import type { Vec2 } from '../types';

/**
 * 背景的幾何（試作）。全部在「世界座標」裡算：
 * 原點在畫面中央，v 軸朝真正的地面（down），u 軸朝右。
 * 地平線是 v = horizon 的那條線，永遠水平。
 */

/** 0 = 原本的平塗；2 = 空氣加遠處的樹影；3 = 再加一排路燈 */
export type SceneKind = 0 | 2 | 3;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 雪片的深度（0 遠 … 1 近）→ 「近的程度」，跟距離成反比。 */
export function nearness(z: number): number {
  return lerp(0.08, 2.2, z ** 1.5);
}

/** nearness 的反函數：這個近的程度對應哪個深度。 */
export function depthOf(near: number): number {
  return Math.min(1, Math.max(0, (near - 0.08) / 2.12)) ** (2 / 3);
}

export interface Frame {
  /** 畫面中央，px */
  cx: number;
  cy: number;
  down: Vec2;
  /** 地平線在中央下方多少 px（沿 down）。低頭時地平線往上跑 */
  horizon: number;
  /** 眼睛的高度換成 px：深度 near = 1 的地面在地平線下方這麼遠 */
  eye: number;
  /** 觀看的人往旁邊站了多少：near = 1 的東西橫移這麼多 px，越遠移得越少 */
  sway: number;
}

/**
 * 背景不跟著手機轉：地平線永遠水平。
 * 歪手機或移動游標時，雪往低的那邊斜，背景只做「人往旁邊站一步」的視差。
 */
export function makeFrame(w: number, h: number, down: Vec2, posture: number): Frame {
  return {
    cx: w / 2,
    cy: h / 2,
    down: { x: 0, y: 1 },
    horizon: h * (0.12 - 0.9 * posture),
    eye: h * 0.38,
    sway: -down.x * 0.4 * h,
  };
}

/** 螢幕上的點在地平線下方多少 px（負的是在地平線上方）。 */
export function belowHorizon(f: Frame, x: number, y: number): number {
  return (x - f.cx) * f.down.x + (y - f.cy) * f.down.y - f.horizon;
}

/** 這個深度的雪片已經落到地面以下、看不見了嗎。 */
export function isGrounded(f: Frame, x: number, y: number, z: number): boolean {
  return belowHorizon(f, x, y) > f.eye * nearness(z);
}

export interface Lamp {
  /** 世界座標（相對於地平線中央），px */
  u: number;
  /** 燈頭，在地平線上方所以是負的 */
  head: number;
  /** 燈柱落地的位置 */
  foot: number;
  near: number;
  /** 燈光照到的半徑，px */
  reach: number;
}

const LAMP_NEARS = [0.75, 0.4, 0.22, 0.12, 0.07];
const LAMP_HEIGHT = 2.6; // 燈高是眼睛高度的幾倍

/** 路的右邊一排路燈，往地平線中央的消失點收攏。 */
export function lamps(f: Frame, w: number, h: number): Lamp[] {
  // 最近的那盞放在畫面右側，直式螢幕也看得到
  const side = Math.min(0.36 * w, 0.45 * h) / LAMP_NEARS[0];
  return LAMP_NEARS.map((near) => ({
    u: (side + f.sway) * near,
    head: (1 - LAMP_HEIGHT) * f.eye * near,
    foot: f.eye * near,
    near,
    reach: 1.25 * f.eye * near,
  }));
}

/** 世界座標 → 螢幕座標。 */
export function toScreen(f: Frame, u: number, v: number): Vec2 {
  const dv = v + f.horizon;
  return {
    x: f.cx + u * f.down.y + dv * f.down.x,
    y: f.cy - u * f.down.x + dv * f.down.y,
  };
}
