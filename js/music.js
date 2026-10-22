// 배경음악과 효과음 (docs/DESIGN.md 3.6). 음악 파일 없이 Web Audio로 직접 연주합니다.
// - C장조, 80 BPM, 4/4, 8분음표를 살짝 늘이는 스윙. 코드는 maj9, m7, sus4, 13 같은 풍성한 화음.
// - 소리: 전자피아노(FM 합성) 코드 + 패드 + 베이스 + 부드러운 멜로디(리드) + 작은 벨 + 아주 작은 드럼(브러시, 에그 셰이커, 킥).
// - 반 박 먼저 치는 화음과 베이스(당김음)로 가볍게 흔들리는 느낌을 냅니다.
// - 곡 <서재> 32마디 반복, <꾸미기> 24마디 반복, <마무리> 16마디 한 번. 쓰는 중에는 멜로디와 드럼을 뺀 <쓰기> 소리.
// - 아이가 처음 화면을 누른 뒤에만 소리가 나고(unlock), 3초 동안 서서히 커집니다.
// - 화면이 바뀌면 다음 마디에서 곡이 바뀌고, 앱이 가려지면 멈춥니다.
// 멜로디나 코드를 바꾸려면 아래 CH(화음), 마디 목록(VERSE_A 같은 것), 멜로디(MEL_ 로 시작하는 것)만 고치면 됩니다.
// 바꾼 뒤에는 npm test를 돌려 음이 화음과 부딪치지 않는지 확인합니다(tests/music.test.js).
// 나중에 작곡가 음원이 생기면 이 파일의 연주 부분(playBar)만 파일 재생으로 바꾸면 됩니다.

const BPM = 80;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const SWING = 0.07; // 뒷박 8분음표를 늦추는 정도(박). 0.07이면 57 : 43 정도로 살짝만 늘어짐
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const frac = (b) => ((b % 1) + 1) % 1;
const swung = (b) => (Math.abs(frac(b) - 0.5) < 1e-6 ? SWING : 0);

// 멜로디가 낼 수 있는 높이 (MIDI 72 = 가운데 도의 한 옥타브 위)
const LEAD_RANGE = [72, 88];

// ---------- 화음 (EP 오른손 4음, 패드 4음, 베이스 1음) ----------
// 음 높이는 MIDI 번호입니다. 위아래 화음으로 옮길 때 음이 크게 뛰지 않게 골랐습니다.
const CH = {
  Cmaj9: { ep: [64, 67, 71, 74], pad: [48, 55, 59, 64], bass: 36 },
  Em7: { ep: [62, 67, 71, 74], pad: [52, 55, 59, 62], bass: 40 },
  Fmaj9: { ep: [64, 67, 69, 72], pad: [53, 57, 60, 64], bass: 41 },
  Fm6: { ep: [62, 65, 68, 72], pad: [53, 56, 60, 62], bass: 41 }, // 파 단조(IV 단조)에서 빌려 온 애틋한 화음
  Am9: { ep: [60, 64, 67, 71], pad: [57, 60, 64, 67], bass: 45 },
  Dm7: { ep: [60, 65, 69, 72], pad: [50, 57, 60, 62], bass: 38 },
  G13: { ep: [65, 71, 74, 76], pad: [55, 59, 62, 65], bass: 43 },
  G9sus4: { ep: [65, 69, 72, 74], pad: [55, 60, 62, 65], bass: 43 },
  Bbmaj9: { ep: [62, 65, 69, 72], pad: [53, 57, 62, 65], bass: 46 }, // 시 플랫(VII)에서 빌려 온 밝은 화음
};

// 마디마다 화음 하나
const VERSE_A = ['Cmaj9', 'Em7', 'Fmaj9', 'Fm6', 'Cmaj9', 'Am9', 'Dm7', 'G9sus4'];
const VERSE_B = ['Cmaj9', 'Bbmaj9', 'Fmaj9', 'Em7', 'Am9', 'Dm7', 'G13', 'Cmaj9'];
const PRE = ['Dm7', 'Em7', 'Fmaj9', 'G9sus4'];
const CHORUS = ['Fmaj9', 'G13', 'Em7', 'Am9', 'Dm7', 'G13', 'Cmaj9', 'Cmaj9'];
const TURN = ['Dm7', 'Fm6', 'Em7', 'G9sus4'];
const END = ['G13', 'Fmaj9', 'Fm6', 'Cmaj9'];

// 멜로디 [박, 음(MIDI), 길이(박)]. 박은 0~3.5, 마디 끝을 넘겨 울려도 됩니다.
// 규칙(시험이 확인): 음 높이 72~88, 센 박(0, 2)에서 길게 내는 음은 화음과 반음으로 부딪치지 않기, 큰 뛰어넘기 없기.
const MEL_VERSE_A = [
  [[1, 79, 1], [2.5, 76, 1]],
  [[0.5, 74, 1], [1.5, 76, 1.5]],
  [[1, 81, 1.5], [2.5, 79, 0.5], [3, 76, 0.5]],
  [[0, 77, 1], [2, 80, 1], [3, 79, 0.5]],
  [[1, 76, 1], [2.5, 79, 1]],
  [[1, 81, 1], [2, 79, 0.5], [2.5, 76, 1]],
  [[0.5, 77, 1], [2, 81, 1.5]],
  [[1.5, 77, 1], [2.5, 74, 1]],
];
const MEL_VERSE_B = [
  [[0.5, 76, 1], [1.5, 79, 0.5], [2, 84, 1.5]],
  [[0, 82, 1], [1, 81, 1], [2, 77, 1]],
  [[0.5, 81, 1.5], [2, 79, 1], [3, 76, 0.5]],
  [[0, 74, 1], [1.5, 76, 0.5], [2, 79, 1.5]],
  [[0.5, 81, 1], [2, 83, 1], [3, 81, 0.5]],
  [[0, 77, 1.5], [1.5, 79, 0.5], [2, 81, 1]],
  [[0.5, 83, 1.5], [2, 79, 1], [3, 77, 0.5]],
  [[0, 76, 1.5], [2.5, 74, 0.5], [3, 72, 1]],
];
const MEL_PRE = [
  [[1, 77, 1], [2, 81, 1.5]],
  [[1, 79, 1], [2, 83, 1.5]],
  [[1, 81, 1], [2, 84, 1.5]],
  [[0, 86, 3]],
];
const MEL_CHORUS = [
  [[0, 84, 1.5], [1.5, 81, 0.5], [2, 79, 1], [3, 81, 0.5]],
  [[0, 83, 1.5], [1.5, 79, 0.5], [2, 74, 1], [3, 77, 0.5]],
  [[0, 76, 1.5], [1.5, 79, 0.5], [2, 83, 1], [3.5, 81, 1.5]],
  [[1, 79, 1], [2, 76, 1.5]],
  [[0, 81, 1.5], [1.5, 77, 0.5], [2, 79, 1], [3, 81, 0.5]],
  [[0, 83, 1.5], [1.5, 81, 0.5], [2, 79, 1], [3, 77, 0.5]],
  [[0, 76, 1.5], [1.5, 74, 0.5], [2, 72, 1.5]],
  [[0.5, 79, 1], [1.5, 76, 0.5], [2, 74, 1.5]],
];
const MEL_TURN = [
  [[1, 81, 1.5], [2.5, 77, 1]],
  [[0.5, 80, 1.5], [2, 77, 1.5]],
  [[1, 79, 1.5], [2.5, 76, 1]],
  [[1.5, 77, 1], [2.5, 74, 1]],
];
const MEL_END = [
  [[1, 79, 1.5], [2.5, 83, 1]],
  [[1, 81, 1.5], [2.5, 79, 1]],
  [[0, 80, 1.5], [2, 77, 1.5]],
  [[0, 76, 5]],
];

const bars = (chords, section, mel) => chords.map((chord, i) => ({ chord, section, mel: mel ? mel[i] : null, i }));
const endBars = bars(END, 'end', MEL_END);
endBars[endBars.length - 1].section = 'close';

const TRACKS = {
  library: {
    loop: true,
    bars: [
      ...bars(VERSE_A, 'verseA', MEL_VERSE_A),
      ...bars(VERSE_B, 'verseB', MEL_VERSE_B),
      ...bars(PRE, 'pre', MEL_PRE),
      ...bars(CHORUS, 'chorus', MEL_CHORUS),
      ...bars(TURN, 'turn', MEL_TURN),
    ],
  },
  decorate: {
    loop: true,
    bars: [
      ...bars(VERSE_B, 'verseB', MEL_VERSE_B),
      ...bars(PRE, 'pre', MEL_PRE),
      ...bars(CHORUS, 'chorus', MEL_CHORUS),
      ...bars(TURN, 'turn', MEL_TURN),
    ],
  },
  finish: {
    loop: false,
    bars: [
      ...bars(CHORUS, 'chorus', MEL_CHORUS),
      ...bars(TURN, 'turn', MEL_TURN),
      ...endBars,
    ],
  },
};

// 화면(scene)마다 어떤 곡을 어떻게 틀지. writing은 서재 곡에서 멜로디와 드럼만 뺀 것(글에 집중하도록).
// sparkle: 긴 멜로디 음에 한 옥타브 위 작은 벨을 겹치는 세기(0이면 없음), sparkleIn: 어느 부분에서만 (null이면 모두)
const SCENES = {
  library: { track: 'library', lead: true, drums: true, sparkle: 0.5, sparkleIn: ['chorus'] },
  decorate: { track: 'decorate', lead: true, drums: true, sparkle: 0.6, sparkleIn: null },
  finish: { track: 'finish', lead: true, drums: true, sparkle: 0.5, sparkleIn: ['chorus'] },
  writing: { track: 'library', lead: false, drums: false, sparkle: 0, sparkleIn: null },
};

// ---------- 연주 모양 ----------
// 전자피아노: [박, 어느 음, 세기, 길이(박)]. 어느 음: full 네 음 모두, mid 가운데 둘, hi 위 둘, n0~n3 한 음
const COMP = {
  verseA: [
    [[0, 'full', 0.3, 2.5], [1.5, 'mid', 0.17, 1]],
    [[0, 'full', 0.3, 2.5], [2, 'hi', 0.15, 1.5]],
  ],
  verseB: [[[0, 'full', 0.28, 1.5], [1.5, 'mid', 0.17, 1], [2.5, 'hi', 0.15, 1]]],
  pre: [[[0, 'full', 0.26, 1], [1, 'n1', 0.14, 0.6], [1.5, 'n2', 0.145, 0.6], [2, 'n3', 0.15, 0.6], [2.5, 'n2', 0.155, 0.6], [3, 'n3', 0.16, 0.6]]],
  chorus: [
    [[0, 'full', 0.3, 1.5], [1.5, 'mid', 0.19, 1], [2.5, 'hi', 0.17, 1]],
    [[0, 'full', 0.3, 1.5], [1.5, 'mid', 0.19, 0.8], [2, 'n3', 0.13, 0.5], [2.5, 'n2', 0.13, 0.5], [3, 'n3', 0.13, 0.5]],
  ],
  turn: [[[0, 'full', 0.26, 2], [2, 'hi', 0.15, 1.5]]],
  end: [[[0, 'full', 0.27, 3]]],
  close: [[[0, 'full', 0.27, 6], [1.5, 'n3', 0.1, 2], [2.5, 'n2', 0.09, 2]]],
};

// 베이스: [박, 어느 음, 세기, 길이(박)]. fifth는 으뜸음 위 5도
const BASS = {
  verseA: [[0, 'root', 0.68, 3.2]],
  verseB: [[0, 'root', 0.72, 2], [2.5, 'fifth', 0.5, 0.8]],
  pre: [[0, 'root', 0.66, 3.2]],
  chorus: [[0, 'root', 0.85, 1.4], [1.5, 'root', 0.5, 0.9], [2.5, 'fifth', 0.55, 0.8]],
  turn: [[0, 'root', 0.7, 3.2]],
  end: [[0, 'root', 0.66, 3.8]],
  close: [[0, 'root', 0.66, 6]],
};

// 이 부분의 어떤 마디가 첫 화음과 베이스를 반 박 먼저 치는지 (홀수는 둘째, 넷째... 마디)
const PUSH = { verseA: 'odd', verseB: 'odd', pre: 'all', chorus: 'all', turn: 'odd', end: null, close: null };
const pushes = (bar) => PUSH[bar.section] === 'all' || (PUSH[bar.section] === 'odd' && bar.i % 2 === 1);

// 드럼은 아주 작게: 브러시(2, 4박), 셰이커(8분음표), 킥(박 위치)
const DRUMS = {
  verseB: { brush: 0.018, shaker: 0.008, kick: [0] },
  pre: { brush: 0.016, shaker: 0, kick: [] },
  chorus: { brush: 0.024, shaker: 0.011, kick: [0, 2.5] },
};

// 멜로디 세기
const LEAD_VEL = { verseA: 0.52, verseB: 0.6, pre: 0.62, chorus: 0.74, turn: 0.5, end: 0.5, close: 0.45 };

// 늘 같은 값이 나오는 작은 난수 (사람이 치는 듯한 흔들림)
function rnd(a, b) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------- 소리 엔진 ----------
class Engine {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.mute = new Set(); // 시험용: 'ep' 'pad' 'bass' 'lead' 'bell' 'drums' 중 끌 것
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
    bassOut.gain.value = 0.72;
    this.bassBus.connect(bassOut).connect(this.master);

    // 멜로디(리드): 둥근 소리를 살짝 깎고, 점 8분 딜레이와 잔향을 얹음
    this.leadBus = ctx.createBiquadFilter();
    this.leadBus.type = 'lowpass';
    this.leadBus.frequency.value = 3000;
    this.leadBus.Q.value = 0.5;
    const leadOut = ctx.createGain();
    leadOut.gain.value = 0.95;
    this.leadBus.connect(leadOut).connect(this.master);
    const ldl = ctx.createDelay(1.5);
    ldl.delayTime.value = BEAT * 0.75;
    const lfb = ctx.createGain();
    lfb.gain.value = 0.3;
    const ldf = ctx.createBiquadFilter();
    ldf.type = 'lowpass';
    ldf.frequency.value = 2200;
    leadOut.connect(ldl);
    ldl.connect(ldf).connect(lfb).connect(ldl);
    const ldOut = ctx.createGain();
    ldOut.gain.value = 0.28;
    ldf.connect(ldOut).connect(this.master);
    const ldSend = ctx.createGain();
    ldSend.gain.value = 0.55;
    leadOut.connect(ldSend).connect(this.reverb);

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

    // 드럼 (아주 작게)
    this.noise = this.noiseBuffer(1);
    this.brushBus = ctx.createBiquadFilter();
    this.brushBus.type = 'bandpass';
    this.brushBus.frequency.value = 5200;
    this.brushBus.Q.value = 0.7;
    const brushOut = ctx.createGain();
    brushOut.gain.value = 0.6;
    this.brushBus.connect(brushOut).connect(this.master);
    this.shakerBus = ctx.createBiquadFilter();
    this.shakerBus.type = 'highpass';
    this.shakerBus.frequency.value = 6500;
    const shakerOut = ctx.createGain();
    shakerOut.gain.value = 0.7;
    this.shakerBus.connect(shakerOut).connect(this.master);
    this.kickBus = ctx.createBiquadFilter();
    this.kickBus.type = 'lowpass';
    this.kickBus.frequency.value = 260;
    const kickOut = ctx.createGain();
    kickOut.gain.value = 0.9;
    this.kickBus.connect(kickOut).connect(this.master);
    this.clickBus = ctx.createBiquadFilter();
    this.clickBus.type = 'bandpass';
    this.clickBus.frequency.value = 2200;
    this.clickBus.Q.value = 1;
    const clickOut = ctx.createGain();
    clickOut.gain.value = 0.6;
    this.clickBus.connect(clickOut).connect(this.master);

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

  // 화음 한 번 치기: 아래 음부터 아주 조금씩 늦게 눌러 사람이 치는 듯하게
  epHit(t, chord, kind, vel, durBeats) {
    const pick = { full: [0, 1, 2, 3], mid: [1, 2], hi: [2, 3], n0: [0], n1: [1], n2: [2], n3: [3] }[kind];
    pick.forEach((idx, i) => this.ep(t + i * 0.012, chord.ep[idx], vel * (idx === 3 ? 0.95 : 1), durBeats));
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

  // 멜로디 한 음: 둥근 삼각파에 옥타브 위 사인파를 조금, 늦게 시작하는 작은 떨림(비브라토)
  lead(t, midi, vel, durBeats) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const hold = durBeats * BEAT;
    const end = t + hold + 0.7;
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.frequency.value = f * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.setValueAtTime(0, t + 0.28);
    lg.gain.linearRampToValueAtTime(f * 0.0045, t + 0.7);
    lfo.connect(lg);
    lg.connect(o1.frequency);
    lg.connect(o2.frequency);
    const amp = ctx.createGain();
    const sustainAt = Math.max(t + 0.31, t + hold);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(vel * 0.34, t + 0.025);
    amp.gain.exponentialRampToValueAtTime(vel * 0.22, t + 0.3);
    amp.gain.setValueAtTime(vel * 0.22, sustainAt);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);
    o1.connect(amp);
    o2.connect(g2).connect(amp);
    amp.connect(this.leadBus);
    for (const o of [o1, o2, lfo]) {
      o.start(t);
      o.stop(end + 0.05);
    }
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

  // 에그 셰이커: 아주 짧고 높은 바스락
  shaker(t, vel) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(g).connect(this.shakerBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.09);
  }

  // 작은 킥: 낮은 둥 소리 + 아주 짧은 딱 소리(작은 스피커에서도 박이 들리게)
  kick(t, vel) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.22, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    o.connect(g).connect(this.kickBus);
    o.start(t);
    o.stop(t + 0.3);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.0001, t);
    cg.gain.linearRampToValueAtTime(vel * 0.04, t + 0.002);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(cg).connect(this.clickBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.05);
  }

  // 한 마디 연주. o: { lead, drums, sparkle, sparkleIn, anticipate }
  // anticipate: 앞 마디가 이어질 때 true. 이때 '당김' 마디는 첫 화음과 베이스를 반 박 먼저 칩니다.
  playBar(bar, t0, barNo, o = {}) {
    const c = CH[bar.chord];
    const s = bar.section;
    const off = (part) => this.mute.has(part);
    const hum = (k) => (rnd(barNo, k) - 0.5) * 0.016;
    const v = (base, k) => base * (0.88 + rnd(barNo + 7, k) * 0.24);
    const at = (beat, k = beat) => t0 + (beat + swung(beat)) * BEAT + hum(k);
    const early = !!o.anticipate && pushes(bar);

    if (!off('pad')) this.pad(t0, c.pad, s === 'close' ? 2 : 1, s === 'chorus' ? 1.15 : 1);

    if (!off('ep')) {
      const pats = COMP[s];
      pats[bar.i % pats.length].forEach(([beat, kind, vel, dur], k) => {
        const first = beat === 0;
        this.epHit(at(first && early ? -0.5 : beat, 10 + k), c, kind, v(vel, 10 + k), first && early ? dur + 0.5 : dur);
      });
    }

    if (!off('bass')) {
      BASS[s].forEach(([beat, kind, vel, dur], k) => {
        const first = beat === 0;
        const note = kind === 'fifth' ? c.bass + 7 : c.bass;
        this.bass(at(first && early ? -0.5 : beat, 90 + k), note, v(vel, 90 + k), first && early ? dur + 0.5 : dur);
      });
    }

    if (o.lead !== false && !off('lead') && bar.mel) {
      const sparkle = o.sparkle && (!o.sparkleIn || o.sparkleIn.includes(s));
      for (const [beat, m, dur] of bar.mel) {
        const t = at(beat, 60 + beat);
        this.lead(t, m, v(LEAD_VEL[s], 60 + beat), dur);
        if (sparkle && dur >= 1.5 && !off('bell')) this.bell(t + 0.004, m + 12, v(o.sparkle, 70 + beat));
      }
    }

    const d = DRUMS[s];
    if (d && o.drums !== false && !off('drums')) {
      if (d.brush) {
        this.brush(at(1, 90), d.brush);
        this.brush(at(3, 91), d.brush);
      }
      if (d.shaker) for (let k = 0; k < 8; k++) this.shaker(at(k * 0.5, 100 + k), v(k % 2 ? d.shaker * 1.5 : d.shaker * 0.6, 100 + k));
      for (const beat of d.kick) this.kick(at(beat, 120 + beat), v(0.75, 120 + beat));
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
const LOOKAHEAD = 0.7; // 초. 반 박 먼저 치는 소리를 제때 예약하려고 넉넉히 앞서 준비합니다.
const TICK = 50; // ms

let ctx = null;
let engine = null;
let timer = null;
let enabled = true;
let sfxOn = true;
let volume = 0.45;
let maxVolume = 0.8;
let scene = 'silent';
let current = null; // { id, bar, nextTime, count, fresh }
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
    // 화면이 바뀌었으면 마디가 바뀌는 자리에서 곡을 바꿈. 같은 곡(서재 ↔ 쓰기)이면 이어서 연주
    if (pending) {
      const same = (SCENES[pending] || SCENES.library).track === (SCENES[current.id] || SCENES.library).track;
      current = { id: pending, bar: same ? current.bar : 0, nextTime: current.nextTime, count: current.count, fresh: !same };
      pending = null;
    }
    const sc = SCENES[current.id] || SCENES.library;
    const track = TRACKS[sc.track];
    if (current.bar >= track.bars.length) {
      if (!track.loop) {
        // 마지막 마디가 울려 퍼진 뒤에 서서히 끔
        const me = current;
        clearInterval(timer);
        timer = null;
        setTimeout(() => { if (current === me) stopLoop(1.2); }, Math.max(0, (me.nextTime - ctx.currentTime) * 1000 + 600));
        return;
      }
      current.bar = 0;
    }
    engine.playBar(track.bars[current.bar], current.nextTime, current.count++, { ...sc, anticipate: !current.fresh });
    current.fresh = false;
    current.bar += 1;
    current.nextTime += BAR;
  }
}

function startLoop(id) {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (!current) {
    current = { id, bar: 0, nextTime: ctx.currentTime + 0.15, count: 0, fresh: true };
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
// opts.mute: 끌 소리 이름들(['lead'] 처럼). 소리별로 크기를 따로 재어 균형을 볼 때 씁니다.
// opts.startBar: 곡의 몇 번째 마디(0부터)에서 시작할지. 일부분만 미리 들어 볼 때 씁니다.
export async function renderOffline(sceneId = 'library', seconds = 30, vol = 0.45, opts = {}) {
  const rate = 44100;
  const off = new OfflineAudioContext(2, Math.floor(rate * seconds), rate);
  const eng = new Engine(off);
  for (const p of opts.mute || []) eng.mute.add(p);
  eng.master.gain.value = Math.pow(Math.min(vol, 1), 1.6) * 0.9;
  const sc = SCENES[sceneId];
  const track = TRACKS[sc.track];
  let t = 0.05;
  let i = opts.startBar || 0;
  let n = 0;
  while (t < seconds) {
    if (i >= track.bars.length) {
      if (!track.loop) break;
      i = 0;
    }
    eng.playBar(track.bars[i], t, n, { ...sc, anticipate: n > 0 });
    i++;
    n++;
    t += BAR;
  }
  const buf = await off.startRendering();
  let peak = 0;
  let sum = 0;
  let count = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let k = 0; k < d.length; k++) {
      const a = Math.abs(d[k]);
      if (a > peak) peak = a;
      sum += d[k] * d[k];
      count++;
    }
  }
  const rms = Math.sqrt(sum / count);
  const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  return { seconds, peak, rms, peakDb: db(peak), rmsDb: db(rms), bars: track.bars.length, barSeconds: BAR, buffer: buf };
}

export const TRACK_INFO = Object.fromEntries(Object.entries(TRACKS).map(([k, v]) => [k, { bars: v.bars.length, loop: v.loop, seconds: v.bars.length * BAR }]));

// 시험(tests/music.test.js)이 곡의 짜임을 확인할 때 읽는 값
export const COMPOSITION = { BPM, BAR, CH, TRACKS, SCENES, COMP, BASS, PUSH, LEAD_RANGE };
