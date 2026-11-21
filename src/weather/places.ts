export interface Place {
  name: string;
  lat: number;
  lon: number;
}

/**
 * 實際模式會看的北海道地點。顯示其中現在雪下得最大的那一個；
 * 全部都沒下時顯示第一個。想只看一個地方，把清單刪到剩一筆即可。
 */
export const PLACES: Place[] = [
  { name: '札幌', lat: 43.06, lon: 141.35 },
  { name: '旭川', lat: 43.77, lon: 142.36 },
  { name: '小樽', lat: 43.19, lon: 141.0 },
  { name: '俱知安', lat: 42.9, lon: 140.76 },
  { name: '富良野', lat: 43.34, lon: 142.38 },
  { name: '函館', lat: 41.77, lon: 140.73 },
  { name: '稚內', lat: 45.42, lon: 141.67 },
  { name: '釧路', lat: 42.98, lon: 144.38 },
  { name: '帶廣', lat: 42.92, lon: 143.2 },
  { name: '網走', lat: 44.02, lon: 144.27 },
];
