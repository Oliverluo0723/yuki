import type p5 from 'p5';
import { noise1 } from '../noise1';
import { type Flake, flakeRadius } from '../snow/field';
import { mix, type RGB } from './palette';
import {
  type Frame,
  isGrounded,
  type Lamp,
  lamps,
  nearness,
  type SceneKind,
  toScreen,
} from './scene';

/**
 * 平視的背景（試作）：天空的漸層、地平線的霧、遠處的山稜和樹影、雪地；
 * 場景 3 再加一條路和一排路燈。雪片本身仍然由 fieldView 畫。
 */

const SKY_TOP: [RGB, RGB] = [
  [6, 9, 16],
  [196, 203, 211],
];
const SKY_HORIZON: [RGB, RGB] = [
  [30, 36, 50],
  [233, 236, 238],
];
const FOG: [RGB, RGB] = [
  [42, 49, 64],
  [240, 242, 243],
];
const GROUND_FAR: [RGB, RGB] = [
  [44, 51, 66],
  [244, 246, 247],
];
const GROUND_NEAR: [RGB, RGB] = [
  [16, 20, 30],
  [216, 221, 227],
];
const TREE: [RGB, RGB] = [
  [7, 10, 16],
  [118, 128, 138],
];
const DRIFT: [RGB, RGB] = [
  [4, 6, 12],
  [150, 165, 186],
];
const POLE: [RGB, RGB] = [
  [9, 11, 16],
  [92, 100, 110],
];
const WARM: RGB = [255, 221, 170];

const at = (pair: [RGB, RGB], dayness: number) => mix(pair[0], pair[1], dayness);
const rgba = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 固定種子的亂數：重畫樹影時每棵樹都在原位。 */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Strip {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  dayness: number;
}

/** 山稜和樹影預先畫成一條長圖，底邊貼在地平線上。 */
function makeStrip(w: number, h: number, dayness: number): Strip {
  const density = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * density);
  canvas.height = Math.ceil(h * density);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.scale(density, density);

  const horizon = at(SKY_HORIZON, dayness);
  const tree = at(TREE, dayness);

  // 遠處的山稜：只比天空暗一點
  ctx.fillStyle = rgba(mix(horizon, tree, 0.3));
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) {
    const n = 0.7 * noise1(x / (h * 4) + 9) + 0.3 * noise1(x / (h * 0.9) + 40);
    ctx.lineTo(x, h - h * (0.3 + 0.68 * n));
  }
  ctx.lineTo(w, h);
  ctx.fill();

  // 近一點的針葉樹：一叢一叢的，中間有空地
  const rng = seeded(7);
  ctx.fillStyle = rgba(mix(horizon, tree, 0.8));
  let x = 0;
  while (x < w) {
    const cluster = noise1(x / (h * 1.6));
    if (cluster < 0.34) {
      x += h * 0.08;
      continue;
    }
    const th = h * (0.22 + 0.5 * (cluster - 0.34)) * (0.7 + 0.6 * rng());
    const tw = th * 0.42;
    for (let k = 0; k < 3; k++) {
      const half = (tw / 2) * (0.5 + 0.25 * k);
      ctx.beginPath();
      ctx.moveTo(x, h - th * (1 - k * 0.22));
      ctx.lineTo(x - half, h - th * (0.55 - k * 0.27));
      ctx.lineTo(x + half, h - th * (0.55 - k * 0.27));
      ctx.fill();
    }
    x += tw * (0.35 + 0.5 * rng());
  }
  return { canvas, w, h, dayness };
}

/** 雪地上固定的幾道起伏，越遠越扁、越密，給地面遠近。 */
const DRIFTS = (() => {
  const rng = seeded(21);
  return Array.from({ length: 16 }, (_, i) => ({
    near: 0.1 + 1.6 * (i / 15) ** 1.6,
    u: (rng() - 0.5) * 3.2,
    size: 0.7 + 0.9 * rng(),
  }));
})();

export class Backdrop {
  private strip: Strip | null = null;
  private warm: p5.Graphics | null = null;

  /** 在清掉畫面之後、畫雪之前呼叫。alpha 是平視佔的比例。 */
  draw(p: p5, scene: SceneKind, f: Frame, dayness: number, alpha: number): void {
    if (scene === 0 || alpha <= 0) return;
    const ctx = p.drawingContext as CanvasRenderingContext2D;
    const W = p.width;
    const H = p.height;
    const R = Math.hypot(W, H); // 不管怎麼歪都蓋得滿
    const night = 1 - dayness;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(f.cx, f.cy);
    ctx.rotate(Math.atan2(-f.down.x, f.down.y));
    ctx.translate(0, f.horizon); // 之後 y = 0 就是地平線

    // 天空
    const sky = ctx.createLinearGradient(0, -0.9 * H, 0, 0);
    sky.addColorStop(0, rgba(at(SKY_TOP, dayness)));
    sky.addColorStop(1, rgba(at(SKY_HORIZON, dayness)));
    ctx.fillStyle = sky;
    ctx.fillRect(-R, -2 * R, 2 * R, 2 * R + 1);

    // 山稜和樹影
    const sw = Math.ceil(2 * R);
    const sh = Math.ceil(0.26 * H);
    const s = this.strip;
    if (!s || s.w !== sw || s.h !== sh || Math.abs(s.dayness - dayness) > 0.03) {
      this.strip = makeStrip(sw, sh, dayness);
    }
    if (this.strip) ctx.drawImage(this.strip.canvas, -sw / 2, -sh, sw, sh);

    // 雪地：地平線那邊最亮，越靠近腳邊越暗
    const ground = ctx.createLinearGradient(0, 0, 0, 0.5 * H);
    ground.addColorStop(0, rgba(at(GROUND_FAR, dayness)));
    ground.addColorStop(1, rgba(at(GROUND_NEAR, dayness)));
    ctx.fillStyle = ground;
    ctx.fillRect(-R, 0, 2 * R, 2 * R);

    // 雪地的起伏
    const drift = at(DRIFT, dayness);
    for (const d of DRIFTS) {
      const rx = 0.55 * H * d.near * d.size;
      ctx.save();
      ctx.translate((d.u * H + f.sway) * d.near, f.eye * d.near);
      ctx.scale(1, 0.07);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, rgba(drift, 0.22));
      g.addColorStop(1, rgba(drift, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
      ctx.restore();
    }

    const row = scene === 3 ? lamps(f, W, H) : [];
    if (scene === 3) this.road(ctx, f, row, dayness);

    // 地平線的霧：吃掉樹的下半和雪地的邊緣
    const fog = at(FOG, dayness);
    const band = ctx.createLinearGradient(0, -0.06 * H, 0, 0.06 * H);
    band.addColorStop(0, rgba(fog, 0));
    band.addColorStop(0.5, rgba(fog, 0.8));
    band.addColorStop(1, rgba(fog, 0));
    ctx.fillStyle = band;
    ctx.fillRect(-R, -0.06 * H, 2 * R, 0.12 * H);

    if (scene === 3) this.lampPosts(ctx, f, row, dayness, night);

    ctx.restore();
  }

  /** 路上的兩道車轍，往消失點收攏。 */
  private road(ctx: CanvasRenderingContext2D, f: Frame, row: Lamp[], dayness: number): void {
    const side = row[0].u / row[0].near - f.sway; // 路燈離路中央多遠（near = 1 時的 px）
    const far = 4; // 畫到比螢幕底更近的地方
    ctx.fillStyle = rgba(at(DRIFT, dayness), lerp(0.22, 0.18, dayness));
    for (const track of [-0.3, 0.3]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(((track - 0.045) * side + f.sway) * far, f.eye * far);
      ctx.lineTo(((track + 0.045) * side + f.sway) * far, f.eye * far);
      ctx.fill();
    }
  }

  private lampPosts(
    ctx: CanvasRenderingContext2D,
    f: Frame,
    row: Lamp[],
    dayness: number,
    night: number,
  ): void {
    const pole = at(POLE, dayness);
    // 遠的先畫
    for (let i = row.length - 1; i >= 0; i--) {
      const l = row[i];
      const fade = lerp(0.3, 0.95, Math.min(1, l.near / 0.75)); // 遠的被霧吃掉
      const arm = armOf(l);
      const thick = Math.max(1, 0.04 * f.eye * l.near);

      // 地上的光
      if (night > 0.02) {
        const rx = l.reach * 1.1;
        ctx.save();
        ctx.translate(l.u - arm, l.foot);
        ctx.scale(1, 0.2);
        const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        pool.addColorStop(0, rgba(WARM, 0.3 * night * fade));
        pool.addColorStop(1, rgba(WARM, 0));
        ctx.fillStyle = pool;
        ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
        ctx.restore();
      }

      // 燈柱和伸向路面的燈臂
      ctx.strokeStyle = rgba(pole, fade);
      ctx.lineWidth = thick;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(l.u, l.foot);
      ctx.lineTo(l.u, l.head);
      ctx.lineTo(l.u - arm, l.head);
      ctx.stroke();

      // 光暈：遠的燈在霧裡暈得比較開
      if (night > 0.02) {
        const r = Math.max(10, l.reach * (0.9 + 0.8 * (1 - fade)));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const halo = ctx.createRadialGradient(l.u - arm, l.head, 0, l.u - arm, l.head, r);
        halo.addColorStop(0, rgba(WARM, 0.6 * night));
        halo.addColorStop(0.06, rgba(WARM, 0.32 * night));
        halo.addColorStop(0.35, rgba(WARM, 0.08 * night));
        halo.addColorStop(1, rgba(WARM, 0));
        ctx.fillStyle = halo;
        ctx.fillRect(l.u - arm - r, l.head - r, 2 * r, 2 * r);
        ctx.restore();
      }
      ctx.fillStyle = rgba(mix(pole, [255, 244, 222], night), Math.max(fade, night));
      ctx.beginPath();
      ctx.arc(l.u - arm, l.head, Math.max(1.2, thick * 1.1), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 場景 3、夜裡：經過燈下的雪被照亮。在 drawField 之後呼叫。 */
  drawLit(
    p: p5,
    scene: SceneKind,
    flakes: readonly Flake[],
    f: Frame,
    c: { dayness: number; wetness: number },
    weight: number,
  ): void {
    const night = 1 - c.dayness;
    if (scene !== 3 || night < 0.05 || weight <= 0) return;
    const ctx = p.drawingContext as CanvasRenderingContext2D;
    const sprite = this.warmSprite(p);
    const W = p.width;
    const H = p.height;

    for (const l of lamps(f, W, H)) {
      if (l.reach < 5) continue;
      // 光是往下照的：照亮的範圍中心在燈頭下面一點
      const centre = toScreen(f, l.u - armOf(l), l.head + l.reach * 0.4);
      for (const fl of flakes) {
        if (fl.life < 0.05) continue;
        const rel = Math.abs(nearness(fl.z) - l.near) / l.near;
        if (rel > 0.6) continue;
        const x = fl.x * W;
        const y = fl.y * H;
        const dist = Math.hypot(x - centre.x, y - centre.y);
        if (dist > l.reach || isGrounded(f, x, y, fl.z)) continue;
        const k = (1 - dist / l.reach) ** 1.5 * (1 - rel / 0.6);
        const d = Math.max(3.5, flakeRadius(fl.z, c.wetness) * 5);
        ctx.globalAlpha = Math.min(1, 1.6 * k) * night * weight * fl.life;
        p.image(sprite, x - d / 2, y - d / 2, d, d);
      }
    }
    ctx.globalAlpha = 1;
  }

  private warmSprite(p: p5): p5.Graphics {
    if (this.warm) return this.warm;
    const size = 32;
    const g = p.createGraphics(size, size);
    g.noStroke();
    for (let k = 0; k < 12; k++) {
      const r = 1 - k / 12;
      g.fill(255, 232, 190, k < 6 ? 40 : 110);
      g.circle(size / 2, size / 2, r * size);
    }
    this.warm = g;
    return g;
  }
}

/** 燈臂伸向路面多長。 */
function armOf(l: Lamp): number {
  return l.reach * 0.2;
}
