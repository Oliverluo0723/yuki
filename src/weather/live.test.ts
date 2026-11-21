import { expect, test } from 'vitest';
import { LiveWeather, liveConditions } from './live';
import { PLACES } from './places';

const cur = (o: object) => ({
  current: { time: '2026-11-21T15:00', weather_code: 1, snowfall: 0, ...o },
});
const snowy = [cur({}), cur({ snowfall: 0.3, weather_code: 73, temperature_2m: -6 })]; // 札幌沒下、旭川在下

function setup() {
  let now = 1_000_000;
  const pending: { resolve: (v: unknown) => void; reject: (e: unknown) => void }[] = [];
  const fetchJson = () =>
    new Promise<unknown>((resolve, reject) => pending.push({ resolve, reject }));
  const live = new LiveWeather(fetchJson, PLACES.slice(0, 2), () => now);
  return {
    live,
    pending,
    tick: (ms: number) => {
      now += ms;
    },
  };
}

test('成功：顯示雪最大的地點', async () => {
  const { live, pending } = setup();
  expect(live.view()).toEqual({ kind: 'unavailable' });
  const p = live.refresh();
  expect(live.view()).toEqual({ kind: 'loading' });
  pending[0].resolve(snowy);
  await p;
  expect(live.view()).toMatchObject({ kind: 'ok', place: { name: '旭川' } });
});

test('失敗且沒有資料：unavailable', async () => {
  const { live, pending } = setup();
  const p = live.refresh();
  pending[0].reject(new Error('offline'));
  await p;
  expect(live.view()).toEqual({ kind: 'unavailable' });
});

test('形狀不對的回應等同失敗', async () => {
  const { live, pending } = setup();
  const p = live.refresh();
  pending[0].resolve({ error: true, reason: 'x' });
  await p;
  expect(live.view()).toEqual({ kind: 'unavailable' });
});

test('失敗但有一小時內的舊資料：繼續用；超過一小時：unavailable', async () => {
  const { live, pending, tick } = setup();
  let p = live.refresh();
  pending[0].resolve(snowy);
  await p;
  tick(30 * 60_000);
  p = live.refresh();
  pending[1].reject(new Error('offline'));
  await p;
  expect(live.view().kind).toBe('ok');
  tick(31 * 60_000);
  expect(live.view()).toEqual({ kind: 'unavailable' });
});

test('晚到的舊回應被忽略', async () => {
  const { live, pending } = setup();
  const a = live.refresh();
  const b = live.refresh();
  pending[1].resolve(snowy);
  await b;
  pending[0].resolve({ error: true }); // 舊的那次後來才失敗
  await a;
  expect(live.view().kind).toBe('ok');
});

test('stop 之後回來的回應被忽略', async () => {
  const { live, pending } = setup();
  const p = live.refresh();
  live.stop();
  pending[0].resolve(snowy);
  await p;
  expect(live.view()).toEqual({ kind: 'unavailable' });
});

test('due：每 15 分鐘一次', async () => {
  const { live, pending, tick } = setup();
  expect(live.due()).toBe(true);
  const p = live.refresh();
  expect(live.due()).toBe(false);
  pending[0].resolve(snowy);
  await p;
  tick(899_000);
  expect(live.due()).toBe(false);
  tick(1_000);
  expect(live.due()).toBe(true);
});

test('liveConditions：沒有資料就沒有雪', () => {
  const noon = Date.UTC(2026, 10, 21, 3, 0); // 日本 12:00
  const night = Date.UTC(2026, 10, 21, 14, 0); // 日本 23:00
  expect(liveConditions({ kind: 'unavailable' }, noon)).toEqual({
    amount: 0,
    windX: 0,
    gust: 0,
    wetness: 0.5,
    isDay: true,
  });
  expect(liveConditions({ kind: 'loading' }, night)).toMatchObject({ amount: 0, isDay: false });
});

test('liveConditions：有資料就照資料', async () => {
  const { live, pending } = setup();
  const p = live.refresh();
  pending[0].resolve(snowy);
  await p;
  const c = liveConditions(live.view(), 0);
  expect(c.amount).toBeGreaterThan(0.5);
  expect(c.wetness).toBe(0); // −6 °C
});

test('抓失敗後一分鐘就重試，連續失敗逐次拉長，成功後回到 15 分鐘', async () => {
  const { live, pending, tick } = setup();
  let p = live.refresh();
  pending[0].reject(new Error('offline'));
  await p;
  tick(59_000);
  expect(live.due()).toBe(false);
  tick(1_000);
  expect(live.due()).toBe(true); // 60 秒
  p = live.refresh();
  pending[1].reject(new Error('offline'));
  await p;
  tick(119_000);
  expect(live.due()).toBe(false);
  tick(1_000);
  expect(live.due()).toBe(true); // 第二次失敗：120 秒
  p = live.refresh();
  pending[2].resolve(snowy);
  await p;
  tick(120_000);
  expect(live.due()).toBe(false); // 成功了：回到 15 分鐘
  tick(780_000);
  expect(live.due()).toBe(true);
});

test('重試的間隔最長 15 分鐘', async () => {
  const { live, pending, tick } = setup();
  for (let i = 0; i < 8; i++) {
    const p = live.refresh();
    pending[i].reject(new Error('offline'));
    await p;
    tick(900_000);
    expect(live.due()).toBe(true);
  }
});
