import { useEffect, useMemo, useRef, useState } from "react";

const puzzle = [
  5, 3, 0, 0, 7, 0, 0, 0, 0, 6, 0, 0, 1, 9, 5, 0, 0, 0, 0, 9, 8, 0, 0, 0, 0, 6, 0, 8, 0, 0, 0, 6, 0,
  0, 0, 3, 4, 0, 0, 8, 0, 3, 0, 0, 1, 7, 0, 0, 0, 2, 0, 0, 0, 6, 0, 6, 0, 0, 0, 0, 2, 8, 0, 0, 0, 0,
  4, 1, 9, 0, 0, 5, 0, 0, 0, 0, 8, 0, 0, 7, 9,
];

const solution = [
  5, 3, 4, 6, 7, 8, 9, 1, 2, 6, 7, 2, 1, 9, 5, 3, 4, 8, 1, 9, 8, 3, 4, 2, 5, 6, 7, 8, 5, 9, 7, 6, 1,
  4, 2, 3, 4, 2, 6, 8, 5, 3, 7, 9, 1, 7, 1, 3, 9, 2, 4, 8, 5, 6, 9, 6, 1, 5, 3, 7, 2, 8, 4, 2, 8, 7,
  4, 1, 9, 6, 3, 5, 3, 4, 5, 2, 8, 6, 1, 7, 9,
];

export function NeonSudokuGame({ onScoreSubmit }: { onScoreSubmit?: (score: number) => void }) {
  const [board, setBoard] = useState([...puzzle]);
  const [selected, setSelected] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("Select a cell");
  const submittedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const conflicts = useMemo(
    () =>
      new Set(board.flatMap((value, index) => (value && value !== solution[index] ? [index] : []))),
    [board],
  );

  const reset = () => {
    setBoard([...puzzle]);
    setSelected(null);
    setSeconds(0);
    submittedRef.current = false;
    setMessage("Select a cell");
  };

  const enter = (value: number) => {
    if (selected === null || puzzle[selected]) return;
    setBoard((current) => current.map((cell, index) => (index === selected ? value : cell)));
    setMessage("Keep going");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/^[1-9]$/.test(event.key)) enter(Number(event.key));
      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") enter(0);
      if (event.key.toLowerCase() === "r") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const check = () => {
    if (board.every((value, index) => value === solution[index])) {
      setMessage("Solved!");
      if (!submittedRef.current) {
        submittedRef.current = true;
        onScoreSubmit?.(Math.max(1, 10000 - seconds * 10));
      }
    } else {
      setMessage(
        conflicts.size
          ? `${conflicts.size} mistake${conflicts.size === 1 ? "" : "s"}`
          : "Puzzle incomplete",
      );
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#070b1c] p-3 text-white">
      <div className="flex w-full max-w-[560px] justify-between text-sm font-bold">
        <span>{message}</span>
        <span>
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="grid aspect-square w-full max-w-[560px] grid-cols-9 overflow-hidden rounded-xl border-2 border-cyan-300 bg-[#10162f] shadow-[0_0_32px_rgba(34,211,238,.25)]">
        {board.map((value, index) => {
          const row = Math.floor(index / 9);
          const col = index % 9;
          return (
            <button
              key={index}
              onClick={() => !puzzle[index] && setSelected(index)}
              className={[
                "grid place-items-center border-cyan-100/15 text-lg font-black sm:text-2xl",
                col % 3 === 2 && col !== 8 ? "border-r-2 border-r-cyan-300/70" : "border-r",
                row % 3 === 2 && row !== 8 ? "border-b-2 border-b-cyan-300/70" : "border-b",
                selected === index ? "bg-fuchsia-500/35" : "",
                puzzle[index] ? "text-cyan-200" : "text-white",
                conflicts.has(index) ? "bg-rose-500/35 text-rose-200" : "",
              ].join(" ")}
            >
              {value || ""}
            </button>
          );
        })}
      </div>
      <div className="flex w-full max-w-[560px] flex-wrap justify-center gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
          <button
            key={number}
            onClick={() => enter(number)}
            className="size-9 rounded-lg bg-cyan-400/15 font-black text-cyan-100 hover:bg-cyan-400/30"
          >
            {number}
          </button>
        ))}
        <button onClick={() => enter(0)} className="rounded-lg bg-white/10 px-3 text-xs font-bold">
          Erase
        </button>
        <button onClick={check} className="rounded-lg bg-fuchsia-500/25 px-3 text-xs font-bold">
          Check
        </button>
        <button onClick={reset} className="rounded-lg bg-white/10 px-3 text-xs font-bold">
          Restart
        </button>
      </div>
    </div>
  );
}
