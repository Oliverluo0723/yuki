/** 整數格點 → 0–1 的固定亂數。 */
function hash(i: number): number {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * 1D value noise，回傳 0–1：格點之間用 smoothstep 內插。
 * 不用 p5 的 noise，才能在沒有畫面的環境裡測。
 */
export function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i);
  return a + (hash(i + 1) - a) * u;
}
