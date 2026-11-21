import { expect, test } from 'vitest';
import { moveX, normalizeWheel, pointerPose, wheel } from './pointer';

test('normalizeWheel', () => {
  expect(normalizeWheel(100, 0)).toBe(100);
  expect(normalizeWheel(3, 1)).toBe(48); // 行 → 16 px
  expect(normalizeWheel(1, 2)).toBe(600); // 頁
});

test('捲動改變 posture', () => {
  expect(wheel({ posture: 0, lean: 0 }, 300).posture).toBeCloseTo(0.5);
  expect(wheel({ posture: 0, lean: 0 }, 10000).posture).toBe(1);
  expect(wheel({ posture: 0.2, lean: 0 }, -600).posture).toBe(0);
});

test('滑鼠左右改變「下」', () => {
  const s = { posture: 0, lean: 0 };
  expect(pointerPose(moveX(s, 500, 1000)).down).toEqual({ x: 0, y: 1 });
  const right = pointerPose(moveX(s, 1000, 1000)).down; // 傾 35°
  expect(right.x).toBeCloseTo(0.574, 3);
  expect(right.y).toBeCloseTo(0.819, 3);
  expect(pointerPose(moveX(s, 0, 1000)).down.x).toBeCloseTo(-0.574, 3);
  expect(moveX(s, 5000, 1000).lean).toBe(1);
});
