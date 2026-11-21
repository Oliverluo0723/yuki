import type { SensedPose, Vec2, Vec3 } from '../types';
import {
  downFromGravity,
  gravityFromAngles,
  postureFromGravity,
  readAngles,
  smoothGravity,
} from './gravity';

export type OrientationPermission = 'granted' | 'denied' | 'unsupported';

/**
 * iPhone 規定必須在使用者點擊的處理函式裡直接呼叫（前面不能有 await）。
 * Android Chrome 不用請求，直接算 granted。
 */
export function requestOrientation(): Promise<OrientationPermission> {
  if (typeof DeviceOrientationEvent === 'undefined') return Promise.resolve('unsupported');
  const ctor = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof ctor.requestPermission !== 'function') return Promise.resolve('granted');
  let asked: Promise<string>;
  try {
    asked = ctor.requestPermission();
  } catch {
    return Promise.resolve('denied');
  }
  return asked.then(
    (r) => (r === 'granted' ? 'granted' : 'denied'),
    () => 'denied',
  );
}

/** 手機姿態感測器 → 平滑過的重力 → posture 與「下」。 */
export class OrientationSource {
  private target: Vec3 | null = null;
  private smoothed: Vec3 | null = null;
  private lastDown: Vec2 = { x: 0, y: 1 };

  start(): void {
    window.addEventListener('deviceorientation', (e) => {
      const a = readAngles(e);
      if (!a) return; // 桌面瀏覽器會發 null 的事件：當作沒有感測器
      this.target = gravityFromAngles(a.beta, a.gamma);
    });
  }

  step(dt: number): void {
    if (!this.target) return;
    this.smoothed = this.smoothed ? smoothGravity(this.smoothed, this.target, dt) : this.target;
  }

  /** 還沒收過有效的感測器資料時回 null。 */
  current(uprightDeg = 60, flatDeg = 15): SensedPose | null {
    const s = this.smoothed;
    if (!s) return null;
    const len = Math.hypot(s.x, s.y, s.z) || 1;
    const g = { x: s.x / len, y: s.y / len, z: s.z / len };
    const angle = screen.orientation?.angle ?? 0;
    this.lastDown = downFromGravity(g, angle, this.lastDown);
    return { posture: postureFromGravity(g, uprightDeg, flatDeg), down: this.lastDown };
  }
}
