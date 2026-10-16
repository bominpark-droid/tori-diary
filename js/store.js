// 앱의 모든 기록은 이 기기 브라우저의 localStorage 한 곳에 JSON으로 저장됩니다.
// 손글씨 사진만 크기 때문에 IndexedDB(js/photos.js)에 따로 저장합니다.
// 기록은 기기 밖으로 나가지 않습니다(보호자가 내보내기를 누를 때만 파일로 나감).

import { dayKey } from './dates.js';
import { FREE } from './data/shop-items.js';
import { defaultHints } from './hints.js';

const KEY = 'tori-diary:v1';
const VERSION = 1;

export function defaultState() {
  return {
    version: VERSION,
    createdAt: new Date().toISOString(),
    firstDay: dayKey(),
    profile: { name: '', onboarded: false },
    settings: {
      theme: 'auto', // 'auto' 기기 따라 | 'light' | 'dark'
      writeSize: 'L', // 쓰기 글자: 'S' | 'M' | 'L'
      leading: 'normal', // 줄 간격: 'normal' | 'wide'
      plainFonts: false, // 읽기 쉬운 글꼴로 보기
      music: true, // 배경음악
      musicWhileWriting: true, // 쓰는 화면에서도 음악 (첫 만남에서 아이가 고름)
      volume: 0.45,
      sfx: true,
      lastInput: 'keyboard', // 'keyboard' | 'voice' | 'photo'
    },
    parent: {
      pin: null, // PIN을 그대로 저장하지 않고 간단히 바꿔 저장
      maxVolume: 0.8,
      helper: true, // 다듬기 도우미
      voice: false, // 말하기 입력 (기본 끔)
      voiceTest: null,
      quiet: { on: false, start: '21:00', end: '07:00' }, // 쉬는 시간대
      payout: 'daily', // 'daily' 매일 | 'weekly' 주간 정산
      payoutAnnounced: 'daily', // 아이에게 알린 지급 방식
      fadeReminderSeen: false,
    },
    wallet: { ledger: [] }, // {id, day, type, amount, pending, diaryId, itemId, at}
    owned: {
      covers: [...FREE.covers],
      stickers: [...FREE.stickers],
      fonts: [...FREE.fonts],
      frames: [],
      items: [], // 산 상품 id
    },
    current: { cover: 'spring', font: 'basic' },
    goal: null, // 목표 상품 id
    diaries: [],
    draft: null, // 쓰는 중인 일기
    hints: defaultHints(),
    topics: { recent: [], custom: [] },
    rests: [], // 쉰 날
    metrics: { shopMs: {}, flowMs: {}, openDays: [] },
    seen: {},
  };
}

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

// 예전에 저장된 기록에 새 항목이 없으면 기본값으로 채웁니다.
function mergeDefaults(def, saved) {
  if (!isObject(saved)) return def;
  const out = { ...def };
  for (const key of Object.keys(saved)) {
    if (isObject(def[key]) && isObject(saved[key])) out[key] = mergeDefaults(def[key], saved[key]);
    else out[key] = saved[key];
  }
  return out;
}

function readSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('기록을 읽지 못했어요', e);
    return null;
  }
}

// 새 버전에서 무료 상품이 늘면 예전 기록에도 넣어 줍니다.
function normalize(s) {
  for (const kind of ['covers', 'stickers', 'fonts']) {
    const have = new Set(s.owned[kind]);
    for (const id of FREE[kind]) if (!have.has(id)) s.owned[kind].push(id);
  }
  s.version = VERSION;
  return s;
}

let state = normalize(mergeDefaults(defaultState(), readSaved()));
const listeners = new Set();
let saveTimer = null;
let lastError = null;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    lastError = null;
  } catch (e) {
    lastError = e;
    console.warn('기록을 저장하지 못했어요', e);
  }
}

function emit() {
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (e) {
      console.error(e);
    }
  }
}

export const store = {
  get state() {
    return state;
  },
  get lastError() {
    return lastError;
  },
  // 바꾸고 바로 저장
  update(fn) {
    fn(state);
    persist();
    emit();
  },
  // 바꾸고 조금 뒤 저장 (글을 쓰는 동안처럼 자주 바뀔 때)
  updateSoon(fn) {
    fn(state);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 400);
  },
  flush() {
    if (saveTimer) persist();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  // 백업 파일을 불러올 때
  replace(next) {
    state = normalize(mergeDefaults(defaultState(), next));
    persist();
    emit();
  },
  resetAll() {
    state = defaultState();
    persist();
    emit();
  },
  exportJSON() {
    return JSON.stringify(state);
  },
};

// 앱이 닫히기 전에 남은 저장을 마칩니다.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => store.flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') store.flush();
  });
}

// 기기가 저장 공간을 함부로 지우지 않도록 요청 (지원하는 브라우저만)
export async function askPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      if (already) return true;
      return await navigator.storage.persist();
    }
  } catch (e) {
    /* 지원하지 않으면 넘어감 */
  }
  return false;
}

// 자주 쓰는 찾기
export function findDiary(id) {
  return state.diaries.find((d) => d.id === id) || null;
}

export function diariesOn(day) {
  return state.diaries.filter((d) => d.day === day);
}
