import { expect, test } from 'vitest';
import { viewWeights } from './views';

test('0.35–0.65 之間連續過渡', () => {
  expect(viewWeights(0.2)).toEqual({ field: 1, glass: 0 });
  expect(viewWeights(0.8)).toEqual({ field: 0, glass: 1 });
  const mid = viewWeights(0.5);
  expect(mid.field).toBeCloseTo(0.5);
  expect(mid.glass).toBeCloseTo(0.5);
  let prev = 0;
  for (let p = 0; p <= 1.0001; p += 0.01) {
    const g = viewWeights(p).glass;
    expect(g).toBeGreaterThanOrEqual(prev);
    prev = g;
  }
});
