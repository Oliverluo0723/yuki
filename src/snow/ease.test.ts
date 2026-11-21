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

test('目標是沒有雪時，幾秒內真的歸零（不拖一條長尾巴）', () => {
  let c = initialEased({ amount: 0.6, windX: 0.5, gust: 0, wetness: 0, isDay: false });
  const none = { amount: 0, windX: 0, gust: 0, wetness: 0.5, isDay: false };
  for (let i = 0; i < 60; i++) c = easeConditions(c, none, 1 / 60); // 1 秒
  expect(c.amount).toBeGreaterThan(0.1); // 仍然是漸變，不是跳
  for (let i = 0; i < 240; i++) c = easeConditions(c, none, 1 / 60); // 共 5 秒
  expect(c.amount).toBe(0);
  // 目標只是變小（不是 0）時維持原本的速度
  let d = initialEased({ amount: 1, windX: 0, gust: 0, wetness: 0, isDay: false });
  for (let i = 0; i < 180; i++) d = easeConditions(d, { ...none, amount: 0.25 }, 1 / 60);
  expect(d.amount).toBeCloseTo(0.25 + 0.75 * Math.exp(-1), 2);
});
