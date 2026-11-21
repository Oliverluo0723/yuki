import type { Vec2, Vec3 } from '../types';

const RAD = Math.PI / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 桌面瀏覽器會發出 beta / gamma 是 null 的事件；那種當作沒有感測器。 */
export function readAngles(e: {
  beta: number | null;
  gamma: number | null;
}): { beta: number; gamma: number } | null {
  const { beta, gamma } = e;
  if (beta === null || gamma === null) return null;
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null;
  return { beta, gamma };
}

/**
 * 重力在裝置座標裡的單位向量（x 向右、y 朝螢幕上緣、z 朝觀眾）。
 * 平放螢幕朝上是 (0, 0, −1)，直立是 (0, −1, 0)。
 */
export function gravityFromAngles(betaDeg: number, gammaDeg: number): Vec3 {
  const b = betaDeg * RAD;
  const g = gammaDeg * RAD;
  return {
    x: Math.sin(g) * Math.cos(b),
    y: -Math.sin(b),
    z: -Math.cos(b) * Math.cos(g),
  };
}

/**
 * 螢幕朝天的程度：0 = 直立（平視）、1 = 平放（低頭）。
 * 螢幕與水平面的夾角在 uprightDeg 以上算完全直立、flatDeg 以下算完全平放。
 * 螢幕朝下也算平放。
 */
export function postureFromGravity(g: Vec3, uprightDeg = 60, flatDeg = 15): number {
  const elevation = Math.acos(Math.min(1, Math.abs(g.z))) / RAD;
  return clamp01((uprightDeg - elevation) / (uprightDeg - flatDeg));
}

/**
 * 螢幕座標（x 向右、y 向下）裡朝真正地面的單位向量。
 * screenAngleDeg 是 screen.orientation.angle。幾乎平放時方向不可靠，沿用 last。
 */
export function downFromGravity(g: Vec3, screenAngleDeg: number, last: Vec2): Vec2 {
  const len = Math.hypot(g.x, g.y);
  if (len < 0.15) return last;
  const t = screenAngleDeg * RAD;
  const x = g.x * Math.cos(t) - g.y * Math.sin(t);
  const yUp = g.x * Math.sin(t) + g.y * Math.cos(t);
  return { x: x / len, y: -yUp / len };
}

/** 指數平滑：tau 秒後追上約 63%。 */
export function smoothGravity(prev: Vec3, next: Vec3, dt: number, tau = 0.12): Vec3 {
  const k = 1 - Math.exp(-dt / tau);
  return {
    x: prev.x + (next.x - prev.x) * k,
    y: prev.y + (next.y - prev.y) * k,
    z: prev.z + (next.z - prev.z) * k,
  };
}
