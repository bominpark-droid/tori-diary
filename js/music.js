// 배경음악과 효과음 (docs/DESIGN.md 3.6). 음악 파일 없이 Web Audio로 직접 연주합니다.
// - D장조 페달톤, 72 BPM, 4/4. EP 피아노(FM 합성) + 패드 + 둥근 베이스 + 작은 벨 + 아주 작은 브러시.
// - 곡 1 <서재> 32마디 반복, 곡 2 <문구점> 24마디 반복, 곡 3 <마무리> 16마디 한 번.
// - 아이가 처음 화면을 누른 뒤에만 소리가 나고(unlock), 3초 동안 서서히 커집니다.
// - 화면이 바뀌면 다음 마디에서 곡이 바뀌고, 앱이 가려지면 멈춥니다.
// 나중에 작곡가 음원이 생기면 이 파일의 연주 부분(playBar)만 파일 재생으로 바꾸면 됩니다.

const BPM = 72;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- 화음 (EP 오른손, 패드, 베이스) ----------
const CH = {
  Dmaj9: { ep: [66, 69, 73, 76], pad: [50, 57, 61, 66], bass: 38 },
  'Gmaj9#11/D': { ep: [66, 69, 71, 73], pad: [50, 55, 59, 66], bass: 38 },
  'Bm11/D': { ep: [64, 69, 71, 74], pad: [50, 54, 59, 64], bass: 38 },
  'Asus4/D': { ep: [64, 69, 74], pad: [50, 57, 62, 64], bass: 38 },
  Em9: { ep: [66, 67, 71, 74], pad: [52, 55, 59, 62], bass: 40 },
  'F#m7(11)': { ep: [64, 69, 71, 73], pad: [54, 57, 61, 64], bass: 42 },
  Gmaj9: { ep: [66, 69, 71, 74], pad: [55, 59, 62, 66], bass: 43 },
  Asus4: { ep: [64, 69, 74], pad: [57, 62, 64, 69], bass: 45 },
  'A/C#': { ep: [64, 69, 73, 76], pad: [49, 57, 61, 64], bass: 37 },
  Bm9: { ep: [66, 69, 73, 74], pad: [47, 54, 57, 62], bass: 47 },
  'Dmaj9/F#': { ep: [66, 69, 73, 76], pad: [54, 57, 61, 66], bass: 42 },
  'Gmaj9#11': { ep: [66, 69, 71, 73], pad: [55, 59, 62, 66], bass: 43 },
};

const VERSE = ['Dmaj9', 'Dmaj9', 'Gmaj9#11/D', 'Dmaj9', 'Dmaj9', 'Bm11/D', 'Gmaj9#11/D', 'Asus4/D'];
const PRE = ['Em9', 'F#m7(11)', 'Gmaj9', 'Asus4'];
const CHORUS = ['Dmaj9', 'A/C#', 'Bm9', 'Gmaj9', 'Dmaj9/F#', 'Em9', 'Gmaj9', 'Dmaj9'];
const TURN = ['Bm9', 'Gmaj9#11', 'Bm9', 'Gmaj9'];

// 윗선율 [박, 음, 길이(박)]
const MEL_CHORUS = [
  [[0, 81, 1], [1, 78, 1], [2, 76, 2]],
  [[0, 76, 1.5], [1.5, 73, 0.5], [2, 76, 2]],
  [[0, 74, 1], [1, 78, 1], [2, 81, 2]],
  [[0, 83, 1.5], [1.5, 81, 0.5], [2, 78, 2]],
  [[0, 81, 1], [1, 78, 1], [2, 76, 1], [3, 74, 1]],
  [[0, 76, 2], [2, 79, 2]],
  [[0, 78, 1], [1, 76, 1], [2, 74, 2]],
  [[0, 76, 1], [1, 74, 3]],
];
const MEL_VERSE = [null, [[2, 76, 2]], null, [[0, 78, 2]], null, [[2, 74, 2]], null, [[0, 76, 4]]];

const bars = (chords, section, mel) => chords.map((c, i) => ({ chord: c, section, mel: mel ? mel[i] : null, i }));

const TRACKS = {
  library: {
    loop: true,
    bars: [
      ...bars(VERSE, 'verseA', MEL_VERSE),
      ...bars(VERSE, 'verseB', MEL_VERSE),
      ...bars(PRE, 'pre'),
      ...bars(CHORUS, 'chorus', MEL_CHORUS),
      ...bars(TURN, 'turn'),
    ],
  },
  shop: {
    loop: true,
    bells: 1,
    bars: [
      ...bars(VERSE, 'verseB', MEL_VERSE),
      ...bars(PRE, 'pre'),
      ...bars(CHORUS, 'chorus', MEL_CHORUS),
      ...bars(TURN, 'turn'),
    ],
  },
  finish: {
    loop: false,
    bars: [
      ...bars(CHORUS, 'chorus', MEL_CHORUS),
      ...bars(['Dmaj9', 'Bm11/D', 'Gmaj9#11/D', 'Asus4/D'], 'verseA', [null, [[2, 76, 2]], null, [[0, 74, 2]]]),
      ...bars(['Gmaj9', 'Asus4', 'Dmaj9', 'Dmaj9'], 'end', [[[0, 78, 2], [2, 76, 2]], [[0, 74, 4]], [[0, 73, 2], [2, 74, 2]], null]),
    ],
  },
};

// 늘 같은 값이 나오는 작은 난수 (사람이 치는 듯한 흔들림)
function rnd(a, b) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------- 소리 엔진 ----------
class Engine {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.3;
    this.master.connect(comp).connect(out || ctx.destination);

    // 잔향
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    this.reverb.connect(wet).connect(this.master);

    // EP: 저역 통과 → 코러스 → 출력
    this.epBus = ctx.createGain();
    this.epBus.gain.value = 0.9;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    lp.Q.value = 0.4;
    this.epBus.connect(lp);
    const dry = ctx.createGain();
    dry.gain.value = 0.8;
    lp.connect(dry).connect(this.master);
    for (const [ms, rate, depth] of [[14, 0.33, 0.0026], [21, 0.47, 0.0031]]) {
      const d = ctx.createDelay(0.05);
      d.delayTime.value = ms / 1000;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const lg = ctx.createGain();
      lg.gain.value = depth;
      lfo.connect(lg).connect(d.delayTime);
      lfo.start();
      const g = ctx.createGain();
      g.gain.value = 0.28;
      lp.connect(d).connect(g).connect(this.master);
      this.lfos = (this.lfos || []).concat(lfo);
    }
    const epSend = ctx.createGain();
    epSend.gain.value = 0.55;
    lp.connect(epSend).connect(this.reverb);

    // 패드
    this.padBus = ctx.createBiquadFilter();
    this.padBus.type = 'lowpass';
    this.padBus.frequency.value = 1100;
    const padOut = ctx.createGain();
    padOut.gain.value = 0.5;
    this.padBus.connect(padOut).connect(this.master);
    const padSend = ctx.createGain();
    padSend.gain.value = 0.6;
    padOut.connect(padSend).connect(this.reverb);

    // 베이스
    this.bassBus = ctx.createBiquadFilter();
    this.bassBus.type = 'lowpass';
    this.bassBus.frequency.value = 520;
    const bassOut = ctx.createGain();
    bassOut.gain.value = 0.9;
    this.bassBus.connect(bassOut).connect(this.master);

    // 벨: 점 8분 딜레이 + 잔향
    this.bellBus = ctx.createGain();
    this.bellBus.gain.value = 0.7;
    this.bellBus.connect(this.master);
    const dl = ctx.createDelay(1.5);
    dl.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const dlf = ctx.createBiquadFilter();
    dlf.type = 'lowpass';
    dlf.frequency.value = 2600;
    this.bellBus.connect(dl);
    dl.connect(dlf).connect(fb).connect(dl);
    const dlOut = ctx.createGain();
    dlOut.gain.value = 0.35;
    dlf.connect(dlOut).connect(this.master);
    const bellSend = ctx.createGain();
    bellSend.gain.value = 0.8;
    this.bellBus.connect(bellSend).connect(this.reverb);

    // 브러시 (아주 작게)
    this.noise = this.noiseBuffer(1);
    this.brushBus = ctx.createBiquadFilter();
    this.brushBus.type = 'bandpass';
    this.brushBus.frequency.value = 5200;
    this.brushBus.Q.value = 0.7;
    const brushOut = ctx.createGain();
    brushOut.gain.value = 0.6;
    this.brushBus.connect(brushOut).connect(this.master);

    // 효과음
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.5;
    this.sfxBus.connect(this.master);
  }

  impulse(seconds) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let smooth = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        smooth = smooth * 0.55 + white * 0.45; // 높은 소리를 조금 깎음
        d[i] = smooth * Math.pow(1 - i / len, 3.2);
      }
    }
    return buf;
  }

  noiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  env(g, t, peak, attack, decayTo, decayTime, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, decayTo), t + attack + decayTime);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
  }

  // EP 피아노 한 음 (FM: 몸통 1:1, 쇳소리 14:1)
  ep(t, midi, vel, durBeats) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const end = t + durBeats * BEAT + 1.8;
    const car = ctx.createOscillator();
    car.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.frequency.value = f;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * (0.9 + vel * 1.6), t);
    mg.gain.exponentialRampToValueAtTime(f * 0.18, t + 1.2);
    mod.connect(mg).connect(car.frequency);
    const tine = ctx.createOscillator();
    tine.frequency.value = f * 14;
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(f * 0.9 * vel, t);
    tg.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
    tine.connect(tg).connect(car.frequency);
    const amp = ctx.createGain();
    this.env(amp, t, vel * 0.42, 0.006, vel * 0.12, 0.9, end);
    car.connect(amp).connect(this.epBus);
    for (const o of [car, mod, tine]) {
      o.start(t);
      o.stop(end + 0.05);
    }
  }

  pad(t, notes, bars = 1, level = 1) {
    const ctx = this.ctx;
    const len = bars * BAR;
    for (const m of notes) {
      for (const cents of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = mtof(m);
        o.detune.value = cents;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.022 * level, t + 1.4);
        g.gain.setValueAtTime(0.022 * level, t + len - 0.2);
        g.gain.linearRampToValueAtTime(0.0001, t + len + 1.6);
        o.connect(g).connect(this.padBus);
        o.start(t);
        o.stop(t + len + 1.7);
      }
    }
  }

  bass(t, midi, vel, durBeats) {
    const ctx = this.ctx;
    const end = t + durBeats * BEAT + 0.4;
    const o = ctx.createOscillator();
    o.frequency.value = mtof(midi);
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = mtof(midi + 12);
    const g = ctx.createGain();
    this.env(g, t, vel * 0.5, 0.02, vel * 0.3, durBeats * BEAT * 0.8, end);
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    o.connect(g).connect(this.bassBus);
    o2.connect(g2).connect(g);
    o.start(t);
    o2.start(t);
    o.stop(end + 0.05);
    o2.stop(end + 0.05);
  }

  bell(t, midi, vel) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const end = t + 2.2;
    const car = ctx.createOscillator();
    car.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.frequency.value = f * 3.5;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 1.2, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.8);
    mod.connect(mg).connect(car.frequency);
    const amp = ctx.createGain();
    this.env(amp, t, vel * 0.16, 0.004, vel * 0.04, 0.7, end);
    car.connect(amp).connect(this.bellBus);
    car.start(t);
    mod.start(t);
    car.stop(end + 0.05);
    mod.stop(end + 0.05);
  }

  brush(t, vel) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    src.connect(g).connect(this.brushBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.3);
  }

  // 한 마디 연주
  playBar(track, bar, t0, barNo) {
    const c = CH[bar.chord];
    const s = bar.section;
    const hum = (k) => (rnd(barNo, k) - 0.5) * 0.016;
    const v = (base, k) => base * (0.88 + rnd(barNo + 7, k) * 0.24);
    const at = (beat, k = beat) => t0 + beat * BEAT + hum(k);
    const block = (beat, vel) => c.ep.forEach((m, i) => this.ep(at(beat, i) + i * 0.012, m, v(vel, i + beat), 2));

    this.pad(t0, c.pad, 1, s === 'chorus' ? 1.15 : 1);
    this.bass(at(0, 99), c.bass, v(s === 'chorus' ? 0.85 : 0.7, 3), s === 'chorus' ? 2.5 : 3.6);
    if (s === 'chorus') this.bass(at(2.5, 98), c.bass, v(0.5, 4), 1.4);

    const top = c.ep.length - 1;
    if (s === 'verseA' || s === 'turn' || s === 'end') {
      block(0, s === 'end' ? 0.28 : 0.3);
      if (s !== 'end') [1, 2, top].forEach((idx, k) => this.ep(at(2 + k * 0.5, 20 + k), c.ep[Math.min(idx, top)], v(0.2, 20 + k), 1));
    } else if (s === 'verseB' || s === 'pre') {
      block(0, 0.26);
      const pattern = s === 'pre' ? [0, 1, 2, 3, 1, 2, 3, 3] : [0, 1, 2, 3, 2, 1, 2, 3];
      pattern.forEach((idx, k) => {
        if (k === 0) return;
        const vel = s === 'pre' ? 0.13 + k * 0.012 : 0.16;
        this.ep(at(k * 0.5, 30 + k), c.ep[Math.min(idx, top)], v(vel, 30 + k), 0.6);
      });
    } else if (s === 'chorus') {
      block(0, 0.3);
      block(2, 0.22);
      // 코러스는 음량이 아니라 음의 밀도로 올라감: 블록 사이를 8분음 펼침화음으로 채움
      [1, 2, 3, 2, 1, 2].forEach((idx, k) => this.ep(at(0.5 + k * 0.5 + (k >= 3 ? 0.5 : 0), 40 + k), c.ep[Math.min(idx, top)], v(0.14, 40 + k), 0.5));
    }

    if (bar.mel) {
      for (const [beat, m, dur] of bar.mel) {
        this.bell(at(beat, 60 + beat), m, v(s === 'chorus' ? 0.9 : 0.7, 60 + beat));
        if (s === 'chorus') this.ep(at(beat, 70 + beat), m - 12, v(0.16, 70 + beat), dur);
      }
    }
    if (track.bells && !bar.mel) {
      const pent = [74, 76, 78, 81, 83, 86];
      const n = Math.floor(rnd(barNo, 5) * pent.length);
      this.bell(at(1.5, 80), pent[n], v(0.55, 80));
      if (s === 'chorus') this.bell(at(3.5, 81), pent[(n + 2) % pent.length], v(0.45, 81));
    }
    if (s === 'verseB' || s === 'chorus') {
      this.brush(at(1, 90), 0.018);
      this.brush(at(3, 91), 0.018);
    }
  }

  // 효과음: 동전(작은 종 두 번), 스티커(퐁)
  sfx(name, t) {
    const ctx = this.ctx;
    if (name === 'coin') {
      this.bell(t, 88, 1.4);
      this.bell(t + 0.09, 93, 1.4);
      return;
    }
    if (name === 'sticker') {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(620, t);
      o.frequency.exponentialRampToValueAtTime(240, t + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(this.sfxBus);
      o.start(t);
      o.stop(t + 0.2);
    }
  }
}

// ---------- 재생 관리 ----------
const LOOKAHEAD = 0.25; // 초
const TICK = 50; // ms

let ctx = null;
let engine = null;
let timer = null;
let enabled = true;
let sfxOn = true;
let volume = 0.45;
let maxVolume = 0.8;
let scene = 'silent';
let current = null; // { id, bar, nextTime }
let pending = null;
let hidden = false;
const listeners = new Set();

function level() {
  const v = Math.min(volume, maxVolume);
  return Math.pow(v, 1.6) * 0.9;
}

function emit() {
  for (const fn of listeners) fn(api.isPlaying());
}

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  engine = new Engine(ctx);
  return true;
}

function wanted() {
  return enabled && !hidden && scene !== 'silent';
}

function fadeTo(value, seconds) {
  if (!engine) return;
  const g = engine.master.gain;
  const now = ctx.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(Math.max(0.0001, g.value), now);
  g.linearRampToValueAtTime(Math.max(0.0001, value), now + seconds);
}

function schedule() {
  if (!ctx || !current) return;
  while (current.nextTime < ctx.currentTime + LOOKAHEAD) {
    // 화면이 바뀌었으면 마디가 바뀌는 자리에서 곡을 바꿈
    if (pending) {
      current = { id: pending, bar: 0, nextTime: current.nextTime, count: current.count };
      pending = null;
    }
    const track = TRACKS[current.id];
    if (current.bar >= track.bars.length) {
      if (!track.loop) {
        stopLoop();
        return;
      }
      current.bar = 0;
    }
    engine.playBar(track, track.bars[current.bar], current.nextTime, current.count++);
    current.bar += 1;
    current.nextTime += BAR;
  }
}

function startLoop(id) {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (!current) {
    current = { id, bar: 0, nextTime: ctx.currentTime + 0.15, count: 0 };
    fadeTo(level(), 3);
  } else if (current.id !== id) {
    pending = id;
  }
  if (!timer) timer = setInterval(schedule, TICK);
  schedule();
  emit();
}

function stopLoop(fade = 0.8) {
  if (timer) clearInterval(timer);
  timer = null;
  current = null;
  pending = null;
  if (engine) fadeTo(0, fade);
  emit();
}

function apply() {
  if (!ctx) return;
  if (wanted()) startLoop(scene);
  else stopLoop();
}

export const api = {
  // 첫 누름에서 부릅니다(브라우저가 소리를 허락하는 순간).
  unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    apply();
  },
  get unlocked() {
    return !!ctx && ctx.state === 'running';
  },
  setScene(next) {
    if (scene === next) return;
    scene = next;
    if (next === 'finish' && current) {
      // 마무리 곡은 처음부터 한 번
      pending = 'finish';
    }
    apply();
  },
  setEnabled(on) {
    enabled = !!on;
    if (enabled && !ctx) return emit();
    apply();
  },
  setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (current) fadeTo(level(), 0.3);
  },
  setMaxVolume(v) {
    maxVolume = Math.max(0, Math.min(1, v));
    if (current) fadeTo(level(), 0.3);
  },
  setSfx(on) {
    sfxOn = !!on;
  },
  sfx(name) {
    if (!sfxOn || !ensure() || hidden) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!current) {
      // 음악이 꺼져 있어도 효과음은 들리게
      const g = engine.master.gain;
      g.cancelScheduledValues(ctx.currentTime);
      g.setValueAtTime(Math.max(level(), 0.2), ctx.currentTime);
    }
    engine.sfx(name, ctx.currentTime + 0.02);
  },
  isPlaying() {
    return !!current;
  },
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export const music = api;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    hidden = document.visibilityState === 'hidden';
    if (!ctx) return;
    if (hidden) {
      stopLoop(0.3);
      setTimeout(() => { if (hidden && ctx) ctx.suspend(); }, 400);
    } else {
      ctx.resume();
      apply();
    }
  });
}

// ---------- 시험용: 소리를 파일처럼 미리 만들어 크기를 잽니다 ----------
export async function renderOffline(trackId = 'library', seconds = 30, vol = 0.45) {
  const rate = 44100;
  const off = new OfflineAudioContext(2, Math.floor(rate * seconds), rate);
  const eng = new Engine(off);
  eng.master.gain.value = Math.pow(Math.min(vol, 1), 1.6) * 0.9;
  const track = TRACKS[trackId];
  let t = 0.05;
  let i = 0;
  while (t < seconds) {
    if (i >= track.bars.length) {
      if (!track.loop) break;
      i = 0;
    }
    eng.playBar(track, track.bars[i], t, i);
    i++;
    t += BAR;
  }
  const buf = await off.startRendering();
  let peak = 0;
  let sum = 0;
  let n = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let k = 0; k < d.length; k++) {
      const a = Math.abs(d[k]);
      if (a > peak) peak = a;
      sum += d[k] * d[k];
      n++;
    }
  }
  const rms = Math.sqrt(sum / n);
  const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  return { seconds, peak, rms, peakDb: db(peak), rmsDb: db(rms), bars: track.bars.length, barSeconds: BAR, buffer: buf };
}

export const TRACK_INFO = Object.fromEntries(Object.entries(TRACKS).map(([k, v]) => [k, { bars: v.bars.length, loop: v.loop, seconds: v.bars.length * BAR }]));
