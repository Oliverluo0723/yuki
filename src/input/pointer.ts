import type { SensedPose } from '../types';

/** 滑鼠版的姿態：posture 由捲動累積，lean（−1…1）由游標的左右位置決定。 */
export interface PointerState {
  posture: number;
  lean: number;
}

const WHEEL_PX_FOR_FULL = 600; // 捲這麼多 px 從平視走到低頭
const LINE_PX = 16;
const MAX_LEAN_RAD = (35 * Math.PI) / 180; // 游標在畫面邊緣時，雪斜 35°

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** WheelEvent.deltaMode：0 = px、1 = 行、2 = 頁。 */
export function normalizeWheel(deltaY: number, deltaMode: number): number {
  if (deltaMode === 1) return deltaY * LINE_PX;
  if (deltaMode === 2) return deltaY * WHEEL_PX_FOR_FULL;
  return deltaY;
}

export function wheel(s: PointerState, pixels: number): PointerState {
  return { ...s, posture: clamp(s.posture + pixels / WHEEL_PX_FOR_FULL, 0, 1) };
}

export function moveX(s: PointerState, x: number, width: number): PointerState {
  return { ...s, lean: clamp((x / width - 0.5) * 2, -1, 1) };
}

export function pointerPose(s: PointerState): SensedPose {
  const a = s.lean * MAX_LEAN_RAD;
  return { posture: s.posture, down: { x: Math.sin(a), y: Math.cos(a) } };
}

/** 把滑鼠的捲動與左右移動接到 PointerState。 */
export class PointerSource {
  private state: PointerState = { posture: 0, lean: 0 };

  constructor(target: HTMLElement) {
    target.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault(); // 頁面本身不捲動
        this.state = wheel(this.state, normalizeWheel(e.deltaY, e.deltaMode));
      },
      { passive: false },
    );
    target.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.state = moveX(this.state, e.clientX, window.innerWidth);
    });
  }

  current(): SensedPose {
    return pointerPose(this.state);
  }
}
