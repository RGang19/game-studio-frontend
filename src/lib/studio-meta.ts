import type { Game } from "./games-data";
import { gameTemplates } from "./templates";
import actionThumbnail from "@/assets/thumbnails/action.png";
import puzzleThumbnail from "@/assets/thumbnails/puzzle.png";
import racingThumbnail from "@/assets/thumbnails/racing.png";

/** Returns a newly generated local cover for each template category. */
export function getThumbnailUrl(templateId: string): string {
  const category = gameTemplates.find((template) => template.id === templateId)?.category;
  if (category === "Racing" || category === "Sports") return racingThumbnail;
  if (category === "Puzzle" || category === "Strategy" || category === "Casual" || category === "Casino") {
    return puzzleThumbnail;
  }
  return actionThumbnail;
}

/**
 * Resolves every game to the refreshed thumbnail set, grouped by its template
 * category so old generated and backend-served covers are not displayed.
 */
export function resolveGameThumbnail(game: {
  id?: string;
  templateId?: string;
  thumbnailUrl?: string | null;
}): string {
  return getThumbnailUrl(game?.templateId ?? game?.id ?? "simple-agent-game");
}

// Maps every template id to a poster emoji (ported from the original studio shell).
export const templateEmoji: Record<string, string> = {
  flappy: "🐤",
  match3: "💎",
  clicker: "🪙",
  memory: "🃏",
  quiz: "⚡",
  drawing: "🎨",
  runner: "🏃",
  racing: "🏎️",
  idle: "🏭",
  "ai-arena": "🤖",
  "cyber-runner": "🌃",
  "space-shooter": "🛸",
  minigames: "🎮",
  "realistic-driving": "🚗",
  "fps-survival": "🧟",
  "flight-sim": "✈️",
  "head-soccer-2026": "⚽",
  "goof-runner": "🏃",
  "mini-racer": "🏎️",
  "bubble-shooter": "🫧",
  "blocks-match3": "💎",
  "happy-halloween-match3": "🎃",
  "happy-chef-bubble-shooter": "👨‍🍳",
  "sea-animals": "🐠",
  "christmas-candy": "🍬",
  "lollipops-match3": "🍭",
  "speed-racer": "🏎️",
  "candy-match3": "🍫",
  "smiles-match3": "😊",
  "valentines-match3": "💝",
  "christmas-match3": "🎄",
  "animals-crash-match3": "🦁",
  "halloween-match3": "👻",
  "scary-run": "💀",
  "billiards": "🎱",
  "crazy-match3": "🤪",
  "cars": "🚗",
  "monster-match3": "👾",
  "sweet-match3": "🧁",
  "crazy-car": "🚙",
  "summer-match3": "☀️",
  "funny-faces-match3": "🤡",
  "space-match3": "🚀",
  "math-game-kids": "🔢",
  "truck-racer": "🚛",
  "christmas-gifts": "🎁",
  "christmas-bubbles": "🎅",
  "stick-panda": "🐼",
  "christmas-balls": "🎄",
  "road-racer": "🛣️",
  "jewels-match": "💎",
  "pops-billiards": "🎱",
  "frog-super-bubbles": "🐸",
  "chicken-cross": "🐔",
  "cratch-royale": "🎰",
  "neon-bounce": "🔮",
  "plinko-pro": "📍",
  "race-kings": "🏁",
  "spin-wheel-royale": "🎡",
  "stake-mines": "💣",
};

// Public-folder game builds live under the app base (e.g. /studio/templates/…).
// Root-absolute /templates/ paths escape the base in production and fall
// through to the host app's router, which 404s inside the game iframe.
const appBase = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const withAppBase = (urls: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(urls).map(([id, url]) => [id, `${appBase}${url}`]));

// Standalone Construct/HTML5 game entry points (served from /public/templates).
export const constructGameUrls: Record<string, string> = withAppBase({
  "offline-12minibattles": "/templates/offline-12minibattles/index.html",
  "offline-1on1soccer": "/templates/offline-1on1soccer/index.html",
  "offline-1on1tennis": "/templates/offline-1on1tennis/index.html",
  "offline-2048": "/templates/offline-2048/index.html",
  "offline-2048cupcakes": "/templates/offline-2048cupcakes/index.html",
  "offline-8ballclassic": "/templates/offline-8ballclassic/index.html",
  "offline-alpha_1.2.6": "/templates/offline-alpha_1.2.6/index.html",
  "offline-beta_1.3": "/templates/offline-beta_1.3/index.html",
  "offline-indev": "/templates/offline-indev/index.html",
  "offline-agariolite": "/templates/offline-agariolite/index.html",
  "offline-ageofwar": "/templates/offline-ageofwar/index.html",
  "offline-amongus": "/templates/offline-amongus/index.html",
  "offline-awesometanks": "/templates/offline-awesometanks/index.html",
  "offline-baconmaydie": "/templates/offline-baconmaydie/index.html",
  "offline-badicecream": "/templates/offline-badicecream/index.html",
  "offline-badicecream2": "/templates/offline-badicecream2/index.html",
  "offline-badicecream3": "/templates/offline-badicecream3/index.html",
  "offline-badpiggies": "/templates/offline-badpiggies/index.html",
  "offline-basketballlegends": "/templates/offline-basketballlegends/index.html",
  "offline-basketballstars": "/templates/offline-basketballstars/index.html",
  "offline-basketbros": "/templates/offline-basketbros/index.html",
  "offline-basketrandom": "/templates/offline-basketrandom/index.html",
  "offline-bloonstd": "/templates/offline-bloonstd/index.html",
  "offline-bloonstd2": "/templates/offline-bloonstd2/index.html",
  "offline-bloonstd3": "/templates/offline-bloonstd3/index.html",
  "offline-bloonstd4": "/templates/offline-bloonstd4/index.html",
  "offline-bloxorz": "/templates/offline-bloxorz/index.html",
  "offline-blumgiracers": "/templates/offline-blumgiracers/index.html",
  "offline-blumgirocket": "/templates/offline-blumgirocket/index.html",
  "offline-bobtherobber2": "/templates/offline-bobtherobber2/index.html",
  "offline-bobtherobber5": "/templates/offline-bobtherobber5/index.html",
  "offline-breakingthebank": "/templates/offline-breakingthebank/index.html",
  "offline-bubbleshooter": "/templates/offline-bubbleshooter/index.html",
  "offline-candycrush": "/templates/offline-candycrush/index.html",
  "offline-chess": "/templates/offline-chess/index.html",
  "offline-choppyorc": "/templates/offline-choppyorc/index.html",
  "offline-circloo": "/templates/offline-circloo/index.html",
  "offline-circloo2": "/templates/offline-circloo2/index.html",
  "offline-clashofvikings": "/templates/offline-clashofvikings/index.html",
  "offline-dadish": "/templates/offline-dadish/index.html",
  "offline-dadish2": "/templates/offline-dadish2/index.html",
  "offline-dadish3": "/templates/offline-dadish3/index.html",
  "offline-deathrun3d": "/templates/offline-deathrun3d/index.html",
  "offline-doodlejump": "/templates/offline-doodlejump/index.html",
  "offline-drawclimber": "/templates/offline-drawclimber/index.html",
  "offline-ducklife": "/templates/offline-ducklife/index.html",
  "offline-ducklife2": "/templates/offline-ducklife2/index.html",
  "offline-ducklingsio": "/templates/offline-ducklingsio/index.html",
  "offline-earntodie": "/templates/offline-earntodie/index.html",
  "offline-eggycar": "/templates/offline-eggycar/index.html",
  "offline-evilglitch": "/templates/offline-evilglitch/index.html",
  "offline-fancypantsadventure": "/templates/offline-fancypantsadventure/index.html",
  "offline-fireboyandwatergirl": "/templates/offline-fireboyandwatergirl/index.html",
  "offline-fireboyandwatergirl2": "/templates/offline-fireboyandwatergirl2/index.html",
  "offline-fireboyandwatergirl3": "/templates/offline-fireboyandwatergirl3/index.html",
  "offline-fireboyandwatergirl4": "/templates/offline-fireboyandwatergirl4/index.html",
  "offline-flappybird": "/templates/offline-flappybird/index.html",
  "offline-floodrunner2": "/templates/offline-floodrunner2/index.html",
  "offline-floodrunner3": "/templates/offline-floodrunner3/index.html",
  "offline-footballlegends": "/templates/offline-footballlegends/index.html",
  "offline-freerider3": "/templates/offline-freerider3/index.html",
  "offline-fruitninja": "/templates/offline-fruitninja/index.html",
  "offline-funnybattle": "/templates/offline-funnybattle/index.html",
  "offline-getontop": "/templates/offline-getontop/index.html",
  "offline-googlebaseball": "/templates/offline-googlebaseball/index.html",
  "offline-googledino": "/templates/offline-googledino/index.html",
  "offline-hanger2": "/templates/offline-hanger2/index.html",
  "offline-helixjump": "/templates/offline-helixjump/index.html",
  "offline-hillclimbracinglite": "/templates/offline-hillclimbracinglite/index.html",
  "offline-idlebreakout": "/templates/offline-idlebreakout/index.html",
  "offline-ironsnout": "/templates/offline-ironsnout/index.html",
  "offline-johnnytrigger": "/templates/offline-johnnytrigger/index.html",
  "offline-jumpingshell": "/templates/offline-jumpingshell/index.html",
  "offline-karatebros": "/templates/offline-karatebros/index.html",
  "offline-learntofly": "/templates/offline-learntofly/index.html",
  "offline-learntoflyidle": "/templates/offline-learntoflyidle/index.html",
  "offline-leveldevil": "/templates/offline-leveldevil/index.html",
  "offline-mergeroundracers": "/templates/offline-mergeroundracers/index.html",
  "offline-minesweeper": "/templates/offline-minesweeper/index.html",
  "offline-monstertracks": "/templates/offline-monstertracks/index.html",
  "offline-motox3m2": "/templates/offline-motox3m2/index.html",
  "offline-motox3m3": "/templates/offline-motox3m3/index.html",
  "offline-motox3mpoolparty": "/templates/offline-motox3mpoolparty/index.html",
  "offline-motox3mspookyland": "/templates/offline-motox3mspookyland/index.html",
  "offline-motox3mwinter": "/templates/offline-motox3mwinter/index.html",
  "offline-noobminer": "/templates/offline-noobminer/index.html",
  "offline-oppositeday": "/templates/offline-oppositeday/index.html",
  "offline-ovo": "/templates/offline-ovo/index.html",
  "offline-ovo2": "/templates/offline-ovo2/index.html",
  "offline-pacman": "/templates/offline-pacman/index.html",
  "offline-papasburgeria": "/templates/offline-papasburgeria/index.html",
  "offline-papaspizzeria": "/templates/offline-papaspizzeria/index.html",
  "offline-parkingfury": "/templates/offline-parkingfury/index.html",
  "offline-parkingfury2": "/templates/offline-parkingfury2/index.html",
  "offline-parkingfury3": "/templates/offline-parkingfury3/index.html",
  "offline-picosschool": "/templates/offline-picosschool/index.html",
  "offline-pingpongchaos": "/templates/offline-pingpongchaos/index.html",
  "offline-pixelspeedrun": "/templates/offline-pixelspeedrun/index.html",
  "offline-plonky": "/templates/offline-plonky/index.html",
  "offline-polytrack": "/templates/offline-polytrack/index.html",

  "head-soccer-2026": "/templates/head-soccer-2026/index.html",
  "goof-runner": "/templates/goof-runner/index.html",
  "mini-racer": "/templates/mini-racer/index.html",
  "bubble-shooter": "/templates/bubble-shooter/index.html",
  "blocks-match3": "/templates/blocks-match3/index.html",
  "happy-halloween-match3": "/templates/happy-halloween-match3/index.html",
  "happy-chef-bubble-shooter": "/templates/happy-chef-bubble-shooter/index.html",
  "sea-animals": "/templates/sea-animals/index.html",
  "christmas-candy": "/templates/christmas-candy/index.html",
  "lollipops-match3": "/templates/lollipops-match3/index.html",
  "speed-racer": "/templates/speed-racer/index.html",
  "candy-match3": "/templates/candy-match3/index.html",
  "smiles-match3": "/templates/smiles-match3/index.html",
  "valentines-match3": "/templates/valentines-match3/index.html",
  "christmas-match3": "/templates/christmas-match3/index.html",
  "animals-crash-match3": "/templates/animals-crash-match3/index.html",
  "halloween-match3": "/templates/halloween-match3/index.html",
  "scary-run": "/templates/scary-run/index.html",
  "billiards": "/templates/billiards/index.html",
  "crazy-match3": "/templates/crazy-match3/index.html",
  "cars": "/templates/cars/index.html",
  "monster-match3": "/templates/monster-match3/index.html",
  "sweet-match3": "/templates/sweet-match3/index.html",
  "crazy-car": "/templates/crazy-car/index.html",
  "summer-match3": "/templates/summer-match3/index.html",
  "funny-faces-match3": "/templates/funny-faces-match3/index.html",
  "space-match3": "/templates/space-match3/index.html",
  "math-game-kids": "/templates/math-game-kids/index.html",
  "truck-racer": "/templates/truck-racer/index.html",
  "christmas-gifts": "/templates/christmas-gifts/index.html",
  "christmas-bubbles": "/templates/christmas-bubbles/index.html",
  "stick-panda": "/templates/stick-panda/index.html",
  "christmas-balls": "/templates/christmas-balls/index.html",
  "road-racer": "/templates/road-racer/index.html",
  "jewels-match": "/templates/jewels-match/index.html",
  "pops-billiards": "/templates/pops-billiards/index.html",
  "frog-super-bubbles": "/templates/frog-super-bubbles/index.html",
  "chicken-cross": "/templates/chicken-cross/index.html",
  "cratch-royale": "/templates/cratch-royale/index.html",
  "neon-bounce": "/templates/neon-bounce/index.html",
  "plinko-pro": "/templates/plinko-pro/index.html",
  "race-kings": "/templates/race-kings/index.html",
  "spin-wheel-royale": "/templates/spin-wheel-royale/index.html",
  "stake-mines": "/templates/stake-mines/index.html",
});

export const templateThumbnails: Record<string, string> = {};

const gradientKeys: Game["gradient"][] = ["pink", "green", "cyan", "warm", "violet"];

// Deterministically assigns one of the design-system gradients to a template id,
// so real templates render with the same look as the mock GameCard data.
export function gradientForId(id: string): Game["gradient"] {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return gradientKeys[hash % gradientKeys.length];
}

export type TemplateEngine = "threejs" | "construct";

export function engineOf(template: { engine?: string }): TemplateEngine {
  if (template.engine === "construct") return "construct";
  return "threejs";
}

const samplePlays = ["343K", "1.5M", "429K", "612K", "3.3M", "2.2M", "85.6K", "888K"];

export function playCount(index: number): string {
  return samplePlays[index % samplePlays.length];
}

// Adapts a raw gameTemplate into the design-system Game shape used by GameCard.
export function templateToGame(template: any, index = 0): Game {
  return {
    title: template.name,
    category: template.category,
    plays: playCount(index),
    emoji: templateEmoji[template.id] ?? "🎮",
    gradient: gradientForId(template.id),
    creator:
      engineOf(template) === "construct"
        ? "Construct Template"
        : "3D Web Game",
    thumbnailUrl: getThumbnailUrl(template.id),
    templateId: template.id,
  };
}
