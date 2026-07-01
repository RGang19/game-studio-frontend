import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type AnyPackage = Record<string, unknown> & {
  refinement?: { generatedCode?: string; source?: string; seededFrom?: string | null };
  templateName?: string;
};

// Strip the relative imports the agent module expects (gamePackage.js, styles.css,
// and any other "./..." import) so the code can run as a self-contained inline module.
// Exports must go too: the module body runs inside a try/catch, where `export`
// is a syntax error that blanks the entire game.
function prepareModule(code: string): string {
  return code
    .replace(/^\s*import\s+["'][^"']*\.css["'];?\s*$/gm, "")
    .replace(/^\s*import\s+[^;\n]*from\s+["']\.\.?\/[^"']*["'];?\s*$/gm, "")
    .replace(/^\s*import\s+["']\.\.?\/[^"']*["'];?\s*$/gm, "")
    .replace(/^\s*export\s+default\s+/gm, "")
    .replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, "")
    .replace(/^(\s*)export\s+(const|let|var|function|class|async)/gm, "$1$2");
}

function buildSrcDoc(code: string, pkg: AnyPackage): string {
  // Don't ship the (large) refinement payload back into the sandbox.
  const { refinement, ...safe } = pkg;
  void refinement;
  const json = JSON.stringify(safe).replace(/</g, "\\u003c");
  const moduleBody = `const gamePackage = ${json};\n${prepareModule(code)}`.replace(
    /<\/script>/gi,
    "<\\/script>",
  );

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; height: 100%; background: #070a12; }
  body { display: flex; align-items: center; justify-content: center; overflow: hidden; }
  /* The fit script below sizes the canvas: every game keeps ITS OWN aspect
     ratio (square boards must not be stretched to 16:9) and is scaled as large
     as the frame allows, centered by the flex body. */
  #game { display: block; touch-action: none; }
  * { box-sizing: border-box; }
</style>
</head>
<body>
<canvas id="game"></canvas>
<script type="module">
// --- Storage shim -----------------------------------------------------------
// The frame is sandboxed WITHOUT allow-same-origin (keeps generated code off
// the parent origin), so reading window.localStorage / sessionStorage throws
// "SecurityError ... document is sandboxed and lacks the 'allow-same-origin'
// flag". Many generated games save high scores/settings there and would crash
// on load. Give them a working in-memory Storage so gameplay is unchanged;
// data just doesn't persist across reloads (which a sandboxed frame can't do
// anyway).
(function () {
  function makeStorage() {
    const map = new Map();
    return {
      getItem: function (k) { return map.has(String(k)) ? map.get(String(k)) : null; },
      setItem: function (k, v) { map.set(String(k), String(v)); },
      removeItem: function (k) { map.delete(String(k)); },
      clear: function () { map.clear(); },
      key: function (i) { return Array.from(map.keys())[i] || null; },
      get length() { return map.size; },
    };
  }
  ["localStorage", "sessionStorage"].forEach(function (name) {
    let ok = false;
    try { const s = window[name]; s.getItem("__probe"); ok = true; } catch (e) { ok = false; }
    if (!ok) {
      try {
        Object.defineProperty(window, name, { value: makeStorage(), configurable: true });
      } catch (e) {}
    }
  });
})();
// Surface runtime errors to the host app (the editor turns them into
// one-click "fix this" requests for the agent).
function reportGameError(message, stack) {
  try {
    window.parent.postMessage({ __kultGameError: { message: String(message), stack: String(stack || "") } }, "*");
  } catch {}
}
// --- Canvas fit ---------------------------------------------------------------
// Scales the canvas (up or down) to the largest size that fits the frame while
// preserving the game's own aspect ratio. The element box always equals the
// painted bitmap, so pointer math that scales by getBoundingClientRect stays
// correct. Re-fits when the game resizes its canvas or the frame changes size.
(function () {
  const c = document.querySelector("#game");
  function fit() {
    if (!c || !c.width || !c.height || !innerWidth || !innerHeight) return;
    const s = Math.min(innerWidth / c.width, innerHeight / c.height);
    c.style.width = Math.round(c.width * s) + "px";
    c.style.height = Math.round(c.height * s) + "px";
  }
  try {
    new MutationObserver(fit).observe(c, { attributes: true, attributeFilter: ["width", "height"] });
  } catch {}
  addEventListener("resize", fit);
  setInterval(fit, 1000);
  fit();
})();
// --- Leaderboard score bridge -----------------------------------------------
// Games call window.reportScore(score) when a run ends. Builds that predate
// this API are covered by a HUD watcher: it reads "Score: N" style text the
// game draws each frame and submits the best value when game-over text shows.
(function () {
  let best = 0;
  let explicit = false;
  let lastSentAt = 0;
  let lastOverSeen = 0;
  function send(score) {
    const value = Math.max(0, Math.floor(Number(score) || 0));
    try { window.parent.postMessage({ __kultGameScore: value }, "*"); } catch {}
  }
  window.reportScore = function (score) {
    explicit = true;
    send(score);
  };
  const scoreRe = /(?:score|pts|points)\\s*[:\\-]?\\s*([0-9][0-9,]*)/i;
  const overRe = /game\\s*over|you\\s*win|you\\s*lose|you\\s*died|crashed|squashed|board\\s*cleared|out\\s*of\\s*moves|quiz\\s*complete|wins|you\\s*fell|press\\s*r|tap\\s*to\\s*restart|play\\s*again/i;
  function scan(text) {
    const s = String(text);
    // Game-over detection feeds the touch bridge (tap = restart when over).
    // Runs even with explicit scoring so restart-by-tap always works.
    if (overRe.test(s)) {
      window.__kultGameOver = true;
      lastOverSeen = Date.now();
    }
    if (explicit) return;
    const m = s.match(scoreRe);
    if (m) {
      const v = parseInt(m[1].replace(/,/g, ""), 10);
      if (Number.isFinite(v)) best = Math.max(best, v);
    }
    if (overRe.test(s) && Date.now() - lastSentAt > 5000) {
      lastSentAt = Date.now();
      send(best);
    }
  }
  // Once the game stops drawing its game-over text, it has resumed.
  setInterval(function () {
    if (window.__kultGameOver && Date.now() - lastOverSeen > 800) window.__kultGameOver = false;
  }, 200);
  const origFill = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
    scan(text);
    return maxWidth === undefined ? origFill.call(this, text, x, y) : origFill.call(this, text, x, y, maxWidth);
  };
  const origStroke = CanvasRenderingContext2D.prototype.strokeText;
  CanvasRenderingContext2D.prototype.strokeText = function (text, x, y, maxWidth) {
    scan(text);
    return maxWidth === undefined ? origStroke.call(this, text, x, y) : origStroke.call(this, text, x, y, maxWidth);
  };
})();
// --- Touch input bridge -----------------------------------------------------
// Keyboard-only generated games (arrow keys to move, R/Space to restart) are
// unplayable on phones — there is no keyboard. Translate touch gestures into
// the keyboard events the game already listens for, so every game works on
// mobile without changing its code: swipe -> arrow keys, tap -> action
// (Space), and a tap while "GAME OVER" is showing -> restart (R/Enter/Space).
(function () {
  const canvas = document.querySelector("#game");
  function makeKey(type, k, code, keyCode) {
    const ev = new KeyboardEvent(type, { key: k, code: code, bubbles: true, cancelable: true });
    // keyCode/which are legacy getters the init dict can't set; force them so
    // games that check e.keyCode === 38 also respond.
    try { Object.defineProperty(ev, "keyCode", { get: function () { return keyCode; } }); } catch (e) {}
    try { Object.defineProperty(ev, "which", { get: function () { return keyCode; } }); } catch (e) {}
    return ev;
  }
  function press(k, code, keyCode) {
    [window, document, canvas].forEach(function (t) {
      if (!t) return;
      t.dispatchEvent(makeKey("keydown", k, code, keyCode));
    });
    setTimeout(function () {
      [window, document, canvas].forEach(function (t) {
        if (!t) return;
        t.dispatchEvent(makeKey("keyup", k, code, keyCode));
      });
    }, 90);
  }
  const K = {
    up: ["ArrowUp", "ArrowUp", 38],
    down: ["ArrowDown", "ArrowDown", 40],
    left: ["ArrowLeft", "ArrowLeft", 37],
    right: ["ArrowRight", "ArrowRight", 39],
    space: [" ", "Space", 32],
    enter: ["Enter", "Enter", 13],
    r: ["r", "KeyR", 82],
  };
  function tap(name) { press(K[name][0], K[name][1], K[name][2]); }
  function restart() { tap("r"); tap("enter"); tap("space"); }

  let sx = 0, sy = 0;
  function begin(x, y) { sx = x; sy = y; }
  function finish(x, y) {
    const dx = x - sx, dy = y - sy;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx < 24 && ady < 24) {
      // A tap: restart when the run is over, otherwise a generic action.
      if (window.__kultGameOver) restart(); else tap("space");
      return;
    }
    if (adx > ady) tap(dx > 0 ? "right" : "left");
    else tap(dy > 0 ? "down" : "up");
  }
  const handler = canvas || document;
  handler.addEventListener("touchstart", function (e) {
    const t = e.touches[0];
    if (t) begin(t.clientX, t.clientY);
  }, { passive: true });
  handler.addEventListener("touchend", function (e) {
    const t = e.changedTouches[0];
    if (t) finish(t.clientX, t.clientY);
  }, { passive: true });
  // Mouse: only used to restart by clicking once the run is over. During play
  // the keyboard works on desktop, and real clicks still reach pointer games.
  handler.addEventListener("mouseup", function () {
    if (window.__kultGameOver) restart();
  });
})();
window.addEventListener("error", (event) => {
  reportGameError(event.message || event.error, event.error && event.error.stack);
});
window.addEventListener("unhandledrejection", (event) => {
  reportGameError(event.reason && event.reason.message || event.reason, event.reason && event.reason.stack);
});
try {
${moduleBody}
} catch (error) {
  const c = document.querySelector("#game");
  const ctx = c && c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#070a12"; ctx.fillRect(0, 0, c.width || 960, c.height || 540);
    ctx.fillStyle = "#ff6b81"; ctx.font = "16px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Generated build failed to run: " + (error && error.message), (c.width || 960) / 2, (c.height || 540) / 2);
  }
  reportGameError(error && error.message, error && error.stack);
  console.error("Generated game runtime error", error);
}
<\/script>
</body>
</html>`;
}

export function GeneratedGameFrame({
  gamePackage,
  onScoreSubmit,
}: {
  gamePackage: AnyPackage;
  onScoreSubmit?: (score: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Scores posted by the sandboxed game (reportScore API or HUD watcher).
  useEffect(() => {
    if (!onScoreSubmit) return;
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const score = event.data?.__kultGameScore;
      if (typeof score === "number" && Number.isFinite(score) && score >= 0) {
        onScoreSubmit?.(Math.floor(score));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onScoreSubmit]);

  const code = gamePackage?.refinement?.generatedCode ?? "";
  const srcDoc = useMemo(() => buildSrcDoc(code, gamePackage), [code, gamePackage]);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(document.fullscreenElement === wrapRef.current);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await wrapRef.current?.requestFullscreen?.();
      return;
    }
    await document.exitFullscreen?.();
  }

  return (
    <div className="three-preview-wrap" ref={wrapRef}>
      <iframe
        ref={iframeRef}
        title={`${gamePackage?.templateName ?? "Generated"} game`}
        className="three-preview"
        // Isolated origin: the agent's code cannot touch the parent app.
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allow="autoplay; fullscreen; gamepad"
      />
      <button
        type="button"
        className="fullscreen-button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
        title={isFullscreen ? "Exit full screen" : "Enter full screen"}
      >
        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>
    </div>
  );
}
