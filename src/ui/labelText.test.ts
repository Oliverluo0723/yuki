import { expect, test } from 'vitest';
import type { WeatherNow } from '../weather/openMeteo';
import { PLACES } from '../weather/places';
import { labelText } from './labelText';

const now = (o: Partial<WeatherNow>): WeatherNow => ({
  time: '2026-11-21T14:45',
  temperature: -6.4,
  snowfall: 0.3,
  weatherCode: 73,
  windSpeed: 0,
  windDirection: 0,
  windGusts: 0,
  isDay: true,
  ...o,
});
const 旭川 = PLACES[1];

test('labelText', () => {
  expect(labelText('free', { kind: 'unavailable' })).toBe('雪');
  expect(labelText('live', { kind: 'loading' })).toBe('北海道 …');
  expect(labelText('live', { kind: 'unavailable' })).toBe('讀不到北海道的天氣');
  expect(labelText('live', { kind: 'ok', place: 旭川, now: now({}) })).toBe('旭川 14:45 −6°C');
  expect(labelText('live', { kind: 'ok', place: 旭川, now: now({ temperature: 1.3 }) })).toBe(
    '旭川 14:45 1°C',
  );
  expect(labelText('live', { kind: 'ok', place: 旭川, now: now({ temperature: -0.4 }) })).toBe(
    '旭川 14:45 0°C',
  ); // 不能出現 −0
  expect(labelText('live', { kind: 'ok', place: 旭川, now: now({ temperature: null }) })).toBe(
    '旭川 14:45',
  );
  expect(
    labelText('live', { kind: 'ok', place: 旭川, now: now({ snowfall: 0, weatherCode: 1 }) }),
  ).toBe('旭川 14:45 現在沒有下雪');
});
