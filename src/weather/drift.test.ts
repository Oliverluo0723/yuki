import { expect, test } from 'vitest';
import { driftConditions } from './drift';

test('常雪模式：永遠有雪、在範圍內、變得很慢、可重現', () => {
  let prev = driftConditions(0, 12);
  for (let t = 1; t <= 3600; t++) {
    const c = driftConditions(t, 12);
    expect(c.amount).toBeGreaterThanOrEqual(0.25);
    expect(c.amount).toBeLessThanOrEqual(1);
    expect(Math.abs(c.windX)).toBeLessThanOrEqual(1);
    expect(c.gust).toBeGreaterThanOrEqual(0);
    expect(c.gust).toBeLessThanOrEqual(1);
    expect(c.wetness).toBeGreaterThanOrEqual(0);
    expect(c.wetness).toBeLessThanOrEqual(0.7);
    expect(Math.abs(c.amount - prev.amount)).toBeLessThan(0.02);
    expect(Math.abs(c.windX - prev.windX)).toBeLessThan(0.04);
    prev = c;
  }
  expect(driftConditions(500, 12)).toEqual(driftConditions(500, 12));
  const amounts = Array.from({ length: 60 }, (_, i) => driftConditions(i * 60, 12).amount);
  expect(Math.max(...amounts) - Math.min(...amounts)).toBeGreaterThan(0.3); // 一小時內確實有起伏
});

test('晝夜照當地時間：6–18 為晝', () => {
  expect(driftConditions(0, 5).isDay).toBe(false);
  expect(driftConditions(0, 6).isDay).toBe(true);
  expect(driftConditions(0, 17).isDay).toBe(true);
  expect(driftConditions(0, 18).isDay).toBe(false);
});
