import type p5 from 'p5';

const SIZE = 64;
const LEVELS = 6;

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 預先畫好的柔邊圓。blur 0 = 邊緣銳利 … 1 = 很糊（失焦）。 */
export interface Sprites {
  get(blur: number): p5.Graphics;
}

/**
 * 模糊的雪片不每一格用濾鏡算，預先畫成 6 張小圖再貼。
 * 每張由外往內疊 32 個半透明圓；每一圈的透明度是反推出來的，
 * 讓疊完之後從中心到邊緣的濃度剛好是想要的柔邊曲線。
 */
export function makeSprites(p: p5): Sprites {
  const list: p5.Graphics[] = [];
  const rings = 32;
  for (let i = 0; i < LEVELS; i++) {
    const blur = i / (LEVELS - 1);
    const core = Math.max(0.05, 0.85 - 0.8 * blur); // 實心部分佔半徑的比例
    const g = p.createGraphics(SIZE, SIZE);
    g.noStroke();
    let covered = 0;
    for (let k = 0; k < rings; k++) {
      const r = 1 - k / rings;
      const wanted = 0.98 * (1 - smoothstep(core, 1, r));
      const alpha = covered >= 0.98 ? 0 : 1 - (1 - wanted) / (1 - covered);
      if (alpha > 0) {
        g.fill(248, 250, 253, alpha * 255);
        g.circle(SIZE / 2, SIZE / 2, r * SIZE);
      }
      covered = wanted;
    }
    list.push(g);
  }
  return {
    get: (blur) => list[Math.round(Math.min(1, Math.max(0, blur)) * (LEVELS - 1))],
  };
}
