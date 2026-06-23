import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gameTemplates, themePresets } from "../lib/templates";
import { api } from "../lib/api";
import { engineOf } from "../lib/studio-meta";
import { getCurrentUserId } from "@/lib/identity";

const defaultPrompt = "cyberpunk doge samurai fighting AI robots in a neon arena";


// Posts a code-generation job and polls until it finishes. Long generations
// (up to ~15 min for pure-agent) cannot survive a single HTTP request through
// browsers and gateways, so the backend returns a jobId immediately and we
// poll /agents/jobs/:id for the result.
const PROGRESS_STAGE_LABELS: Record<string, string> = {
  "writing-code": "Writing game code",
  "editing-seed": "Customizing game code",
  "repairing": "Repairing build",
  "fixing-syntax": "Fixing syntax",
  "fixing-runtime": "Testing & fixing the build",
};

// Polls an existing code job until it finishes. Separated from runCodeJob so a
// build can be resumed after a page refresh from just its persisted jobId.
export async function pollCodeJob(
  jobId: string,
  startedAt: number,
  maxWaitMs: number,
  onProgress?: (statusText: string) => void,
  isCancelled?: () => boolean,
) {
  while (Date.now() - startedAt < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    if (isCancelled?.()) return null;
    const poll = await api.get(`/agents/jobs/${jobId}`, { timeout: 15000 });
    const job = poll.data;
    if (job?.status === "complete") return job.result?.refinement ?? job.result;
    if (job?.status === "failed") {
      throw new Error(job.error?.message ?? "Code generation job failed");
    }
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    // The backend streams the model output and reports how much code exists so
    // far — much more informative than a bare elapsed-seconds counter.
    const progress = job?.progress;
    const stage = PROGRESS_STAGE_LABELS[progress?.stage] ?? "AI build in progress";
    const chars = progress?.chars ? ` · ${Number(progress.chars).toLocaleString()} chars` : "";
    onProgress?.(`${stage}…${chars} (${elapsed}s)`);
  }
  return null;
}

export async function runCodeJob(
  body: Record<string, unknown>,
  maxWaitMs: number,
  onProgress?: (statusText: string) => void,
  isCancelled?: () => boolean,
  onJobId?: (jobId: string) => void,
) {
  const response = await api.post("/agents/code", body, { timeout: 30000 });
  const jobId = response.data?.jobId;
  if (!jobId) throw new Error("No jobId returned for code generation");
  onJobId?.(jobId);
  return pollCodeJob(jobId, Date.now(), maxWaitMs, onProgress, isCancelled);
}

// --- Persistent build state -------------------------------------------------
// The active generation is recorded in localStorage so it survives both
// navigation and a full page refresh. The backend job keeps running either
// way (jobs are mirrored in Mongo); on reload we resume polling by jobId.
const ACTIVE_BUILD_KEY = "kult-active-build";

export type ActiveBuild = {
  strategy: "hybrid" | "pure-agent";
  prompt: string;
  startedAt: number;
  maxWaitMs: number;
  phase: "building" | "done" | "failed";
  jobId?: string;
  statusText?: string;
  game?: { id?: string; templateId?: string; title?: string } | null;
};

function readActiveBuild(): ActiveBuild | null {
  try {
    const raw = localStorage.getItem(ACTIVE_BUILD_KEY);
    if (!raw) return null;
    const build = JSON.parse(raw) as ActiveBuild;
    // A "building" record older than its own deadline can never finish.
    if (build?.phase === "building" && Date.now() - build.startedAt > build.maxWaitMs + 60_000) {
      localStorage.removeItem(ACTIVE_BUILD_KEY);
      return null;
    }
    return build;
  } catch {
    return null;
  }
}

function templateForPrompt(prompt: string) {
  const text = prompt.toLowerCase();
  const match = (ids: string[], terms: string[]) =>
    terms.some((term: string) => text.includes(term))
      ? gameTemplates.find((template: any) => ids.includes(template.id))
      : null;

  return (
    match(["chess"], ["chess", "checkmate", "chessboard", "grandmaster"]) ||
    match(["head-soccer-2026"], ["soccer", "football", "world cup", "sports"]) ||
    match(["goof-runner"], ["endless runner", "runner", "run", "jump", "parkour"]) ||
    match(["mini-racer"], ["racing", "racer", "race", "car", "cars", "driving", "traffic"]) ||
    match(["bubble-shooter"], ["bubble", "shooter", "aim"]) ||
    match(["blocks-match3"], ["match 3", "match-3", "match three", "blocks", "jewel", "candy"]) ||
    gameTemplates.find((template) => text.includes(template.category.toLowerCase())) ||
    gameTemplates.find((template) => text.includes(template.name.toLowerCase())) ||
    null
  );
}

function recentCreationContext() {
  try {
    const games = JSON.parse(localStorage.getItem("kult-created-games") ?? "[]");
    return games.slice(0, 12).map((game: any) => ({
      id: game.id,
      title: game.title,
      templateId: game.templateId,
      category: game.category,
      thumbnailUrl: game.thumbnailUrl,
      createdAt: game.createdAt,
    }));
  } catch {
    return [];
  }
}

export function localPackage(template: any, options: any) {
  const theme = themePresets[options.theme as keyof typeof themePresets] ?? themePresets.neon;
  const tuning = template.difficulty[options.difficulty] ?? template.difficulty.normal;
  const slug = `${template.id}-${options.theme}-${Date.now().toString(36)}`;

  return {
    id: slug,
    tier: "template",
    title: `${theme.label} ${template.name}`,
    templateId: template.id,
    templateName: template.name,
    category: template.category,
    createdIn: template.time,
    apiCost: 0,
    reliability: template.reliability,
    customization: {
      prompt: options.prompt,
      theme: theme.label,
      level: options.customization,
      difficulty: options.difficulty,
      extra: options.extra,
    },
    gameplay: {
      mechanic: template.mechanic,
      controls: template.controls,
      tuning,
    },
    visuals: {
      mood: theme.mood,
      colors: theme.colors,
      assets: template.assets,
    },
    build: {
      renderer:
        template.engine === "construct"
          ? "Embedded HTML5 Construct runtime"
          : "Playable Canvas runtime",
      runtimeTarget: "Browser",
      externalAssets: template.engine === "construct",
      publishReady: true,
    },
    checklist: [
      "Deterministic template selected",
      "Difficulty tuning applied",
      "Theme colors injected",
      "Canvas-safe asset plan generated",
      "Optional AI refinement available",
    ],
  };
}

function localTemplateExport() {
  return {
    name: "kult-template-pack",
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    strategy: {
      tier1: "Templates are primary: instant, deterministic, zero API cost.",
      tier2: "LLM refinement is optional and prompt-driven.",
    },
    themes: themePresets,
    templates: gameTemplates.map((template) => ({
      ...template,
      assets: [
        {
          id: `${template.id}-procedural-assets`,
          type: "procedural",
          format: "canvas",
          description: template.assets,
        },
      ],
      aiRefinement: {
        system:
          "You are an expert Phaser 3 game developer. Output only executable JavaScript. Use Canvas-drawn assets. No markdown.",
        userTemplate: `Game: ${template.name}\nMechanic: ${template.mechanic}\nControls: ${template.controls}`,
      },
    })),
    usage: {
      exportNote:
        "Assets are procedural Canvas manifests. The game runtime draws them instead of shipping image files.",
    },
  };
}

export function useCreatorStudio() {
  const generationRef = useRef(0);
  // While a prompt generation programmatically changes engine/selection, the
  // StudioContext "sync package to selection" effect must not run — it would
  // overwrite the AI-designed package with a plain template package.
  const templateSyncPausedUntil = useRef(0);
  const pauseTemplateSync = useCallback((ms = 8000) => {
    templateSyncPausedUntil.current = Date.now() + ms;
  }, []);
  const isTemplateSyncPaused = useCallback(() => Date.now() < templateSyncPausedUntil.current, []);
  const [engine, setEngine] = useState("threejs");
  const [selectedId, setSelectedId] = useState("flappy");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [theme, setTheme] = useState("neon");
  const [difficulty, setDifficulty] = useState("normal");
  const [customization, setCustomization] = useState("light");
  const [extra, setExtra] = useState("none");
  const [status, setStatus] = useState("Ready");
  const [packageMode, setPackageMode] = useState("Tier 1");
  const [agentStack, setAgentStack] = useState<any>(null);
  const [agentStatus, setAgentStatus] = useState("Agents idle");
  const [orchestrationPlan, setOrchestrationPlan] = useState<any>(null);
  const [assetResult, setAssetResult] = useState<any>(null);
  const [generatedPackage, setGeneratedPackage] = useState(() =>
    localPackage(gameTemplates[0], {
      prompt: defaultPrompt,
      theme: "neon",
      difficulty: "normal",
      customization: "light",
      extra: "none",
    }),
  );
  const [activeBuild, setActiveBuild] = useState<ActiveBuild | null>(() => readActiveBuild());

  const updateActiveBuild = useCallback((patch: Partial<ActiveBuild> | null) => {
    setActiveBuild((prev) => {
      const next = patch === null ? null : ({ ...(prev as ActiveBuild), ...patch } as ActiveBuild);
      try {
        if (next === null) localStorage.removeItem(ACTIVE_BUILD_KEY);
        else localStorage.setItem(ACTIVE_BUILD_KEY, JSON.stringify(next));
      } catch {
        // localStorage full/unavailable — in-memory state still works for this session.
      }
      return next;
    });
  }, []);

  // Cancels the in-progress build (stops polling) or dismisses a finished one.
  const cancelActiveBuild = useCallback(() => {
    generationRef.current += 1; // invalidates every active polling loop
    if (activeBuild?.phase === "building") setAgentStatus("Build cancelled");
    updateActiveBuild(null);
  }, [activeBuild, updateActiveBuild]);

  // Resume polling after a page refresh: the backend job kept running, we just
  // lost the in-memory poller. Done/failed records simply render as-is.
  useEffect(() => {
    const build = readActiveBuild();
    if (!build || build.phase !== "building") return;
    if (!build.jobId) {
      // Refresh happened before the job was registered — nothing to poll.
      updateActiveBuild({
        phase: "failed",
        statusText: "Build was interrupted before the job started — please run it again.",
      });
      return;
    }
    const token = ++generationRef.current;
    setStatus("Generating from prompt");
    setPackageMode(build.strategy === "pure-agent" ? "Pure Agent" : "Prompt");
    setAgentStatus(build.statusText ?? "Resuming build…");
    void (async () => {
      try {
        const refinement = await pollCodeJob(
          build.jobId!,
          build.startedAt,
          build.maxWaitMs,
          (statusText) => {
            setAgentStatus(statusText);
            updateActiveBuild({ statusText });
          },
          () => generationRef.current !== token,
        );
        if (generationRef.current !== token) return;
        if (refinement?.generatedCode) {
          setGeneratedPackage((prev) => ({
            ...(prev ?? {}),
            ...(build.game ?? {}),
            tier: "ai-refinement",
            refinement,
          }));
          setPackageMode("Prompt + Agents");
          setStatus("Game generated with code");
          setAgentStatus(`AI build ready · ${refinement.source ?? refinement.model ?? "agent"}`);
          updateActiveBuild({ phase: "done", statusText: "AI build ready" });
        } else {
          updateActiveBuild({
            phase: "done",
            statusText: "AI build returned no code — the playable template version was saved.",
          });
        }
      } catch (error: any) {
        if (generationRef.current !== token) return;
        const message = error?.response?.data?.error ?? error?.message ?? "AI build failed";
        setAgentStatus(`AI build failed: ${message}`);
        updateActiveBuild({ phase: "failed", statusText: message });
      }
    })();
    // Run once on mount: this recovers the poller that the refresh destroyed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAgentStack() {
      try {
        const response = await api.get("/agents/stack");
        if (!cancelled) setAgentStack(response.data);
      } catch {
        if (!cancelled) {
          setAgentStack({
            provider: "0g",
            hasApiKey: false,
            models: {
              orchestrator: "glm-5.1",
              coding: "deepseek-v4-pro",
              background: "deepseek-v4-flash",
              image: "z-image",
              vision: "qwen/qwen3-vl-30b-a3b-instruct",
              speech: "openai/whisper-large-v3",
            },
          });
        }
      }
    }

    loadAgentStack();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTemplates = useMemo(
    () =>
      gameTemplates
        .map((t) => ({ ...t, engine: t.engine ?? "threejs" }))
        .filter((t) => t.engine === engine),
    [engine],
  );

  useEffect(() => {
    if (filteredTemplates.length > 0 && !filteredTemplates.some((t) => t.id === selectedId)) {
      setSelectedId(filteredTemplates[0].id);
    }
  }, [engine, filteredTemplates, selectedId]);

  const selectedTemplate = useMemo(
    () =>
      filteredTemplates.find((template) => template.id === selectedId) ??
      filteredTemplates[0] ??
      gameTemplates[0],
    [selectedId, filteredTemplates],
  );

  const options = useMemo(
    () => ({ prompt, theme, difficulty, customization, extra }),
    [prompt, theme, difficulty, customization, extra],
  );

  const createFromTemplate = useCallback(async () => {
    setStatus("Creating");
    setPackageMode("Tier 1");
    try {
      const response = await api.post("/games/create", {
        templateId: selectedTemplate.id,
        userId: getCurrentUserId(),
        ...options,
      });
      setGeneratedPackage(response.data.game);
      setStatus("Generated");
    } catch {
      setGeneratedPackage(localPackage(selectedTemplate, options));
      setStatus("Generated locally");
    }
  }, [options, selectedTemplate]);

  const generateFromPrompt = useCallback(
    async (strategy = "hybrid", promptOverride = "") => {
      const effectivePrompt = promptOverride || prompt;
      const effectiveOptions = { ...options, prompt: effectivePrompt };
      const token = ++generationRef.current;
      // Pure-agent writes a game from scratch (slow); hybrid edits a working seed.
      const maxWaitMs = strategy === "pure-agent" ? 16 * 60 * 1000 : 8 * 60 * 1000;
      updateActiveBuild({
        strategy: strategy === "pure-agent" ? "pure-agent" : "hybrid",
        prompt: effectivePrompt,
        startedAt: Date.now(),
        maxWaitMs,
        phase: "building",
        jobId: undefined,
        statusText: "Starting build…",
        game: null,
      });
      setStatus("Generating from prompt");
      setPackageMode(strategy === "pure-agent" ? "Pure Agent" : "Prompt");
      setAgentStatus(`Routing ${strategy === "pure-agent" ? "pure agent" : "hybrid"} request…`);
      setOrchestrationPlan(null);
      setAssetResult(null);
      // A confident keyword match (e.g. "chess", "racing") — null for vague prompts.
      const localMatch = templateForPrompt(effectivePrompt);
      const promptTemplate = localMatch ?? selectedTemplate;
      // Lock the matched template for hybrid so the routing agent can't drift to a different
      // game. Pure-agent always goes to the backend (it designs from scratch, no template).
      const lockTemplate = strategy !== "pure-agent" && Boolean(localMatch);

      // Phase 0 (instant): show a playable local build immediately so the preview is never blank.
      pauseTemplateSync();
      setEngine(engineOf(promptTemplate));
      setSelectedId(promptTemplate.id);
      const localGame = localPackage(promptTemplate, effectiveOptions);
      setGeneratedPackage(localGame);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let baseGame: any = localGame;

      if (lockTemplate) {
        // Clear intent — keep the matched template, skip the ~23s routing call entirely.
        setPackageMode("Prompt");
        setStatus("Playable template ready");
        setAgentStatus(`Matched “${promptTemplate.name}” — generating AI build in the background…`);
      } else {
        // Phase 1 (fast): vague prompt — let the backend routing agent pick the closest template.
        // No code/assets/plan, so it returns well under the ~100s gateway timeout.
        try {
          const response = await api.post(
            "/games/generate-from-prompt",
            {
              prompt: effectivePrompt,
              userId: getCurrentUserId(),
              context: {
                preferredTemplateId: promptTemplate.id,
                recentCreations: recentCreationContext(),
                requestedStrategy: strategy,
              },
              theme,
              difficulty,
              customization,
              extra,
              includePlan: false,
              includeCode: false,
              includeAssets: false,
              strategy,
            },
            { timeout: 90000 },
          );
          const result = response.data;
          baseGame = {
            ...result.game,
            thumbnailUrl: result.game?.thumbnailUrl ?? "/thumbnails/simple-agent-game-cover.png",
          };
          // Only move the studio selection when the backend picked a real
          // template. Pure-agent games have templateId "pure-agent", which is
          // not in the template list — selecting it used to bounce the
          // selection back to the default template and wipe the AI package.
          const template = gameTemplates.find((t) => t.id === baseGame?.templateId);
          if (template) {
            pauseTemplateSync();
            setEngine(engineOf(template));
            setSelectedId(template.id);
          }
          setGeneratedPackage(baseGame);
          setPackageMode(strategy === "pure-agent" ? "Pure Agent" : "Prompt");
          setStatus(strategy === "pure-agent" ? "AI design ready" : "Playable template ready");
          setAgentStatus(
            strategy === "pure-agent"
              ? "Custom game designed — generating AI build in the background…"
              : "Template ready — generating AI build in the background…",
          );
        } catch (error: any) {
          // Routing failed (offline/timeout) — keep the instant local build, still playable.
          baseGame = localGame;
          setStatus("Generated locally");
          setAgentStatus(
            error.response?.data?.error ?? "Prompt pipeline unreachable — showing local template",
          );
        }
      }

      // The playable base game is known — record it so the create page can show
      // and link the build even after navigation or a refresh.
      if (generationRef.current === token) {
        updateActiveBuild({
          game: { id: baseGame?.id, templateId: baseGame?.templateId, title: baseGame?.title },
        });
      }

      // Phase 2 (background): ask the coding agent for the real build and swap it in
      // when ready. The backend returns a jobId immediately and we poll for the result,
      // so generation can take 10-15 minutes without any HTTP timeout killing it.
      // If it is slow or fails, the playable template stays in place.
      void (async () => {
        try {
          const refinement = await runCodeJob(
            {
              gamePackage: baseGame,
              request: effectivePrompt,
              refinementLevel: customization,
              strategy,
            },
            maxWaitMs,
            (statusText) => {
              if (generationRef.current !== token) return;
              setAgentStatus(statusText);
              updateActiveBuild({ statusText });
            },
            () => generationRef.current !== token,
            (jobId) => {
              if (generationRef.current === token) updateActiveBuild({ jobId });
            },
          );

          if (generationRef.current !== token) return; // superseded by a newer generation
          if (refinement?.generatedCode) {
            setGeneratedPackage((prev) => ({
              ...(prev ?? baseGame),
              tier: "ai-refinement",
              refinement,
            }));
            setPackageMode("Prompt + Agents");
            setStatus("Game generated with code");
            setAgentStatus(`AI build ready · ${refinement.source ?? refinement.model ?? "agent"}`);
            updateActiveBuild({ phase: "done", statusText: "AI build ready" });
          } else {
            setAgentStatus("AI build returned no code — showing playable template");
            updateActiveBuild({
              phase: "done",
              statusText: "AI build returned no code — the playable template version was saved.",
            });
          }
        } catch (error: any) {
          if (generationRef.current !== token) return;
          // Surface the real failure (e.g. "interrupted by a server restart",
          // "insufficient balance") instead of calling everything a timeout.
          const detail = error.response?.data?.error ?? error?.message;
          const message = detail
            ? `AI build failed: ${detail} — showing playable template`
            : "AI build timed out — showing playable template";
          setAgentStatus(message);
          updateActiveBuild({ phase: "failed", statusText: message });
        }
      })();

      return baseGame;
    },
    [customization, difficulty, extra, options, prompt, selectedTemplate, theme, updateActiveBuild],
  );

  const refineWithAi = useCallback(async () => {
    setStatus("Preparing AI");
    setPackageMode("Tier 2");
    try {
      const refinement = await runCodeJob(
        {
          gamePackage: generatedPackage,
          request: prompt,
          refinementLevel: customization,
        },
        8 * 60 * 1000,
        (statusText) => setAgentStatus(statusText),
      );
      setGeneratedPackage((prev) => ({
        ...prev,
        tier: "ai-refinement",
        refinement,
      }));
      setAgentStatus(`Code agent: ${refinement?.model ?? "deepseek-v4-pro"}`);
      setStatus(refinement?.generatedCode ? "AI code generated" : "AI prompt ready");
    } catch (error: any) {
      setGeneratedPackage((prev) => ({
        ...prev,
        tier: "ai-refinement",
        refinement: {
          error: error.response?.data?.error ?? "AI refinement failed",
          promptBundle: {
            system: "Tier 2 could not reach the configured 0G agent.",
            user: `Refine ${prev.title}. User request: ${prompt}`,
          },
        },
      }));
      setAgentStatus("Code agent unavailable");
      setStatus("AI setup needed");
    }
  }, [customization, generatedPackage, prompt]);

  const orchestrateBuild = useCallback(async () => {
    setAgentStatus("Planning with orchestrator");
    try {
      const response = await api.post(
        "/agents/orchestrate",
        {
          prompt,
          context: {
            template: selectedTemplate,
            options,
            gamePackage: generatedPackage,
          },
        },
        { timeout: 60000 },
      );
      setOrchestrationPlan(response.data.result);
      setAgentStatus(`Orchestrator: ${response.data.result?.model ?? "glm-5.1"}`);
    } catch (error: any) {
      setOrchestrationPlan({
        error: error.response?.data?.error ?? "Orchestrator unavailable",
        content: "Use the selected template and local deterministic package.",
      });
      setAgentStatus("Orchestrator unavailable");
    }
  }, [generatedPackage, options, prompt, selectedTemplate]);

  const generateAssets = useCallback(async () => {
    setAgentStatus("Generating image assets");
    try {
      const response = await api.post(
        "/agents/assets",
        {
          prompt: [
            `${generatedPackage.title} game thumbnail`,
            generatedPackage.gameplay?.mechanic,
            generatedPackage.visuals?.mood,
            "polished colorful game cover art, no text",
          ]
            .filter(Boolean)
            .join(", "),
        },
        { timeout: 60000 },
      );
      setAssetResult(response.data.result);
      setAgentStatus(`Image agent: ${response.data.result?.model ?? "z-image"}`);
    } catch (error: any) {
      setAssetResult({
        error: error.response?.data?.error ?? "Asset generation unavailable",
      });
      setAgentStatus("Image agent unavailable");
    }
  }, [generatedPackage]);

  const getTemplateExport = useCallback(async () => {
    try {
      const response = await api.get("/templates/export");
      return response.data;
    } catch {
      return localTemplateExport();
    }
  }, []);

  return {
    templates: filteredTemplates,
    engine,
    setEngine,
    themePresets,
    selectedTemplate,
    selectedId,
    setSelectedId,
    isTemplateSyncPaused,
    prompt,
    setPrompt,
    theme,
    setTheme,
    difficulty,
    setDifficulty,
    customization,
    setCustomization,
    extra,
    setExtra,
    status,
    agentStack,
    agentStatus,
    orchestrationPlan,
    assetResult,
    packageMode,
    generatedPackage,
    activeBuild,
    cancelActiveBuild,
    createFromTemplate,
    generateFromPrompt,
    refineWithAi,
    orchestrateBuild,
    generateAssets,
    getTemplateExport,
  };
}
