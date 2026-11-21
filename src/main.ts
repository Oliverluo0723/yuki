import p5 from 'p5';
import { OrientationSource } from './input/orientation';
import { PointerSource, pointerPose } from './input/pointer';
import { choosePose } from './input/pose';
import { attachWarm, WarmTracker } from './input/warm';
import { drawField } from './render/fieldView';
import { drawGlass } from './render/glassView';
import { fieldBackground, glassBackground, mix } from './render/palette';
import { makeSprites, type Sprites } from './render/sprites';
import { activeCount, adjustBudget } from './snow/budget';
import { clampDt, easeConditions, initialEased } from './snow/ease';
import { createField, type Flake, stepField } from './snow/field';
import { Landings } from './snow/landing';
import { viewWeights } from './snow/views';
import type { Mode, SnowConditions } from './types';
import { mountDevPanel, overrides, stats, tunables } from './ui/devPanel';
import { noticeFor, showEntry, showNotice } from './ui/entry';
import { mountLabel } from './ui/label';
import { labelText } from './ui/labelText';
import { driftConditions } from './weather/drift';
import { browserFetchJson, LiveWeather, liveConditions } from './weather/live';
import { PLACES } from './weather/places';

const stage = document.getElementById('stage');
if (!stage) throw new Error('#stage not found');

const dev = new URLSearchParams(location.search).has('dev');
if (dev) {
  mountDevPanel();
  // 開發時可以在主控台直接改：yuki.overrides.posture = 1
  Object.assign(window, { yuki: { overrides, tunables, stats } });
}

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
showEntry({ desktop, url: location.origin + location.pathname }).then((result) => {
  if (result === 'granted') orientation.start();
  const notice = noticeFor(result, desktop);
  if (notice) showNotice(notice);
});

new p5((p: p5) => {
  let sprites: Sprites;
  let flakes: Flake[] = [];
  const landings = new Landings(Math.random);

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

  // 雪片數量：手機先少一點，之後每秒依幀率調整
  let budget = window.matchMedia('(pointer: coarse)').matches ? 900 : 1500;
  let frames = 0;
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
    eased = easeConditions(eased, target(), dt);
    const w = viewWeights(posture);

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
    landings.step(dt, eased, w.glass, warm.points(), { w: p.width, h: p.height });

    // 畫
    const bg = mix(
      fieldBackground(eased.dayness),
      glassBackground(eased.dayness, tunables.dayGlass),
      w.glass,
    );
    // trail 超過 0.5 時不整張清掉，留下殘影（只在平視）
    const smear = tunables.trail > 0.5 ? (tunables.trail - 0.5) * 1.96 * w.field : 0;
    p.background(bg[0], bg[1], bg[2], (1 - smear) * 255);
    if (w.field > 0) drawField(p, flakes, eased, w.field, tunables.trail, sprites);
    if (w.glass > 0) drawGlass(p, landings.items, w.glass, sprites);

    // 每秒量一次幀率，調整雪片數量
    frames++;
    const now = performance.now();
    const elapsed = now - fpsSince;
    if (elapsed >= 1000) {
      // 分頁剛從背景回來時這一秒不準，跳過
      if (elapsed < 2000) {
        const fps = (frames * 1000) / elapsed;
        budget = adjustBudget(budget, fps, 150, tunables.budgetMax);
        stats.fps = Math.round(fps);
        stats.flakes = active;
      }
      frames = 0;
      fpsSince = now;
    }
  };
}, stage);
