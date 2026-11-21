import { expect, test } from 'vitest';
import { clampDt, easeConditions, initialEased } from './ease';

test('clampDt', () => {
  expect(clampDt(1 / 60)).toBeCloseTo(1 / 60);
  expect(clampDt(5)).toBeCloseTo(1 / 15);
  expect(clampDt(-1)).toBe(0);
  expect(clampDt(Number.NaN)).toBe(0);
});

test('條件用幾秒漸變，不跳', () => {
  const from = initialEased({ amount: 0, windX: 0, gust: 0, wetness: 0, isDay: false });
  expect(from.dayness).toBe(0);
  const to = { amount: 1, windX: -2, gust: 1, wetness: 1, isDay: true };
  const one = easeConditions(from, to, 1 / 60);
  expect(one.amount).toBeLessThan(0.01);
  let c = from;
  for (let i = 0; i < 180; i++) c = easeConditions(c, to, 1 / 60); // 3 秒
  expect(c.amount).toBeCloseTo(0.632, 2);
  expect(c.windX).toBeCloseTo(-1.264, 2);
  expect(c.dayness).toBeCloseTo(0.632, 2);
});
