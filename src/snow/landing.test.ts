import { expect, test } from 'vitest';
import type { WarmPoint } from '../types';
import { type LandedPhase, type LandingEvent, Landings, MAX_LANDED } from './landing';

const B = { w: 400, h: 800 };
const snow = { amount: 1, wetness: 0.5 };
const none = { amount: 0, wetness: 0.5 };
const rngFrom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};
const run = (l: Landings, sec: number, c = snow, gate = 1, warm: WarmPoint[] = [], b = B) => {
  for (let i = 0; i < Math.round(sec * 60); i++) l.step(1 / 60, c, gate, warm, b);
};

test('有雪就落，但最多 30 枚', () => {
  const l = new Landings(rngFrom(1));
  let max = 0;
  for (let i = 0; i < 1800; i++) {
    l.step(1 / 60, snow, 1, [], B);
    max = Math.max(max, l.items.length);
  }
  expect(max).toBeGreaterThan(5);
  expect(max).toBeLessThanOrEqual(MAX_LANDED);
});

test('沒有雪、或不在低頭：不落', () => {
  const a = new Landings(rngFrom(1));
  run(a, 10, none);
  expect(a.items).toHaveLength(0);
  const b = new Landings(rngFrom(1));
  run(b, 10, snow, 0);
  expect(b.items).toHaveLength(0);
});

test('雪量越大落得越密', () => {
  const count = (amount: number) => {
    const l = new Landings(rngFrom(3));
    let n = 0;
    l.on((e) => {
      if (e.type === 'landed') n++;
    });
    run(l, 20, { amount, wetness: 0.5 });
    return n;
  };
  expect(count(1)).toBeGreaterThan(count(0.2) * 2);
});

test('一生：靠近 → 落定 → 停留 → 化掉，事件依序發出', () => {
  const l = new Landings(rngFrom(7));
  const events: string[] = [];
  l.on((e) => events.push(`${e.type}:${e.id}`));
  while (l.items.length === 0) l.step(1 / 60, snow, 1, [], B);
  const { id, size, x, y } = l.items[0];
  expect(l.items[0].phase).toBe('approach');
  expect(l.items[0].dur).toBeGreaterThanOrEqual(1);
  expect(l.items[0].dur).toBeLessThanOrEqual(2);
  expect(size).toBeGreaterThanOrEqual(20);
  expect(size).toBeLessThanOrEqual(40);
  expect(x).toBeGreaterThanOrEqual(0);
  expect(x).toBeLessThanOrEqual(B.w);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(y).toBeLessThanOrEqual(B.h);
  const seen: LandedPhase[] = [];
  for (let i = 0; i < 60 * 20; i++) {
    l.step(1 / 60, none, 1, [], B);
    const it = l.items.find((k) => k.id === id);
    if (it && seen.at(-1) !== it.phase) seen.push(it.phase);
  }
  expect(seen).toEqual(['approach', 'rest', 'melt']);
  expect(l.items.find((k) => k.id === id)).toBeUndefined();
  expect(events.filter((e) => e.endsWith(`:${id}`))).toEqual([`landed:${id}`, `melted:${id}`]);
});

test('越冷停越久', () => {
  const rest = (wetness: number) => {
    const l = new Landings(rngFrom(7));
    while (!l.items.some((k) => k.phase === 'rest'))
      l.step(1 / 60, { amount: 1, wetness }, 1, [], B);
    return l.items.find((k) => k.phase === 'rest')?.dur ?? 0;
  };
  expect(rest(0)).toBeGreaterThan(rest(1) * 2);
  expect(rest(0)).toBeLessThanOrEqual(8 * 1.2);
  expect(rest(1)).toBeGreaterThanOrEqual(3 * 0.8);
});

test('手指碰到：停留中的雪立刻開始化；60 px 外的不受影響', () => {
  const l = new Landings(rngFrom(7));
  const events: LandingEvent[] = [];
  l.on((e) => events.push(e));
  while (!l.items.some((k) => k.phase === 'rest')) l.step(1 / 60, snow, 1, [], B);
  const it = l.items.find((k) => k.phase === 'rest');
  if (!it) throw new Error('no resting flake');
  l.step(1 / 60, none, 1, [{ x: it.x + 61, y: it.y, heat: 1 }], B);
  expect(l.items.find((k) => k.id === it.id)?.phase).toBe('rest');
  l.step(1 / 60, none, 1, [{ x: it.x + 30, y: it.y, heat: 1 }], B);
  expect(l.items.find((k) => k.id === it.id)?.phase).toBe('melt');
  expect(events.some((e) => e.type === 'touched' && e.id === it.id)).toBe(true);
});

test('落在還暖的地方（手指已離開），停得短，但不會立刻化', () => {
  const restDur = (heat: number) => {
    const l = new Landings(rngFrom(7));
    while (l.items.length === 0) l.step(1 / 60, snow, 1, [], B);
    const a = l.items[0];
    const warm = heat > 0 ? [{ x: a.x, y: a.y, heat }] : [];
    while (l.items[0].phase === 'approach') l.step(1 / 60, none, 1, warm, B);
    expect(l.items[0].phase).toBe('rest');
    return l.items[0].dur;
  };
  expect(restDur(0.5)).toBeCloseTo(restDur(0) * 0.55, 1);
});

test('畫面變小：範圍外的雪直接移除，不發事件', () => {
  const l = new Landings(rngFrom(1));
  run(l, 15);
  const gone = l.items.filter((k) => k.x > 100 || k.y > 100).map((k) => k.id);
  expect(gone.length).toBeGreaterThan(0);
  const events: LandingEvent[] = [];
  l.on((e) => events.push(e));
  l.step(1 / 60, none, 1, [], { w: 100, h: 100 });
  expect(l.items.every((k) => k.x <= 100 && k.y <= 100)).toBe(true);
  expect(events.filter((e) => gone.includes(e.id))).toEqual([]);
});

test('on 回傳的函式可以取消訂閱', () => {
  const l = new Landings(rngFrom(1));
  let n = 0;
  const off = l.on(() => n++);
  off();
  run(l, 10);
  expect(n).toBe(0);
});
