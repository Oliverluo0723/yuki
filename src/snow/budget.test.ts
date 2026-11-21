import { expect, test } from 'vitest';
import { activeCount, adjustBudget } from './budget';

test('幀率低就減少，夠高就增加，有上下限', () => {
  expect(adjustBudget(1000, 40)).toBe(900);
  expect(adjustBudget(1000, 55)).toBe(1000);
  expect(adjustBudget(1000, 60)).toBe(1050);
  expect(adjustBudget(1790, 60)).toBe(1800);
  expect(adjustBudget(160, 20)).toBe(150);
});

test('activeCount', () => {
  expect(activeCount(0, 1000)).toBe(0);
  expect(activeCount(0.5, 1000)).toBe(500);
  expect(activeCount(1, 1000)).toBe(1000);
});
