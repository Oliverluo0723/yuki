import { expect, test } from 'vitest';
import { WarmTracker } from './warm';

test('手指按著是 1，放開後 1.5 秒內退到 0', () => {
  const w = new WarmTracker();
  w.down(1, 100, 100);
  expect(w.points()).toEqual([{ x: 100, y: 100, heat: 1 }]);
  w.move(1, 120, 90);
  w.step(1);
  expect(w.points()).toEqual([{ x: 120, y: 90, heat: 1 }]);
  w.up(1);
  w.step(0.75);
  expect(w.points()[0].heat).toBeCloseTo(0.5);
  w.step(0.75);
  expect(w.points()).toEqual([]);
});

test('多指各自一個暖區；沒按下的 id 被 move 時忽略', () => {
  const w = new WarmTracker();
  w.down(1, 0, 0);
  w.down(2, 50, 50);
  w.move(9, 1, 1);
  expect(w.points()).toHaveLength(2);
});
