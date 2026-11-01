import { basketPixelWidth, basketPose, drawScene, fruitRadius, type FruitDraw, type FruitKind } from "@/game/draw";

const MAX_SPEED = 0.92;
const KEY_RESPONSE = 14;
const POINTER_RESPONSE = 16;
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "KeyA", "KeyD"]);
const GRAVITY = 340;
const FRUIT_KINDS: FruitKind[] = ["apple", "banana", "orange", "strawberry"];

type Fruit = FruitDraw & { vy: number; spin: number };

export type ControlsProbe = {
  getX: () => number;
  getYaw: () => number;
  getSpeed: () => number;
  getScore: () => number;
  getFruits: () => { kind: FruitKind; x: number; y: number }[];
  setKeys: (codes: string[]) => void;
  setBasketX: (x: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fruitCaught(
  fruit: Fruit,
  prevY: number,
  pose: { mouthX: number; mouthY: number; mouthRx: number; mouthRy: number },
) {
  const dx = Math.abs(fruit.x - pose.mouthX);
  const extra = fruit.kind === "banana" ? fruit.r * 0.9 : fruit.r * 0.25;
  if (dx > pose.mouthRx + extra) return false;
  const top = pose.mouthY - pose.mouthRy;
  const bottom = pose.mouthY + pose.mouthRy;
  if (fruit.y + fruit.r < top) return false;
  if (prevY - fruit.r > bottom) return false;
  return fruit.y + fruit.r >= top && prevY - fruit.r <= bottom;
}

function radialX(x: number, y: number, deadzone = 0.18) {
  const mag = Math.hypot(x, y);
  if (mag < deadzone) return 0;
  const scale = (mag - deadzone) / (1 - deadzone) / mag;
  return clamp(x * scale, -1, 1);
}

export function mountGame(
  canvas: HTMLCanvasElement,
  hooks: {
    getTouchDir: () => number;
    onPlayingChange: (playing: boolean) => void;
    onScore: (score: number) => void;
  },
) {
  const keys = new Set<string>();
  const fruits: Fruit[] = [];
  let score = 0;
  let spawnIn = 0.35;
  let kindBag: FruitKind[] = [];
  const state = {
    playing: false,
    basketX: 0.5,
    vx: 0,
    time: 0,
    pointerX: null as number | null,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
  const view = { w: 1, h: 1, dpr: 1 };
  let raf = 0;
  let last = performance.now();

  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onReduce = () => {
    state.reducedMotion = reduceQuery.matches;
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = Math.max(1, rect.width);
    view.h = Math.max(1, rect.height);
    view.dpr = dpr;
    canvas.width = Math.round(view.w * dpr);
    canvas.height = Math.round(view.h * dpr);
  }

  function margin() {
    return basketPixelWidth(view.w, view.h) / view.w / 2;
  }

  function readPadX() {
    const pads = navigator.getGamepads?.();
    if (!pads) return 0;
    let move = 0;
    for (const pad of pads) {
      if (!pad) continue;
      move += radialX(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      if (pad.buttons[14]?.pressed) move -= 1;
      if (pad.buttons[15]?.pressed) move += 1;
    }
    return clamp(move, -1, 1);
  }

  function step(dt: number) {
    state.time += dt;
    if (!state.playing) {
      state.vx *= Math.exp(-6 * dt);
      return;
    }

    let move = hooks.getTouchDir() + readPadX();
    if (keys.has("ArrowLeft") || keys.has("KeyA")) move -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) move += 1;
    move = clamp(move, -1, 1);

    if (move !== 0 || state.pointerX == null) {
      const target = move * MAX_SPEED;
      state.vx += (target - state.vx) * (1 - Math.exp(-KEY_RESPONSE * dt));
      state.basketX += state.vx * dt;
    } else {
      const dx = state.pointerX - state.basketX;
      state.basketX += dx * (1 - Math.exp(-POINTER_RESPONSE * dt));
      state.vx = dx * 5;
    }

    const edge = margin();
    state.basketX = clamp(state.basketX, edge, 1 - edge);
    stepFruits(dt);
  }

  function stepFruits(dt: number) {
    if (!state.playing) return;
    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawnFruit();
      spawnIn = 0.8 + Math.random() * 0.45;
    }

    const pose = basketPose(view.w, view.h, state.basketX, state.vx, state.time, state.reducedMotion);
    let scored = false;
    for (let i = fruits.length - 1; i >= 0; i--) {
      const fruit = fruits[i];
      const prevY = fruit.y;
      fruit.vy += GRAVITY * dt;
      fruit.y += fruit.vy * dt;
      if (!state.reducedMotion) fruit.rot += fruit.spin * dt;
      if (fruitCaught(fruit, prevY, pose)) {
        fruits.splice(i, 1);
        score += 10;
        scored = true;
        continue;
      }
      if (fruit.y - fruit.r > view.h + 40) fruits.splice(i, 1);
    }
    if (scored) hooks.onScore(score);
  }

  function nextKind() {
    if (kindBag.length === 0) {
      kindBag = [...FRUIT_KINDS];
      for (let i = kindBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const swap = kindBag[i];
        kindBag[i] = kindBag[j];
        kindBag[j] = swap;
      }
    }
    return kindBag.pop() ?? "apple";
  }

  function spawnFruit() {
    const r = fruitRadius(view.w, view.h);
    const kind = nextKind();
    const pad = r * (kind === "banana" ? 1.3 : 1);
    fruits.push({
      kind,
      x: pad + Math.random() * Math.max(1, view.w - pad * 2),
      y: -r * 1.4,
      r,
      rot: (Math.random() - 0.5) * 0.4,
      spin: (Math.random() - 0.5) * 1.4,
      vy: 28 + Math.random() * 36,
    });
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      drawScene(ctx, view.w, view.h, { ...state, fruits });
    }
    raf = requestAnimationFrame(frame);
  }

  function normX(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return state.basketX;
    return (event.clientX - rect.left) / rect.width;
  }

  function onKeyDown(event: KeyboardEvent) {
    if (GAME_KEYS.has(event.code)) event.preventDefault();
    keys.add(event.code);
  }

  function onKeyUp(event: KeyboardEvent) {
    keys.delete(event.code);
  }

  function clearKeys() {
    keys.clear();
    state.pointerX = null;
  }

  function onPointerDown(event: PointerEvent) {
    if (!state.playing) return;
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    state.pointerX = normX(event);
  }

  function onPointerMove(event: PointerEvent) {
    if (state.pointerX == null) return;
    state.pointerX = normX(event);
  }

  function endPointer(event: PointerEvent) {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    state.pointerX = null;
  }

  function onContextMenu(event: Event) {
    event.preventDefault();
  }

  function start() {
    if (state.playing) return;
    state.playing = true;
    hooks.onPlayingChange(true);
  }

  const probe: ControlsProbe = {
    getX: () => state.basketX,
    getYaw: () => 0,
    getSpeed: () => Math.abs(state.vx),
    getScore: () => score,
    getFruits: () => fruits.map((fruit) => ({ kind: fruit.kind, x: fruit.x / view.w, y: fruit.y / view.h })),
    setKeys: (codes) => {
      keys.clear();
      for (const code of codes) keys.add(code);
    },
    setBasketX: (x) => {
      const edge = margin();
      state.basketX = clamp(x, edge, 1 - edge);
      state.vx = 0;
    },
  };
  window.__controlsTest = probe;

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  document.addEventListener("visibilitychange", clearKeys);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("contextmenu", onContextMenu);
  reduceQuery.addEventListener("change", onReduce);
  raf = requestAnimationFrame(frame);

  return {
    start,
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", clearKeys);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", endPointer);
      canvas.removeEventListener("contextmenu", onContextMenu);
      reduceQuery.removeEventListener("change", onReduce);
      if (window.__controlsTest === probe) delete window.__controlsTest;
    },
  };
}
