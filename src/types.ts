export interface Vec2 {
  x: number;
  y: number;
}
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 感測器或滑鼠算出的姿態。down 是螢幕座標（x 向右、y 向下）裡朝真正地面的單位向量。 */
export interface SensedPose {
  /** 0 = 直立（平視）… 1 = 平放（低頭） */
  posture: number;
  down: Vec2;
}
/** 螢幕 px；heat 0–1（1 = 手指或游標正在那裡） */
export interface WarmPoint {
  x: number;
  y: number;
  heat: number;
}
export interface Pose extends SensedPose {
  warm: WarmPoint[];
}

/** 兩個模式都產生這份資料。windX = 橫向速度 ÷ 落下速度（tan 斜角），正值往右。 */
export interface SnowConditions {
  /** 0–1，雪量。0 = 沒有雪 */
  amount: number;
  windX: number;
  /** 0–1，風忽強忽弱的程度 */
  gust: number;
  /** 0–1，0 = 又乾又輕，1 = 又濕又重 */
  wetness: number;
  isDay: boolean;
}
/** 漸變後、給雪和畫面讀的版本。dayness 0 = 夜、1 = 晝。 */
export interface EasedConditions {
  amount: number;
  windX: number;
  gust: number;
  wetness: number;
  dayness: number;
}
export type Mode = 'free' | 'live';
/** 回傳 0–1 */
export type Noise3 = (x: number, y: number, t: number) => number;
