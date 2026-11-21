import { expect, test } from 'vitest';
import { isSnowing, pickHeaviest, toConditions } from './conditions';
import type { WeatherNow } from './openMeteo';
import { PLACES } from './places';

const w = (o: Partial<WeatherNow>): WeatherNow => ({
  time: '2026-11-21T15:00',
  temperature: -3,
  snowfall: 0,
  weatherCode: 1,
  windSpeed: 0,
  windDirection: 0,
  windGusts: 0,
  isDay: true,
  ...o,
});

test('isSnowing：有降雪量，或代碼是 71 73 75 77 85 86', () => {
  expect(isSnowing(w({}))).toBe(false);
  expect(isSnowing(w({ snowfall: 0.01 }))).toBe(true);
  for (const c of [71, 73, 75, 77, 85, 86]) expect(isSnowing(w({ weatherCode: c }))).toBe(true);
  expect(isSnowing(w({ weatherCode: 61 }))).toBe(false); // 雨
});

test('amount', () => {
  const a = (o: Partial<WeatherNow>) => toConditions(w(o)).amount;
  expect(a({})).toBe(0);
  expect(a({ weatherCode: 71 })).toBeCloseTo(0.15); // 代碼下限：小雪
  expect(a({ weatherCode: 73 })).toBeCloseTo(0.5); // 中雪
  expect(a({ weatherCode: 75 })).toBeCloseTo(0.8); // 大雪
  expect(a({ snowfall: 0.25, weatherCode: 71 })).toBeCloseTo(0.575);
  expect(a({ snowfall: 0.01, weatherCode: 3 })).toBeCloseTo(0.235);
  expect(a({ snowfall: 1 })).toBeCloseTo(1);
  expect(a({ snowfall: 5, weatherCode: 75 })).toBe(1);
});

test('windX：風向是吹來的方向，觀眾面向北', () => {
  const x = (dir: number, speed: number) =>
    toConditions(w({ windDirection: dir, windSpeed: speed })).windX;
  expect(x(270, 20)).toBeCloseTo(1, 3); // 西風 20 km/h → 往右斜 45°
  expect(x(90, 20)).toBeCloseTo(-1, 3);
  expect(x(0, 50)).toBeCloseTo(0, 3); // 北風：沒有橫向分量
  expect(x(270, 100)).toBeCloseTo(2.7475, 3); // 上限 70°
  expect(x(337, 7.3)).toBeCloseTo(0.1125, 3);
});

test('gust、wetness、isDay', () => {
  expect(toConditions(w({ windSpeed: 7.3, windGusts: 18.7 })).gust).toBeCloseTo(0.38);
  expect(toConditions(w({ windSpeed: 10, windGusts: 100 })).gust).toBe(1);
  expect(toConditions(w({ windSpeed: 10, windGusts: 0 })).gust).toBe(0);
  expect(toConditions(w({ temperature: -8 })).wetness).toBe(0);
  expect(toConditions(w({ temperature: -2.5 })).wetness).toBeCloseTo(0.5);
  expect(toConditions(w({ temperature: 1.3 })).wetness).toBe(1);
  expect(toConditions(w({ temperature: null })).wetness).toBe(0.5);
  expect(toConditions(w({ isDay: false })).isDay).toBe(false);
});

test('pickHeaviest', () => {
  const at = (i: number, o: Partial<WeatherNow>) => ({ place: PLACES[i], now: w(o) });
  expect(
    pickHeaviest([at(0, {}), at(1, { snowfall: 0.1 }), at(2, { snowfall: 0.4 })]).place.name,
  ).toBe('小樽');
  expect(pickHeaviest([at(0, { weatherCode: 71 }), at(1, { weatherCode: 75 })]).place.name).toBe(
    '旭川',
  ); // 降雪量相同比代碼
  expect(pickHeaviest([at(0, { weatherCode: 71 }), at(1, { weatherCode: 77 })]).place.name).toBe(
    '札幌',
  ); // 再相同照順序
  expect(pickHeaviest([at(0, {}), at(1, {})]).place.name).toBe('札幌'); // 都沒下：第一個
});
