import type p5 from 'p5';
import { type Flake, flakeRadius, isNear } from '../snow/field';
import type { EasedConditions } from '../types';
import { flakeColor } from './palette';
import type { Sprites } from './sprites';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const SOFT_Z = 0.7; // 比這更近的雪開始失焦，改貼柔邊圓
const BANDS = 8; // 清楚的雪依深度分成幾組；同一組共用顏色和粗細
const SETTLED = 0.97; // life 超過這個值就當作完全淡入

interface Groups {
  bands: Flake[][];
  soft: Flake[];
  near: Flake[];
}

// 雪片的深度不會變，所以只分組一次
const cache = new WeakMap<readonly Flake[], Groups>();

function groupsOf(flakes: readonly Flake[]): Groups {
  let g = cache.get(flakes);
  if (g) return g;
  g = { bands: Array.from({ length: BANDS }, () => [] as Flake[]), soft: [], near: [] };
  for (const f of flakes) {
    if (isNear(f.z)) g.near.push(f);
    else if (f.z > SOFT_Z) g.soft.push(f);
    else g.bands[Math.min(BANDS - 1, Math.floor((f.z / SOFT_Z) * BANDS))].push(f);
  }
  cache.set(flakes, g);
  return g;
}

/**
 * 畫平視的雪。weight 是平視佔的比例（放平時淡出）；
 * trail 0–1 決定每片拉出的短線多長（0 是一個點）。
 */
export function drawField(
  p: p5,
  flakes: readonly Flake[],
  c: EasedConditions,
  weight: number,
  trail: number,
  sprites: Sprites,
): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D;
  const W = p.width;
  const H = p.height;
  // 放平的過程中，眼前的雪像是越過你往後退：整體放大一點
  const grow = 1 + (1 - weight) * 0.6;
  const stretch = 1 + trail * 12;
  const g = groupsOf(flakes);

  // 遠到中距離：清楚的短線。
  // p5 2.x 的 line() / point() 每呼叫一次就建立一個形狀物件，一格上千次太浪費；
  // 所以同一個深度帶裡已經完全淡入的雪片合成一個形狀一次畫完，
  // 只有正在淡入淡出的少數幾片個別畫（它們的透明度各不相同）。
  p.noFill();
  p.strokeCap(p.ROUND);
  const dots = trail <= 0;
  for (let b = 0; b < BANDS; b++) {
    const zMid = ((b + 0.5) / BANDS) * SOFT_Z;
    const [r, gr, bl] = flakeColor(c.dayness, zMid);
    p.stroke(r, gr, bl);
    p.strokeWeight(flakeRadius(zMid, c.wetness) * 2 * grow);
    const base = lerp(0.35, 0.95, zMid) * weight;

    ctx.globalAlpha = base;
    p.beginShape(dots ? p.POINTS : p.LINES);
    for (const f of g.bands[b]) {
      if (f.life < SETTLED) continue;
      const x = f.x * W;
      const y = f.y * H;
      p.vertex(x, y);
      // 這一格沒有移動時補一個極短的線段，圓頭會把它畫成一個點
      if (!dots) p.vertex(x - ((f.x - f.px) * W * stretch || 0.01), y - (f.y - f.py) * H * stretch);
    }
    p.endShape();

    for (const f of g.bands[b]) {
      if (f.life < 0.01 || f.life >= SETTLED) continue;
      ctx.globalAlpha = base * f.life;
      const x = f.x * W;
      const y = f.y * H;
      if (dots) p.point(x, y);
      else p.line(x, y, x - ((f.x - f.px) * W * stretch || 0.01), y - (f.y - f.py) * H * stretch);
    }
  }

  // 近的：失焦的柔邊圓，越近越糊
  for (const f of g.soft) {
    if (f.life < 0.01) continue;
    const blur = lerp(0.2, 0.8, (f.z - SOFT_Z) / (0.97 - SOFT_Z));
    const d = flakeRadius(f.z, c.wetness) * 2 * grow * (1 + blur);
    ctx.globalAlpha = lerp(0.35, 0.95, f.z) * weight * f.life * 0.8;
    p.image(sprites.get(blur), f.x * W - d / 2, f.y * H - d / 2, d, d);
  }

  // 最近的幾片：很大、很淡的圓斑，偶爾從眼前掠過
  const blob = sprites.get(1);
  for (const f of g.near) {
    if (f.life < 0.01) continue;
    const d = flakeRadius(f.z, c.wetness) * 2 * grow;
    ctx.globalAlpha = weight * f.life * 0.25;
    p.image(blob, f.x * W - d / 2, f.y * H - d / 2, d, d);
  }

  ctx.globalAlpha = 1;
}
