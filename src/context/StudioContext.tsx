import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCreatorStudio } from "@/hooks/useCreatorStudio";
import { api } from "@/lib/api";
import { engineOf } from "@/lib/studio-meta";
import { gameTemplates } from "@/lib/templates";
import { getCurrentUserId, ownsGame } from "@/lib/identity";

type Studio = ReturnType<typeof useCreatorStudio>;

type StudioContextValue = {
  studio: Studio;
  createdGames: any[];
  addCreatedGame: (game: any) => void;
  removeCreatedGame: (gameId: string) => Promise<void>;
  /** Re-fetches backend games and merges them in (e.g. while waiting for a build). */
  refreshCreatedGames: () => Promise<void>;
  /** Select a template (switching engine if needed) and jump to the Studio route. */
  openInStudio: (templateId: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

const StudioContext = createContext<StudioContextValue | null>(null);

// localStorage holds lean metadata only: generated code is 20-30KB per game
// and would blow the ~5MB quota within a few dozen creations. Full packages
// (with code) live in memory and in the backend.
function persistCreatedGames(games: any[]) {
  try {
    const lean = games.slice(0, 60).map((g: any) => {
      const { refinement, plan, promptBundle, ...rest } = g ?? {};
      void plan;
      void promptBundle;
      return { ...rest, hasBuild: Boolean(refinement?.generatedCode) };
    });
    localStorage.setItem("kult-created-games", JSON.stringify(lean));
  } catch {
    // quota exceeded — keep the in-memory state, drop persistence silently
  }
}

// Dead draft: a pure-agent game whose build never delivered code. A real
// build resolves within ~16 minutes; anything older without code is junk
// from an interrupted build and must never show in My Creations.
const DEAD_DRAFT_MS = 20 * 60 * 1000;
function isDeadDraft(game: any) {
  if (game?.templateId !== "pure-agent") return false;
  if (game?.refinement?.generatedCode || game?.hasBuild) return false;
  const born = Date.parse(String(game?.createdAt ?? "")) || 0;
  return born > 0 && Date.now() - born > DEAD_DRAFT_MS;
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const studio = useCreatorStudio();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [createdGames, setCreatedGames] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("kult-created-games");
      const parsed: any[] = stored ? JSON.parse(stored) : [];
      // dedupe + keep only the current user's games (wallet = user)
      return parsed
        .filter((g) => ownsGame(g?.creatorId))
        .filter((g) => !isDeadDraft(g))
        .filter((g, i, all) => !g?.id || all.findIndex((x) => x?.id === g.id) === i);
    } catch {
      return [];
    }
  });

  const addCreatedGame = (game: any) => {
    setCreatedGames((prev) => {
      const updated = [game, ...prev.filter((g: any) => g?.id !== game?.id)];
      persistCreatedGames(updated);
      return updated;
    });
  };

  const removeCreatedGame = useCallback(async (gameId: string) => {
    await api.delete(`/games/${encodeURIComponent(gameId)}`).catch(() => {});
    setCreatedGames((prev) => {
      const updated = prev.filter((g: any) => g?.id !== gameId);
      persistCreatedGames(updated);
      return updated;
    });
  }, []);

  // A failed pure-agent build leaves a dead draft behind — no code and no
  // template to play. Delete it right away so it never lands in My Creations.
  const failedBuild = studio.activeBuild?.phase === "failed" ? studio.activeBuild : null;
  useEffect(() => {
    if (failedBuild?.strategy === "pure-agent" && failedBuild.game?.id) {
      void removeCreatedGame(failedBuild.game.id);
    }
  }, [failedBuild?.strategy, failedBuild?.game?.id, removeCreatedGame]);

  // localStorage only knows about games generated in this browser. Merge in
  // everything the backend persisted so creations show up on any client.
  // When both sides have the same game, prefer the copy that carries the
  // generated build (the backend saves it when the code job completes).
  const refreshCreatedGames = useCallback(async () => {
    try {
      // Only the current user's creations belong in My Creations.
      const response = await api.get("/games/list", {
        timeout: 15000,
        params: { creatorId: getCurrentUserId() },
      });
      const remote: any[] = response.data?.games ?? [];
      if (!remote.length) return;
      setCreatedGames((prev) => {
        const remoteById = new Map(remote.filter((g: any) => g?.id).map((g: any) => [g.id, g]));
        // The backend list is authoritative: cached entries from before creator
        // attribution (no creatorId) that the server doesn't know are stale
        // copies of other users' games — drop them.
        const kept = prev.filter(
          (g: any) => !isDeadDraft(g) && (g?.creatorId || (g?.id && remoteById.has(g.id))),
        );
        let changed = kept.length !== prev.length;
        const upgraded = kept.map((g: any) => {
          const r = remoteById.get(g?.id);
          if (!r) return g;
          if (r.refinement?.generatedCode && !g?.refinement?.generatedCode) {
            changed = true;
            return r;
          }
          // The backend generates a real cover image in the background —
          // swap out the placeholder SVG when it has landed.
          const localIsPlaceholder =
            !g?.thumbnailUrl ||
            String(g.thumbnailUrl).startsWith("data:image/svg+xml") ||
            String(g.thumbnailUrl).startsWith("/api/"); // backend-served — upgrade to the CDN URL
          const remoteIsReal =
            r.thumbnailUrl && !String(r.thumbnailUrl).startsWith("data:image/svg+xml");
          if (localIsPlaceholder && remoteIsReal) {
            changed = true;
            return { ...g, thumbnailUrl: r.thumbnailUrl };
          }
          return g;
        });
        const known = new Set(kept.map((g: any) => g?.id));
        const added = remote.filter((g: any) => g?.id && !known.has(g.id));
        if (!changed && added.length === 0) return prev;
        const merged = [...upgraded, ...added];
        persistCreatedGames(merged);
        return merged;
      });
    } catch {
      // backend offline — local games still show
    }
  }, []);

  useEffect(() => {
    void refreshCreatedGames();
  }, [refreshCreatedGames]);

  const {
    createFromTemplate,
    customization,
    difficulty,
    extra,
    isTemplateSyncPaused,
    selectedId,
    theme,
  } = studio;

  // Keep the generated package in sync whenever the selection or options change.
  // Skipped while a prompt generation is updating the selection itself —
  // otherwise this would overwrite the AI-designed package with a template one.
  useEffect(() => {
    if (isTemplateSyncPaused()) return;
    createFromTemplate();
  }, [createFromTemplate, customization, difficulty, extra, isTemplateSyncPaused, selectedId, theme]);

  // The standalone Studio section was removed — "Use Template" now selects the
  // template and opens it directly on its play page.
  const openInStudio = (templateId: string) => {
    const template = gameTemplates.find((t: any) => t.id === templateId);
    if (template) studio.setEngine(engineOf(template));
    studio.setSelectedId(templateId);
    navigate({ to: "/play/$gameId", params: { gameId: templateId } });
  };

  return (
    <StudioContext.Provider
      value={{
        studio,
        createdGames,
        addCreatedGame,
        removeCreatedGame,
        refreshCreatedGames,
        openInStudio,
        sidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export function useStudioContext(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error("useStudioContext must be used within a StudioProvider");
  }
  return ctx;
}
