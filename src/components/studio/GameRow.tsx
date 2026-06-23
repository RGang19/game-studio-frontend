import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { type Game } from "@/lib/games-data";
import { GameCard } from "./GameCard";

export function GameRow({
  title,
  games,
  viewAllTo,
}: {
  title: string;
  games: Game[];
  viewAllTo?: string;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    dragFree: true,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const emblaNode = emblaApi.rootNode();
    
    let lastWheelTime = 0;
    const handleWheel = (e: WheelEvent) => {
      const deltaX = e.deltaX;
      const deltaY = e.deltaY;
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      const delta = isHorizontal ? deltaX : deltaY;
      
      if (Math.abs(delta) < 10) return;
      
      const now = Date.now();
      if (now - lastWheelTime < 200) return;
      
      if (delta > 0 && emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
        e.preventDefault();
        lastWheelTime = now;
      } else if (delta < 0 && emblaApi.canScrollPrev()) {
        emblaApi.scrollPrev();
        e.preventDefault();
        lastWheelTime = now;
      }
    };

    emblaNode.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      emblaNode.removeEventListener("wheel", handleWheel);
    };
  }, [emblaApi]);

  return (
    <section className="px-6 pb-12 lg:px-10 lg:pb-16">
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-black uppercase tracking-tight text-white lg:text-5xl">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className="grid size-12 place-items-center rounded-lg border border-neon-violet/70 bg-[#1b072e]/50 text-[#d87cff] transition hover:bg-neon-violet/20 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Previous games"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            className="grid size-12 place-items-center rounded-lg border border-neon-violet/70 bg-[#1b072e]/50 text-[#d87cff] transition hover:bg-neon-violet/20 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Next games"
          >
            <ChevronRight className="size-5" />
          </button>
          {viewAllTo && (
            <a
              href={viewAllTo}
              className="label-mono flex h-12 items-center gap-3 rounded-lg border border-neon-violet/70 bg-[#1b072e]/50 px-5 text-[10px] font-bold text-[#d87cff] transition hover:bg-neon-violet/20"
            >
              View All
              <ArrowUpRight className="size-4" />
            </a>
          )}
        </div>
      </div>
      <div className="overflow-hidden cursor-grab active:cursor-grabbing select-none overscroll-x-contain" ref={emblaRef}>
        <div className="flex gap-4">
          {games.map((g, i) => (
            <div
              key={g.title}
              className="min-w-0 shrink-0 grow-0 basis-[calc(50%-8px)] sm:basis-[calc(33.333%-11px)] xl:basis-[calc(25%-12px)] 2xl:basis-[calc(20%-13px)]"
            >
              <GameCard game={g} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
