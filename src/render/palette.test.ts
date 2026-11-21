import { expect, test } from 'vitest';
import {
  crystalColor,
  fieldBackground,
  flakeColor,
  glassBackground,
  luminance,
  mix,
} from './palette';

test('平視：夜深、晝淺', () => {
  expect(fieldBackground(0)).toEqual([11, 15, 23]);
  expect(fieldBackground(1)).toEqual([223, 227, 230]);
  expect(luminance(fieldBackground(1))).toBeGreaterThan(0.7);
});

test('玻璃永遠是深色，白天只淺一點', () => {
  expect(glassBackground(0)).toEqual([7, 9, 13]);
  for (const d of [0, 0.5, 1]) expect(luminance(glassBackground(d))).toBeLessThan(0.2);
  expect(luminance(glassBackground(1))).toBeGreaterThan(luminance(glassBackground(0)));
  expect(luminance(glassBackground(1, 0.3))).toBeGreaterThan(luminance(glassBackground(1, 0.1)));
});

test('結晶永遠是亮的；夜裡的雪是亮的；白天近的比底亮、遠的比底暗', () => {
  expect(luminance(crystalColor())).toBeGreaterThan(0.85);
  expect(luminance(flakeColor(0, 0.5))).toBeGreaterThan(0.85);
  const bg = luminance(fieldBackground(1));
  expect(luminance(flakeColor(1, 0.9))).toBeGreaterThan(bg);
  expect(luminance(flakeColor(1, 0.1))).toBeLessThan(bg);
});

test('mix', () => {
  expect(mix([0, 0, 0], [100, 200, 50], 0.5)).toEqual([50, 100, 25]);
});
