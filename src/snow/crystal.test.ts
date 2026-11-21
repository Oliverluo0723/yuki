import { expect, test } from 'vitest';
import { makeCrystal } from './crystal';

test('同一個種子同一枚，不同種子不同', () => {
  expect(makeCrystal(0.42)).toEqual(makeCrystal(0.42));
  expect(makeCrystal(0.42)).not.toEqual(makeCrystal(0.43));
});

test('形狀在單位圓內，每枚至少兩對側枝', () => {
  for (let i = 0; i < 200; i++) {
    const c = makeCrystal(i / 200);
    expect(c.core).toBeGreaterThanOrEqual(0);
    expect(c.core).toBeLessThanOrEqual(0.3);
    expect(c.branches.length).toBeGreaterThanOrEqual(2);
    expect(c.branches.length).toBeLessThanOrEqual(5);
    for (const b of c.branches) {
      expect(b.at).toBeGreaterThan(0.15);
      expect(b.at).toBeLessThan(0.95);
      expect(b.angle).toBeGreaterThanOrEqual((Math.PI * 40) / 180);
      expect(b.angle).toBeLessThanOrEqual((Math.PI * 70) / 180);
      expect(
        Math.hypot(b.at + b.len * Math.cos(b.angle), b.len * Math.sin(b.angle)),
      ).toBeLessThanOrEqual(1);
    }
  }
});
