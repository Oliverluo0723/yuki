import { expect, test } from 'vitest';
import { choosePose } from './pose';

test('有感測器就用感測器，否則滑鼠', () => {
  const sensor = { posture: 0.8, down: { x: 0, y: 1 } };
  const pointer = { posture: 0.1, down: { x: 0.5, y: 0.866 } };
  expect(choosePose(sensor, pointer)).toBe(sensor);
  expect(choosePose(null, pointer)).toBe(pointer);
});
