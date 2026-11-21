import type { SnowConditions } from '../types';
import { pickHeaviest, toConditions } from './conditions';
import { buildUrl, parseResponse, type WeatherNow } from './openMeteo';
import type { Place } from './places';

/** 失敗時 reject。 */
export type FetchJson = (url: string) => Promise<unknown>;

export type LiveView =
  | { kind: 'loading' }
  | { kind: 'ok'; place: Place; now: WeatherNow }
  | { kind: 'unavailable' };

const REFRESH_MS = 900_000; // 資料每 15 分鐘更新一次
const STALE_MS = 3_600_000; // 抓不到時，一小時內的舊資料繼續用
const RETRY_MS = 60_000; // 抓失敗後多久重試；連續失敗每次加倍，最長 15 分鐘

/**
 * 實際模式的天氣：抓取、過期、亂序回應的處理。
 * 這裡絕不產生模擬的雪：沒有可用的資料就是 unavailable。
 */
export class LiveWeather {
  private seq = 0;
  private inFlight: number | null = null;
  private lastStart: number | null = null;
  private failures = 0; // 連續失敗幾次
  private data: { place: Place; now: WeatherNow; fetchedAt: number } | null = null;

  constructor(
    private fetchJson: FetchJson,
    private places: Place[],
    private clock: () => number,
  ) {}

  /** 抓一次。永不 reject；晚到的舊回應會被忽略。 */
  async refresh(): Promise<void> {
    const seq = ++this.seq;
    this.inFlight = seq;
    this.lastStart = this.clock();
    let list: ReturnType<typeof parseResponse> = null;
    try {
      list = parseResponse(await this.fetchJson(buildUrl(this.places)), this.places);
    } catch {
      list = null;
    }
    if (seq !== this.seq) return; // 之後又抓了一次，或已經 stop
    this.inFlight = null;
    if (!list) {
      // 失敗：保留舊資料，讓 view() 依時間決定還能不能用；並且早一點重試
      this.failures++;
      return;
    }
    this.failures = 0;
    const best = pickHeaviest(list);
    this.data = { place: best.place, now: best.now, fetchedAt: this.clock() };
  }

  /**
   * 該不該再抓一次：從沒抓過、距離上次開始抓取已滿 15 分鐘、
   * 或上次失敗而且已經等夠久（60 秒起，連續失敗逐次加倍）。
   */
  due(): boolean {
    if (this.lastStart === null) return true;
    const wait =
      this.failures === 0 ? REFRESH_MS : Math.min(REFRESH_MS, RETRY_MS * 2 ** (this.failures - 1));
    return this.clock() - this.lastStart >= wait;
  }

  view(): LiveView {
    if (this.data && this.clock() - this.data.fetchedAt <= STALE_MS) {
      return { kind: 'ok', place: this.data.place, now: this.data.now };
    }
    return this.inFlight === null ? { kind: 'unavailable' } : { kind: 'loading' };
  }

  /** 讓進行中的請求全部失效。之後再 refresh 仍然可以用。 */
  stop(): void {
    this.seq++;
    this.inFlight = null;
  }
}

/** 沒有可用的資料時沒有雪；晝夜改用日本時間（6–18 為晝）。 */
export function liveConditions(v: LiveView, nowMs: number): SnowConditions {
  if (v.kind === 'ok') return toConditions(v.now);
  const jstHour = (new Date(nowMs).getUTCHours() + 9) % 24;
  return { amount: 0, windX: 0, gust: 0, wetness: 0.5, isDay: jstHour >= 6 && jstHour < 18 };
}

/** 瀏覽器版的 FetchJson：10 秒逾時，非 2xx 視為失敗。 */
export async function browserFetchJson(url: string): Promise<unknown> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: abort.signal });
    if (!res.ok) throw new Error(`weather: HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
