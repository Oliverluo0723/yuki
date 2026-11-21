/** 0–255 */
export type RGB = [number, number, number];

const FIELD_NIGHT: RGB = [11, 15, 23];
const FIELD_DAY: RGB = [223, 227, 230];
const GLASS_NIGHT: RGB = [7, 9, 13];
/** 白天的玻璃：這個藍灰色再依 dayGlass 調整明暗（像日光下的深色外套）。 */
const GLASS_DAY_HUE: RGB = [29, 37, 48];
const FLAKE_NIGHT: RGB = [242, 245, 250];
const FLAKE_DAY_FAR: RGB = [201, 207, 214]; // 比白天的底暗一點
const FLAKE_DAY_NEAR: RGB = [255, 255, 255]; // 比白天的底亮
const CRYSTAL: RGB = [236, 242, 250];

/** 相對亮度，0–1。 */
export function luminance(c: RGB): number {
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  const k = Math.min(1, Math.max(0, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

/** 平視的底色：夜深、晝淺。dayness 0 = 夜、1 = 晝。 */
export function fieldBackground(dayness: number): RGB {
  return mix(FIELD_NIGHT, FIELD_DAY, dayness);
}

/**
 * 低頭的底色：永遠是深色的，白天也一樣。人低頭看雪，看的是落在深色袖子上的那幾片。
 * dayGlass 是白天玻璃的亮度（0–1），可調。
 */
export function glassBackground(dayness: number, dayGlass = 0.14): RGB {
  const scale = dayGlass / luminance(GLASS_DAY_HUE);
  const day: RGB = [
    Math.min(255, Math.round(GLASS_DAY_HUE[0] * scale)),
    Math.min(255, Math.round(GLASS_DAY_HUE[1] * scale)),
    Math.min(255, Math.round(GLASS_DAY_HUE[2] * scale)),
  ];
  return mix(GLASS_NIGHT, day, dayness);
}

/** 平視的雪。夜裡是亮的；白天近的比底亮、遠的比底暗，靠失焦和動態才看得出來。 */
export function flakeColor(dayness: number, z: number): RGB {
  return mix(FLAKE_NIGHT, mix(FLAKE_DAY_FAR, FLAKE_DAY_NEAR, z), dayness);
}

/** 玻璃上的結晶永遠是亮的細線。 */
export function crystalColor(): RGB {
  return CRYSTAL;
}
