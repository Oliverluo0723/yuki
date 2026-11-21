import { expect, test } from 'vitest';
import { activeCount, adjustBudget } from './budget';

test('忙不過來就減少，有餘裕就增加，有上下限', () => {
  expect(adjustBudget(1000, 60, 3)).toBe(1050); // 每格只花 3 ms：加
  expect(adjustBudget(1000, 60, 12)).toBe(900); // 每格花掉大半：減
  expect(adjustBudget(1000, 60, 7)).toBe(1000); // 中間：不動
  expect(adjustBudget(1000, 40, 22)).toBe(900); // 畫不完所以掉幀：減
  expect(adjustBudget(1790, 60, 3)).toBe(1800);
  expect(adjustBudget(160, 20, 30)).toBe(150);
});

test('省電模式把畫面鎖在 30 fps 時，不能因此把雪砍光', () => {
  expect(adjustBudget(1000, 30, 4)).toBe(1050); // 手機其實很閒
  expect(adjustBudget(1000, 30, 25)).toBe(900); // 真的忙不過來
  let b = 900;
  for (let i = 0; i < 60; i++) b = adjustBudget(b, 30, 4);
  expect(b).toBe(1800);
});

test('掉到 24 fps 以下一律減少；不上不下的幀率不亂加', () => {
  expect(adjustBudget(1000, 20, 2)).toBe(900); // 低於可接受的下限
  expect(adjustBudget(1000, 45, 3)).toBe(1000); // 不是程式忙，可能是顯示卡：先不加
});

test('activeCount', () => {
  expect(activeCount(0, 1000)).toBe(0);
  expect(activeCount(0.5, 1000)).toBe(500);
  expect(activeCount(1, 1000)).toBe(1000);
});
