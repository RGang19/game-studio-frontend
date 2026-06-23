import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Heart,
  Loader2,
  MessageCircle,
  MessageSquareWarning,
  MoreVertical,
  Play,
  Plus,
  RotateCcw,
  Send,
  Shuffle,
  Maximize2,
  Minimize2,
  Trash2,
  UserPlus,
  X,
  Trophy,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { GamePreview } from "@/components/studio/GamePreview";
import { Html5Preview } from "@/components/studio/Html5Preview";
import { SimpleAgentGame } from "@/components/studio/SimpleAgentGame";
import { NeonSudokuGame } from "@/components/studio/NeonSudokuGame";
import { gameTemplates } from "@/lib/templates";
import { engineOf, templateEmoji, getThumbnailUrl, resolveGameThumbnail } from "@/lib/studio-meta";
import { localPackage } from "@/hooks/useCreatorStudio";
import { gradientClass } from "@/lib/games-data";
import { gradientForId, templateToGame } from "@/lib/studio-meta";
import { useSocial } from "@/hooks/useSocial";
import { useFollow } from "@/hooks/useFollow";
import { getCurrentUserId } from "@/lib/identity";
import { recordView } from "@/lib/api/social";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useStudioContext } from "@/context/StudioContext";
import { api } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/api/leaderboards";
import type { SharePlatform } from "@/lib/api/social";
import { qualifyReferral } from "@/lib/api/referral";

export const Route = createFileRoute("/_app/play/$gameId")({
  head: ({ params }) => {
    const template = gameTemplates.find((t: any) => t.id === params.gameId);
    return {
      meta: [
        { title: `${template?.name ?? "Play"} - GameStudio` },
        { name: "description", content: "Play this game instantly from the social feed." },
      ],
    };
  },
  component: PlayFeed,
});

const creatorProfiles = [
  { handle: "@archeologist", name: "archeologist", avatar: "A", bio: "Browse their games" },
  { handle: "@neo", name: "neo", avatar: "N", bio: "Fast arcade experiments" },
  { handle: "@luma", name: "luma", avatar: "L", bio: "Puzzle loops and bright worlds" },
  { handle: "@pixel", name: "pixel", avatar: "P", bio: "Tiny games, big scores" },
  { handle: "@orbit", name: "orbit", avatar: "O", bio: "3D web playgrounds" },
];

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Leaderboard Logic & Side Panel
// ═══════════════════════════════════════════════════════════════════════════

function LeaderboardButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex min-w-12 flex-col items-center gap-1.5 text-black transition-transform active:scale-90 lg:min-w-12"
    >
      <span className="grid size-11 place-items-center rounded-none border-2 border-black bg-white transition-all lg:size-10 group-hover:shadow-[3px_3px_0_#101010]">
        <Trophy className="size-5 text-black" />
      </span>
      <span className="label-mono text-[10px]">Rank</span>
    </button>
  );
}

function LeaderboardPanel({
  template,
  entries,
  loading,
  onClose,
}: {
  template: any;
  entries: LeaderboardEntry[];
  loading: boolean;
  onClose: () => void;
}) {
  const top1 = entries[0];
  const top2 = entries[1];
  const top3 = entries[2];
  const listPlayers = entries.slice(3);

  return (
    <div className="flex flex-col h-full overflow-hidden text-black">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-black">
        <div className="flex items-center gap-2.5">
          <Trophy className="size-5 text-black" />
          <div>
            <h3 className="font-display text-lg font-black uppercase tracking-tight">Leaderboard</h3>
            <p className="label-mono text-[10px] text-[#55534d]">{template.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="grid size-9 place-items-center rounded-none border-2 border-black bg-white text-black transition hover:bg-primary"
        >
          <X className="size-5" />
        </button>
      </div>

      {loading && (
        <div className="grid flex-1 place-items-center label-mono text-sm text-[#55534d]">
          Loading scores...
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div>
            <Trophy className="mx-auto mb-4 size-12 text-black/40" />
            <h4 className="font-display text-lg font-black uppercase text-black">No scores yet</h4>
            <p className="mt-2 text-sm leading-6 text-[#55534d]">
              This game has its own leaderboard. Scores submitted for other games will not appear
              here.
            </p>
          </div>
        </div>
      )}

      {!loading && top1 && (
        <div className="flex items-end justify-center gap-3 py-8 border-b-2 border-black shrink-0 select-none">
          {/* Rank 2 */}
          {top2 && (
            <div className="flex flex-col items-center w-20 text-center">
              <div className="relative">
                <div className="size-14 rounded-none border-2 border-black bg-white p-0.5 overflow-hidden">
                  <div className="size-full rounded-none bg-[#e9e5da] flex items-center justify-center text-lg font-bold">
                    🥈
                  </div>
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-5 rounded-none bg-white text-black flex items-center justify-center text-[10px] font-black border-2 border-black">
                  2
                </div>
              </div>
              <span className="text-[10px] font-black text-black truncate w-full mt-3 block">
                {top2.username}
              </span>
              <span className="label-mono text-[10px] text-[#55534d] mt-0.5 block">
                {formatCount(top2.score)}
              </span>
            </div>
          )}

          {/* Rank 1 */}
          <div className="flex flex-col items-center w-24 text-center z-10">
            <div className="relative -top-2">
              <div className="size-18 rounded-none border-2 border-black bg-primary p-0.5 overflow-hidden shadow-[4px_4px_0_#101010]">
                <div className="size-full rounded-none bg-primary flex items-center justify-center text-xl font-bold">
                  👑
                </div>
              </div>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-5.5 rounded-none bg-black text-[#b9ff2c] flex items-center justify-center text-[10px] font-black border-2 border-black">
                1
              </div>
            </div>
            <span className="text-xs font-black text-black truncate w-full mt-1 block">
              {top1.username}
            </span>
            <span className="label-mono text-xs text-black mt-0.5 block">
              {formatCount(top1.score)}
            </span>
          </div>

          {/* Rank 3 */}
          {top3 && (
            <div className="flex flex-col items-center w-20 text-center">
              <div className="relative">
                <div className="size-14 rounded-none border-2 border-black bg-white p-0.5 overflow-hidden">
                  <div className="size-full rounded-none bg-[#ff5b42] flex items-center justify-center text-lg font-bold">
                    🥉
                  </div>
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-5 rounded-none bg-white text-black flex items-center justify-center text-[10px] font-black border-2 border-black">
                  3
                </div>
              </div>
              <span className="text-[10px] font-black text-black truncate w-full mt-3 block">
                {top3.username}
              </span>
              <span className="label-mono text-[10px] text-[#55534d] mt-0.5 block">
                {formatCount(top3.score)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Ranks list */}
      {!loading && entries.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 py-4 pr-1">
          {listPlayers.map((row) => (
            <div
              key={row.rank}
              className="flex items-center gap-3 rounded-none border-2 border-black bg-white p-3 transition duration-150 hover:shadow-[3px_3px_0_#101010]"
            >
              {/* Rank badge */}
              <div className="flex size-7 shrink-0 items-center justify-center rounded-none bg-[#f3f0e8] border-2 border-black text-xs font-black text-black">
                {row.rank}
              </div>

              {/* Avatar block */}
              <div className="size-8 rounded-none bg-primary border-2 border-black flex items-center justify-center text-xs font-black text-black shrink-0">
                {row.username.charAt(0).toUpperCase()}
              </div>

              {/* Player details */}
              <div className="flex-1 min-w-0">
                <span className="font-bold text-xs text-black truncate block">{row.username}</span>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <span className="label-mono font-black text-xs text-black">
                  {formatCount(row.score)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayFeed() {
  const { gameId } = Route.useParams();
  const navigate = useNavigate();
  const { setSidebarCollapsed, studio, createdGames, refreshCreatedGames } = useStudioContext();
  const isSimpleAgentGame = gameId === "simple-agent-game";
  const isNeonSudoku = gameId === "neon-sudoku";
  const generatedPackageMatches =
    Boolean(studio.generatedPackage?.id) &&
    (studio.generatedPackage?.id === gameId ||
     studio.generatedPackage?.templateId === gameId ||
     (gameId === "pure-agent" && studio.generatedPackage?.templateId === "pure-agent"));
  // A created game opened by its own id (from My Creations / profile). Without
  // this lookup, unknown ids silently fell back to gameTemplates[0] and played
  // the wrong game instead of the creation's generated build.
  const localCustomGame = !generatedPackageMatches
    ? createdGames.find((cg: any) => cg?.id === gameId)
    : undefined;
  const [publicGame, setPublicGame] = useState<any>(null);
  const [publicLoadState, setPublicLoadState] = useState<"idle" | "loading" | "loaded" | "not-found">(
    "idle",
  );
  const customGame = localCustomGame ?? (publicGame?.id === gameId ? publicGame : undefined);

  // Shared links resolve through the public-by-ID endpoint. It returns only
  // explicitly published games, so drafts cannot be opened by guessing an id.
  useEffect(() => {
    const isTemplate = gameTemplates.some((template: any) => template.id === gameId);
    if (!gameId || isSimpleAgentGame || isNeonSudoku || isTemplate || generatedPackageMatches || localCustomGame) {
      setPublicLoadState("idle");
      return;
    }
    let cancelled = false;
    setPublicGame(null);
    setPublicLoadState("loading");
    api
      .get(`/games/${encodeURIComponent(gameId)}`)
      .then((res) => {
        if (cancelled) return;
        const found = res.data?.game;
        if (found?.id === gameId) {
          setPublicGame(found);
          setPublicLoadState("loaded");
        } else setPublicLoadState("not-found");
      })
      .catch(() => {
        if (!cancelled) setPublicLoadState("not-found");
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, isSimpleAgentGame, isNeonSudoku, generatedPackageMatches, localCustomGame]);

  // The AI build finishes minutes after the game record exists. While this
  // created game has no code yet, poll the backend so the finished build
  // swaps in without requiring a manual refresh.
  const awaitingBuild = Boolean(customGame) && !customGame?.refinement?.generatedCode;
  useEffect(() => {
    if (!awaitingBuild) return;
    const interval = setInterval(() => {
      void refreshCreatedGames();
    }, 20000);
    return () => clearInterval(interval);
  }, [awaitingBuild, refreshCreatedGames]);

  const index = Math.max(
    0,
    gameTemplates.findIndex((t: any) => t.id === gameId),
  );
  const baseTemplate = gameTemplates[index] ?? gameTemplates[0];
  const template = isNeonSudoku
    ? {
        ...baseTemplate,
        id: "neon-sudoku",
        name: "Neon Sudoku",
        category: "Puzzle",
        mechanic: "Complete the 9x9 number grid without repeating digits.",
        controls: "Mouse, touch, keyboard numbers, or R to restart.",
      }
    : isSimpleAgentGame
      ? {
          ...baseTemplate,
          id: "simple-agent-game",
          name: "Simple Agent Game",
          category: "Agent Arcade",
          mechanic: "Click the glowing target as many times as possible in 20 seconds.",
          controls: "Mouse, touch, or R to restart.",
        }
      : generatedPackageMatches && studio.generatedPackage
        ? {
            id: studio.generatedPackage.templateId || "pure-agent",
            name: studio.generatedPackage.title || "AI Custom Game",
            category: studio.generatedPackage.category || "Casual",
            mechanic: studio.generatedPackage.gameplay?.mechanic || "custom gameplay mechanics",
            controls: studio.generatedPackage.gameplay?.controls || "controls",
            engine: studio.generatedPackage.build?.renderer === "construct"
              ? "construct"
              : "threejs"
          }
        : customGame
          ? {
              id: customGame.templateId || "pure-agent",
              name: customGame.title || "AI Custom Game",
              category: customGame.category || "Casual",
              mechanic: customGame.gameplay?.mechanic || "custom gameplay mechanics",
              controls: customGame.gameplay?.controls || "controls",
              // Generated builds run on the canvas renderer regardless of the
              // template family they were routed from.
              engine: "threejs"
            }
          : baseTemplate;

  const game = isNeonSudoku
    ? {
        ...templateToGame(baseTemplate, index),
        title: template.name,
        category: template.category,
        emoji: "🔢",
      }
    : isSimpleAgentGame
      ? {
          ...templateToGame(baseTemplate, index),
          title: template.name,
          category: template.category,
          emoji: "🎯",
        }
      : generatedPackageMatches && studio.generatedPackage
        ? {
            title: studio.generatedPackage.title,
            category: studio.generatedPackage.category,
            plays: "1.2K",
            emoji: "🎮",
            gradient: "from-purple-900 to-indigo-950",
            creator: "0G AI Agent",
            thumbnailUrl: (studio.generatedPackage as any).thumbnailUrl || "/thumbnails/chess-cover.png",
            templateId: studio.generatedPackage.templateId,
          }
        : customGame
          ? {
              title: customGame.title,
              category: customGame.category ?? "Game",
              plays: "New",
              emoji: "🎮",
              gradient: "from-purple-900 to-indigo-950",
              creator: "you",
              thumbnailUrl: resolveGameThumbnail(customGame),
              templateId: customGame.templateId,
            }
          : templateToGame(template, index);

  const engine = engineOf(template);
  const gameTags = Array.from(
    new Set([
      game.category,
      engine === "construct" ? "HTML5" : "Canvas",
      "AI Generated",
    ]),
  );
  const profile = creatorProfiles[index % creatorProfiles.length];
  const pkg = generatedPackageMatches
    ? studio.generatedPackage
    : customGame ??
      localPackage(template, {
        prompt: `${template.name} playable feed session`,
        theme: "neon",
        difficulty: "normal",
        customization: "light",
        extra: "none",
      });
  const isCustomCreation = Boolean(generatedPackageMatches || customGame);
  const isShareable = !isCustomCreation || pkg?.publish?.published === true;
  const social = useSocial(gameId);
  // Real follow state: target the game's creator (template games fall back to
  // a stable pseudo-creator id derived from the displayed creator name).
  const creatorId =
    (pkg as any)?.creatorId ?? (customGame as any)?.creatorId ?? `creator:${game.creator ?? "studio"}`;
  const follow = useFollow(creatorId);
  const isFollowing = follow.following;
  const setIsFollowing = (_next?: boolean) => {
    void follow.toggle();
  };
  // Count a real play once per game per browser session.
  const [viewCount, setViewCount] = useState<number | null>(null);
  useEffect(() => {
    if (!gameId) return;
    const key = `kult-viewed-${gameId}`;
    const uid = getCurrentUserId();
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    recordView(gameId, uid)
      .then((r) => setViewCount(r.views))
      .catch(() => {});
  }, [gameId]);
  if (viewCount != null) game.plays = viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}K` : String(viewCount);
  const leaderboard = useLeaderboard(gameId);
  const { submitScore } = leaderboard;
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const playStartedAt = useRef(Date.now());

  useEffect(() => {
    setIsGameActive(false);
    playStartedAt.current = Date.now();
  }, [gameId]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const feedTabs = [
    { label: "For You", gameId: "flappy" },
    { label: "Trending", gameId: "match3" },
    { label: "Friends", gameId: "memory" },
    { label: "New Creations", gameId: "neon-sudoku" },
  ];
  const activeFeed = feedTabs.find((tab) => tab.gameId === gameId)?.label ?? "For You";

  useEffect(() => {
    setSidebarCollapsed(leaderboardOpen);
    return () => {
      setSidebarCollapsed(false);
    };
  }, [leaderboardOpen, setSidebarCollapsed]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
      return;
    }
    await frameRef.current?.requestFullscreen?.();
  };

  const handleScoreSubmit = useCallback(
    async (score: number) => {
      await submitScore(score).catch(() => {});
      const durationSeconds = Math.floor((Date.now() - playStartedAt.current) / 1000);
      const qualificationKey = `kult-referral-qualified-${getCurrentUserId()}`;
      if (durationSeconds > 30 && !localStorage.getItem(qualificationKey)) {
        const result = await qualifyReferral(gameId, durationSeconds).catch(() => null);
        if (result?.qualified || result?.status === "held") {
          localStorage.setItem(qualificationKey, "1");
        }
      }
    },
    [gameId, submitScore],
  );

  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [, setIsTransitioning] = useState(false);
  const startY = useRef(0);
  const cooldownRef = useRef(false);

  const trendingIds = useMemo(
    () => [
      "match3",
      "flappy",
      "space-shooter",
      "head-soccer-2026",
      "bubble-shooter",
      "cratch-royale",
    ],
    [],
  );
  const agentIds = useMemo(() => ["simple-agent-game", "ai-arena"], []);
  const friendsIds = useMemo(
    () => [
      "memory",
      "drawing",
      "quiz",
      "race-kings",
      "spin-wheel-royale",
    ],
    [],
  );
  const newCreationsIds = useMemo(
    () => [
      "neon-sudoku",
      "simple-agent-game",
      "chicken-cross",
      "cratch-royale",
      "neon-bounce",
      "plinko-pro",
      "race-kings",
      "spin-wheel-royale",
      "stake-mines",
    ],
    [],
  );

  const getTabGameList = useCallback(
    (tab: string) => {
      const neonSudokuTemplate = {
        ...gameTemplates[0],
        id: "neon-sudoku",
        name: "Neon Sudoku",
        category: "Puzzle",
        mechanic: "Complete the 9x9 number grid without repeating digits.",
        controls: "Mouse, touch, keyboard numbers, or R to restart.",
        engine: "canvas",
      };
      const simpleAgentTemplate = {
        ...gameTemplates[0],
        id: "simple-agent-game",
        name: "Simple Agent Game",
        category: "Agent Arcade",
        mechanic: "Click the glowing target as many times as possible in 20 seconds.",
        controls: "Mouse, touch, or R to restart.",
        engine: "canvas",
      };
      const templates = [neonSudokuTemplate, simpleAgentTemplate, ...gameTemplates];
      
      switch (tab) {
        case "Trending":
          return trendingIds.map(id => templates.find((t: any) => t.id === id)).filter(Boolean);
        case "Friends":
          return friendsIds.map(id => templates.find((t: any) => t.id === id)).filter(Boolean);
        case "New Creations":
          return newCreationsIds.map(id => templates.find((t: any) => t.id === id)).filter(Boolean);
        case "For You":
        default:
          return templates;
      }
    },
    [trendingIds, agentIds, friendsIds, newCreationsIds],
  );

  const [activeTab, setActiveTab] = useState(() => {
    if (newCreationsIds.includes(gameId)) return "New Creations";
    if (friendsIds.includes(gameId)) return "Friends";
    if (trendingIds.includes(gameId)) return "Trending";
    return "For You";
  });

  useEffect(() => {
    const currentList = getTabGameList(activeTab);
    if (!currentList.some((t: any) => t.id === gameId)) {
      if (newCreationsIds.includes(gameId)) setActiveTab("New Creations");
      else if (friendsIds.includes(gameId)) setActiveTab("Friends");
      else if (trendingIds.includes(gameId)) setActiveTab("Trending");
      else setActiveTab("For You");
    }
  }, [gameId, activeTab, getTabGameList, newCreationsIds, friendsIds, trendingIds]);

  const activeGamesList = useMemo(() => getTabGameList(activeTab), [activeTab, getTabGameList]);

  const handleTabClick = useCallback(
    (tabLabel: string, defaultGameId: string) => {
      setActiveTab(tabLabel);
      navigate({ to: "/play/$gameId", params: { gameId: defaultGameId } });
    },
    [navigate],
  );

  const triggerNextGame = useCallback(() => {
    if (cooldownRef.current || activeGamesList.length === 0) return;
    const indexInList = activeGamesList.findIndex((t: any) => t.id === gameId);
    const currentIndex = indexInList === -1 ? 0 : indexInList;
    const nextIndex = (currentIndex + 1) % activeGamesList.length;
    const nextGame = activeGamesList[nextIndex];
    if (nextGame) {
      cooldownRef.current = true;
      setIsTransitioning(true);
      setDragY(-800);
      setTimeout(() => {
        navigate({ to: "/play/$gameId", params: { gameId: nextGame.id } });
        setDragY(800);
        setTimeout(() => {
          setIsTransitioning(false);
          setDragY(0);
          setTimeout(() => {
            cooldownRef.current = false;
          }, 300);
        }, 50);
      }, 300);
    }
  }, [gameId, activeGamesList, navigate]);

  const triggerPrevGame = useCallback(() => {
    if (cooldownRef.current || activeGamesList.length === 0) return;
    const indexInList = activeGamesList.findIndex((t: any) => t.id === gameId);
    const currentIndex = indexInList === -1 ? 0 : indexInList;
    const prevIndex = (currentIndex - 1 + activeGamesList.length) % activeGamesList.length;
    const prevGame = activeGamesList[prevIndex];
    if (prevGame) {
      cooldownRef.current = true;
      setIsTransitioning(true);
      setDragY(800);
      setTimeout(() => {
        navigate({ to: "/play/$gameId", params: { gameId: prevGame.id } });
        setDragY(-800);
        setTimeout(() => {
          setIsTransitioning(false);
          setDragY(0);
          setTimeout(() => {
            cooldownRef.current = false;
          }, 300);
        }, 50);
      }, 300);
    }
  }, [gameId, activeGamesList, navigate]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("textarea")
    ) {
      return;
    }

    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    startY.current = clientY;
    setIsDragging(true);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || cooldownRef.current) return;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - startY.current;
    setDragY(deltaY * 0.8);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragY < -80) {
      triggerNextGame();
    } else if (dragY > 80) {
      triggerPrevGame();
    } else {
      setDragY(0);
      if (Math.abs(dragY) < 5) {
        setIsUiHidden((prev) => !prev);
      }
    }
  };

  useEffect(() => {
    let lastWheelTime = 0;
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(".comments-panel") ||
        target.closest(".leaderboard-panel")
      ) {
        return;
      }

      if (Math.abs(e.deltaY) < 15) return;

      const now = Date.now();
      if (now - lastWheelTime < 1000) return;

      if (e.deltaY > 0) {
        lastWheelTime = now;
        triggerNextGame();
      } else {
        lastWheelTime = now;
        triggerPrevGame();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [triggerNextGame, triggerPrevGame]);

  const socialButtons = (
    <>
      <FollowSidebarButton following={isFollowing} onToggle={() => setIsFollowing(!isFollowing)} />
      <LeaderboardButton onClick={() => setLeaderboardOpen(true)} />
      <ShareButton
        count={social.shareCount}
        open={social.shareMenuOpen}
        onToggle={() => social.setShareMenuOpen(!social.shareMenuOpen)}
        onShare={social.handleShare}
        template={template}
        game={game}
        gameId={gameId}
        disabled={!isShareable}
      />
      <ActionButton
        icon={<MessageCircle className="size-6" />}
        label={social.commentCount > 0 ? formatCount(social.commentCount) : "0"}
        onClick={() => social.setCommentsOpen(!social.commentsOpen)}
        active={social.commentsOpen}
      />
      <LikeButton
        liked={social.liked}
        count={social.likeCount}
        onToggle={social.handleLike}
        animating={social.likeAnimating}
      />
      <FavoriteButton
        favorited={social.favorited}
        count={social.favoriteCount}
        onToggle={social.handleFavorite}
        animating={social.favoriteAnimating}
      />
      <ActionButton
        icon={isFullscreen ? <Minimize2 className="size-6" /> : <Maximize2 className="size-6" />}
        label={isFullscreen ? "Exit" : "Expand"}
        onClick={toggleFullscreen}
      />
    </>
  );

  const isKnownGame =
    isSimpleAgentGame ||
    isNeonSudoku ||
    generatedPackageMatches ||
    Boolean(customGame) ||
    gameTemplates.some((candidate: any) => candidate.id === gameId);

  if (!isKnownGame && (publicLoadState === "idle" || publicLoadState === "loading")) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-[#f3f0e8] text-black">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-black" />
          <p className="label-mono mt-4 text-sm">Loading published game...</p>
        </div>
      </div>
    );
  }

  if (!isKnownGame && publicLoadState === "not-found") {
    return (
      <div className="grid h-[100dvh] place-items-center bg-[#f3f0e8] px-6 text-black">
        <div className="max-w-md text-center">
          <MessageSquareWarning className="mx-auto size-12 text-black/40" />
          <h1 className="mt-5 font-display text-3xl font-black uppercase">Game unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-[#55534d]">
            This link does not exist, or the creator has not published the game yet.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-none border-2 border-black bg-primary px-5 py-3 text-xs font-black uppercase tracking-wider text-black transition-all hover:shadow-[3px_3px_0_#101010]"
          >
            Browse games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-56px)] lg:h-[100dvh] w-full bg-[#f3f0e8] overflow-hidden touch-none text-black">
      {isCustomCreation && !isShareable && (
        <div className="absolute left-1/2 top-3 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-none border-2 border-black bg-primary px-4 py-2 text-xs font-black uppercase text-black shadow-[3px_3px_0_#101010]">
          Draft preview
          <Link
            to="/edit/$gameId"
            params={{ gameId }}
            className="rounded-none border-2 border-black bg-black px-3 py-1 text-[10px] font-black uppercase text-[#b9ff2c]"
          >
            Publish
          </Link>
        </div>
      )}
      {/* Navigation Arrows for Desktop (Moved to right) */}
      <div className={`absolute right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-4 transition-opacity duration-300 ${isUiHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <button
          type="button"
          onClick={triggerPrevGame}
          className="grid size-12 place-items-center rounded-none border-2 border-black bg-white text-black transition-all hover:shadow-[3px_3px_0_#101010] active:scale-90"
          aria-label="Previous game"
        >
          <ArrowUp size={24} />
        </button>
        <button
          type="button"
          onClick={triggerNextGame}
          className="grid size-12 place-items-center rounded-none border-2 border-black bg-white text-black transition-all hover:shadow-[3px_3px_0_#101010] active:scale-90"
          aria-label="Next game"
        >
          <ArrowDown size={24} />
        </button>
      </div>

      {/* (Old Right Sidebar removed, moved to Game Container wrapper) */}

      <main
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        className="absolute inset-0 h-full w-full select-none cursor-grab active:cursor-grabbing"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradientClass[gradientForId(template.id)]} opacity-[0.08]`}
        />
        <img
          src={game?.thumbnailUrl || getThumbnailUrl(template.id)}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="absolute inset-0 h-full w-full object-cover opacity-10 blur-2xl"
        />
        
        {/* Game Container Wrapper */}
        <div className={`absolute inset-0 pb-[60px] lg:pb-0 z-10 flex items-center justify-center pointer-events-none transition-all duration-500 ease-out ${leaderboardOpen ? "lg:pr-[420px]" : ""}`}>
          <div className="relative flex items-center justify-center w-full h-full lg:w-auto lg:h-full">
            <div
              ref={frameRef}
              className={`relative feed-game-frame w-full h-full rounded-b-3xl overflow-hidden pointer-events-auto lg:w-[400px] lg:h-full lg:rounded-none lg:shadow-[8px_8px_0_#101010] lg:border-2 lg:border-black ${
                engine === "construct"
                  ? "feed-game-frame--construct"
                  : "feed-game-frame--canvas"
              } ${leaderboardOpen ? "feed-game-frame--leaderboard-open" : ""}`}
            >
              <div className={`w-full h-full lg:h-[calc(100%-76px)] lg:pointer-events-auto ${!isGameActive ? "pointer-events-none" : ""}`}>
                {isNeonSudoku ? (
                  <NeonSudokuGame onScoreSubmit={handleScoreSubmit} />
                ) : isSimpleAgentGame ? (
                  <SimpleAgentGame onScoreSubmit={handleScoreSubmit} />
                ) : engine === "construct" ? (
                  <Html5Preview templateId={template.id} />
                ) : (
                  <GamePreview gamePackage={pkg} onScoreSubmit={handleScoreSubmit} />
                )}
              </div>

              {/* Play Button Overlay (Mobile/Tablet only) */}
              {!isGameActive && (
                <div 
                  className="absolute inset-0 z-20 flex lg:hidden items-center justify-center bg-black/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGameActive(true);
                  }}
                >
                  <div className="grid size-20 place-items-center rounded-none bg-primary text-black shadow-[4px_4px_0_#101010] transition-transform active:scale-95 border-2 border-black">
                    <Play size={40} className="ml-2 fill-current" />
                  </div>
                </div>
              )}
              {/* Desktop Creator Bar (Bottom of Game Frame) */}
              <div className="absolute bottom-0 left-0 right-0 h-[76px] px-4 bg-[#f3f0e8] hidden lg:flex items-center justify-between z-30 border-t-2 border-black">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-none border-2 border-black bg-primary font-display text-sm font-black text-black">
                    {profile.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black">{profile.name}</p>
                    <p className="label-mono text-[10px] text-[#55534d]">Browse their games</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isFullscreen && (
                    <button
                      onClick={toggleFullscreen}
                      className="grid size-8 place-items-center rounded-none border-2 border-black bg-white text-black transition-all hover:shadow-[3px_3px_0_#101010]"
                      title="Exit Fullscreen"
                    >
                      <Minimize2 className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsFollowing(!isFollowing)}
                    className="rounded-none border-2 border-black bg-black px-4 py-1.5 text-xs font-black uppercase tracking-wide text-[#b9ff2c] transition-all hover:shadow-[3px_3px_0_#101010]"
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Right Actions (Floating next to game frame) */}
            <aside className={`hidden lg:flex flex-col items-center gap-6 ml-6 pb-6 pointer-events-auto transition-opacity duration-300 ${isUiHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
              {socialButtons}
            </aside>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-[60px] bg-[#f3f0e8] border-t-2 border-black flex lg:hidden items-center justify-between px-4 z-40 transition-opacity duration-300`}>
         <div className="flex items-center gap-4">
           <div className="relative">
              <div className="grid size-8 shrink-0 place-items-center rounded-none border-2 border-black bg-primary font-display text-sm font-black text-black">
                {profile.avatar}
              </div>
              <button onClick={() => setIsFollowing(!isFollowing)} className="absolute -bottom-1 -right-1 size-4 bg-black rounded-none flex items-center justify-center text-[#b9ff2c]">
                 {isFollowing ? <Check size={10} /> : <Plus size={10} strokeWidth={3} />}
              </button>
           </div>
           <button onClick={() => window.location.reload()} className="text-black">
             <RotateCcw size={20} strokeWidth={2.5} />
           </button>
         </div>

         <div className="flex items-center gap-5 text-black">
            <button onClick={social.handleLike} className="label-mono flex items-center gap-1.5 text-[11px]">
              <Heart size={20} className={social.liked ? "fill-[#ff5b42] text-[#ff5b42]" : ""} /> {formatCount(social.likeCount)}
            </button>
            <button onClick={() => social.setCommentsOpen(true)} className="label-mono flex items-center gap-1.5 text-[11px]">
              <MessageCircle size={20} /> {formatCount(social.commentCount)}
            </button>
            <button onClick={social.handleFavorite}>
              <Bookmark size={20} className={social.favorited ? "fill-[#b9ff2c] text-black" : ""} />
            </button>
            <button
              onClick={() => isShareable && social.setShareMenuOpen(true)}
              disabled={!isShareable}
              className="disabled:opacity-35"
            >
              <Send size={20} />
            </button>
            <button onClick={() => setLeaderboardOpen(true)}>
              <Trophy size={20} className={leaderboardOpen ? "text-[#ff5b42]" : ""} />
            </button>
            <button onClick={() => setDetailsModalOpen(true)}>
              <MoreVertical size={20} />
            </button>
         </div>
      </div>

      {/* Details Modal */}
      <DetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        template={template}
        profile={profile}
        social={social}
        pkg={pkg}
        generatedPackageMatches={generatedPackageMatches}
        isFollowing={isFollowing}
        setIsFollowing={setIsFollowing}
      />

      {/* Comments Panel */}
      <CommentsPanel
        open={social.commentsOpen}
          onClose={() => social.setCommentsOpen(false)}
          comments={social.comments}
          loading={social.commentsLoading}
          onAdd={social.handleAddComment}
          onDelete={social.handleDeleteComment}
          onLoadMore={social.loadMoreComments}
          hasMore={social.hasMoreComments}
          count={social.commentCount}
        />

      {leaderboardOpen && (
        <>
          <div
            className="fixed inset-0 z-[65] bg-black/80 backdrop-blur-sm animate-in fade-in lg:hidden"
            onClick={() => setLeaderboardOpen(false)}
          />
          <div className="fixed z-[70] flex flex-col bg-[#f3f0e8] shadow-[8px_8px_0_#101010] transition-all inset-x-0 bottom-0 max-h-[90vh] w-full rounded-none border-t-2 border-black animate-in slide-in-from-bottom p-6 pb-8 lg:top-0 lg:bottom-0 lg:right-0 lg:left-auto lg:w-[min(420px,calc(100vw-92px))] lg:max-h-screen lg:rounded-none lg:border-l-2 lg:border-t-0 lg:border-black lg:bg-[#f3f0e8] lg:animate-in lg:slide-in-from-right lg:pb-6">
            <div className="mx-auto mb-6 h-1.5 w-12 shrink-0 rounded-none bg-black/40 lg:hidden" />
            <div className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <LeaderboardPanel
                template={template}
                entries={leaderboard.entries}
                loading={leaderboard.loading}
                onClose={() => setLeaderboardOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Interactive Buttons
// ═══════════════════════════════════════════════════════════════════════════

function ActionButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex min-w-12 flex-col items-center gap-1.5 text-black transition-transform active:scale-90 lg:min-w-12"
    >
      <span
        className={`grid size-11 place-items-center rounded-none border-2 border-black text-black transition-all lg:size-10 ${
          active ? "bg-primary shadow-[3px_3px_0_#101010]" : "bg-white group-hover:shadow-[3px_3px_0_#101010]"
        }`}
      >
        <div className="scale-75">{icon}</div>
      </span>
      <span className="label-mono text-[10px]">{label}</span>
    </button>
  );
}

function FollowSidebarButton({
  following,
  onToggle,
}: {
  following: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`group flex min-w-12 flex-col items-center gap-1.5 transition-transform active:scale-90 lg:min-w-12 ${following ? "text-black/55" : "text-black"}`}
    >
      <span
        className={`grid size-11 place-items-center rounded-none border-2 border-black text-black transition-all duration-200 lg:size-10 ${
          following
            ? "bg-white group-hover:shadow-[3px_3px_0_#101010]"
            : "bg-[#ff5b42] shadow-[3px_3px_0_#101010]"
        }`}
      >
        {following ? (
          <Check className="size-5" />
        ) : (
          <UserPlus className="size-5" />
        )}
      </span>
      <span className="label-mono text-[10px]">
        {following ? "Following" : "Follow"}
      </span>
    </button>
  );
}

function LikeButton({
  liked,
  count,
  onToggle,
  animating,
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
  animating: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className="group flex min-w-12 flex-col items-center gap-1.5 transition-transform active:scale-90 lg:min-w-12"
    >
      <span
        className={`grid size-11 place-items-center rounded-none border-2 border-black transition-all lg:size-10 ${
          liked ? "bg-[#ff5b42] shadow-[3px_3px_0_#101010]" : "bg-white group-hover:shadow-[3px_3px_0_#101010]"
        }`}
      >
        <Heart
          className={`size-5 text-black transition-all ${
            liked ? "fill-black" : ""
          } ${animating ? "scale-125" : "scale-100"}`}
        />
      </span>
      <span
        className={`label-mono text-[10px] ${liked ? "text-[#ff5b42]" : "text-black"}`}
      >
        {count > 0 ? formatCount(count) : "Like"}
      </span>
    </button>
  );
}

function FavoriteButton({
  favorited,
  count,
  onToggle,
  animating,
}: {
  favorited: boolean;
  count: number;
  onToggle: () => void;
  animating: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className="group flex min-w-12 flex-col items-center gap-1.5 transition-transform active:scale-90 lg:min-w-12"
    >
      <span
        className={`grid size-11 place-items-center rounded-none border-2 border-black transition-all lg:size-10 ${
          favorited
            ? "bg-primary shadow-[3px_3px_0_#101010]"
            : "bg-white group-hover:shadow-[3px_3px_0_#101010]"
        }`}
      >
        {favorited ? (
          <BookmarkCheck
            className={`size-5 text-black transition-all ${animating ? "scale-125" : "scale-100"}`}
          />
        ) : (
          <Bookmark className="size-5 text-black" />
        )}
      </span>
      <span
        className={`label-mono text-[10px] ${favorited ? "text-[#5a8a00]" : "text-black"}`}
      >
        {count > 0 ? formatCount(count) : "Favorite"}
      </span>
    </button>
  );
}

function ShareButton({
  count,
  open,
  onToggle,
  onShare,
  template,
  game,
  gameId,
  disabled = false,
}: {
  count: number;
  open: boolean;
  onToggle: () => void;
  onShare: (platform?: SharePlatform) => Promise<void>;
  template: any;
  game?: any;
  gameId?: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Link to THIS game (its real id), honoring the app's base path (/studio/).
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/?$/, "/");
  const path = `${base}play/${gameId ?? template.id}`;
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setToastMessage("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setToastMessage(""), 3000);
      await onShare("link");
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  const handlePlatformClick = async (platform: SharePlatform) => {
    await onShare(platform);
    if (platform === "discord" || platform === "instagram") {
      setToastMessage(
        platform === "discord"
          ? "Link copied! Paste it in Discord."
          : "Link copied! Ready to share on Instagram.",
      );
      setTimeout(() => setToastMessage(""), 3000);
    } else {
      onToggle(); // Close modal for other redirect shares
    }
  };

  const platforms = [
    {
      label: "Copy Link",
      platform: "link" as const,
      icon: (
        <svg
          className="size-6 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
          />
        </svg>
      ),
      bgClass: "bg-black hover:bg-[#2a2a2a]",
      action: handleCopy,
    },
    {
      label: "X (Twitter)",
      platform: "twitter" as const,
      icon: (
        <svg className="size-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      bgClass: "bg-black hover:bg-[#2a2a2a]",
      action: () => handlePlatformClick("twitter"),
    },
    {
      label: "WhatsApp",
      platform: "whatsapp" as const,
      icon: (
        <svg className="size-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
        </svg>
      ),
      bgClass: "bg-[#25D366] hover:bg-[#20ba59]",
      action: () => handlePlatformClick("whatsapp"),
    },
    {
      label: "Discord",
      platform: "discord" as const,
      icon: (
        <svg className="size-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.46-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 01-1.873-.894.077.077 0 01-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 01.077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 01.078.009c.12.099.246.195.373.289a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03a.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
        </svg>
      ),
      bgClass: "bg-[#5865F2] hover:bg-[#4752c4]",
      action: () => handlePlatformClick("discord"),
    },
    {
      label: "Instagram",
      platform: "instagram" as const,
      icon: (
        <svg
          className="size-6 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      ),
      bgClass:
        "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:opacity-90",
      action: () => handlePlatformClick("instagram"),
    },
    {
      label: "Telegram",
      platform: "telegram" as const,
      icon: (
        <svg className="size-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.61l-1.91 9c-.14.65-.53.81-1.08.5l-2.91-2.15-1.4 1.35c-.15.15-.28.28-.58.28l.2-2.94 5.35-4.83c.23-.2-.05-.32-.36-.12l-6.62 4.17-2.85-.89c-.62-.19-.63-.62.13-.91l11.13-4.29c.51-.19.96.11.8.88z" />
        </svg>
      ),
      bgClass: "bg-[#26A5E4] hover:bg-[#2295ce]",
      action: () => handlePlatformClick("telegram"),
    },
    {
      label: "Email",
      platform: "email" as const,
      icon: (
        <svg
          className="size-6 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
      ),
      bgClass: "bg-black hover:bg-[#2a2a2a]",
      action: () => handlePlatformClick("email"),
    },
  ];

  const shareDialog =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onToggle}
          >
            <div
              className="relative w-full max-w-md overflow-hidden rounded-none border-2 border-black bg-white p-6 shadow-[8px_8px_0_#101010] animate-in zoom-in-95 duration-200"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                onClick={onToggle}
                title="Close"
                className="absolute right-4 top-4 grid size-9 place-items-center rounded-none border-2 border-black bg-white text-black transition hover:bg-primary"
              >
                <X className="size-5" />
              </button>

              <h3 className="mb-5 font-display text-xl font-black uppercase text-black">Share this game</h3>

              <div className="mb-6 flex items-center gap-4 rounded-none border-2 border-black bg-[#f3f0e8] p-4">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-none border-2 border-black bg-white text-3xl">
                  <img
                    src={game?.thumbnailUrl || getThumbnailUrl(gameId ?? template.id)}
                    alt={game?.title ?? template.name}
                    onError={(event) => {
                      // missing cover: show the emoji tile instead of a broken icon
                      event.currentTarget.style.display = "none";
                      const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = "block";
                    }}
                    className="size-full object-cover"
                  />
                  <span style={{ display: "none" }}>{templateEmoji[template.id] || "🎮"}</span>
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-base font-black text-black">{game?.title ?? template.name}</h4>
                  <p className="label-mono truncate text-xs uppercase text-[#55534d]">
                    {game?.category ?? template.category} - HTML5 Game
                  </p>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-4 gap-3">
                {platforms.map((platform) => (
                  <button
                    key={platform.platform}
                    onClick={platform.action}
                    className="group flex min-w-0 flex-col items-center gap-2"
                  >
                    <span
                      className={`grid size-12 place-items-center rounded-none border-2 border-black transition-all group-hover:shadow-[3px_3px_0_#101010] ${platform.bgClass}`}
                    >
                      {platform.icon}
                    </span>
                    <span className="label-mono w-full truncate text-center text-[10px] text-[#55534d] group-hover:text-black">
                      {platform.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t-2 border-black pt-5">
                <label className="label-mono mb-2 block text-[10px] uppercase text-[#55534d]">
                  Direct Link
                </label>
                <div className="flex items-center gap-2 rounded-none border-2 border-black bg-[#f3f0e8] p-1.5 pl-3">
                  <input
                    type="text"
                    readOnly
                    value={url}
                    className="min-w-0 flex-1 bg-transparent font-mono text-xs text-black outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-none border-2 border-black bg-primary px-4 py-2.5 text-xs font-black uppercase text-black transition-all hover:shadow-[3px_3px_0_#101010]"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {toastMessage && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-none border-2 border-black bg-primary px-4 py-2 text-xs font-black text-black shadow-[3px_3px_0_#101010]">
                  {toastMessage}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && onToggle()}
        disabled={disabled}
        title={disabled ? "Publish this game before sharing it" : "Share game"}
        data-testid="share-button"
        className="group flex min-w-12 flex-col items-center gap-1.5 text-black transition-transform active:scale-90 disabled:cursor-not-allowed disabled:opacity-35 lg:min-w-12"
      >
        <span
          className={`grid size-11 place-items-center rounded-none border-2 border-black text-black transition-all lg:size-10 ${
            open ? "bg-primary shadow-[3px_3px_0_#101010]" : "bg-white group-hover:shadow-[3px_3px_0_#101010]"
          }`}
        >
          <Send className="size-5" />
        </span>
        <span className="label-mono text-[10px]">
          {count > 0 ? formatCount(count) : "Share"}
        </span>
      </button>

      {shareDialog}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Comments Panel (slide-up drawer)
// ═══════════════════════════════════════════════════════════════════════════

function CommentsPanel({
  open,
  onClose,
  comments,
  loading,
  onAdd,
  onDelete,
  onLoadMore,
  hasMore,
  count,
}: {
  open: boolean;
  onClose: () => void;
  comments: { _id: string; userId: string; username: string; text: string; createdAt: string }[];
  loading: boolean;
  onAdd: (text: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  count: number;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUserId = useRef(localStorage.getItem("kult_anon_uid") ?? "").current;

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setText("");
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }, [text, submitting, onAdd]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[70vh] flex-col rounded-none border-t-2 border-black bg-[#f3f0e8] shadow-[0_-8px_0_#101010] animate-in slide-in-from-bottom lg:inset-x-auto lg:left-1/2 lg:w-full lg:max-w-[560px] lg:-translate-x-1/2 lg:border-2 lg:border-black lg:shadow-[8px_8px_0_#101010]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b-2 border-black px-5 py-4">
          <h2 className="font-display text-lg font-black uppercase text-black">
            Comments
            {count > 0 && (
              <span className="label-mono ml-2 text-sm text-[#55534d]">
                ({formatCount(count)})
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-none border-2 border-black bg-white text-black transition hover:bg-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && comments.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-black/40" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center">
              <MessageCircle className="mx-auto mb-3 size-10 text-black/20" />
              <p className="text-sm font-bold text-[#55534d]">No comments yet</p>
              <p className="mt-1 text-xs text-[#55534d]/70">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c._id} className="group flex gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-none border-2 border-black bg-primary text-xs font-black text-black">
                    {c.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-black">{c.username}</span>
                      <span className="label-mono text-[10px] text-[#55534d]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-[#33312c] break-words">{c.text}</p>
                  </div>
                  {c.userId === currentUserId && (
                    <button
                      onClick={() => onDelete(c._id)}
                      className="mt-1 hidden shrink-0 rounded-none p-1.5 text-black/40 transition hover:bg-[#ff5b42] hover:text-black group-hover:block"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  className="label-mono mx-auto flex items-center gap-2 rounded-none border-2 border-black bg-white px-5 py-2 text-xs text-black transition hover:bg-primary disabled:opacity-50"
                >
                  {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Load more
                </button>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t-2 border-black px-4 pt-3 pb-6 sm:pb-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Add a comment..."
              maxLength={2000}
              className="flex-1 rounded-none border-2 border-black bg-white px-4 py-2.5 text-sm text-black placeholder-[#55534d] outline-none transition focus:shadow-[3px_3px_0_#101010]"
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="grid size-10 shrink-0 place-items-center rounded-none border-2 border-black bg-primary text-black transition-all hover:shadow-[3px_3px_0_#101010] disabled:opacity-30"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Details Modal
// ═══════════════════════════════════════════════════════════════════════════

function DetailsModal({
  open,
  onClose,
  template,
  profile,
  social,
  pkg,
  generatedPackageMatches,
  isFollowing,
  setIsFollowing,
}: any) {
  if (!open) return null;

  const title = generatedPackageMatches ? pkg.title : template.name;
  const description = generatedPackageMatches ? pkg.gameplay?.mechanic : template.mechanic;
  // The game's own cover when it has one, else the template cover.
  const thumbnailSrc = (pkg as any)?.thumbnailUrl || getThumbnailUrl(template.id);

  return (
    <>
      <div
        className="fixed inset-0 z-[65] bg-black/80 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[90vh] flex-col rounded-none border-t-2 border-black bg-[#f3f0e8] shadow-[0_-8px_0_#101010] animate-in slide-in-from-bottom lg:inset-x-auto lg:left-1/2 lg:w-full lg:max-w-[560px] lg:-translate-x-1/2 lg:border-2 lg:border-black lg:shadow-[8px_8px_0_#101010] p-6 pb-8">

        {/* Drag handle */}
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-none bg-black/40" />

        <div className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Thumbnail Image */}
          <div className="relative mb-6 w-full overflow-hidden rounded-none border-2 border-black bg-white aspect-[4/3] sm:aspect-video">
            <img
              src={thumbnailSrc}
              alt={title}
              onError={(event) => {
                event.currentTarget.style.display = "none";
                const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "grid";
              }}
              className="size-full object-cover"
            />
            <div style={{ display: "none" }} className="size-full place-items-center text-6xl">
              {templateEmoji[template.id] || "🎮"}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-none border-2 border-black bg-primary px-2.5 py-1 text-xs font-black text-black">
              <Play size={12} className="fill-black" /> {formatCount(social.likeCount + 15200)}
            </div>

            <h2 className="absolute bottom-4 left-4 font-display text-3xl font-black uppercase text-white drop-shadow-[2px_2px_0_#000]">
              {title}
            </h2>
          </div>

          {/* Profile Row */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="grid size-10 place-items-center rounded-none border-2 border-black bg-primary font-display font-black text-black">
                  {profile.avatar}
                </div>
                <button
                  onClick={() => setIsFollowing(!isFollowing)}
                  className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-none bg-black text-[#b9ff2c]"
                >
                  {isFollowing ? <Check size={10} /> : <Plus size={10} strokeWidth={3} />}
                </button>
              </div>
              <span className="font-bold text-black text-base">@{profile.name}</span>
            </div>
            <button className="flex items-center gap-2 rounded-none border-2 border-black bg-black px-4 py-2 text-sm font-black uppercase text-[#b9ff2c] transition-all hover:shadow-[3px_3px_0_#101010]">
              <Shuffle size={16} /> Remix
            </button>
          </div>

          {/* Description */}
          <div className="mb-8 text-sm leading-relaxed text-[#33312c] font-medium">
            <p><strong className="text-black">**Description:**</strong> {description}</p>
            <p className="mt-2 text-[#55534d]">---</p>
          </div>

          {/* Circular Action Buttons */}
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col items-center gap-2">
              <button onClick={social.handleLike} className={`grid size-14 place-items-center rounded-none border-2 border-black transition-all active:scale-95 hover:shadow-[3px_3px_0_#101010] ${social.liked ? "bg-[#ff5b42]" : "bg-white"}`}>
                <Heart size={24} className={social.liked ? "fill-black text-black" : "text-black"} />
              </button>
              <span className="label-mono text-[11px] text-black">{formatCount(social.likeCount)}</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button onClick={() => { onClose(); social.setCommentsOpen(true); }} className="grid size-14 place-items-center rounded-none border-2 border-black bg-white transition-all active:scale-95 hover:shadow-[3px_3px_0_#101010]">
                <MessageCircle size={24} className="text-black" />
              </button>
              <span className="label-mono text-[11px] text-black">{formatCount(social.commentCount)}</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button onClick={social.handleFavorite} className={`grid size-14 place-items-center rounded-none border-2 border-black transition-all active:scale-95 hover:shadow-[3px_3px_0_#101010] ${social.favorited ? "bg-primary" : "bg-white"}`}>
                <Bookmark size={24} className={social.favorited ? "fill-black text-black" : "text-black"} />
              </button>
              <span className="label-mono text-[11px] text-black">Favorite</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button onClick={() => { onClose(); social.setShareMenuOpen(true); }} className="grid size-14 place-items-center rounded-none border-2 border-black bg-white transition-all active:scale-95 hover:shadow-[3px_3px_0_#101010]">
                <Send size={24} className="text-black" />
              </button>
              <span className="label-mono text-[11px] text-black">Share</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button className="grid size-14 place-items-center rounded-none border-2 border-black bg-white transition-all active:scale-95 hover:shadow-[3px_3px_0_#101010]">
                <MessageSquareWarning size={24} className="text-black" />
              </button>
              <span className="label-mono text-[11px] text-black">Feedback</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Feed Navigation
// ═══════════════════════════════════════════════════════════════════════════

function FeedLink({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <Link
      to="/play/$gameId"
      params={{ gameId: to }}
      aria-label={label}
      title={label}
      className="grid size-16 place-items-center rounded-none border-2 border-black bg-white text-black transition-all hover:shadow-[3px_3px_0_#101010]"
    >
      {icon}
    </Link>
  );
}
