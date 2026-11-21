import type { WarmPoint } from '../types';

const COOL_SECONDS = 1.5; // 手指離開後，那一塊還暖多久
const MOUSE_ID = -1;

interface Spot {
  x: number;
  y: number;
  held: boolean;
  heat: number;
}

/** 手指（或游標）在玻璃上留下的暖區。按著時 heat = 1，放開後在 1.5 秒內退到 0。 */
export class WarmTracker {
  private spots = new Map<number, Spot>();

  down(id: number, x: number, y: number): void {
    this.spots.set(id, { x, y, held: true, heat: 1 });
  }

  move(id: number, x: number, y: number): void {
    const s = this.spots.get(id);
    if (!s?.held) return;
    s.x = x;
    s.y = y;
  }

  up(id: number): void {
    const s = this.spots.get(id);
    if (s) s.held = false;
  }

  step(dt: number): void {
    for (const [id, s] of this.spots) {
      if (s.held) continue;
      s.heat -= dt / COOL_SECONDS;
      if (s.heat <= 1e-9) this.spots.delete(id);
    }
  }

  points(): WarmPoint[] {
    return [...this.spots.values()].map(({ x, y, heat }) => ({ x, y, heat }));
  }
}

/** 觸控：按下才算。滑鼠：游標在畫面上就算（不用按），離開畫面才放開。 */
export function attachWarm(target: HTMLElement, tracker: WarmTracker): void {
  let mouseIn = false;
  target.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    tracker.down(e.pointerId, e.clientX, e.clientY);
  });
  target.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      if (mouseIn) tracker.move(MOUSE_ID, e.clientX, e.clientY);
      else tracker.down(MOUSE_ID, e.clientX, e.clientY);
      mouseIn = true;
      return;
    }
    tracker.move(e.pointerId, e.clientX, e.clientY);
  });
  const release = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    tracker.up(e.pointerId);
  };
  target.addEventListener('pointerup', release);
  target.addEventListener('pointercancel', release);
  target.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    tracker.up(MOUSE_ID);
    mouseIn = false;
  });
}
