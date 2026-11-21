import { noise1 } from '../noise1';
import type { EasedConditions } from '../types';

/**
 * 這一刻聲音該是什麼樣子。全部由雪的條件和姿態算出來，
 * 所以實際模式的風聲就是北海道現在的風。
 */
export interface SoundParams {
  /** 悶住的安靜：很低、很輕的空氣聲 */
  airGain: number;
  /** Hz。雪越大越悶 */
  airCutoff: number;
  /** 風的低鳴 */
  windGain: number;
  /** Hz。風越大越高 */
  windFreq: number;
  /** 風夠大時才有的一點哨音 */
  whistleGain: number;
  /** 平視時雪落在身上的細碎聲：每秒幾聲 */
  tickRate: number;
  /** Hz。乾雪清脆，濕雪悶 */
  tickFreq: number;
  tickGain: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** views 是 viewWeights(posture)：平視與低頭各佔多少。 */
export function soundParams(
  c: EasedConditions,
  views: { field: number; glass: number },
): SoundParams {
  // 風的大小只看強弱，不看方向；windX 1.5（約斜 56°）以上當作最大
  const wind = Math.min(1, Math.abs(c.windX) / 1.5);
  // 低頭時世界退到遠處：風和空氣聲都變小
  const far = lerp(1, 0.35, views.glass);
  return {
    airGain: 0.05 * lerp(1, 0.6, views.glass),
    airCutoff: lerp(700, 300, clamp(c.amount, 0, 1)),
    windGain: (0.015 + 0.16 * wind) * far,
    windFreq: lerp(220, 520, wind),
    whistleGain: Math.max(0, wind - 0.5) * 0.06 * views.field,
    // 沒有雪就沒有雪的聲音；低頭時改由每一片落定各響一下
    tickRate: clamp(c.amount, 0, 1) * views.field * 14,
    tickFreq: lerp(5200, 1600, clamp(c.wetness, 0, 1)),
    tickGain: lerp(0.03, 0.05, clamp(c.wetness, 0, 1)),
  };
}

/** 陣風：風聲一陣一陣的倍率。gust 是 0 時永遠是 1。 */
export function windSwell(tSec: number, gust: number): number {
  const n = 0.65 * noise1(tSec / 2.5) + 0.35 * noise1(tSec / 0.9 + 50);
  return 1 + gust * (n * 1.5 - 0.6);
}

const MAX_TICKS_PER_FRAME = 4;

/** 這一格該響幾聲。用亂數決定小數部分，長期平均剛好是 rate。 */
export function tickCount(rate: number, dt: number, rng: () => number): number {
  return Math.min(MAX_TICKS_PER_FRAME, Math.floor(rate * dt + rng()));
}

/** 畫面上的左右位置 → 聲音的左右（−0.8…0.8，不推到最邊）。 */
export function panFor(x: number, width: number): number {
  return clamp((x / width) * 2 - 1, -1, 1) * 0.8;
}
