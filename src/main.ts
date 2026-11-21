import p5 from 'p5';
import { OrientationSource } from './input/orientation';
import { PointerSource, pointerPose } from './input/pointer';
import { choosePose } from './input/pose';
import { attachWarm, WarmTracker } from './input/warm';
import { Backdrop } from './render/backdrop';
import { drawField } from './render/fieldView';
import { drawGlass } from './render/glassView';
import { fieldBackground, glassBackground, mix } from './render/palette';
import { makeFrame, type SceneKind } from './render/scene';
import { makeSprites, type Sprites } from './render/sprites';
import { activeCount, adjustBudget } from './snow/budget';
import { clampDt, easeConditions, initialEased } from './snow/ease';
import { createField, type Flake, stepField } from './snow/field';
import { Landings } from './snow/landing';
import { viewWeights } from './snow/views';
import { SnowSound } from './sound/engine';
import { panFor, soundParams, windSwell } from './sound/params';
import type { Mode, SnowConditions } from './types';
import { mountDevPanel, overrides, stats, tunables } from './ui/devPanel';
import { noticeFor, showEntry, showNotice, silentSensorNotice } from './ui/entry';
import { mountLabel } from './ui/label';
import { labelText } from './ui/labelText';
import { driftConditions } from './weather/drift';
import { browserFetchJson, LiveWeather, liveConditions } from './weather/live';
import { PLACES } from './weather/places';

const stage = document.getElementById('stage');
if (!stage) throw new Error('#stage not found');

// p5 預設每次呼叫都檢查參數，正式執行時不需要
p5.disableFriendlyErrors = true;

const sound = new SnowSound();

const dev = new URLSearchParams(location.search).has('dev');
if (dev) {
  mountDevPanel();
  // 開發時可以在主控台直接改：yuki.overrides.posture = 1
  Object.assign(window, { yuki: { overrides, tunables, stats, sound } });
}

// 試作：鍵盤 0／2／3 或網址 ?scene=3 切換平視的背景
const asScene = (v: string | null): SceneKind | null =>
  v === '0' ? 0 : v === '2' ? 2 : v === '3' ? 3 : null;
tunables.scene = asScene(new URLSearchParams(location.search).get('scene')) ?? tunables.scene;
window.addEventListener('keydown', (e) => {
  tunables.scene = asScene(e.key) ?? tunables.scene;
});

const root = document.documentElement;
const pointer = new PointerSource(root);
const orientation = new OrientationSource();
const warm = new WarmTracker();
attachWarm(root, warm);

// 兩個模式：常雪（預設）與北海道現在的天氣。點右下角的標籤切換。
let mode: Mode = 'free';
const live = new LiveWeather(browserFetchJson, PLACES, Date.now);
const label = mountLabel(() => {
  mode = mode === 'free' ? 'live' : 'free';
  // 切回常雪時不丟資料：一小時內再切回來不用等。
  // 沒有可用的資料、或已滿 15 分鐘才重新抓，連續切換不會送出一串請求。
  if (mode === 'live' && (live.due() || live.view().kind === 'unavailable')) live.refresh();
});

// 入口：點一下之後才能讀手機的姿態
const desktop = window.matchMedia('(pointer: fine)').matches;
showEntry({
  desktop,
  url: location.origin + location.pathname,
  onStart: () => sound.start(), // 聲音必須在這一下點擊裡開始
}).then((result) => {
  if (result === 'granted') orientation.start();
  const notice = noticeFor(result, desktop);
  if (notice) showNotice(notice);
  // Android 不會詢問權限，感測器被擋掉時只會一直沒有資料：等一下還是沒有就說明
  else if (result === 'granted') {
    setTimeout(() => {
      const silent = silentSensorNotice(orientation.current() !== null, desktop);
      if (silent) showNotice(silent);
    }, 2500);
  }
});

new p5((p: p5) => {
  let sprites: Sprites;
  let flakes: Flake[] = [];
  const landings = new Landings(Math.random);
  const backdrop = new Backdrop();

  // 每次打開從不同的時間點開始，常雪模式的天氣才不會每次都一樣
  let t = Math.random() * 10_000;
  const target = (): SnowConditions => ({
    // 實際模式只讀天氣資料；沒有資料就沒有雪，絕不用模擬的補上
    ...(mode === 'live'
      ? liveConditions(live.view(), Date.now())
      : driftConditions(t, new Date().getHours())),
    ...overrides.conditions,
  });
  let eased = initialEased(target());
  let glass = 0; // 現在低頭的程度，給聲音用

  // 玻璃上的雪發出的聲音：每一片落定各響一下，被手指融掉是一聲氣音
  landings.on((e) => {
    if (glass < 0.3) return; // 沒在低頭看，就聽不到這麼近的聲音
    const pan = panFor(e.x, p.width);
    if (e.type === 'landed') sound.landed(pan, eased.wetness);
    else if (e.type === 'touched') sound.touched(pan);
  });

  // 雪片數量：手機先少一點，之後每秒依幀率調整
  let budget = window.matchMedia('(pointer: coarse)').matches ? 900 : 1500;
  let frames = 0;
  let workMs = 0; // 這一秒裡花在計算和畫圖的時間
  let fpsSince = performance.now();

  p.setup = () => {
    p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
    p.createCanvas(window.innerWidth, window.innerHeight);
    sprites = makeSprites(p);
    flakes = createField(tunables.budgetMax, Math.random);
  };

  p.windowResized = () => {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
  };

  p.draw = () => {
    const began = performance.now();
    const dt = clampDt(p.deltaTime / 1000);
    t += dt;

    // 輸入 → 姿態
    warm.step(dt);
    orientation.step(dt);
    const sensed = choosePose(
      orientation.current(tunables.uprightDeg, tunables.flatDeg),
      pointer.current(),
    );
    const posture = overrides.posture ?? sensed.posture;
    const down =
      overrides.lean === null
        ? sensed.down
        : pointerPose({ posture: 0, lean: overrides.lean }).down;

    // 模式 → 條件
    if (mode === 'live' && document.visibilityState === 'visible' && live.due()) live.refresh();
    label.set(labelText(mode, live.view()));
    const goal = target();
    eased = easeConditions(eased, goal, dt);
    const w = viewWeights(posture);
    glass = w.glass;
    sound.update(soundParams(eased, w), windSwell(t, eased.gust), dt, tunables.volume);

    // 雪
    const active = activeCount(eased.amount, budget);
    stepField(
      flakes,
      active,
      eased,
      down,
      dt,
      t,
      (x, y, z) => p.noise(x, y, z),
      p.width / p.height,
    );
    // 雪停了就不再落新的；eased 還在退場的那幾秒也一樣
    const landing = { amount: goal.amount === 0 ? 0 : eased.amount, wetness: eased.wetness };
    landings.step(dt, landing, w.glass, warm.points(), { w: p.width, h: p.height });

    // 畫
    const bg = mix(
      fieldBackground(eased.dayness),
      glassBackground(eased.dayness, tunables.dayGlass),
      w.glass,
    );
    // trail 超過 0.5 時不整張清掉，留下殘影（只在平視）
    const smear = tunables.trail > 0.5 ? (tunables.trail - 0.5) * 1.96 * w.field : 0;
    p.background(bg[0], bg[1], bg[2], (1 - smear) * 255);
    const frame = tunables.scene === 0 ? null : makeFrame(p.width, p.height, down, posture);
    if (frame) backdrop.draw(p, tunables.scene, frame, eased.dayness, w.field * (1 - smear));
    if (w.field > 0) {
      drawField(p, flakes, eased, w.field, tunables.trail, sprites, frame);
      if (frame) backdrop.drawLit(p, tunables.scene, flakes, frame, eased, w.field);
    }
    if (w.glass > 0) drawGlass(p, landings.items, w.glass, sprites);

    // 每秒量一次幀率和每格的工作時間，調整雪片數量
    frames++;
    const now = performance.now();
    workMs += now - began;
    const elapsed = now - fpsSince;
    if (elapsed >= 1000) {
      // 分頁剛從背景回來時這一秒不準，跳過
      if (elapsed < 2000) {
        const fps = (frames * 1000) / elapsed;
        const work = workMs / frames;
        budget = adjustBudget(budget, fps, work, 150, tunables.budgetMax);
        stats.fps = Math.round(fps);
        stats.workMs = Math.round(work * 10) / 10;
        stats.flakes = active;
      }
      frames = 0;
      workMs = 0;
      fpsSince = now;
    }
  };
}, stage);
