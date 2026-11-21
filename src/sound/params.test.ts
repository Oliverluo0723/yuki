import { expect, test } from 'vitest';
import type { EasedConditions } from '../types';
import { panFor, soundParams, tickCount, windSwell } from './params';

const c = (o: Partial<EasedConditions> = {}): EasedConditions => ({
  amount: 0.6,
  windX: 0,
  gust: 0,
  wetness: 0,
  dayness: 0,
  ...o,
});
const LEVEL = { field: 1, glass: 0 };
const DOWN = { field: 0, glass: 1 };

test('安靜一直都在；雪越大越悶', () => {
  expect(soundParams(c({ amount: 0 }), LEVEL).airGain).toBeGreaterThan(0);
  expect(soundParams(c({ amount: 1 }), LEVEL).airCutoff).toBeLessThan(
    soundParams(c({ amount: 0 }), LEVEL).airCutoff,
  );
});

test('風跟著風速變大變高，方向不影響；低頭時退到遠處', () => {
  const calm = soundParams(c({ windX: 0 }), LEVEL);
  const east = soundParams(c({ windX: 1.2 }), LEVEL);
  const west = soundParams(c({ windX: -1.2 }), LEVEL);
  expect(east.windGain).toBeGreaterThan(calm.windGain * 3);
  expect(east.windFreq).toBeGreaterThan(calm.windFreq);
  expect(west.windGain).toBeCloseTo(east.windGain);
  expect(soundParams(c({ windX: 1.2 }), DOWN).windGain).toBeLessThan(east.windGain * 0.5);
  expect(soundParams(c({ windX: 5 }), LEVEL).windGain).toBeLessThanOrEqual(0.2); // 再大的風也不會爆音
});

test('沒有雪就沒有雪的聲音（實際模式沒下雪時）', () => {
  expect(soundParams(c({ amount: 0, windX: 1 }), LEVEL).tickRate).toBe(0);
  expect(soundParams(c({ amount: 0, windX: 1 }), LEVEL).windGain).toBeGreaterThan(0); // 但風還在
});

test('平視時雪越大細碎聲越密；低頭時不靠這一層（改由每一片落定各響一下）', () => {
  expect(soundParams(c({ amount: 1 }), LEVEL).tickRate).toBeGreaterThan(
    soundParams(c({ amount: 0.3 }), LEVEL).tickRate,
  );
  expect(soundParams(c({ amount: 1 }), DOWN).tickRate).toBe(0);
});

test('乾雪清脆，濕雪悶', () => {
  expect(soundParams(c({ wetness: 0 }), LEVEL).tickFreq).toBeGreaterThan(
    soundParams(c({ wetness: 1 }), LEVEL).tickFreq * 2,
  );
});

test('windSwell：陣風讓風一陣一陣，沒有陣風時是平的', () => {
  for (let t = 0; t < 600; t += 0.37) {
    expect(windSwell(t, 0)).toBe(1);
    const s = windSwell(t, 1);
    expect(s).toBeGreaterThanOrEqual(0.4);
    expect(s).toBeLessThanOrEqual(1.9);
  }
  const values = Array.from({ length: 200 }, (_, i) => windSwell(i * 0.7, 1));
  expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.5);
});

test('tickCount：長期平均等於 rate，rate 是 0 就永遠沒有', () => {
  let s = 1;
  const rng = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  let n = 0;
  for (let i = 0; i < 6000; i++) n += tickCount(8, 1 / 60, rng);
  expect(n).toBeGreaterThan(8 * 100 * 0.9);
  expect(n).toBeLessThan(8 * 100 * 1.1);
  for (let i = 0; i < 100; i++) expect(tickCount(0, 1 / 60, rng)).toBe(0);
  expect(tickCount(1000, 1 / 15, rng)).toBeLessThanOrEqual(4); // 一格最多幾聲
});

test('panFor：畫面左右對應聲音左右', () => {
  expect(panFor(0, 400)).toBeCloseTo(-0.8);
  expect(panFor(200, 400)).toBeCloseTo(0);
  expect(panFor(400, 400)).toBeCloseTo(0.8);
  expect(panFor(9999, 400)).toBeCloseTo(0.8);
});
