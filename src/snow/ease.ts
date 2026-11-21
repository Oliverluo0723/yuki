import type { EasedConditions, SnowConditions } from '../types';

const MAX_DT = 1 / 15;

/** 分頁切到背景再回來時 dt 會是好幾秒；不擋掉，雪會瞬間移動、拉出橫跨螢幕的線。 */
export function clampDt(dt: number): number {
  if (!(dt > 0)) return 0; // 負值和 NaN
  return Math.min(dt, MAX_DT);
}

export function initialEased(c: SnowConditions): EasedConditions {
  return {
    amount: c.amount,
    windX: c.windX,
    gust: c.gust,
    wetness: c.wetness,
    dayness: c.isDay ? 1 : 0,
  };
}

/** 條件改變時用幾秒鐘漸變過去，不能跳。tau 秒後追上約 63%。 */
export function easeConditions(
  cur: EasedConditions,
  target: SnowConditions,
  dt: number,
  tau = 3,
): EasedConditions {
  const k = 1 - Math.exp(-dt / tau);
  const to = (a: number, b: number) => a + (b - a) * k;
  return {
    amount: to(cur.amount, target.amount),
    windX: to(cur.windX, target.windX),
    gust: to(cur.gust, target.gust),
    wetness: to(cur.wetness, target.wetness),
    dayness: to(cur.dayness, target.isDay ? 1 : 0),
  };
}
