import GUI from 'lil-gui';
import type { SceneKind } from '../render/scene';
import type { SnowConditions } from '../types';

/** 要在裝置上用眼睛調的數值。 */
export interface Tunables {
  /** 0–1：每片雪拉出的短線多長。0 是點，超過 0.5 開始留下殘影 */
  trail: number;
  /** 螢幕與水平面的夾角在這以上算完全平視（度） */
  uprightDeg: number;
  /** 在這以下算完全平放（度） */
  flatDeg: number;
  /** 白天玻璃的亮度，0–1 */
  dayGlass: number;
  /** 雪片數量的上限 */
  budgetMax: number;
  /** 聲音的整體音量，1 = 預設，0 = 靜音 */
  volume: number;
  /** 平視的背景（試作）：0 原本的平塗、2 空氣加樹影、3 再加路燈 */
  scene: SceneKind;
}

/** 開發面板蓋掉的值；null／沒有的欄位表示交還給裝置和天氣。 */
export interface Overrides {
  posture: number | null;
  lean: number | null;
  conditions: Partial<SnowConditions>;
}

export const tunables: Tunables = {
  trail: 0.25,
  uprightDeg: 60,
  flatDeg: 15,
  dayGlass: 0.14,
  budgetMax: 1800,
  volume: 1,
  scene: 2,
};

export const overrides: Overrides = { posture: null, lean: null, conditions: {} };

/** 面板上顯示用，main 每秒更新。 */
export const stats = { fps: 0, workMs: 0, flakes: 0 };

/** 只在網址有 ?dev 時呼叫。這個面板不給觀眾用。 */
export function mountDevPanel(): void {
  const gui = new GUI({ title: 'Yuki dev' });

  const pose = { 覆寫: false, posture: 0, lean: 0 };
  const syncPose = () => {
    overrides.posture = pose.覆寫 ? pose.posture : null;
    overrides.lean = pose.覆寫 ? pose.lean : null;
  };
  const poseFolder = gui.addFolder('姿態');
  poseFolder.add(pose, '覆寫').onChange(syncPose);
  poseFolder.add(pose, 'posture', 0, 1, 0.01).onChange(syncPose);
  poseFolder.add(pose, 'lean', -1, 1, 0.01).onChange(syncPose);

  const sky = { 覆寫: false, amount: 0.6, windX: 0, gust: 0.3, wetness: 0.2, isDay: false };
  const syncSky = () => {
    const { 覆寫, ...values } = sky;
    overrides.conditions = 覆寫 ? values : {};
  };
  const skyFolder = gui.addFolder('天氣');
  skyFolder.add(sky, '覆寫').onChange(syncSky);
  skyFolder.add(sky, 'amount', 0, 1, 0.01).onChange(syncSky);
  skyFolder.add(sky, 'windX', -2.75, 2.75, 0.01).onChange(syncSky);
  skyFolder.add(sky, 'gust', 0, 1, 0.01).onChange(syncSky);
  skyFolder.add(sky, 'wetness', 0, 1, 0.01).onChange(syncSky);
  skyFolder.add(sky, 'isDay').onChange(syncSky);

  const look = gui.addFolder('畫面');
  look.add(tunables, 'trail', 0, 1, 0.01);
  look.add(tunables, 'uprightDeg', 30, 90, 1);
  look.add(tunables, 'flatDeg', 0, 45, 1);
  look.add(tunables, 'dayGlass', 0.03, 0.3, 0.01);
  look.add(tunables, 'budgetMax', 150, 1800, 50);
  look.add(tunables, 'volume', 0, 3, 0.05);
  look.add(tunables, 'scene', { 原本: 0, 樹影: 2, 路燈: 3 }).listen();

  const info = gui.addFolder('狀態');
  info.add(stats, 'fps').listen().disable();
  info.add(stats, 'workMs').listen().disable();
  info.add(stats, 'flakes').listen().disable();
}
