import { noise1 } from '../noise1';
import type { SnowConditions } from '../types';

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
