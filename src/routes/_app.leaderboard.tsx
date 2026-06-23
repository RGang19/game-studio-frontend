import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/studio/PageHeader";
import { Crown, TrendingUp, Flame, Medal } from "lucide-react";

export const Route = createFileRoute("/_app/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Web3 Game Studio" },
      { name: "description", content: "Top creators and most played games ranked by plays this week." },
    ],
  }),
  component: Leaderboard,
});

const ranks = [
  { rank: 1, name: "@turbo", game: "Neon Drift", plays: "1.5M", emoji: "🏎️", change: "+12%" },
  { rank: 2, name: "@luma", game: "Match Quiz", plays: "1.2M", emoji: "💎", change: "+8%" },
  { rank: 3, name: "@circuit", game: "Bot Brawl", plays: "612K", emoji: "🤖", change: "+5%" },
  { rank: 4, name: "@vex", game: "Clicker Economy", plays: "429K", emoji: "🪙", change: "+3%" },
  { rank: 5, name: "@neo", game: "Floppy Bird", plays: "843K", emoji: "🐤", change: "+15%" },
  { rank: 6, name: "@bolt", game: "Sprint Runner", plays: "311K", emoji: "🏃", change: "+2%" },
  { rank: 7, name: "@pixl", game: "Memory Cards", plays: "208K", emoji: "🃏", change: "+1%" },
  { rank: 8, name: "@gear", game: "Factory Loop", plays: "176K", emoji: "🏭", change: "+4%" },
];

const podiumConfig = [
  { position: 2, height: "h-44", glow: "shadow-[0_0_40px_-10px_oklch(0.8_0.02_280/0.5)]", border: "border-[oklch(0.8_0.02_280/0.6)]", crownColor: "text-[oklch(0.8_0.02_280)]" },
  { position: 1, height: "h-56", glow: "shadow-[0_0_50px_-8px_oklch(0.85_0.19_85/0.6)]", border: "border-[oklch(0.85_0.19_85/0.6)]", crownColor: "text-[oklch(0.85_0.19_85)]" },
  { position: 3, height: "h-36", glow: "shadow-[0_0_40px_-10px_oklch(0.7_0.15_50/0.5)]", border: "border-[oklch(0.7_0.15_50/0.6)]", crownColor: "text-[oklch(0.7_0.15_50)]" },
];

function Podium() {
  const top3 = [
    { ...ranks[1], config: podiumConfig[0] },
    { ...ranks[0], config: podiumConfig[1] },
    { ...ranks[2], config: podiumConfig[2] },
  ];

  return (
    <div className="flex items-end justify-center gap-3 px-4 pb-8 pt-4 sm:gap-6">
      {top3.map((entry) => (
        <div
          key={entry.rank}
          className={`animate-float-up flex flex-col items-center ${entry.config.height}`}
          style={{ animationDelay: `${entry.rank * 80}ms`, opacity: 0 }}
        >
          <div className="mb-3 flex flex-col items-center gap-1">
            <Crown className={`size-6 ${entry.config.crownColor}`} />
            <span className="label-mono text-[10px] text-muted-foreground">{entry.change}</span>
          </div>
          <div
            className={`flex w-24 flex-1 flex-col items-center justify-end rounded-t-2xl border-2 ${entry.config.border} bg-card/80 p-3 backdrop-blur-sm transition-all hover:scale-105 sm:w-32 ${entry.config.glow}`}
          >
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-secondary text-xl sm:size-12 sm:text-2xl">
              {entry.emoji}
            </div>
            <span className="font-display text-lg font-black sm:text-xl">#{entry.rank}</span>
            <span className="label-mono text-[10px] text-muted-foreground">{entry.name}</span>
            <span className="font-display mt-1 text-xs font-bold text-primary">{entry.plays}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Leaderboard() {
  return (
    <div>
      <PageHeader title="Leaderboard" subtitle="Top creators this week · Ranked by total plays" />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-10">
        <Podium />

        <div className="space-y-2">
          {ranks.slice(3).map((r, i) => (
            <div
              key={r.rank}
              className="animate-float-up group flex items-center gap-3 rounded-2xl border border-border/40 bg-card/60 p-3 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card sm:gap-4 sm:p-4"
              style={{ animationDelay: `${(i + 3) * 40}ms`, opacity: 0 }}
            >
              <div className="flex w-7 shrink-0 justify-center sm:w-10">
                <span className="font-display text-sm font-black text-muted-foreground sm:text-lg">{r.rank}</span>
              </div>

              <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-lg sm:size-12 sm:text-xl">
                {r.emoji}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold sm:text-base">{r.name}</h3>
                <p className="label-mono text-[9px] text-muted-foreground sm:text-[10px]">{r.game}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-1 rounded-full bg-[oklch(0.85_0.2_150/0.1)] px-2.5 py-1 sm:flex">
                  <Flame className="size-3 text-[oklch(0.85_0.2_150)]" />
                  <span className="label-mono text-[9px] text-[oklch(0.85_0.2_150)]">{r.change}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-primary sm:size-4" />
                  <span className="font-display text-sm font-bold sm:text-base">{r.plays}</span>
                </div>
                <Medal className="size-4 text-muted-foreground/40 transition-colors group-hover:text-primary/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
