import { type SoundParams, tickCount } from './params';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const SMOOTH = 0.15; // 參數變化的時間常數（秒），避免爆音

/** 一段可以無縫循環的白噪音：開頭和接在結尾之後的那一段交叉淡化。 */
function loopingNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * seconds);
  const fade = Math.floor(ctx.sampleRate * 0.25);
  const raw = new Float32Array(n + fade);
  for (let i = 0; i < raw.length; i++) raw[i] = Math.random() * 2 - 1;
  const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
  const out = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const k = i < fade ? i / fade : 1;
    out[i] = raw[i] * k + (i < fade ? raw[n + i] * (1 - k) : 0);
  }
  return buffer;
}

/**
 * 下雪的聲音，全部用 Web Audio 合成，沒有音檔：
 * 悶住的安靜（低通的噪音）、風（帶通的噪音，一陣一陣）、雪落下的細碎聲（很短的噪音顆粒）。
 * 好不好聽要用耳朵調；數值在 params.ts 和這個檔案裡。
 */
export class SnowSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private air: { filter: BiquadFilterNode; gain: GainNode } | null = null;
  private wind: { filter: BiquadFilterNode; gain: GainNode } | null = null;
  private whistle: { filter: BiquadFilterNode; gain: GainNode } | null = null;
  private grain: AudioBuffer | null = null;
  private analyser: AnalyserNode | null = null;

  /** 瀏覽器規定要在使用者點擊的處理函式裡呼叫，聲音才出得來。 */
  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return; // 沒有 Web Audio：作品照常，只是沒有聲音
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 2); // 兩秒淡入
    master.connect(ctx.destination);
    this.master = master;

    const noise = ctx.createBufferSource();
    noise.buffer = loopingNoise(ctx, 4);
    noise.loop = true;

    const layer = (type: BiquadFilterType, freq: number, q: number) => {
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      noise.connect(filter).connect(gain).connect(master);
      return { filter, gain };
    };
    this.air = layer('lowpass', 500, 0.5);
    this.wind = layer('bandpass', 300, 0.7);
    this.whistle = layer('bandpass', 1300, 6);
    noise.start();

    // 細碎聲用的短噪音
    const grain = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
    const g = grain.getChannelData(0);
    for (let i = 0; i < g.length; i++) g[i] = Math.random() * 2 - 1;
    this.grain = grain;

    void ctx.resume();
    // 切到背景就停，回來再繼續
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void ctx.resume();
      else void ctx.suspend();
    });
  }

  /** 每一格呼叫：把聲音追到現在的條件，並撒下這一格該有的細碎聲。swell 是陣風的倍率。 */
  update(p: SoundParams, swell: number, dt: number): void {
    const ctx = this.ctx;
    if (ctx?.state !== 'running' || !this.air || !this.wind || !this.whistle) return;
    const now = ctx.currentTime;
    this.air.gain.gain.setTargetAtTime(p.airGain, now, SMOOTH);
    this.air.filter.frequency.setTargetAtTime(p.airCutoff, now, SMOOTH);
    this.wind.gain.gain.setTargetAtTime(p.windGain * swell, now, SMOOTH);
    this.wind.filter.frequency.setTargetAtTime(
      p.windFreq * lerp(0.85, 1.25, swell / 2),
      now,
      SMOOTH,
    );
    this.whistle.gain.gain.setTargetAtTime(p.whistleGain * swell, now, SMOOTH);
    this.whistle.filter.frequency.setTargetAtTime(lerp(1000, 1700, swell / 2), now, SMOOTH * 3);

    const n = tickCount(p.tickRate, dt, Math.random);
    for (let i = 0; i < n; i++) {
      this.burst({
        freq: p.tickFreq * lerp(0.7, 1.4, Math.random()),
        gain: p.tickGain * lerp(0.5, 1, Math.random()),
        pan: lerp(-0.8, 0.8, Math.random()),
        decay: lerp(0.03, 0.07, Math.random()),
      });
    }
  }

  /** 一片雪落定在玻璃上。pan −1…1，wetness 0–1。 */
  landed(pan: number, wetness: number): void {
    this.burst({
      freq: lerp(5200, 1600, wetness) * lerp(0.85, 1.2, Math.random()),
      gain: 0.12,
      pan,
      decay: lerp(0.06, 0.09, Math.random()),
    });
  }

  /** 手指把雪融掉：一聲很短的氣音。 */
  touched(pan: number): void {
    this.burst({ freq: 3500, gain: 0.05, pan, decay: 0.18, attack: 0.01, type: 'highpass' });
  }

  /** 現在輸出的音量（0–1 左右）。開發時確認聲音真的在播。 */
  level(): number {
    if (!this.ctx || !this.master) return 0;
    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.master.connect(this.analyser);
    }
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += v * v;
    return Math.sqrt(sum / data.length);
  }

  private burst(o: {
    freq: number;
    gain: number;
    pan: number;
    decay: number;
    attack?: number;
    type?: BiquadFilterType;
  }): void {
    const ctx = this.ctx;
    if (ctx?.state !== 'running' || !this.master || !this.grain) return;
    const now = ctx.currentTime;
    const attack = o.attack ?? 0.002;
    const length = attack + o.decay + 0.02;

    const src = ctx.createBufferSource();
    src.buffer = this.grain;
    const filter = ctx.createBiquadFilter();
    filter.type = o.type ?? 'bandpass';
    filter.frequency.value = o.freq;
    filter.Q.value = 1.5;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(o.gain, now + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, now + attack + o.decay);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.min(1, Math.max(-1, o.pan));

    src.connect(filter).connect(env).connect(pan).connect(this.master);
    // 每次從噪音的不同位置開始，才不會每一聲都一樣
    src.start(now, Math.random() * (this.grain.duration - length), length);
  }
}
