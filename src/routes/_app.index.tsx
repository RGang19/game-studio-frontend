import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Flag,
  Gamepad2,
  Globe2,
  Pencil,
  Play,
  Rocket,
  Search,
  Swords,
  Sparkles,
  Trophy,
  TrendingUp,
  UserRound,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { gameTemplates } from "@/lib/templates";
import { templateToGame, getThumbnailUrl, resolveGameThumbnail } from "@/lib/studio-meta";
import type { Game } from "@/lib/games-data";
import { useStudioContext } from "@/context/StudioContext";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Home - Web3 Game Studio" },
      { name: "description", content: "Create, publish, and grow playable games with AI." },
    ],
  }),
  component: Home,
});

const library = gameTemplates.map((template, index) => templateToGame(template, index));
const featured: Game[] = [
  {
    title: "Neon Sudoku",
    category: "Puzzle",
    plays: "New",
    emoji: "S",
    gradient: "violet",
    creator: "@0g-agent",
    thumbnailUrl: getThumbnailUrl("neon-sudoku"),
    templateId: "neon-sudoku",
  },
  {
    title: "Simple Agent Game",
    category: "Agent Arcade",
    plays: "New",
    emoji: "A",
    gradient: "cyan",
    creator: "@0g-agent",
    thumbnailUrl: getThumbnailUrl("simple-agent-game"),
    templateId: "simple-agent-game",
  },
  ...library,
];

const activity = [
  { icon: CircleDollarSign, color: "text-neon-green", text: "Neon Drift earned $120", time: "2h" },
  { icon: Bot, color: "text-neon-cyan", text: "RacerBot v2 deployed", time: "4h" },
  { icon: Play, color: "text-neon-violet", text: "PixelKnight played AI Arena", time: "6h" },
  { icon: TrendingUp, color: "text-neon-pink", text: "Cyber Runner reached 1K plays", time: "1d" },
  { icon: Zap, color: "text-neon-violet", text: "Sudoku Master unlocked 'Speed Demon' badge", time: "2d" },
  { icon: Gamepad2, color: "text-neon-green", text: "New high score on Space Shooter: 24.5K pts", time: "3d" },
  { icon: Rocket, color: "text-neon-pink", text: "Bubble Reef published to IPFS", time: "4d" },
];

const preferredCategories = ["Action", "Arcade", "Racing", "Puzzle"];

function numericPlays(plays: string) {
  if (plays === "New") return Number.POSITIVE_INFINITY;
  const value = Number.parseFloat(plays);
  if (plays.endsWith("M")) return value * 1_000_000;
  if (plays.endsWith("K")) return value * 1_000;
  return value || 0;
}

function uniqueGames(games: Game[]) {
  return games.filter(
    (game, index, collection) =>
      collection.findIndex((candidate) => candidate.templateId === game.templateId) === index,
  );
}

function Home() {
  const navigate = useNavigate();
  const { studio, createdGames, addCreatedGame, removeCreatedGame } = useStudioContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [, setIsSearching] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(() => {
      api
        .get(`/games/list?q=${encodeURIComponent(query)}&limit=20`)
        .then((res) => {
          const games: any[] = res.data?.games ?? [];
          const mapped = games.map((g: any, index: number) => ({
            title: g.title,
            category: g.category ?? "Game",
            plays: g.views ? (g.views >= 1000 ? `${(g.views / 1000).toFixed(1)}K` : String(g.views)) : "New",
            emoji: "🎮",
            gradient: (index % 2 === 0 ? "violet" : "cyan") as "violet" | "cyan",
            creator: g.creator ?? "you",
            thumbnailUrl: resolveGameThumbnail(g),
            templateId: g.id ?? g.templateId,
            prompt: g.customization?.prompt || "",
          }));
          setSearchResults(mapped);
        })
        .catch(() => {
          // fail silently
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);
  const [prompt, setPrompt] = useState(
    "Create a cyberpunk racing game with AI drivers and neon city rewards.",
  );

  // The user's own creations (from this browser and from the backend) — without
  // this, search only covered the static template showcase.
  const myCreations: Game[] = useMemo(
    () =>
      createdGames
        .filter((g: any) => g?.title)
        .filter((g: any, i: number, all: any[]) => !g?.id || all.findIndex((x: any) => x?.id === g.id) === i)
        .map((g: any, index: number) => ({
          title: g.title,
          category: g.category ?? "Game",
          plays: g.views ? (g.views >= 1000 ? `${(g.views / 1000).toFixed(1)}K` : String(g.views)) : "New",
          emoji: "🎮",
          gradient: (index % 2 === 0 ? "violet" : "cyan") as "violet" | "cyan",
          creator: "you",
          thumbnailUrl: resolveGameThumbnail(g),
          templateId: g.id ?? g.templateId,
          prompt: g.customization?.prompt || "",
        })),
    [createdGames],
  );

  // Real view counts drive the Trending order: most viewed first.
  const [viewsMap, setViewsMap] = useState<Record<string, number>>({});
  const [communityGames, setCommunityGames] = useState<Game[]>([]);
  // Real published games, newest first — drives the Latest shelf.
  const [latestGames, setLatestGames] = useState<Game[]>([]);
  useEffect(() => {
    api
      .get("/social/views-top", { params: { limit: 500 } })
      .then((res) => {
        const map: Record<string, number> = {};
        for (const g of res.data?.games ?? []) map[g.gameId] = g.views;
        setViewsMap(map);
      })
      .catch(() => {});
    // Trending is platform-wide: every creator's games compete by views.
    api
      .get("/games/list", { params: { limit: 100 } })
      .then((res) => {
        const games: any[] = (res.data?.games ?? []).filter((g: any) => g?.title);
        const toGame = (g: any, index: number): Game => ({
          title: g.title,
          category: g.category ?? "Game",
          plays: "New",
          emoji: "🎮",
          gradient: (index % 2 === 0 ? "violet" : "cyan") as "violet" | "cyan",
          creator: g.creatorId?.startsWith("0x")
            ? `${g.creatorId.slice(0, 6)}…${g.creatorId.slice(-4)}`
            : "community",
          thumbnailUrl: resolveGameThumbnail(g),
          templateId: g.id ?? g.templateId,
        });
        setCommunityGames(games.map(toGame));
        setLatestGames(
          [...games]
            .sort(
              (a: any, b: any) =>
                (Date.parse(b?.createdAt ?? "") || 0) - (Date.parse(a?.createdAt ?? "") || 0),
            )
            .map(toGame),
        );
      })
      .catch(() => {});
  }, []);

  const shelves = useMemo(() => {
    const realViews = (game: Game) => viewsMap[game.templateId ?? ""] ?? 0;
    const withRealPlays = (game: Game): Game => {
      const v = realViews(game);
      if (v <= 0) return game;
      return { ...game, plays: v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v) };
    };
    // Most-viewed first; untouched games keep their showcase order after them.
    const trending = [...featured, ...myCreations, ...communityGames]
      .filter((game, i, all) => all.findIndex((x) => x.templateId === game.templateId) === i)
      .sort((first, second) => realViews(second) - realViews(first))
      .map(withRealPlays);
    // Newest real games first (actual createdAt order from the backend);
    // showcase templates only pad the shelf after them.
    const latest = uniqueGames([...latestGames, ...featured]).map(withRealPlays);
    const playersChoice = uniqueGames([
      ...preferredCategories.flatMap((category) =>
        trending.filter((game) => game.category === category),
      ),
      ...trending,
    ]);
    const favoriteIds = [
      "neon-sudoku",
      "simple-agent-game",
      "cyber-runner",
      "ai-arena",
      "racing",
      "runner",
      "match3",
      "memory",
      "space-shooter",
      "quiz",
    ];
    const favorites = uniqueGames([
      ...favoriteIds
        .map((id) => featured.find((game) => game.templateId === id))
        .filter((game): game is Game => Boolean(game)),
      ...trending,
    ]).slice(0, 14);

    return [
      { title: "Popular Worlds", games: trending },
      { title: "Latest Worlds", games: latest },
      { title: "Favourite World", games: favorites },
      { title: "Trending This Week", games: playersChoice },
    ];
  }, [myCreations, viewsMap, communityGames, latestGames]);

  const visibleShelves = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return shelves;

    // Local matches across all shelves as an instant starting point
    const localMatches = shelves
      .flatMap((shelf) => shelf.games)
      .filter((game, index, self) =>
        self.findIndex((g) => g.templateId === game.templateId || g.title === game.title) === index
      )
      .filter((game) =>
        [game.title, game.category, game.creator, game.prompt || ""].some((value) =>
          value.toLowerCase().includes(query),
        ),
      );

    // Merge local matches with background search results from DB
    const allResults = [...searchResults];
    localMatches.forEach((lm) => {
      if (!allResults.some((ar) => ar.templateId === lm.templateId || ar.title === lm.title)) {
        allResults.push(lm);
      }
    });

    return [
      { title: `Search Results for “${searchQuery}”`, games: allResults }
    ];
  }, [searchQuery, shelves, searchResults]);

  // Every game we know about, de-duplicated — the pool a genre card filters.
  const genreGames = useMemo(() => {
    if (!selectedGenre) return [];
    const needle = selectedGenre.trim().toLowerCase();
    const pool = shelves
      .flatMap((shelf) => shelf.games)
      .filter((game, index, self) =>
        self.findIndex(
          (g) => g.templateId === game.templateId || g.title === game.title,
        ) === index,
      );
    return pool.filter((game) => {
      const category = (game.category || "").toLowerCase();
      return category.includes(needle) || needle.includes(category);
    });
  }, [selectedGenre, shelves]);

  const openGameById = useCallback(
    (game: Game) => {
      if (game.templateId) {
        navigate({ to: "/play/$gameId", params: { gameId: game.templateId } });
      }
    },
    [navigate],
  );

  const create = () => {
    const buildPrompt = prompt.trim();
    if (!buildPrompt || studio.activeBuild?.phase === "building") return;

    studio.setPrompt(buildPrompt);
    void studio.generateFromPrompt("pure-agent", buildPrompt).then((game) => {
      if (game) addCreatedGame(game);
    });
    navigate({ to: "/create" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b-2 border-border px-4 py-2 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <p className="hidden shrink-0 text-sm text-muted-foreground sm:block">
            Welcome back, <span className="font-semibold text-foreground">Web3 Game Studio</span>
          </p>
          <label className="flex h-10 w-full max-w-md items-center gap-2 rounded-none border-2 border-black bg-white px-3 transition focus-within:shadow-[3px_3px_0_#101010]">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search games, categories, creators..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-none border-2 border-black bg-white px-3 py-1.5 text-xs font-bold">
            <Zap className="size-4 text-[#ff5b42]" /> 1,250
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/profile" })}
            title="Open profile"
            aria-label="Open profile"
            className="grid size-9 place-items-center rounded-none border-2 border-black bg-primary font-display text-sm font-black text-black transition hover:shadow-[3px_3px_0_#101010]"
          >
            <UserRound className="size-5" />
          </button>
        </div>
      </header>

      <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_310px]">
        <main className="min-w-0 space-y-3 xl:col-span-2">
          <section className="relative min-h-[380px] overflow-hidden rounded-none border-2 border-border bg-card shadow-card">
            <img
              src={getThumbnailUrl("cyber-runner")}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(243,240,232,.97)_0%,rgba(243,240,232,.9)_38%,rgba(243,240,232,.3)_58%,rgba(243,240,232,0)_80%)]" />
            <div className="absolute inset-y-0 left-[54%] w-px bg-black/15" />
            <div className="relative z-10 flex min-h-[380px] items-end gap-8 p-6 lg:p-8">
              <div className="flex min-w-0 max-w-[660px] flex-1 flex-col justify-center self-center">
              <p className="label-mono mb-3 inline-flex w-fit border border-black bg-[#b9ff2c] px-2 py-1 text-[10px] text-foreground">FILE: GAMESTUDIO.MDX · BUILD_01</p>
              <h1 className="max-w-xl font-display text-4xl font-black leading-[.9] sm:text-6xl">
                CREATE ANY GAME <span className="text-gradient">WITH AI</span>
              </h1>
              <p className="mt-4 max-w-md text-sm text-muted-foreground">
                Turn an idea into a playable build in minutes.
              </p>
              <div className="mt-6 rounded-none border-2 border-black bg-white p-3 shadow-card">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  className="h-20 w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
                  placeholder="Describe your game..."
                  maxLength={500}
                />
                <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
                  <span className="text-[10px] text-muted-foreground">{prompt.length}/500</span>
                  <button
                    onClick={create}
                    className="shadow-press flex items-center gap-2 rounded-none border-2 border-black bg-primary px-4 py-2 text-[11px] font-black uppercase tracking-wide text-black shadow-[3px_3px_0_#101010]"
                  >
                    <WandSparkles className="size-4" /> GENERATE GAME
                  </button>
                </div>
              </div>
              </div>
              <div className="hidden w-[280px] shrink-0 space-y-2 self-center lg:block">
                <Feature icon={Sparkles} title="1-Click Generate" copy="Prompt to playable game" />
                <Feature icon={Bot} title="AI Agent Integration" copy="Intelligent NPCs" />
                <Feature icon={Globe2} title="Deploy to Browser" copy="Play instantly, anywhere" />
                <Feature icon={Rocket} title="Publish & Earn" copy="Share your creations" />
              </div>
            </div>
          </section>

          {visibleShelves.map((shelf) => (
            <GameShelf
              key={shelf.title}
              title={shelf.title}
              games={shelf.games}
              cardsPerRow={4}
              onDeleteGame={
                shelf.title === "My Creations"
                  ? (game) => { if (game.templateId) void removeCreatedGame(game.templateId); }
                  : undefined
              }
              onEditGame={
                shelf.title === "My Creations"
                  ? (game) => { if (game.templateId) navigate({ to: "/edit/$gameId", params: { gameId: game.templateId } }); }
                  : undefined
              }
            />
          ))}
          <TopCreators />
          <BrowseByGenre onSelect={setSelectedGenre} />
        </main>

        <aside className="space-y-3 xl:col-span-2 xl:grid xl:grid-cols-2">
          <Panel title="My Projects" action="View all" onActionClick={() => navigate({ to: "/profile" })}>
            <div className="divide-y divide-border/40">
              {featured.slice(0, 4).map((game, index) => (
                <button
                  key={game.title}
                  onClick={() =>
                    game.templateId &&
                    navigate({ to: "/play/$gameId", params: { gameId: game.templateId } })
                  }
                  className="flex w-full items-center gap-4 py-4 text-left transition hover:bg-[#f3f0e8]"
                >
                  <img src={game.thumbnailUrl} alt="" className="size-12 rounded-none border-2 border-black object-cover" />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{game.title}</strong>
                    <span className="text-xs text-muted-foreground">
                      Updated {index + 1}h ago
                    </span>
                  </span>
                  <span className={`label-mono border-2 border-black px-2 py-0.5 text-[9px] font-bold ${index % 2 ? "bg-white" : "bg-primary"}`}>
                    {index % 2 ? "Building" : "Published"}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate({ to: "/create" })}
              className="shadow-press mt-4 flex w-full items-center justify-center gap-2 rounded-none border-2 border-black bg-primary py-3 text-sm font-black uppercase tracking-wide text-black shadow-[4px_4px_0_#101010]"
            >
              <Sparkles className="size-4" /> Create New Game
            </button>
          </Panel>

          <Panel title="Recent Activity">
            <div className="divide-y divide-border/40">
              {activity.map(({ icon: Icon, text, time }) => (
                <div key={text} className="flex items-center gap-3 py-4">
                  <span className="grid size-8 shrink-0 place-items-center border-2 border-black bg-[#f3f0e8]">
                    <Icon className="size-4 text-black" />
                  </span>
                  <p className="min-w-0 flex-1 text-xs text-muted-foreground">{text}</p>
                  <span className="label-mono text-[10px] text-muted-foreground/70">{time}</span>
                </div>
              ))}
            </div>
          </Panel>
        </aside>

      </div>

      {selectedGenre && (
        <CategoryModal
          genre={selectedGenre}
          games={genreGames}
          onClose={() => setSelectedGenre(null)}
          onOpenGame={openGameById}
        />
      )}
    </div>
  );
}

function CategoryModal({
  genre,
  games,
  onClose,
  onOpenGame,
}: {
  genre: string;
  games: Game[];
  onClose: () => void;
  onOpenGame: (game: Game) => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#f3f0e8]/95 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${genre} games`}
        className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-none border-2 border-black bg-white shadow-card"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-lg font-black uppercase sm:text-xl">{genre}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {games.length} {games.length === 1 ? "game" : "games"} in this genre
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close"
            className="grid size-9 place-items-center rounded-none border-2 border-black bg-white text-black transition hover:bg-primary"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto p-4 sm:p-6">
          {games.length === 0 ? (
            <div className="grid place-items-center py-20 text-center">
              <p className="font-display text-base font-black uppercase">No games yet</p>
              <p className="mt-2 max-w-xs text-xs text-muted-foreground">
                There are no {genre} games to explore right now. Check back soon or create one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {games.map((game, index) => (
                <GameTile
                  key={`${game.title}-genre-${index}`}
                  game={game}
                  onOpen={() => onOpenGame(game)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  copy,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex items-center gap-3 border border-black/70 bg-white/80 p-3 backdrop-blur-sm transition hover:-translate-x-1 hover:bg-[#b9ff2c]">
      <div className="grid size-9 shrink-0 place-items-center border border-black bg-[#b9ff2c]">
        <Icon className="size-4 text-black" />
      </div>
      <div>
        <p className="label-mono text-[10px] font-bold">{title}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{copy}</p>
      </div>
    </div>
  );
}

const creators = [
  { name: "NovaByte", handle: "@nova", games: 42, followers: "12.4k", accent: "bg-[#b9ff2c]" },
  { name: "PixelWitch", handle: "@pxw", games: 38, followers: "9.1k", accent: "bg-[#ff5b42]" },
  { name: "SynthLord", handle: "@synth", games: 31, followers: "7.6k", accent: "bg-[#101010] text-white" },
  { name: "GhostCode", handle: "@ghost", games: 29, followers: "6.8k", accent: "bg-[#b9ff2c]" },
  { name: "VioletAce", handle: "@vace", games: 24, followers: "5.2k", accent: "bg-[#ff5b42]" },
];

function TopCreators() {
  const [following, setFollowing] = useState<string[]>([]);

  return (
    <section className="border-2 border-black bg-white p-5 shadow-card">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-black uppercase">Top Creators <span className="text-[#ff5b42]">✦</span></h2>
        <button type="button" className="label-mono text-[10px] underline underline-offset-4">View all →</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {creators.map((creator) => {
          const isFollowing = following.includes(creator.handle);
          return (
            <article key={creator.handle} className="border-2 border-black bg-[#f3f0e8] p-4 text-center">
              <div className={`mx-auto grid size-14 place-items-center border-2 border-black text-xl font-black ${creator.accent}`}>
                {creator.name[0]}
              </div>
              <h3 className="mt-3 font-display text-lg font-black">{creator.name}</h3>
              <p className="text-xs text-muted-foreground">{creator.handle}</p>
              <p className="mt-2 text-xs font-bold">{creator.games} worlds · {creator.followers}</p>
              <button
                type="button"
                onClick={() => setFollowing((current) => isFollowing ? current.filter((handle) => handle !== creator.handle) : [...current, creator.handle])}
                className={`mt-4 w-full border-2 border-black py-2 text-xs font-black uppercase ${isFollowing ? "bg-white" : "bg-black text-[#b9ff2c]"}`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const genres = [
  { name: "Sports", icon: Trophy, accent: "text-[#00a878]" },
  { name: "Racing", icon: Flag, accent: "text-[#ff5b42]" },
  { name: "RPG", icon: Swords, accent: "text-[#ff5b42]" },
  { name: "Strategy", icon: Bot, accent: "text-[#101010]" },
  { name: "Arcade", icon: Gamepad2, accent: "text-[#00a878]" },
  { name: "Sci-Fi", icon: Rocket, accent: "text-[#ff5b42]" },
];

function BrowseByGenre({ onSelect }: { onSelect: (genre: string) => void }) {
  return (
    <section className="border-2 border-black bg-white p-5 shadow-card">
      <h2 className="mb-5 inline-block bg-[#b9ff2c] px-3 py-1 font-display text-2xl font-black uppercase">Browse by Genre ✦</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {genres.map(({ name, icon: Icon, accent }) => (
          <button key={name} type="button" onClick={() => onSelect(name)} className="group border-2 border-black bg-[#f3f0e8] p-4 text-center transition hover:-translate-y-1 hover:bg-white">
            <Icon className={`mx-auto size-9 ${accent}`} />
            <span className="mt-3 block font-display text-base font-black uppercase">{name}</span>
            <span className="mt-1 block text-[10px] text-muted-foreground">Explore worlds →</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function GameShelf({ title, games, cardsPerRow, onDeleteGame, onEditGame }: { title: string; games: Game[]; cardsPerRow?: number; onDeleteGame?: (game: Game) => void; onEditGame?: (game: Game) => void }) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    dragFree: true,
    loop: false,
    containScroll: "trimSnaps",
    skipSnaps: true,
  });
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!showAll) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowAll(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showAll]);

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

  const openGame = (game: Game) => {
    if (game.templateId) {
      navigate({ to: "/play/$gameId", params: { gameId: game.templateId } });
    }
  };

  const rowItems = games;

  const basisClass = cardsPerRow === 4
    ? "min-w-0 shrink-0 grow-0 basis-[72%] sm:basis-[40%] md:basis-[31%] lg:basis-[calc(25%-6px)] 2xl:basis-[calc(25%-6px)]"
    : "min-w-0 shrink-0 grow-0 basis-[72%] sm:basis-[40%] md:basis-[31%] lg:basis-[calc(20%-7px)] 2xl:basis-[calc(16.666%-7px)]";

  return (
    <>
      <section className="rounded-none border-2 border-black bg-white p-4 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-black uppercase tracking-tight">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={scrollPrev}
              title="Previous games"
              className="grid size-8 place-items-center rounded-none border-2 border-black bg-white text-black transition hover:bg-primary"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={scrollNext}
              title="Next games"
              className="grid size-8 place-items-center rounded-none border-2 border-black bg-white text-black transition hover:bg-primary"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              onClick={() => setShowAll(true)}
              className="label-mono ml-1 flex items-center gap-1 text-[10px] underline underline-offset-4"
            >
              View all <ChevronRight className="size-3" />
            </button>
          </div>
        </div>
        <div
          ref={emblaRef}
          className="cursor-grab overflow-hidden select-none active:cursor-grabbing"
        >
          <div className="flex touch-pan-y gap-2">
            {rowItems.map((game, index) => (
              <div
                key={`${game.title}-${index}`}
                className={basisClass}
              >
                <GameTile
                  game={game}
                  onOpen={() => openGame(game)}
                  onDelete={onDeleteGame ? () => onDeleteGame(game) : undefined}
                  onEdit={onEditGame ? () => onEditGame(game) : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {showAll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#f3f0e8]/95 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAll(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`All ${title}`}
            className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-none border-2 border-black bg-white shadow-card"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {games.length} playable games
                </p>
              </div>
              <button
                onClick={() => setShowAll(false)}
                title="Close"
                className="grid size-9 place-items-center rounded-none border-2 border-black bg-white text-black transition hover:bg-primary"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {rowItems.map((game, index) => (
                  <GameTile
                    key={`${game.title}-grid-${index}`}
                    game={game}
                    onOpen={() => openGame(game)}
                    onDelete={onDeleteGame ? () => onDeleteGame(game) : undefined}
                    onEdit={onEditGame ? () => onEditGame(game) : undefined}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

// Inline cover shown when a game has no stored image (e.g. its generated
// cover failed) — anything but a broken-image icon.
const FALLBACK_COVER =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2b1a4f"/><stop offset="1" stop-color="#0c1230"/>
      </linearGradient></defs>
      <rect width="400" height="400" fill="url(#g)"/>
      <circle cx="200" cy="170" r="64" fill="none" stroke="#8d6bff" stroke-width="6" opacity="0.7"/>
      <rect x="160" y="150" width="80" height="40" rx="12" fill="#8d6bff" opacity="0.8"/>
      <circle cx="176" cy="170" r="6" fill="#0c1230"/><circle cx="224" cy="170" r="6" fill="#0c1230"/>
      <text x="200" y="290" text-anchor="middle" fill="#b9a8ff" font-family="monospace" font-size="20">AI GAME</text>
    </svg>`,
  );

function GameTile({ game, onOpen, onDelete, onEdit }: { game: Game; onOpen: () => void; onDelete?: () => void; onEdit?: () => void }) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={(event) => {
        pointerStart.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (!start) return;
        const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        if (distance < 8) onOpen();
      }}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
      className="group w-full min-w-0 overflow-hidden rounded-none border-2 border-black bg-white text-left transition-all duration-150 hover:-translate-y-1 hover:shadow-[4px_4px_0_#101010]"
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={game.thumbnailUrl}
          alt=""
          draggable={false}
          onError={(event) => {
            const img = event.currentTarget;
            if (img.dataset.fallback) return;
            img.dataset.fallback = "1";
            img.src = FALLBACK_COVER;
          }}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent" />
        {onEdit && (
          <button
            title={`Edit ${game.title}`}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            className="absolute left-1.5 top-1.5 z-10 grid size-6 place-items-center rounded-md bg-black/60 text-white/80 opacity-0 transition group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            title={`Delete ${game.title}`}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (window.confirm(`Delete "${game.title}"? This cannot be undone.`)) onDelete();
            }}
            className="absolute right-1.5 top-1.5 z-10 grid size-6 place-items-center rounded-md bg-black/60 text-white/80 opacity-0 transition group-hover:opacity-100 hover:bg-red-600 hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="border-t-2 border-black p-2.5">
        <p className="truncate text-xs font-bold">{game.title}</p>
        <div className="label-mono mt-1.5 flex items-center justify-between text-[9px] text-muted-foreground">
          <span className="truncate">{game.category}</span>
          <span className="shrink-0">{game.plays}</span>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  action,
  onActionClick,
  children,
}: {
  title: string;
  action?: string;
  onActionClick?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-none border-2 border-black bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-black uppercase tracking-tight">{title}</h2>
        {action && (
          <button onClick={onActionClick} className="label-mono flex items-center text-[10px] underline underline-offset-4">
            {action}
            <ArrowRight className="ml-1.5 size-4" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
