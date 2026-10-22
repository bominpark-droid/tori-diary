// 쓰기 흐름에서 함께 쓰는 도우미: 쓰던 일기(draft) 만들기와 저장, <다 썼어>로 일기 만들기.

import { store, findDiary } from './store.js';
import { dayKey } from './dates.js';
import { uid } from './util.js';
import { earnDiary, earnWeek, canEarnDiary } from './rewards.js';
import { grantDue } from './gifts.js';
import { praiseFor, sentenceCount, splitSentences, quoteOf } from './feedback.js';

export function newDraft() {
  const s = store.state;
  return {
    id: uid('d'),
    day: dayKey(),
    startedAt: Date.now(),
    scene: { slots: {}, star: null },
    topic: null, // { kind: 'slot' | 'card' | 'custom' | 'free' | 'ask' | 'mood' | 'favorite', text, cardId, group }
    plan: { who: '', where: '', when: '', what: '', how: '', feeling: '', reader: '', detailed: false, skipped: false },
    hintUse: { start: false, middle: false, end: false },
    weather: null,
    title: '',
    input: s.settings.lastInput === 'voice' && !s.parent.voice ? 'keyboard' : s.settings.lastInput,
    text: '',
    photoId: null,
    stats: { planMs: 0, writeMs: 0, hintsOpened: 0, starter: 0, ladder: [], cardsShown: [] },
    steps: { planAt: null, writeAt: null },
  };
}

export function getDraft() {
  return store.state.draft;
}

export function startDraft() {
  if (!store.state.draft) store.update((s) => { s.draft = newDraft(); });
  return store.state.draft;
}

export function updateDraft(fn, soon = true) {
  const run = (s) => {
    if (!s.draft) s.draft = newDraft();
    fn(s.draft, s);
  };
  if (soon) store.updateSoon(run);
  else store.update(run);
}

export function discardDraft() {
  store.update((s) => { s.draft = null; });
}

// 쓰기 칸이 <다 썼어>를 누를 만큼 찼는지: 한 문장 이상(한글 3자 이상), 또는 사진 한 장
export function readyToFinish(d) {
  if (!d) return false;
  if (d.input === 'photo') return !!d.photoId;
  const hangul = (String(d.text).match(/[가-힣]/g) || []).length;
  return hangul >= 3;
}

// <다 썼어>: 일기를 책장에 넣고 용돈과 선물을 계산합니다.
export function finishDraft() {
  const s = store.state;
  const d = s.draft;
  if (!d) return null;
  const day = dayKey();
  const first = canEarnDiary(s, day);
  const text = String(d.text || '').trim();
  const praise = d.input === 'photo' && !text ? null : praiseFor(text, { seed: Date.now() % 997 });
  // 칭찬에 인용 문장이 없으면(순서, 누가·언제·어디서 칭찬) 가운데 문장에 책갈피
  if (praise && !praise.sentence) {
    const ss = splitSentences(text);
    if (ss.length) {
      const s = ss.length >= 3 ? ss[Math.floor(ss.length / 2)] : ss[ss.length - 1];
      praise.sentence = s.text;
      praise.quote = quoteOf(s.text);
    }
  }
  const diary = {
    id: d.id,
    day,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    first,
    topic: d.topic,
    plan: d.plan,
    weather: d.weather,
    title: String(d.title || '').trim(),
    input: d.input,
    text,
    original: text,
    photo: d.photoId,
    cover: s.current.cover,
    font: s.current.font,
    stickers: [],
    frame: null,
    selfCheck: null,
    shared: false,
    bookmark: praise && praise.sentence ? { s: praise.sentence, quote: praise.quote } : null,
    praise: praise ? { kind: praise.kind, line: praise.line } : null,
    polish: { opened: false, rounds: 0, changed: false, bonus: 0, kinds: [], history: [] },
    replies: [],
    reread: null,
    stats: {
      ...d.stats,
      writeMs: d.steps.writeAt ? Date.now() - d.steps.writeAt : 0,
      sentences: sentenceCount(text),
      planSkipped: !!d.plan.skipped,
      hints: { ...d.hintUse },
    },
  };
  let reward = { amount: 0, pending: false };
  let week = { amount: 0, pending: false };
  let gifts = [];
  store.update((st) => {
    st.diaries.push(diary);
    reward = earnDiary(st, day, diary.id);
    week = earnWeek(st, day, diary.id);
    gifts = grantDue(st, day, diary.id);
    st.settings.lastInput = d.input;
    st.draft = null;
    const m = st.metrics;
    m.flowMs[day] = (m.flowMs[day] || 0) + (Date.now() - d.startedAt);
  });
  return { diary: findDiary(diary.id), reward, week, gifts, first };
}

export function updateDiary(id, fn) {
  store.update((s) => {
    const d = s.diaries.find((x) => x.id === id);
    if (d) {
      fn(d, s);
      d.updatedAt = new Date().toISOString();
    }
  });
}

export function latestToday() {
  const day = dayKey();
  const list = store.state.diaries.filter((d) => d.day === day);
  return list[list.length - 1] || null;
}
