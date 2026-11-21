import type { SnowConditions } from '../types';
import type { PlaceWeather, WeatherNow } from './openMeteo';

const RAD = Math.PI / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const MIN_AMOUNT = 0.15; // 在下雪時，畫面上至少看得出來的雪量
/** 天氣代碼給雪量的下限：很輕的乾雪降雪量可能讀到 0，但代碼仍然說在下。 */
const CODE_FLOOR: Record<number, number> = {
  71: MIN_AMOUNT, // 小雪
  77: MIN_AMOUNT, // 雪粒
  85: MIN_AMOUNT, // 小陣雪
  73: 0.5, // 中雪
  75: 0.8, // 大雪
  86: 0.8, // 大陣雪
};
const CODE_STRENGTH: Record<number, number> = { 71: 1, 77: 1, 85: 1, 73: 2, 75: 3, 86: 3 };

export function isSnowing(w: WeatherNow): boolean {
  return w.snowfall > 0 || w.weatherCode in CODE_FLOOR;
}

/** 規格 6.3：天氣 → 雪的條件。數值都是起始值，要在手機上用眼睛調。 */
export function toConditions(w: WeatherNow): SnowConditions {
  // 雪量：每 15 分鐘 1 cm 以上視為最大，之間用平方根讓小雪也看得見
  const fromCm = 1 - (1 - MIN_AMOUNT) * (1 - Math.sqrt(Math.min(w.snowfall, 1)));
  const amount = isSnowing(w) ? Math.max(fromCm, CODE_FLOOR[w.weatherCode] ?? 0) : 0;

  // 風：windDirection 是吹來的方向；假設觀眾面向正北，所以東是畫面右邊
  const eastward = -Math.sin(w.windDirection * RAD) * w.windSpeed; // km/h
  // 10 m 高的風速直接換算會讓雪幾乎橫著飛，壓縮成：20 km/h 斜 45°，上限 70°
  const angle = Math.min(70, (Math.abs(eastward) * 45) / 20);
  const windX = Math.sign(eastward) * Math.tan(angle * RAD);

  return {
    amount,
    windX,
    gust: clamp01((w.windGusts - w.windSpeed) / 30),
    // −5 °C 以下又乾又輕，0 °C 以上又濕又重
    wetness: w.temperature === null ? 0.5 : clamp01((w.temperature + 5) / 5),
    isDay: w.isDay,
  };
}

/** 先比降雪量，相同再比代碼的強度，再相同照清單順序；都沒下就是第一個。 */
export function pickHeaviest(list: PlaceWeather[]): PlaceWeather {
  let best = list[0];
  for (const item of list.slice(1)) {
    const a = item.now;
    const b = best.now;
    const sa = CODE_STRENGTH[a.weatherCode] ?? 0;
    const sb = CODE_STRENGTH[b.weatherCode] ?? 0;
    if (a.snowfall > b.snowfall || (a.snowfall === b.snowfall && sa > sb)) best = item;
  }
  return best;
}
