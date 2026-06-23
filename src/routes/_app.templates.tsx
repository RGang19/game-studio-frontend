import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/studio/PageHeader";
import { ArrowUpRight } from "lucide-react";
import { gameTemplates } from "@/lib/templates";
import { gradientClass } from "@/lib/games-data";
import { gradientForId, templateEmoji, engineOf, getThumbnailUrl } from "@/lib/studio-meta";
import { useStudioContext } from "@/context/StudioContext";

export const Route = createFileRoute("/_app/templates")({
  head: () => ({
    meta: [
      { title: "Templates — GameStudio" },
      { name: "description", content: "Start from a ready-made game template and remix it with a prompt." },
    ],
  }),
  component: Templates,
});

const engines = [
  { id: "threejs", label: "Three.js" },
  { id: "construct", label: "HTML5" },
] as const;

function Templates() {
  const { studio, openInStudio } = useStudioContext();
  const list = gameTemplates.filter((t: any) => engineOf(t) === studio.engine);

  return (
    <div>
      <PageHeader title="Templates" subtitle="Pick a base · Remix with a prompt · Ship instantly" />
      <div className="flex items-center gap-2 px-6 pt-6 lg:px-10">
        <div className="inline-flex rounded-xl border border-border/60 bg-card p-1">
          {engines.map((e) => (
            <button
              key={e.id}
              onClick={() => studio.setEngine(e.id)}
              className={`label-mono rounded-lg px-4 py-2 text-[11px] transition-colors ${
                studio.engine === e.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 px-6 py-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 lg:px-10">
        {list.map((t: any, i: number) => (
          <article
            key={t.id}
            className="animate-float-up group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-neon"
            style={{ animationDelay: `${i * 50}ms`, opacity: 0 }}
          >
            <div className={`relative flex aspect-[16/12] items-center justify-center overflow-hidden bg-gradient-to-br ${gradientClass[gradientForId(t.id)]}`}>
              {getThumbnailUrl(t.id) ? (
                <>
                  <img
                    src={getThumbnailUrl(t.id)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/35" />
                </>
              ) : (
                <span className="text-6xl transition-transform group-hover:scale-110">{templateEmoji[t.id] ?? "🎮"}</span>
              )}
            </div>
            <div className="p-5">
              <span className="label-mono text-[9px] text-primary">{t.category}</span>
              <h3 className="mt-1 font-display text-lg font-bold">{t.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{t.mechanic}</p>
              <button
                onClick={() => openInStudio(t.id)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.65_0.25_295)] py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90"
              >
                Use Template <ArrowUpRight className="size-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
