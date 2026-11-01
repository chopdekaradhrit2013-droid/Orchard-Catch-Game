export type FruitKind = "apple" | "banana" | "orange" | "strawberry";

export type FruitDraw = {
  kind: FruitKind;
  x: number;
  y: number;
  r: number;
  rot: number;
};

export type Scene = {
  basketX: number;
  vx: number;
  time: number;
  reducedMotion: boolean;
  fruits: FruitDraw[];
};

const SKY_TOP = "#5eb0e4";
const SKY_MID = "#9fd4f2";
const HORIZON = "#ffe3c2";
const SUN = "#ffd56a";
const SUN_CORE = "#fff4c4";
const HILL_FAR = "#9ec98a";
const HILL_MID = "#5ea35a";
const HILL_NEAR = "#3d8c49";
const GRASS = "#2f7a3e";
const GRASS_DEEP = "#246833";
const CREAM = "#fff6ea";
const CITRUS = "#ef7a28";
const WOOD = "#e0a15a";
const WOOD_MID = "#c4843c";
const WOOD_DARK = "#8d5a28";
const WOOD_DEEP = "#6e4322";

const TREES = [
  { x: 0.08, s: 1 },
  { x: 0.18, s: 0.72 },
  { x: 0.84, s: 0.86 },
  { x: 0.93, s: 1.05 },
];

const FLOWERS = [
  { x: 0.12, k: 0 },
  { x: 0.22, k: 1 },
  { x: 0.33, k: 0 },
  { x: 0.46, k: 1 },
  { x: 0.58, k: 0 },
  { x: 0.7, k: 1 },
  { x: 0.81, k: 0 },
  { x: 0.9, k: 1 },
];

export function basketPixelWidth(viewW: number, viewH: number): number {
  const unit = Math.min(viewW, viewH);
  return Math.max(96, Math.min(176, unit * 0.22));
}

export function fruitRadius(viewW: number, viewH: number): number {
  const unit = Math.min(viewW, viewH);
  return Math.max(15, Math.min(24, unit * 0.03));
}

export type BasketPose = {
  x: number;
  baseY: number;
  basketW: number;
  tilt: number;
  mouthX: number;
  mouthY: number;
  mouthRx: number;
  mouthRy: number;
};

export function basketPose(
  viewW: number,
  viewH: number,
  basketX: number,
  vx: number,
  time: number,
  reducedMotion: boolean,
): BasketPose {
  const groundH = Math.max(88, viewH * 0.18);
  const groundY = viewH - groundH;
  const basketW = basketPixelWidth(viewW, viewH);
  const bob = reducedMotion ? 0 : Math.sin(time * 2.2) * 2.5;
  const baseY = groundY + groundH * 0.22 + bob;
  const basketH = basketW * 0.58;
  const tilt = Math.max(-0.18, Math.min(0.18, vx * 0.2));
  const localY = -basketH * 0.9;
  const mouthX = basketX * viewW + -localY * Math.sin(tilt);
  const mouthY = baseY + localY * Math.cos(tilt);
  return {
    x: basketX * viewW,
    baseY,
    basketW,
    tilt,
    mouthX,
    mouthY,
    mouthRx: basketW * 0.33,
    mouthRy: Math.max(12, basketH * 0.2),
  };
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  scene: Scene,
) {
  const w = viewW;
  const h = viewH;
  const t = scene.reducedMotion ? 0 : scene.time;
  const groundH = Math.max(88, h * 0.18);
  const groundY = h - groundH;
  const shift = (scene.basketX - 0.5) * Math.min(48, w * 0.04);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(0.48, SKY_MID);
  sky.addColorStop(1, HORIZON);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  drawSun(ctx, w * 0.78, h * 0.16, Math.min(w, h) * 0.075);
  drawCloud(ctx, w * 0.18 + Math.sin(t * 0.15) * 10, h * 0.14, Math.min(w, h) * 0.09);
  drawCloud(ctx, w * 0.42 + Math.sin(t * 0.11 + 1) * 14, h * 0.22, Math.min(w, h) * 0.07);
  drawCloud(ctx, w * 0.62 + Math.sin(t * 0.13 + 2) * 8, h * 0.11, Math.min(w, h) * 0.055);

  drawHill(ctx, w, h, groundY - h * 0.16, h * 0.045, HILL_FAR, 0.6, shift * 0.25);
  drawHill(ctx, w, h, groundY - h * 0.08, h * 0.05, HILL_MID, 1.4, shift * 0.45);
  drawHill(ctx, w, h, groundY + 8, h * 0.035, HILL_NEAR, 2.2, shift * 0.7);

  const treeBase = groundY + 6;
  for (const tree of TREES) {
    drawTree(ctx, tree.x * w + shift * 0.85, treeBase, Math.min(w, h) * 0.16 * tree.s);
  }

  const grass = ctx.createLinearGradient(0, groundY, 0, h);
  grass.addColorStop(0, GRASS);
  grass.addColorStop(1, GRASS_DEEP);
  ctx.fillStyle = grass;
  ctx.fillRect(0, groundY, w, groundH);

  ctx.strokeStyle = "rgba(255, 246, 234, 0.18)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const y = groundY + 16 + i * (groundH / 10);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y + 4, w * 0.6, y - 3, w, y + 2);
    ctx.stroke();
  }

  for (const flower of FLOWERS) {
    const y = groundY + 22 + (flower.k === 0 ? 10 : 26);
    drawFlower(ctx, flower.x * w, y, flower.k);
  }

  for (const fruit of scene.fruits) drawFruit(ctx, fruit);

  const pose = basketPose(w, h, scene.basketX, scene.vx, scene.time, scene.reducedMotion);
  drawBasket(ctx, pose.x, pose.baseY, pose.basketW, pose.tilt);
}

function drawFruit(ctx: CanvasRenderingContext2D, fruit: FruitDraw) {
  ctx.save();
  ctx.translate(fruit.x, fruit.y + fruit.r * 0.15);
  ctx.fillStyle = "rgba(23, 48, 40, 0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 0, fruit.r * 0.72, fruit.r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(fruit.x, fruit.y);
  ctx.rotate(fruit.rot);
  if (fruit.kind === "apple") drawApple(ctx, fruit.r);
  else if (fruit.kind === "banana") drawBanana(ctx, fruit.r);
  else if (fruit.kind === "orange") drawOrange(ctx, fruit.r);
  else drawStrawberry(ctx, fruit.r);
  ctx.restore();
}

function drawApple(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = "#e24b4b";
  ctx.beginPath();
  ctx.arc(0, r * 0.06, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 246, 234, 0.7)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.28, r * 0.22, r * 0.12, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = WOOD_DEEP;
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.82);
  ctx.quadraticCurveTo(r * 0.08, -r * 1.2, 0, -r * 1.32);
  ctx.stroke();
  ctx.fillStyle = "#2f8f55";
  ctx.beginPath();
  ctx.ellipse(r * 0.32, -r * 1.02, r * 0.36, r * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBanana(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeStyle = "#f2c14e";
  ctx.lineWidth = r * 0.78;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, r * 0.42);
  ctx.quadraticCurveTo(-r * 0.1, -r * 1.2, r * 1.15, r * 0.05);
  ctx.stroke();
  ctx.strokeStyle = "#e0a15a";
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.moveTo(-r * 0.72, r * 0.12);
  ctx.quadraticCurveTo(-r * 0.05, -r * 0.72, r * 0.78, -r * 0.08);
  ctx.stroke();
  ctx.fillStyle = WOOD_DEEP;
  ctx.beginPath();
  ctx.arc(-r * 1.05, r * 0.42, r * 0.16, 0, Math.PI * 2);
  ctx.arc(r * 1.15, r * 0.05, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

function drawOrange(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = CITRUS;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 246, 234, 0.45)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.24, r * 0.14, -0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c45e16";
  ctx.beginPath();
  ctx.arc(r * 0.08, r * 0.12, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2f8f55";
  ctx.beginPath();
  ctx.ellipse(r * 0.05, -r * 0.92, r * 0.28, r * 0.12, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawStrawberry(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = "#e23b4a";
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.72);
  ctx.bezierCurveTo(r * 1.15, -r * 0.15, r * 0.9, r * 0.95, 0, r * 1.05);
  ctx.bezierCurveTo(-r * 0.9, r * 0.95, -r * 1.15, -r * 0.15, 0, -r * 0.72);
  ctx.fill();
  ctx.fillStyle = "#fff6ea";
  const seeds: [number, number][] = [
    [-0.28, 0.05],
    [0.22, 0.12],
    [0, 0.38],
    [-0.4, 0.42],
    [0.38, 0.48],
    [-0.12, 0.68],
    [0.18, 0.72],
  ];
  for (const [sx, sy] of seeds) {
    ctx.beginPath();
    ctx.ellipse(sx * r, sy * r, r * 0.07, r * 0.1, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#2f8f55";
  ctx.beginPath();
  ctx.ellipse(-r * 0.22, -r * 0.78, r * 0.28, r * 0.14, -0.5, 0, Math.PI * 2);
  ctx.ellipse(r * 0.2, -r * 0.8, r * 0.26, r * 0.13, 0.45, 0, Math.PI * 2);
  ctx.ellipse(0, -r * 0.95, r * 0.16, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3.2);
  glow.addColorStop(0, "rgba(255, 213, 106, 0.95)");
  glow.addColorStop(0.35, "rgba(255, 213, 106, 0.28)");
  glow.addColorStop(1, "rgba(255, 213, 106, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = SUN;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SUN_CORE;
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.22, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "rgba(255, 246, 234, 0.92)";
  ctx.beginPath();
  ctx.arc(x, y, s * 0.55, 0, Math.PI * 2);
  ctx.arc(x + s * 0.5, y + s * 0.08, s * 0.42, 0, Math.PI * 2);
  ctx.arc(x - s * 0.48, y + s * 0.1, s * 0.38, 0, Math.PI * 2);
  ctx.arc(x + s * 0.12, y - s * 0.22, s * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawHill(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  y: number,
  amp: number,
  color: string,
  phase: number,
  shift: number,
) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 10) {
    const sample = x + shift;
    const wave =
      Math.sin(sample * 0.007 + phase) * amp + Math.sin(sample * 0.018 + phase * 1.7) * amp * 0.35;
    ctx.lineTo(x, y + wave);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = WOOD_DEEP;
  roundRect(ctx, x - s * 0.07, y - s * 0.55, s * 0.14, s * 0.58, s * 0.04);
  ctx.fill();

  ctx.fillStyle = "#2f8f55";
  ctx.beginPath();
  ctx.arc(x, y - s * 0.78, s * 0.32, 0, Math.PI * 2);
  ctx.arc(x - s * 0.24, y - s * 0.58, s * 0.26, 0, Math.PI * 2);
  ctx.arc(x + s * 0.24, y - s * 0.56, s * 0.24, 0, Math.PI * 2);
  ctx.arc(x, y - s * 0.5, s * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3fa864";
  ctx.beginPath();
  ctx.arc(x - s * 0.08, y - s * 0.88, s * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = CITRUS;
  const fruits: [number, number][] = [
    [-0.16, -0.7],
    [0.12, -0.78],
    [0.18, -0.52],
    [-0.02, -0.48],
  ];
  for (const [fx, fy] of fruits) {
    ctx.beginPath();
    ctx.arc(x + fx * s, y + fy * s, s * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, kind: number) {
  ctx.strokeStyle = "#1f6b38";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 12);
  ctx.stroke();
  ctx.fillStyle = kind === 0 ? CREAM : CITRUS;
  ctx.beginPath();
  ctx.arc(x, y - 14, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = kind === 0 ? CITRUS : CREAM;
  ctx.beginPath();
  ctx.arc(x, y - 14, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawBasket(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  width: number,
  tilt: number,
) {
  const w = width;
  const h = width * 0.58;

  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(tilt);

  ctx.fillStyle = "rgba(23, 48, 40, 0.2)";
  ctx.beginPath();
  ctx.ellipse(tilt * 40, 10, w * 0.4, w * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = Math.max(5, w * 0.045);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, -h * 0.72, w * 0.34, Math.PI + 0.55, Math.PI * 2 - 0.55, false);
  ctx.stroke();

  basketBody(ctx, w, h);
  ctx.fillStyle = WOOD;
  ctx.fill();

  ctx.save();
  basketBody(ctx, w, h);
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    const y = -h * 0.92 + i * (h * 0.16);
    ctx.strokeStyle = i % 2 === 0 ? WOOD_MID : WOOD_DARK;
    ctx.lineWidth = h * 0.07;
    ctx.beginPath();
    ctx.moveTo(-w, y);
    ctx.quadraticCurveTo(0, y + h * 0.05, w, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = WOOD_DEEP;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.9, w * 0.3, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f2c98a";
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.9, w * 0.36, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = Math.max(2, w * 0.018);
  ctx.stroke();

  ctx.fillStyle = CITRUS;
  ctx.beginPath();
  ctx.ellipse(w * 0.22, -h * 0.9, w * 0.055, h * 0.07, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.2, -h * 0.9);
  ctx.lineTo(w * 0.28, -h * 0.72);
  ctx.lineTo(w * 0.16, -h * 0.74);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function basketBody(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(-w * 0.34, -h * 0.82);
  ctx.lineTo(-w * 0.46, -h * 0.12);
  ctx.quadraticCurveTo(0, h * 0.08, w * 0.46, -h * 0.12);
  ctx.lineTo(w * 0.34, -h * 0.82);
  ctx.quadraticCurveTo(0, -h * 1.02, -w * 0.34, -h * 0.82);
  ctx.closePath();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
