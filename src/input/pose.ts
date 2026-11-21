import type { SensedPose } from '../types';

/** 拿到感測器資料就用感測器；沒有就用滑鼠。 */
export function choosePose(sensor: SensedPose | null, pointer: SensedPose): SensedPose {
  return sensor ?? pointer;
}
