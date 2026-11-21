/** 主枝上的一對側枝。at：沿主枝的位置 0–1；len：長度；angle：與主枝的夾角（弧度）。 */
export interface Branch {
  at: number;
  len: number;
  angle: number;
}

/**
 * 一枚結晶 = 中央六角板（半徑 core）+ 六根長度 1 的主枝，
 * 每根主枝兩側對稱長出 branches。座標都在單位圓內，畫的時候再乘上實際大小。
 */
export interface Crystal {
  core: number;
  branches: Branch[];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEG = Math.PI / 180;

/** 同一個種子（0–1）永遠長出同一枚。 */
export function makeCrystal(seed: number): Crystal {
  const rng = mulberry32(Math.floor(seed * 4294967296));
  const core = rng() * 0.3;
  const count = 2 + Math.floor(rng() * 4); // 2–5 對
  const branches: Branch[] = [];
  for (let i = 0; i < count; i++) {
    const at = 0.2 + rng() * 0.7;
    const angle = (40 + rng() * 30) * DEG;
    // 越靠近枝尖的側枝越短
    const wanted = (0.15 + rng() * 0.3) * (1 - at * 0.6);
    // 枝尖不能超出單位圓：解 |(at + L·cos, L·sin)| = 1
    const cos = Math.cos(angle);
    const maxLen = -at * cos + Math.sqrt(at * at * cos * cos - at * at + 1);
    branches.push({ at, len: Math.min(wanted, maxLen * 0.999), angle });
  }
  branches.sort((a, b) => a.at - b.at);
  return { core, branches };
}
