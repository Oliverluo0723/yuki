import { expect, test } from 'vitest';
import type { EasedConditions, Noise3 } from '../types';
import { createField, type Flake, fallSpeed, flakeRadius, isNear, stepField } from './field';

const calm: EasedConditions = { amount: 1, windX: 0, gust: 0, wetness: 0, dayness: 0 };
const flat: Noise3 = () => 0.5;
const one = (o: Partial<Flake> = {}): Flake => ({
  x: 0.5,
  y: 0.5,
  px: 0.5,
  py: 0.5,
  z: 0.5,
  seed: 0.3,
  life: 1,
  ...o,
});
const DOWN = { x: 0, y: 1 };

test('近的大而快，濕的大而快', () => {
  expect(fallSpeed(0.9, 0)).toBeGreaterThan(fallSpeed(0.1, 0) * 3);
  expect(fallSpeed(0.5, 1)).toBeGreaterThan(fallSpeed(0.5, 0));
  expect(flakeRadius(0.9, 0)).toBeGreaterThan(flakeRadius(0.1, 0));
  expect(flakeRadius(0.5, 1)).toBeGreaterThan(flakeRadius(0.5, 0));
  expect(isNear(0.98)).toBe(true);
  expect(isNear(0.9)).toBe(false);
  expect(flakeRadius(0.99, 0)).toBeGreaterThanOrEqual(12);
});

test('往「下」落，並記住上一格的位置', () => {
  const f = [one()];
  stepField(f, 1, calm, DOWN, 0.1, 0, flat, 0.5);
  expect(f[0].py).toBe(0.5);
  expect(f[0].y).toBeCloseTo(0.5 + fallSpeed(0.5, 0) * 0.1, 4);
});

test('「下」轉向，雪跟著轉', () => {
  const f = [one()];
  stepField(f, 1, calm, { x: 1, y: 0 }, 0.1, 0, flat, 1);
  expect(f[0].x).toBeGreaterThan(0.5);
  expect(Math.abs(f[0].y - 0.5)).toBeLessThan(0.01);
});

test('風把雪往橫向帶；乾雪飄得比濕雪多', () => {
  const still = [one()];
  const blown = [one()];
  stepField(still, 1, calm, DOWN, 0.1, 0, flat, 1);
  stepField(blown, 1, { ...calm, windX: 1 }, DOWN, 0.1, 0, flat, 1);
  expect(blown[0].x - still[0].x).toBeCloseTo(fallSpeed(0.5, 0) * 0.1, 3);
  const span = (wetness: number) => {
    const f = [one()];
    let lo = 1;
    let hi = 0;
    for (let i = 0; i < 300; i++) {
      stepField(f, 1, { ...calm, wetness }, DOWN, 1 / 60, i / 60, flat, 1);
      f[0].y = 0.5;
      lo = Math.min(lo, f[0].x);
      hi = Math.max(hi, f[0].x);
    }
    return hi - lo;
  };
  expect(span(0)).toBeGreaterThan(span(1) * 2);
});

test('飄出邊界從另一邊回來，而且不拉出橫跨螢幕的線', () => {
  const f = [one({ y: 1.049, py: 1.04 })];
  stepField(f, 1, calm, DOWN, 0.1, 0, flat, 1);
  expect(f[0].y).toBeLessThan(0);
  expect(f[0].y).toBeGreaterThanOrEqual(-0.05);
  expect(f[0].py).toBe(f[0].y);
  expect(f[0].px).toBe(f[0].x);
  const g = [one({ x: -0.049, px: -0.04 })];
  stepField(g, 1, { ...calm, windX: -3 }, DOWN, 0.1, 0, flat, 1);
  expect(g[0].x).toBeGreaterThan(0.9);
  expect(g[0].x).toBeLessThan(1.05);
  expect(g[0].px).toBe(g[0].x);
});

test('超過 active 的雪片淡出，之內的淡入', () => {
  const f = [one({ life: 0 }), one({ life: 1 })];
  for (let i = 0; i < 120; i++) stepField(f, 1, calm, DOWN, 1 / 60, i / 60, flat, 1);
  expect(f[0].life).toBeGreaterThan(0.95);
  expect(f[1].life).toBeLessThan(0.05);
});

test('createField：位置和深度散開，遠的多', () => {
  let s = 1;
  const rng = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const f = createField(1000, rng);
  expect(f).toHaveLength(1000);
  expect(f.filter((k) => k.z < 0.5).length).toBeGreaterThan(600);
  expect(
    f.every((k) => k.x >= 0 && k.x < 1 && k.y >= 0 && k.y < 1 && k.px === k.x && k.py === k.y),
  ).toBe(true);
});
