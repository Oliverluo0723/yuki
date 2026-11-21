import type p5 from 'p5';
import { makeCrystal } from '../snow/crystal';
import type { Landed } from '../snow/landing';
import { crystalColor } from './palette';
import type { Sprites } from './sprites';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const PAD = 3;

// 每一枚結晶落下時畫一次，存成小圖；之後每一格只是貼圖
const drawn = new Map<number, p5.Graphics>();

function crystalImage(p: p5, k: Landed): p5.Graphics {
  let g = drawn.get(k.id);
  if (g) return g;
  const side = Math.ceil(k.size) + PAD * 2;
  const R = k.size / 2;
  const { core, branches } = makeCrystal(k.seed);
  const [r, gr, b] = crystalColor();
  g = p.createGraphics(side, side);
  g.noFill();
  g.stroke(r, gr, b);
  g.strokeWeight(1);
  g.translate(side / 2, side / 2);
  for (let arm = 0; arm < 6; arm++) {
    g.push();
    g.rotate((arm * Math.PI) / 3);
    g.line(0, 0, R, 0); // 主枝
    // 中央六角板的一條邊
    g.line(core * R, 0, core * R * 0.5, core * R * 0.866);
    for (const br of branches) {
      const bx = br.at * R;
      const ex = bx + br.len * R * Math.cos(br.angle);
      const ey = br.len * R * Math.sin(br.angle);
      g.line(bx, 0, ex, ey);
      g.line(bx, 0, ex, -ey);
    }
    g.pop();
  }
  drawn.set(k.id, g);
  return g;
}

/** 畫低頭時玻璃上的雪。weight 是低頭佔的比例。 */
export function drawGlass(p: p5, items: readonly Landed[], weight: number, sprites: Sprites): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D;
  const [r, g, b] = crystalColor();
  p.noStroke();
  p.fill(r, g, b);

  for (const k of items) {
    const u = Math.min(1, k.t / k.dur);
    if (k.phase === 'approach') {
      // 從上方落向玻璃：先是大而淡、很糊的影子，逐漸變小、變清楚
      const halo = u < 0.7 ? lerp(0.05, 0.35, u / 0.7) : lerp(0.35, 0, (u - 0.7) / 0.3);
      const d = lerp(k.size * 6, k.size, u);
      ctx.globalAlpha = halo * weight;
      p.image(sprites.get(1 - u * 0.5), k.x - d / 2, k.y - d / 2, d, d);
      if (u > 0.7) stamp(p, ctx, k, 1, ((u - 0.7) / 0.3) * weight);
    } else if (k.phase === 'rest') {
      stamp(p, ctx, k, 1, weight);
    } else {
      // 化掉：枝縮回、糊成一小滴水，水滴淡去
      const fade = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
      stamp(p, ctx, k, 1 - u, fade * weight);
      const rad = k.size * 0.18 * u;
      ctx.globalAlpha = 0.35 * fade * weight;
      p.circle(k.x, k.y, rad * 2);
      ctx.globalAlpha = 0.8 * fade * weight;
      p.circle(k.x - rad * 0.3, k.y - rad * 0.3, Math.max(1, rad * 0.4));
    }
  }
  ctx.globalAlpha = 1;

  // 已經化掉的結晶，把小圖收掉
  if (drawn.size > items.length) {
    const alive = new Set(items.map((k) => k.id));
    for (const [id, img] of drawn) {
      if (alive.has(id)) continue;
      img.remove();
      drawn.delete(id);
    }
  }
}

function stamp(
  p: p5,
  ctx: CanvasRenderingContext2D,
  k: Landed,
  scale: number,
  alpha: number,
): void {
  if (alpha <= 0 || scale <= 0) return;
  const img = crystalImage(p, k);
  const side = (Math.ceil(k.size) + PAD * 2) * scale;
  ctx.globalAlpha = alpha;
  p.image(img, k.x - side / 2, k.y - side / 2, side, side);
}
