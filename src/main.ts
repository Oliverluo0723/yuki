import p5 from 'p5';
import { PointerSource, pointerPose } from './input/pointer';
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
import type { SnowConditions } from './types';
import { mountDevPanel, overrides, stats, tunables } from './ui/devPanel';
import { driftConditions } from './weather/drift';

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
const warm = new WarmTracker();
attachWarm(root, warm);

new p5((p: p5) => {
  let sprites: Sprites;
  let flakes: Flake[] = [];
  const landings = new Landings(Math.random);

  // 每次打開從不同的時間點開始，常雪模式的天氣才不會每次都一樣
  let t = Math.random() * 10_000;
  const target = (): SnowConditions => ({
    ...driftConditions(t, new Date().getHours()),
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
    const sensed = pointer.current();
    const posture = overrides.posture ?? sensed.posture;
    const down =
      overrides.lean === null
        ? sensed.down
        : pointerPose({ posture: 0, lean: overrides.lean }).down;

    // 模式 → 條件
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
