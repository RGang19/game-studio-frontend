export type Game = {
  title: string;
  category: string;
  plays: string;
  emoji: string;
  gradient: "pink" | "green" | "cyan" | "warm" | "violet";
  creator: string;
  thumbnailUrl?: string;
  /** When set, the card opens this real template in the Studio. */
  templateId?: string;
  playUrl?: string;
  prompt?: string;
};

export const playersChoice: Game[] = [
  { title: "Floppy Bird", category: "Arcade", plays: "843K", emoji: "🐤", gradient: "pink", creator: "@neo" },
  { title: "Match Quiz", category: "Puzzle", plays: "1.5M", emoji: "💎", gradient: "green", creator: "@luma" },
  { title: "Clicker Economy", category: "Idle", plays: "429K", emoji: "🪙", gradient: "cyan", creator: "@vex" },
  { title: "Memory Cards", category: "Casual", plays: "612K", emoji: "🃏", gradient: "violet", creator: "@pixl" },
  { title: "Color Dash", category: "Arcade", plays: "311K", emoji: "🌈", gradient: "warm", creator: "@dot" },
];

export const trending: Game[] = [
  { title: "Sprint Runner", category: "Action", plays: "843K", emoji: "🏃", gradient: "warm", creator: "@bolt" },
  { title: "Neon Drift", category: "Racing", plays: "1.5M", emoji: "🏎️", gradient: "cyan", creator: "@turbo" },
  { title: "Factory Loop", category: "Automation", plays: "429K", emoji: "🏭", gradient: "warm", creator: "@gear" },
  { title: "Bot Brawl", category: "Combat", plays: "612K", emoji: "🤖", gradient: "pink", creator: "@circuit" },
  { title: "Sky Glide", category: "Casual", plays: "208K", emoji: "🪂", gradient: "green", creator: "@air" },
];

export const fresh: Game[] = [
  { title: "Word Forge", category: "Puzzle", plays: "12K", emoji: "🔤", gradient: "violet", creator: "@wordy" },
  { title: "Tap Tempo", category: "Rhythm", plays: "44K", emoji: "🥁", gradient: "pink", creator: "@beat" },
  { title: "Maze Mind", category: "Puzzle", plays: "9K", emoji: "🧩", gradient: "green", creator: "@maze" },
  { title: "Coin Rush", category: "Idle", plays: "76K", emoji: "💰", gradient: "warm", creator: "@rich" },
  { title: "Star Pop", category: "Casual", plays: "31K", emoji: "⭐", gradient: "cyan", creator: "@pop" },
];

export const gradientClass: Record<Game["gradient"], string> = {
  pink: "from-[oklch(0.72_0.27_340)] to-[oklch(0.6_0.27_300)]",
  green: "from-[oklch(0.85_0.2_150)] to-[oklch(0.82_0.16_195)]",
  cyan: "from-[oklch(0.82_0.16_195)] to-[oklch(0.65_0.25_270)]",
  warm: "from-[oklch(0.85_0.19_80)] to-[oklch(0.7_0.22_30)]",
  violet: "from-[oklch(0.65_0.25_295)] to-[oklch(0.5_0.25_300)]",
};
