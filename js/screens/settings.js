// 설정 (아이). docs/DESIGN.md 4.6

import { h, clear } from '../util.js';
import { store } from '../store.js';
import { talk, icon, toast, ask, switchRow, seg, screenTitle } from '../ui.js';
import { coverSVG, coverMeta } from '../art/covers.js';
import { FONTS, fontStyle } from '../data/fonts.js';
import { PLAN_PARTS } from '../data/plan.js';
import { LINES } from '../data/tori-lines.js';
import { PARTS } from '../hints.js';
import { music } from '../music.js';
import { photoCard } from './welcome.js';

export const meta = { tab: 'settings', flow: false, music: 'library' };

const LEVEL_NAME = { 1: '힌트 있음', 2: '한 줄 힌트', 3: '접힘' };

function section(title, ...kids) {
  return h('section', { class: 'card stack-sm settings-sec' }, h('h2', { class: 'card-title' }, title), ...kids);
}

function row(label, control, note) {
  return h('div', { class: 'set-row' },
    h('div', { class: 'grow' }, h('div', { class: 'ui set-label' }, label), note ? h('div', { class: 'muted small' }, note) : null),
    control);
}

export function render(root) {
  const s = store.state;
  const set = (fn) => store.update((st) => fn(st));

  // ---------- 나 ----------
  const nameInput = h('input', { class: 'field', type: 'text', maxlength: 10, value: s.profile.name || '', placeholder: '이름 또는 별명', 'aria-label': '이름' });
  const saveName = () => {
    const v = nameInput.value.trim().slice(0, 10);
    if (v === store.state.profile.name) return;
    set((st) => { st.profile.name = v; });
    toast(v ? '이름을 바꿨어.' : '이름 없이 부를게.');
  };
  nameInput.addEventListener('change', saveName);
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });

  const coverGrid = h('div', { class: 'cover-grid small', role: 'radiogroup', 'aria-label': '새 일기 표지' });
  const paintCovers = () => {
    clear(coverGrid);
    for (const id of store.state.owned.covers) {
      const on = store.state.current.cover === id;
      coverGrid.appendChild(h('button', { class: ['cover-pick', on ? 'on' : null], type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', on: { click: () => { set((st) => { st.current.cover = id; }); paintCovers(); } } },
        h('span', { class: 'cover-thumb', html: coverSVG(id) }), h('span', { class: 'cover-name' }, coverMeta(id).name)));
    }
  };
  paintCovers();

  const fontList = h('div', { class: 'font-list', role: 'radiogroup', 'aria-label': '새 일기 제목 글씨' });
  const paintFonts = () => {
    clear(fontList);
    for (const id of store.state.owned.fonts) {
      const f = FONTS[id];
      if (!f) continue;
      const on = store.state.current.font === id;
      fontList.appendChild(h('button', { class: ['font-pick', on ? 'on' : null], type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', on: { click: () => { set((st) => { st.current.font = id; }); paintFonts(); } } },
        h('span', { class: 'font-sample', style: fontStyle(id, false) }, '오늘의 일기'), h('span', { class: 'muted small' }, f.name)));
    }
  };
  paintFonts();

  // ---------- 소리 ----------
  const maxVol = s.parent.maxVolume;
  const vol = h('input', { type: 'range', min: '0', max: String(maxVol), step: '0.05', value: String(Math.min(s.settings.volume, maxVol)), 'aria-label': '음량' });
  vol.addEventListener('input', () => {
    const v = Number(vol.value);
    music.setVolume(v);
    store.updateSoon((st) => { st.settings.volume = v; });
  });
  vol.addEventListener('change', () => set((st) => { st.settings.volume = Number(vol.value); }));

  // ---------- 힌트와 카드 ----------
  const hintBox = h('div', { class: 'stack-sm' });
  const paintHints = () => {
    clear(hintBox);
    const hs = store.state.hints;
    hintBox.appendChild(h('div', { class: 'hint-levels' }, PARTS.map((p) => h('span', { class: 'pill' }, `${PLAN_PARTS[p].title}: ${LEVEL_NAME[hs[p].level] || ''}`))));
    if (PARTS.some((p) => hs[p].level > 1)) {
      hintBox.appendChild(h('button', { class: 'btn btn-soft', type: 'button', on: { click: () => {
        set((st) => { for (const p of PARTS) { st.hints[p].level = 1; st.hints[p].clean = 0; } });
        toast('힌트를 다시 폈어.');
        paintHints();
      } } }, '접은 힌트 다시 펴기'));
    }
  };
  paintHints();

  const cardBox = h('div', { class: 'stack-sm' });
  const paintCards = () => {
    clear(cardBox);
    const list = store.state.topics.custom;
    if (!list.length) {
      cardBox.appendChild(h('p', { class: 'muted small' }, '아직 만든 카드가 없어. 장면 고르기에서 <내 카드 만들기>로 만들 수 있어.'));
      return;
    }
    for (const c of list) {
      cardBox.appendChild(h('div', { class: 'row-between my-card' },
        h('span', { class: 'grow' }, c.text),
        h('button', { class: 'btn-icon', type: 'button', 'aria-label': `${c.text} 카드 지우기`, on: { click: async () => {
          if (!(await ask({ title: '이 카드를 지울까?', body: c.text, yes: '지울래', no: '그대로 둘래', danger: true }))) return;
          set((st) => { st.topics.custom = st.topics.custom.filter((x) => x.id !== c.id); });
          paintCards();
        } } }, icon('trash'))));
    }
  };
  paintCards();

  const view = h('div', { class: 'wrap stack settings' },
    screenTitle('설정'),
    section('나',
      h('label', { class: 'lbl' }, '토리가 부를 이름'), nameInput,
      h('label', { class: 'lbl' }, '새 일기 표지'), coverGrid,
      h('label', { class: 'lbl' }, '새 일기 제목 글씨'), fontList),
    section('글자',
      row('쓰는 글자 크기', seg([{ value: 'S', label: '작게' }, { value: 'M', label: '보통' }, { value: 'L', label: '크게' }], s.settings.writeSize, (v) => set((st) => { st.settings.writeSize = v; }), '쓰는 글자 크기')),
      row('줄 간격', seg([{ value: 'normal', label: '보통' }, { value: 'wide', label: '넓게' }], s.settings.leading, (v) => set((st) => { st.settings.leading = v; }), '줄 간격')),
      switchRow('읽기 쉬운 글꼴로 보기', s.settings.plainFonts, (v) => set((st) => { st.settings.plainFonts = v; }), '제목과 책등도 기본 글씨로 보여 줘.'),
      row('화면 밝기', seg([{ value: 'auto', label: '기기 따라' }, { value: 'light', label: '밝게' }, { value: 'dark', label: '어둡게' }], s.settings.theme, (v) => set((st) => { st.settings.theme = v; }), '화면 밝기'))),
    section('소리',
      switchRow('배경음악', s.settings.music, (v) => { set((st) => { st.settings.music = v; }); music.unlock(); }),
      switchRow('쓰는 화면에서도 음악', s.settings.musicWhileWriting, (v) => set((st) => { st.settings.musicWhileWriting = v; }), '끄면 계획과 쓰기 화면에서는 조용해.'),
      row('음량', vol),
      switchRow('효과음', s.settings.sfx, (v) => set((st) => { st.settings.sfx = v; }), '동전 소리, 스티커 소리'),
      h('p', { class: 'muted small' }, '아이폰이나 아이패드가 무음 모드이면 음악이 안 들릴 수 있어요.')),
    section('계획 힌트', hintBox),
    section('내 이야기 카드', cardBox),
    section('토리 소개',
      h('div', { class: 'tori-intro' }, photoCard('small'), talk('wave', [LINES.hello[0], LINES.hello[1]], { size: 'xs' }))),
    h('a', { class: 'btn btn-soft btn-big', href: '#/parent' }, icon('lock'), '보호자 화면'),
    h('p', { class: 'muted small center' }, '토리 일기장 · 기록은 이 기기 안에만 저장돼요.'));

  root.appendChild(view);
}
