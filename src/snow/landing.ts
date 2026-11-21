import type { WarmPoint } from '../types';

export type LandedPhase = 'approach' | 'rest' | 'melt';

/** 落在玻璃上的一片雪。t：這個階段已經過了幾秒；dur：這個階段總長。 */
export interface Landed {
  id: number;
  /** 螢幕 px */
  x: number;
  y: number;
  /** 結晶的直徑，px */
  size: number;
  /** 0–1，決定結晶的形狀 */
  seed: number;
  phase: LandedPhase;
  t: number;
  dur: number;
}

/** 之後要加聲音時訂閱這些事件即可，不用改這裡。 */
export type LandingEvent = {
  type: 'landed' | 'touched' | 'melted';
  id: number;
  x: number;
  y: number;
};

export const MAX_LANDED = 30; // 玻璃上永遠不會積滿
export const WARM_RADIUS = 60; // 手指附近多遠的雪會化，px
export const MELT_SECONDS = 1;

const RATE_AT_FULL = 4; // 雪量 1 時每秒落幾片
const CLEAR_SECONDS = 2; // 雪停了之後，玻璃上剩下的雪最多再停這麼久
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 低頭時玻璃上的雪：靠近 → 落定 → 停留 → 化掉。 */
export class Landings {
  private list: Landed[] = [];
  private listeners = new Set<(e: LandingEvent) => void>();
  private owed = 0; // 還沒落下的小數片
  private nextId = 1;

  constructor(private rng: () => number) {}

  get items(): readonly Landed[] {
    return this.list;
  }

  /** 回傳取消訂閱的函式。 */
  on(fn: (e: LandingEvent) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /**
   * gate 是低頭的程度（viewWeights(posture).glass）：0 時不產生新的雪。
   * dt 由呼叫端先經過 clampDt。
   */
  step(
    dt: number,
    c: { amount: number; wetness: number },
    gate: number,
    warm: readonly WarmPoint[],
    bounds: { w: number; h: number },
  ): void {
    // 1. 畫面變小（手機旋轉）：落在新範圍外的直接移除，不佔名額
    this.list = this.list.filter((k) => k.x <= bounds.w && k.y <= bounds.h);

    // 2. 新的雪
    if (this.list.length < MAX_LANDED) {
      this.owed += c.amount * gate * RATE_AT_FULL * dt;
      while (this.owed >= 1 && this.list.length < MAX_LANDED) {
        this.owed -= 1;
        this.list.push({
          id: this.nextId++,
          x: this.rng() * bounds.w,
          y: this.rng() * bounds.h,
          dur: lerp(1, 2, this.rng()),
          size: lerp(20, 40, this.rng()),
          seed: this.rng(),
          phase: 'approach',
          t: 0,
        });
      }
    }

    // 3. 每一片往前走
    const done: Landed[] = [];
    for (const k of this.list) {
      k.t += dt;
      if (k.phase === 'approach') {
        if (k.t < k.dur) continue;
        // 落定。越冷停越久；落在還暖的地方停得短
        const heat = this.heatAt(k, warm);
        k.phase = 'rest';
        k.t = 0;
        k.dur = lerp(8, 3, c.wetness) * lerp(0.8, 1.2, this.rng()) * (1 - 0.9 * heat);
        if (c.amount <= 0) k.dur = Math.min(k.dur, clearAfter(k));
        this.emit('landed', k);
      } else if (k.phase === 'rest') {
        // 雪停了：剩下的雪幾秒內先後化完，不等原本的停留時間
        if (c.amount <= 0) k.dur = Math.min(k.dur, k.t + clearAfter(k));
        // 手指或游標正在那裡才會立刻化；離開後的餘溫不會融掉已經停著的雪
        const touching = warm.some((p) => p.heat >= 1 && near(k, p));
        if (touching) this.emit('touched', k);
        if (touching || k.t >= k.dur) {
          k.phase = 'melt';
          k.t = 0;
          k.dur = MELT_SECONDS;
        }
      } else if (k.t >= k.dur) {
        done.push(k);
      }
    }
    if (done.length > 0) {
      this.list = this.list.filter((k) => !done.includes(k));
      for (const k of done) this.emit('melted', k);
    }
  }

  private heatAt(k: Landed, warm: readonly WarmPoint[]): number {
    let heat = 0;
    for (const p of warm) if (near(k, p)) heat = Math.max(heat, p.heat);
    return Math.min(1, Math.max(0, heat));
  }

  private emit(type: LandingEvent['type'], k: Landed): void {
    const e: LandingEvent = { type, id: k.id, x: k.x, y: k.y };
    for (const fn of this.listeners) fn(e);
  }
}

/** 每一片錯開一點，才不會同時消失。 */
function clearAfter(k: Landed): number {
  return CLEAR_SECONDS * (0.4 + 0.6 * k.seed);
}

function near(k: Landed, p: WarmPoint): boolean {
  return Math.hypot(k.x - p.x, k.y - p.y) <= WARM_RADIUS;
}
