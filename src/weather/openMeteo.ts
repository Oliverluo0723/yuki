import type { Place } from './places';

/** 某個地點現在的天氣（Open-Meteo 的 current，每 15 分鐘更新）。 */
export interface WeatherNow {
  /** 當地時間，例如 '2026-11-21T15:00' */
  time: string;
  /** °C；資料沒給時是 null */
  temperature: number | null;
  /** 前 15 分鐘的降雪量，cm */
  snowfall: number;
  /** WMO 天氣代碼；資料沒給時是 −1 */
  weatherCode: number;
  /** km/h */
  windSpeed: number;
  /** 度，風「吹來」的方向 */
  windDirection: number;
  /** km/h */
  windGusts: number;
  isDay: boolean;
}

export interface PlaceWeather {
  place: Place;
  now: WeatherNow;
}

const FIELDS =
  'temperature_2m,snowfall,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day';

/** 多個地點用逗號一次查完；回應是同順序的陣列（只有一個地點時是物件）。 */
export function buildUrl(places: Place[]): string {
  const lat = places.map((p) => p.lat).join(',');
  const lon = places.map((p) => p.lon).join(',');
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${FIELDS}&timezone=Asia%2FTokyo`;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function parseOne(entry: unknown): WeatherNow | null {
  if (typeof entry !== 'object' || entry === null) return null;
  const cur = (entry as { current?: unknown }).current;
  if (typeof cur !== 'object' || cur === null) return null;
  const c = cur as Record<string, unknown>;
  if (typeof c.time !== 'string') return null;
  const snowfall = num(c.snowfall);
  const code = num(c.weather_code);
  if (snowfall === null && code === null) return null; // 沒有任何能判斷下不下雪的欄位
  const windSpeed = Math.max(0, num(c.wind_speed_10m) ?? 0);
  const isDayField = num(c.is_day);
  const hour = Number(c.time.slice(11, 13));
  return {
    time: c.time,
    temperature: num(c.temperature_2m),
    snowfall: Math.max(0, snowfall ?? 0), // 負值會讓雪量算出 NaN
    weatherCode: code ?? -1,
    windSpeed,
    windDirection: num(c.wind_direction_10m) ?? 0,
    windGusts: num(c.wind_gusts_10m) ?? windSpeed,
    isDay: isDayField !== null ? isDayField === 1 : hour >= 6 && hour < 18,
  };
}

/** 回應的形狀只要有一點不對（錯誤物件、長度不符、缺 current…）就回 null，當作抓取失敗。 */
export function parseResponse(json: unknown, places: Place[]): PlaceWeather[] | null {
  const entries = Array.isArray(json) ? json : [json];
  if (entries.length !== places.length) return null;
  const out: PlaceWeather[] = [];
  for (let i = 0; i < entries.length; i++) {
    const now = parseOne(entries[i]);
    if (!now) return null;
    out.push({ place: places[i], now });
  }
  return out;
}
