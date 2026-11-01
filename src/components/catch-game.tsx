import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, ArrowRight, Leaf, Play } from "lucide-react";
import { mountGame } from "@/game/engine";

export function CatchGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchDir = useRef(0);
  const apiRef = useRef<{ start: () => void } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const api = mountGame(canvas, {
      getTouchDir: () => touchDir.current,
      onPlayingChange: setPlaying,
      onScore: setScore,
    });
    apiRef.current = api;
    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  function hold(dir: -1 | 1) {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        touchDir.current = dir;
      },
      onPointerUp: () => {
        touchDir.current = 0;
      },
      onPointerCancel: () => {
        touchDir.current = 0;
      },
      onLostPointerCapture: () => {
        touchDir.current = 0;
      },
    };
  }

  return (
    <main className="game-shell relative h-dvh w-full overflow-hidden" aria-label="Orchard Catch">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      <header className="safe-top pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-3">
        <div className="flex min-w-0 items-center gap-2 rounded-full bg-cream/95 px-3 py-2 text-ink shadow-md">
          <Leaf className="size-5 shrink-0 text-leaf" aria-hidden="true" />
          <span className="font-display truncate text-base font-semibold sm:text-lg">Orchard Catch</span>
        </div>
        <div
          className="flex items-baseline gap-2 rounded-full bg-cream/95 px-4 py-2 text-ink shadow-md"
          aria-live="polite"
        >
          <span className="text-sm font-medium">Score</span>
          <span id="score-value" className="font-display text-3xl leading-none font-semibold tabular-nums">
            {score}
          </span>
        </div>
      </header>

      {!playing && (
        <div className="absolute inset-0 z-30 flex items-start justify-center px-4 pt-28 sm:pt-32">
          <div className="w-full max-w-sm rounded-3xl bg-cream/95 px-6 py-7 text-center text-ink shadow-xl ring-1 ring-ink/10">
            <p className="text-sm font-semibold tracking-wide text-leaf">Sunny meadow</p>
            <h1 className="font-display mt-1 text-4xl leading-tight font-semibold">Ready the basket</h1>
            <p className="mt-3 text-base leading-relaxed text-ink/80">
              The lane is yours. Start, then slide the basket left and right across the grass.
            </p>
            <button
              id="start-game"
              type="button"
              className="motion-safe mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-citrus text-base font-semibold text-ink shadow-md transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:translate-y-px"
              onClick={() => apiRef.current?.start()}
            >
              <Play className="size-5" aria-hidden="true" fill="currentColor" />
              Start Game
            </button>
            <p className="mt-4 text-sm leading-relaxed text-ink/70">
              Arrows or A and D on a keyboard. Drag the meadow, or use the side buttons.
            </p>
          </div>
        </div>
      )}

      {playing && (
        <div className="pointer-events-none absolute inset-0 z-30">
          <button
            type="button"
            className="thumb-btn pointer-events-auto absolute left-4 grid size-14 place-items-center rounded-full bg-cream/95 text-ink shadow-lg ring-1 ring-ink/10"
            aria-label="Move basket left"
            {...hold(-1)}
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="thumb-btn pointer-events-auto absolute right-4 grid size-14 place-items-center rounded-full bg-cream/95 text-ink shadow-lg ring-1 ring-ink/10"
            aria-label="Move basket right"
            {...hold(1)}
          >
            <ArrowRight className="size-6" aria-hidden="true" />
          </button>
        </div>
      )}
    </main>
  );
}
