import { expect, test } from 'vitest';
import { buildUrl, parseResponse } from './openMeteo';
import { PLACES } from './places';

const cur = (o: object) => ({ current: { time: '2026-11-21T15:00', interval: 900, ...o } });
const SAPPORO = cur({
  temperature_2m: 1.0,
  snowfall: 0.0,
  weather_code: 1,
  wind_speed_10m: 7.3,
  wind_direction_10m: 337,
  wind_gusts_10m: 18.7,
  is_day: 1,
});
const two = PLACES.slice(0, 2);

test('buildUrl', () => {
  const u = buildUrl(two);
  expect(u).toContain('https://api.open-meteo.com/v1/forecast?');
  expect(u).toContain('latitude=43.06,43.77');
  expect(u).toContain('longitude=141.35,142.36');
  expect(u).toContain(
    'current=temperature_2m,snowfall,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day',
  );
  expect(u).toContain('timezone=Asia%2FTokyo');
});

test('陣列回應照順序配上地點', () => {
  const r = parseResponse([SAPPORO, cur({ snowfall: 0.2, weather_code: 73, is_day: 0 })], two);
  expect(r).toHaveLength(2);
  expect(r?.[0]).toEqual({
    place: two[0],
    now: {
      time: '2026-11-21T15:00',
      temperature: 1.0,
      snowfall: 0,
      weatherCode: 1,
      windSpeed: 7.3,
      windDirection: 337,
      windGusts: 18.7,
      isDay: true,
    },
  });
  expect(r?.[1].now).toMatchObject({
    temperature: null,
    snowfall: 0.2,
    weatherCode: 73,
    windSpeed: 0,
    windGusts: 0,
    isDay: false,
  });
});

test('單一地點回的是物件', () => {
  expect(parseResponse(SAPPORO, [PLACES[0]])).toHaveLength(1);
});

test('缺 is_day 時用 time 的小時（6–18 為晝）', () => {
  expect(parseResponse(cur({ snowfall: 0, weather_code: 1 }), [PLACES[0]])?.[0].now.isDay).toBe(
    true,
  );
  const night = { current: { time: '2026-11-21T22:15', snowfall: 0, weather_code: 1 } };
  expect(parseResponse(night, [PLACES[0]])?.[0].now.isDay).toBe(false);
});

test('形狀不對一律回 null', () => {
  expect(parseResponse({ error: true, reason: 'x' }, two)).toBeNull();
  expect(parseResponse([SAPPORO], two)).toBeNull(); // 長度不符
  expect(parseResponse('<html>', two)).toBeNull();
  expect(parseResponse(null, two)).toBeNull();
  expect(parseResponse([SAPPORO, {}], two)).toBeNull(); // 沒有 current
  expect(parseResponse(cur({ temperature_2m: 1 }), [PLACES[0]])).toBeNull(); // snowfall 和 weather_code 都沒有
});
