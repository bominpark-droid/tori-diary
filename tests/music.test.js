// 음악 점검: 곡의 짜임, 화음과 멜로디가 부딪치지 않는지, 범위를 벗어난 음이 없는지 확인합니다.
// 소리를 직접 들어 보는 시험은 아닙니다. 음이 서로 어울리는지(음악 이론의 규칙)만 확인합니다.
// 멜로디나 화음을 바꾼 뒤 이 시험이 깨지면, 어느 마디의 어느 음인지 알려 주니 그 음만 고치면 됩니다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPOSITION, TRACK_INFO } from '../js/music.js';

const { BPM, BAR, CH, TRACKS, SCENES, COMP, BASS, PUSH, LEAD_RANGE } = COMPOSITION;

const C_MAJOR = new Set([0, 2, 4, 5, 7, 9, 11]);
const pc = (m) => ((m % 12) + 12) % 12;
const chordPcs = (name) => {
  const c = CH[name];
  return new Set([...c.ep, ...c.pad, c.bass].map(pc));
};
// 두 음이 반음(단2도) 사이인지
const semitone = (a, b) => Math.min((a - b + 12) % 12, (b - a + 12) % 12) === 1;
const clashes = (note, name) => {
  const set = chordPcs(name);
  const p = pc(note);
  if (set.has(p)) return false; // 화음 안의 음이면 부딪치지 않음
  return [...set].some((x) => semitone(p, x));
};
const where = (track, bar, n) => `${track} ${bar.section} ${bar.i + 1}마디(${bar.chord}) ${n.join(',')}`;

test('곡의 길이: 서재 32마디, 꾸미기 24마디, 마무리 16마디', () => {
  assert.equal(TRACKS.library.bars.length, 32);
  assert.equal(TRACKS.decorate.bars.length, 24);
  assert.equal(TRACKS.finish.bars.length, 16);
  assert.equal(TRACKS.library.loop, true);
  assert.equal(TRACKS.decorate.loop, true);
  assert.equal(TRACKS.finish.loop, false);
  assert.equal(TRACK_INFO.library.seconds, 32 * BAR);
});

test('빠르기는 잔잔한 범위(60~90 BPM)', () => {
  assert.ok(BPM >= 60 && BPM <= 90, `BPM ${BPM}`);
});

test('모든 마디의 화음이 화음표에 있고, 화음마다 EP 4음 패드 4음 베이스 1음', () => {
  for (const [id, track] of Object.entries(TRACKS)) {
    for (const bar of track.bars) assert.ok(CH[bar.chord], `${id} ${bar.i + 1}마디 화음 ${bar.chord}이 화음표에 없음`);
  }
  for (const [name, c] of Object.entries(CH)) {
    assert.equal(c.ep.length, 4, `${name} ep`);
    assert.equal(c.pad.length, 4, `${name} pad`);
    assert.ok(Number.isInteger(c.bass) && c.bass >= 33 && c.bass <= 48, `${name} 베이스 높이 ${c.bass}`);
    assert.ok(Math.min(...c.ep) >= 57 && Math.max(...c.ep) <= 79, `${name} EP 높이`);
  }
});

test('화음 안에서 EP와 패드가 반음으로 붙어 울리지 않음', () => {
  for (const [name, c] of Object.entries(CH)) {
    const notes = [...c.ep, ...c.pad, c.bass];
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const d = Math.abs(notes[i] - notes[j]);
        assert.ok(d !== 1 && d !== 13, `${name}: ${notes[i]}와 ${notes[j]}가 ${d}반음 차이`);
      }
    }
  }
});

test('모든 부분(section)에 연주 모양이 있음', () => {
  for (const track of Object.values(TRACKS)) {
    for (const bar of track.bars) {
      assert.ok(COMP[bar.section], `COMP.${bar.section}`);
      assert.ok(BASS[bar.section], `BASS.${bar.section}`);
      assert.ok(bar.section in PUSH, `PUSH.${bar.section}`);
    }
  }
});

test('화면별 소리: 곡이 있고, 쓰기 소리는 멜로디와 드럼이 없음', () => {
  for (const [id, sc] of Object.entries(SCENES)) assert.ok(TRACKS[sc.track], `${id} 곡 ${sc.track}`);
  assert.equal(SCENES.writing.lead, false);
  assert.equal(SCENES.writing.drums, false);
  assert.equal(SCENES.library.lead, true);
});

// 곡 안의 모든 멜로디 음을 시간 순서로 (마디 번호 × 4 + 박)
function leadNotes(trackId) {
  const out = [];
  TRACKS[trackId].bars.forEach((bar, b) => {
    for (const [beat, midi, dur] of bar.mel || []) out.push({ bar, b, beat, midi, dur, start: b * 4 + beat, end: b * 4 + beat + dur });
  });
  return out;
}

for (const id of Object.keys(TRACKS)) {
  test(`멜로디(${id}): 높이 범위, 사용할 수 있는 음, 박 위치`, () => {
    for (const n of leadNotes(id)) {
      const at = where(id, n.bar, [n.beat, n.midi]);
      assert.ok(n.midi >= LEAD_RANGE[0] && n.midi <= LEAD_RANGE[1], `범위 밖 ${at}`);
      assert.ok(n.beat >= 0 && n.beat <= 3.5 && (n.beat * 2) % 1 === 0, `박 위치 ${at}`);
      assert.ok(n.dur >= 0.5, `너무 짧음 ${at}`);
      // C장조의 음이거나, 그 마디 화음 안의 음(빌려 온 화음의 음)만
      assert.ok(C_MAJOR.has(pc(n.midi)) || chordPcs(n.bar.chord).has(pc(n.midi)), `조 밖의 음 ${at}`);
    }
  });

  test(`멜로디(${id}): 센 박이나 긴 음은 화음과 반음으로 부딪치지 않음`, () => {
    for (const n of leadNotes(id)) {
      const strong = n.beat === 0 || n.beat === 2 || n.dur >= 1.5;
      if (!strong) continue;
      assert.ok(!clashes(n.midi, n.bar.chord), `화음과 부딪침 ${where(id, n.bar, [n.beat, n.midi, n.dur])}`);
    }
  });

  test(`멜로디(${id}): 다음 마디로 넘어가 울리는 음도 그 마디 화음과 부딪치지 않음`, () => {
    const bars = TRACKS[id].bars;
    for (const n of leadNotes(id)) {
      const spill = n.end - (n.b + 1) * 4;
      const next = bars[n.b + 1];
      if (spill <= 0.5 || !next) continue;
      assert.ok(!clashes(n.midi, next.chord), `넘어가 울리다 부딪침 ${where(id, n.bar, [n.beat, n.midi, n.dur])} → ${next.chord}`);
    }
  });

  test(`멜로디(${id}): 한 번에 한 음만, 건너뛰는 폭은 5도(7반음) 이내`, () => {
    const notes = leadNotes(id);
    for (let i = 1; i < notes.length; i++) {
      const a = notes[i - 1];
      const b = notes[i];
      const at = where(id, b.bar, [b.beat, b.midi]);
      assert.ok(a.end <= b.start + 1e-9, `앞 음이 다음 음과 겹침 ${at}`);
      assert.ok(Math.abs(b.midi - a.midi) <= 7, `너무 크게 건너뜀(${a.midi}→${b.midi}) ${at}`);
    }
  });
}

test('멜로디 모양: 마디마다 쉼이 있고(숨 쉴 곳), 같은 음 높이가 세 번 이어지지 않음', () => {
  for (const id of Object.keys(TRACKS)) {
    const notes = leadNotes(id);
    for (let i = 2; i < notes.length; i++) {
      assert.ok(!(notes[i].midi === notes[i - 1].midi && notes[i].midi === notes[i - 2].midi), `${id} 같은 음 세 번: ${notes[i].midi}`);
    }
    // 4마디 안에 멜로디가 하나도 없는 구간이 없고, 쉬는 시간이 아예 없는 곳도 없음
    const total = TRACKS[id].bars.length * 4;
    const sounding = notes.reduce((a, n) => a + Math.min(n.dur, total - n.start), 0);
    assert.ok(sounding / total < 0.85, `${id} 멜로디가 빈틈없이 이어짐 ${(sounding / total).toFixed(2)}`);
    assert.ok(sounding / total > 0.3, `${id} 멜로디가 너무 드묾 ${(sounding / total).toFixed(2)}`);
  }
});

test('후렴은 앞부분보다 음이 많고 높음(음량이 아니라 밀도와 높이로 올라감)', () => {
  const bars = TRACKS.library.bars;
  const stat = (section) => {
    const own = bars.filter((b) => b.section === section);
    const notes = own.flatMap((b) => b.mel || []);
    return { perBar: notes.length / own.length, avg: notes.reduce((a, n) => a + n[1], 0) / notes.length };
  };
  assert.ok(stat('chorus').perBar > stat('verseA').perBar, '후렴 음 개수');
  assert.ok(stat('chorus').avg >= stat('verseA').avg, '후렴 평균 높이');
});

test('쓰는 중 소리는 서재 곡을 그대로 이어서 쓰므로 마디 수가 같음', () => {
  assert.equal(SCENES.writing.track, SCENES.library.track);
});
