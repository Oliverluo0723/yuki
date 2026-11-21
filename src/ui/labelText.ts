import type { Mode } from '../types';
import { isSnowing } from '../weather/conditions';
import type { LiveView } from '../weather/live';

/** 右下角那一行字。時間直接取資料裡的當地時間字串，不經過 Date（會被觀眾的時區影響）。 */
export function labelText(mode: Mode, live: LiveView): string {
  if (mode === 'free') return '雪';
  if (live.kind === 'loading') return '北海道 …';
  if (live.kind === 'unavailable') return '讀不到北海道的天氣';
  const { place, now } = live;
  const head = `${place.name} ${now.time.slice(11, 16)}`;
  if (!isSnowing(now)) return `${head} 現在沒有下雪`;
  if (now.temperature === null) return head;
  const t = Math.round(now.temperature);
  return `${head} ${t < 0 ? `−${-t}` : `${Math.abs(t)}`}°C`; // U+2212；−0.4 要顯示 0
}
