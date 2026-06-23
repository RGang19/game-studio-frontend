import { Play, ArrowUpRight, Pencil, Zap } from "lucide-react";
import { type Game, gradientClass } from "@/lib/games-data";
import { useNavigate } from "@tanstack/react-router";

export function GameCard({
  game,
  index = 0,
  onEdit,
}: {
  game: Game;
  index?: number;
  /** Shown as a pencil button on the cover — pass only for the viewer's own games. */
  onEdit?: (game: Game) => void;
}) {
  const navigate = useNavigate();
  const open = () => {
    if (game.playUrl) {
      window.location.href = game.playUrl;
      return;
    }
    if (game.templateId) navigate({ to: "/play/$gameId", params: { gameId: game.templateId } });
  };

  return (
    <article
      onClick={open}
      className={`animate-float-up group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-neon ${
        game.templateId || game.playUrl ? "cursor-pointer" : ""
      }`}
      style={{ animationDelay: `${index * 60}ms`, opacity: 0 }}
    >
      <div
        className={`relative flex aspect-[4/3.6] items-center justify-center bg-gradient-to-br ${gradientClass[game.gradient]}`}
      >
        {game.thumbnailUrl && (
          <>
            <img
              src={game.thumbnailUrl}
              alt=""
              onError={(event) => {
                // missing cover: fall back to the gradient + emoji tile
                event.currentTarget.style.display = "none";
              }}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/35" />
          </>
        )}
        <span className="absolute left-3 top-3 label-mono rounded-md bg-black/35 px-2.5 py-1 text-[10px] text-white backdrop-blur">
          {game.category}
        </span>
        {onEdit && (
          <button
            type="button"
            title="Edit game"
            aria-label="Edit game"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(game);
            }}
            className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-lg bg-black/55 text-white backdrop-blur transition hover:bg-primary hover:text-primary-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
        {!game.thumbnailUrl && (
          <div className="flex size-32 items-center justify-center overflow-hidden rounded-3xl bg-white/15 text-6xl shadow-inner backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            {game.emoji}
          </div>
        )}
        <span className="absolute bottom-3 left-3 label-mono rounded-md bg-black/45 px-2.5 py-1 text-[10px] text-white">
          {game.plays} Plays
        </span>
        <button className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Zap className="size-3" /> Instant Play
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-bold">{game.title}</h3>
          <p className="label-mono mt-1 text-[9px] text-muted-foreground">{game.creator}</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <Play className="size-3" /> Play <ArrowUpRight className="size-3" />
        </button>
      </div>
    </article>
  );
}
