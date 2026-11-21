import type { SnowConditions } from '../types';

/** 整數格點 → 0–1 的固定亂數。不用 p5 的 noise，才能在沒有畫面的環境裡測。 */
function hash(i: number): number {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 1D value noise：格點之間用 smoothstep 內插。 */
function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i);
  return a + (hash(i + 1) - a) * u;
}

/**
 * 常雪模式：雪一直下，雪量、風、冷暖各自很慢地起伏（幾分鐘一個週期）。
 * tSec 是作品開始後的秒數；localHour 是觀眾裝置的當地小時（6–18 為晝）。
 */
export function driftConditions(tSec: number, localHour: number): SnowConditions {
  return {
    amount: 0.25 + 0.75 * noise1(tSec / 240),
    windX: noise1(tSec / 300 + 100) * 2 - 1,
    gust: noise1(tSec / 180 + 200),
    wetness: 0.7 * noise1(tSec / 400 + 300),
    isDay: localHour >= 6 && localHour < 18,
  };
}
