import type { EasedConditions, Noise3, Vec2 } from '../types';

/** 平視裡的一片雪。 */
export interface Flake {
  /** 0–1，螢幕的比例位置（y 向下） */
  x: number;
  y: number;
  /** 上一格的位置，畫短線用 */
  px: number;
  py: number;
  /** 0 遠 … 1 近 */
  z: number;
  /** 0–1，決定這一片自己的飄動 */
  seed: number;
  /** 0–1，淡入淡出 */
  life: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const NEAR_Z = 0.97; // 比這更近的是失焦的大圓斑
const EDGE = 0.05; // 畫面外的緩衝，雪片飄出這個範圍才繞回
const LIFE_TAU = 0.5; // 淡入淡出的時間常數（秒）

export function isNear(z: number): boolean {
  return z > NEAR_Z;
}

/** 每秒落下幾個螢幕高。遠的慢、近的快；濕的雪重，落得快。 */
export function fallSpeed(z: number, wetness: number): number {
  return lerp(0.04, 0.35, z) * (1 + 0.8 * wetness);
}

/** 半徑，px（未乘 pixelDensity）。 */
export function flakeRadius(z: number, wetness: number): number {
  if (isNear(z)) return lerp(12, 40, (z - NEAR_Z) / (1 - NEAR_Z));
  return lerp(0.6, 3.5, z * z) * (1 + 0.6 * wetness);
}

/** count 片雪，位置均勻散開；深度取平方，所以遠的多、近的少。一開始都還沒淡入。 */
export function createField(count: number, rng: () => number): Flake[] {
  const flakes: Flake[] = [];
  for (let i = 0; i < count; i++) {
    const x = rng();
    const y = rng();
    const u = rng();
    flakes.push({ x, y, px: x, py: y, z: u * u, seed: rng(), life: 0 });
  }
  return flakes;
}

/**
 * 推進一格。前 active 片淡入，其餘淡出。
 * down 是螢幕座標裡朝真正地面的單位向量；aspect = 畫面寬 ÷ 高。
 * dt 由呼叫端先經過 clampDt。
 */
export function stepField(
  flakes: Flake[],
  active: number,
  c: EasedConditions,
  down: Vec2,
  dt: number,
  t: number,
  noise: Noise3,
  aspect: number,
): void {
  // 垂直於「下」的方向；down = (0, 1) 時指向畫面右邊
  const perpX = down.y;
  const perpY = -down.x;
  const lifeK = 1 - Math.exp(-dt / LIFE_TAU);
  const dryness = 1 - 0.7 * c.wetness; // 乾的雪飄得多

  for (let i = 0; i < flakes.length; i++) {
    const f = flakes[i];
    f.life += ((i < active ? 1 : 0) - f.life) * lifeK;

    const fall = fallSpeed(f.z, c.wetness);
    // 每片自己的左右擺動：頻率和相位都由 seed 決定
    const sway =
      0.12 *
      lerp(0.3, 1, f.z) *
      dryness *
      Math.sin(2 * Math.PI * (f.seed * 7 + t * lerp(0.15, 0.5, f.seed)));
    // 一陣一陣、一塊一塊的風
    const gusty = 1 + c.gust * (noise(f.x * 2, f.y * 2, t * 0.25) - 0.5) * 3;
    const side = c.windX * fall * gusty + sway;

    f.px = f.x;
    f.py = f.y;
    f.x += ((down.x * fall + perpX * side) / aspect) * dt;
    f.y += (down.y * fall + perpY * side) * dt;

    // 飄出邊界從另一邊回來；同時把「上一格」移過去，才不會畫出橫跨螢幕的線
    let wrapped = false;
    if (f.x < -EDGE) {
      f.x += 1 + 2 * EDGE;
      wrapped = true;
    } else if (f.x >= 1 + EDGE) {
      f.x -= 1 + 2 * EDGE;
      wrapped = true;
    }
    if (f.y < -EDGE) {
      f.y += 1 + 2 * EDGE;
      wrapped = true;
    } else if (f.y >= 1 + EDGE) {
      f.y -= 1 + 2 * EDGE;
      wrapped = true;
    }
    if (wrapped) {
      f.px = f.x;
      f.py = f.y;
    }
  }
}
