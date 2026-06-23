import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/studio/PageHeader";
import { GameCard } from "@/components/studio/GameCard";
import { type Game } from "@/lib/games-data";
import { templateEmoji, gradientForId, getThumbnailUrl, resolveGameThumbnail } from "@/lib/studio-meta";
import { fetchCreatorStats, type CreatorStats } from "@/lib/api/social";
import { getCurrentUserId, getCurrentUsername, getWalletAddress } from "@/lib/identity";
import { api } from "@/lib/api";
import { gameTemplates } from "@/lib/templates";
import { useStudioContext } from "@/context/StudioContext";
import {
  MapPin,
  Link2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Heart,
  Bookmark,
  Send,
  MessageSquare,
  Rocket,
  Gamepad2,
  Loader2,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  fetchUserActivities,
  fetchUserFavorites,
  fetchUserLikes,
  type UserActivity,
} from "@/lib/api/social";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Web3 Game Studio" },
      { name: "description", content: "Your creator profile, stats, and published games." },
    ],
  }),
  component: Profile,
});

const activityIcons: Record<string, any> = {
  like: Heart,
  favorite: Bookmark,
  share: Send,
  comment: MessageSquare,
  create: Rocket,
  play: Gamepad2,
};

const activityColors: Record<string, string> = {
  like: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  favorite: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  share: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  comment: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  create: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  play: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
};

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface GameRowProps {
  title: string;
  games: Game[];
  emptyMessage: React.ReactNode;
  /** Adds an edit (pencil) button to each card — used by My Games only. */
  onEditGame?: (game: Game) => void;
}

function GameRow({ title, games, emptyMessage, onEditGame }: GameRowProps) {
  const [showAll, setShowAll] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    dragFree: true,
    loop: false,
    containScroll: "trimSnaps",
    skipSnaps: true,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const viewport = emblaApi.rootNode();
    const handleWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 2) return;
      viewport.scrollLeft += delta;
      event.preventDefault();
    };
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [emblaApi]);

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-black">{title}</h2>
        {games.length > 0 && (
          <div className="flex items-center gap-2">
            {!showAll && (
              <div className="flex items-center gap-1">
                <button
                  onClick={scrollPrev}
                  title={`Previous ${title}`}
                  className="grid size-8 place-items-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-primary/50 hover:text-primary active:scale-95"
                >
                  <ChevronLeft className="size-4.5" />
                </button>
                <button
                  onClick={scrollNext}
                  title={`Next ${title}`}
                  className="grid size-8 place-items-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-primary/50 hover:text-primary active:scale-95"
                >
                  <ChevronRight className="size-4.5" />
                </button>
              </div>
            )}
            <button
              onClick={() => setShowAll(!showAll)}
              className="ml-2 flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-secondary/60 hover:text-primary-foreground"
            >
              {showAll ? "Show less" : "View all"} <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {games.length > 0 ? (
        showAll ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {games.map((g, i) => (
              <GameCard key={g.title + i} game={g} index={i} onEdit={onEditGame} />
            ))}
          </div>
        ) : (
          <div ref={emblaRef} className="mt-5 cursor-grab overflow-hidden select-none active:cursor-grabbing">
            <div className="flex touch-pan-y gap-4">
              {games.map((g, i) => (
                <div key={g.title + i} className="flex-[0_0_240px] sm:flex-[0_0_280px] min-w-0">
                  <GameCard game={g} index={i} onEdit={onEditGame} />
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

type TimeFilter = "today" | "week" | "month" | "all";

function Profile() {
  const navigate = useNavigate();
  const { createdGames } = useStudioContext();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  // Real info (title, cover, views) for any game referenced by likes,
  // favorites, or history — fetched from the backend, never guessed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gameInfo, setGameInfo] = useState<Record<string, any>>({});
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [likedGames, setLikedGames] = useState<Game[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const getThumbnail = useCallback((id: string | undefined, fallbackUrl?: string) => {
    if (!id) return fallbackUrl;
    return getThumbnailUrl(id);
  }, []);

  const formatViews = (views: number | undefined): string => {
    if (!views) return "—";
    return views >= 1000 ? `${(views / 1000).toFixed(1)}K` : String(views);
  };

  const mapActivityToGame = useCallback((gameId: string, gameTitle: string): Game => {
    // 1) the user's own creations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customGame = createdGames.find((cg: any) => cg.id === gameId || cg.templateId === gameId);
    if (customGame) {
      return {
        title: customGame.title,
        category: customGame.category ?? "Game",
        plays: formatViews(customGame.views),
        emoji: templateEmoji[customGame.templateId] ?? "🎮",
        gradient: gradientForId(customGame.templateId ?? customGame.id),
        creator: "you",
        thumbnailUrl: resolveGameThumbnail(customGame),
        templateId: customGame.id ?? customGame.templateId,
      };
    }

    // 2) other creators' games — real record fetched from the backend
    const remote = gameInfo[gameId];
    if (remote) {
      return {
        title: remote.title,
        category: remote.category ?? "Game",
        plays: formatViews(remote.views),
        emoji: templateEmoji[remote.templateId] ?? "🎮",
        gradient: gradientForId(remote.templateId ?? remote.id),
        creator: remote.creatorId?.startsWith("0x")
          ? `${remote.creatorId.slice(0, 6)}…${remote.creatorId.slice(-4)}`
          : "community",
        thumbnailUrl: resolveGameThumbnail(remote),
        templateId: remote.id,
      };
    }

    // 3) platform templates (gameId IS the template id)
    const template = gameTemplates.find((t: any) => t.id === gameId);
    if (template) {
      return {
        title: template.name,
        category: template.category ?? "Game",
        plays: "—",
        emoji: templateEmoji[gameId] ?? "🎮",
        gradient: gradientForId(gameId),
        creator: "studio",
        thumbnailUrl: getThumbnail(gameId),
        templateId: gameId,
      };
    }

    // 4) deleted/unknown game — show only what was truthfully recorded
    return {
      title: gameTitle || "Removed game",
      category: "Game",
      plays: "—",
      emoji: "🎮",
      gradient: gradientForId(gameId),
      creator: "—",
      thumbnailUrl: getThumbnail(gameId),
      templateId: gameId,
    };
  }, [createdGames, gameInfo, getThumbnail]);

  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    const uid = getCurrentUserId();

    Promise.allSettled([
      fetchUserActivities(uid).then((data) => setActivities(data ?? [])),
      fetchUserFavorites(uid).then((data) => {
        if (data && Array.isArray(data.favorites)) setFavoriteIds(data.favorites.map((f) => f.gameId));
      }),
      fetchUserLikes(uid).then((data) => {
        if (data && Array.isArray(data.likes)) setLikedIds(data.likes.map((l) => l.gameId));
      }),
    ]).finally(() => setActivitiesLoading(false));
  }, []);

  // Resolve REAL records for every game referenced by likes/favorites/history.
  useEffect(() => {
    const referenced = new Set<string>([...likedIds, ...favoriteIds]);
    for (const act of activities) {
      if (act.gameId) referenced.add(act.gameId);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const known = new Set<string>([
      ...createdGames.map((g: any) => g?.id),
      ...gameTemplates.map((t: any) => t.id),
    ]);
    const missing = [...referenced].filter((id) => id && !known.has(id));
    if (missing.length === 0) return;
    api
      .get("/games/list", { params: { ids: missing.join(","), limit: 100 } })
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const map: Record<string, any> = {};
        for (const g of res.data?.games ?? []) map[g.id] = g;
        setGameInfo(map);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likedIds, favoriteIds, activities]);

  useEffect(() => {
    setLikedGames(likedIds.map((id) => mapActivityToGame(id, "")));
    setFavoriteGames(favoriteIds.map((id) => mapActivityToGame(id, "")));
  }, [likedIds, favoriteIds, mapActivityToGame]);

  const games: Game[] = createdGames
    .filter((g: any, i: number, all: any[]) => !g?.id || all.findIndex((x: any) => x?.id === g.id) === i)
    .map((g: any) => ({
      title: g.title,
      category: g.category ?? "Game",
      plays: g.views ? (g.views >= 1000 ? `${(g.views / 1000).toFixed(1)}K` : String(g.views)) : "New",
      emoji: templateEmoji[g.templateId] ?? "🎮",
      gradient: gradientForId(g.templateId ?? g.id),
      creator: "you",
      thumbnailUrl: resolveGameThumbnail(g),
      templateId: g.id ?? g.templateId,
    }));

  // Extract history games (played or created) from activities
  const historyGamesMap = new Map<string, string>();
  activities.forEach((act) => {
    if (act.gameId && (act.activityType === "play" || act.activityType === "create")) {
      if (!historyGamesMap.has(act.gameId)) {
        historyGamesMap.set(act.gameId, act.gameTitle || "");
      }
    }
  });
  const historyGames: Game[] = Array.from(historyGamesMap.entries()).map(([gameId, title]) =>
    mapActivityToGame(gameId, title)
  );

  const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null);
  useEffect(() => {
    fetchCreatorStats(getCurrentUserId()).then(setCreatorStats).catch(() => {});
  }, []);

  const formatStat = (value: number | undefined) => {
    const n = value ?? 0;
    return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  };
  const wallet = getWalletAddress();
  const displayName = getCurrentUsername();
  // Joined date from the earliest real record we have (creation or activity).
  const timestamps: number[] = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...createdGames.map((g: any) => new Date(g?.createdAt ?? NaN).getTime()),
    ...activities.map((a) => new Date(a.timestamp).getTime()),
  ].filter((t) => Number.isFinite(t));
  const joined =
    timestamps.length > 0
      ? new Date(Math.min(...timestamps)).toLocaleDateString(undefined, { month: "short", year: "numeric" })
      : null;

  const stats = [
    { label: "Games", value: String(createdGames.length) },
    { label: "Plays", value: formatStat(creatorStats?.plays) },
    { label: "Followers", value: formatStat(creatorStats?.followers) },
    { label: "Likes", value: formatStat(creatorStats?.likes) },
  ];

  const filteredActivities = activities.filter((activity) => {
    const actDate = new Date(activity.timestamp);
    const now = new Date();
    
    if (timeFilter === "today") {
      return actDate.toDateString() === now.toDateString();
    }
    
    const diffTime = now.getTime() - actDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (timeFilter === "week") {
      return diffDays <= 7;
    }
    if (timeFilter === "month") {
      return diffDays <= 30;
    }
    return true;
  });

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your creator identity · Published games" />
      <div className="px-6 py-8 lg:px-10">
        <div className="animate-float-up overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
          <div className="h-32 bg-gradient-to-r from-[oklch(0.72_0.27_340)] via-[oklch(0.65_0.25_295)] to-[oklch(0.82_0.16_195)]" />
          <div className="px-6 pb-6">
            <div className="-mt-12 flex items-end justify-between">
              <div className="flex size-24 items-center justify-center rounded-2xl border-4 border-card bg-secondary text-5xl">🎮</div>
            </div>
            <h2 className="mt-4 font-display text-2xl font-black">
              {displayName}
            </h2>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-mono">
                <Link2 className="size-3.5" />
                {wallet ?? "Not connected — local creator profile"}
              </span>
              {joined && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Joined {joined}
                </span>
              )}
            </div>
            <div className="mt-6 grid grid-cols-4 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-border/60 bg-background/40 p-3 text-center">
                  <p className="font-display text-lg font-black">{s.value}</p>
                  <p className="label-mono text-[8px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* My Games Row */}
        <GameRow
          title="My Games"
          games={games}
          onEditGame={(g) => {
            if (g.templateId) navigate({ to: "/edit/$gameId", params: { gameId: g.templateId } });
          }}
          emptyMessage={
            <>
              No games yet. Head to <span className="text-primary font-bold">Create</span> to generate your first playable build.
            </>
          }
        />

        {/* History Row */}
        <GameRow
          title="History"
          games={historyGames}
          emptyMessage="No games in history. Play or generate games to see them listed here."
        />

        {/* Favorites Row */}
        <GameRow
          title="Favorites"
          games={favoriteGames}
          emptyMessage="No favorite games yet. Click the bookmark icon on any game to favorite it."
        />

        {/* Liked Games Row */}
        <GameRow
          title="Liked Games"
          games={likedGames}
          emptyMessage="No liked games yet. Click the heart icon on any game to like it."
        />

        {/* Recent Activity Section */}
        <div className="mt-14">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-black">Recent Activity</h2>
            
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs font-bold text-primary outline-none transition-colors hover:bg-secondary/60 cursor-pointer"
            >
              <option value="today" className="bg-card text-foreground">Today</option>
              <option value="week" className="bg-card text-foreground">This Week</option>
              <option value="month" className="bg-card text-foreground">This Month</option>
              <option value="all" className="bg-card text-foreground">All Time</option>
            </select>
          </div>
          
          <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 shadow-card">
            {activitiesLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="mt-2 text-sm">Loading activity history...</p>
              </div>
            ) : filteredActivities.length > 0 ? (
              <>
                <div className="relative border-l border-border/40 pl-6 ml-4 space-y-8">
                  {filteredActivities.slice(0, showAllActivities ? undefined : 5).map((activity) => {
                    const IconComponent = activityIcons[activity.activityType] || Gamepad2;
                    const colorClass = activityColors[activity.activityType] || "text-muted-foreground bg-muted";
                    
                    return (
                      <div key={activity._id} className="relative group">
                        {/* Timeline Node Icon */}
                        <div className={`absolute -left-[39px] top-0 flex size-8 items-center justify-center rounded-full border transition-all duration-300 group-hover:scale-110 ${colorClass}`}>
                          <IconComponent className="size-4" />
                        </div>
                        
                        {/* Activity Content */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/40 bg-card/20 p-4 transition-all duration-300 hover:border-primary/20 hover:bg-card/40">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {activity.details}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                          </div>
                          
                          {activity.gameId && (
                            <button
                              onClick={() => navigate({ to: "/play/$gameId", params: { gameId: activity.gameId! } })}
                              className="self-start sm:self-center shrink-0 flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:border-primary hover:bg-primary/5 active:scale-95"
                            >
                              Play Game
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredActivities.length > 5 && (
                  <button
                    onClick={() => setShowAllActivities(!showAllActivities)}
                    className="mt-6 w-full flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-secondary/20 py-3 text-sm font-bold text-primary transition-all hover:bg-secondary/40 hover:text-primary-foreground active:scale-[0.99]"
                  >
                    {showAllActivities ? "Show less" : "View all"}
                  </button>
                )}
              </>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-6">
                No recent activity found for the selected time range.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
