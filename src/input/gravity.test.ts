import { expect, test } from 'vitest';
import type { Vec2, Vec3 } from '../types';
import {
  downFromGravity,
  gravityFromAngles,
  postureFromGravity,
  readAngles,
  smoothGravity,
} from './gravity';

const v3 = (a: Vec3, x: number, y: number, z: number) => {
  expect(a.x).toBeCloseTo(x, 3);
  expect(a.y).toBeCloseTo(y, 3);
  expect(a.z).toBeCloseTo(z, 3);
};
const v2 = (a: Vec2, x: number, y: number) => {
  expect(a.x).toBeCloseTo(x, 3);
  expect(a.y).toBeCloseTo(y, 3);
};

test('readAngles 擋掉 null 和 NaN', () => {
  expect(readAngles({ beta: null, gamma: null })).toBeNull();
  expect(readAngles({ beta: 10, gamma: null })).toBeNull();
  expect(readAngles({ beta: Number.NaN, gamma: 0 })).toBeNull();
  expect(readAngles({ beta: 45, gamma: -10 })).toEqual({ beta: 45, gamma: -10 });
});

test('gravityFromAngles', () => {
  v3(gravityFromAngles(0, 0), 0, 0, -1); // 平放、螢幕朝上
  v3(gravityFromAngles(90, 0), 0, -1, 0); // 直立
  v3(gravityFromAngles(0, 30), 0.5, 0, -0.866); // 平放、右邊較低
  v3(gravityFromAngles(60, 90), 0.5, -0.866, 0); // 直立、順時針歪 30°
});

test('postureFromGravity', () => {
  expect(postureFromGravity({ x: 0, y: -1, z: 0 })).toBe(0);
  expect(postureFromGravity({ x: 0, y: 0, z: -1 })).toBe(1);
  expect(postureFromGravity({ x: 0, y: 0, z: 1 })).toBe(1); // 螢幕朝下也算平放
  expect(postureFromGravity(gravityFromAngles(60, 0))).toBeCloseTo(0, 3);
  expect(postureFromGravity(gravityFromAngles(50, 0))).toBeCloseTo(0.222, 3); // 自然握持仍是平視
  expect(postureFromGravity(gravityFromAngles(37.5, 0))).toBeCloseTo(0.5, 3);
  expect(postureFromGravity(gravityFromAngles(15, 0))).toBeCloseTo(1, 3);
});

test('downFromGravity', () => {
  const last = { x: 0.6, y: 0.8 };
  v2(downFromGravity({ x: 0, y: -1, z: 0 }, 0, last), 0, 1);
  v2(downFromGravity({ x: 0.5, y: -0.866, z: 0 }, 0, last), 0.5, 0.866);
  v2(downFromGravity({ x: -1, y: 0, z: 0 }, 90, last), 0, 1); // 橫向，機頂朝左
  v2(downFromGravity({ x: 1, y: 0, z: 0 }, 270, last), 0, 1); // 橫向，機頂朝右
  expect(downFromGravity({ x: 0.05, y: -0.05, z: -0.997 }, 0, last)).toEqual(last); // 幾乎平放：沿用上一個
});

test('smoothGravity', () => {
  const a = { x: 0, y: -1, z: 0 };
  const b = { x: 0, y: 0, z: -1 };
  v3(smoothGravity(a, b, 0, 0.12), 0, -1, 0);
  v3(smoothGravity(a, b, 0.12, 0.12), 0, -0.368, -0.632);
});
