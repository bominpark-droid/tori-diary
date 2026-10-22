// 여러 화면에서 같이 쓰는 조각: 음악 단추, 이번 주 점, 일기 쪽 그리기, 스티커, 이름 부르기

import { h, svg, won } from '../util.js';
import { store } from '../store.js';
import { icon, ICONS, WEATHER_ICONS, coinSVG } from '../ui.js';
import { music } from '../music.js';
import { weekDays, dayKey, shortDay, koreanDate } from '../dates.js';
import { coverSVG } from '../art/covers.js';
import { stickerSVG, stickerMeta } from '../art/stickers.js';
import { FRAMES } from '../art/covers.js';
import { fontStyle, pageFont } from '../data/fonts.js';
import { giftInfo } from '../gifts.js';
import { stickerLayer } from '../sticker-layer.js';
import { callName, softName } from '../josa.js';
import { WEATHER } from '../data/plan.js';

// 이름 부르기 값들 (토리 대사 채우기용)
export function nameVars() {
  const n = store.state.profile.name;
  return { name: callName(n), soft: softName(n), nameComma: n ? `, ${callName(n)}` : '' };
}

// 헤드폰 단추: 음악 켜기와 끄기
export function musicButton() {
  const on = () => store.state.settings.music;
  const b = h('button', { class: 'btn-icon music-btn', type: 'button' });
  const paint = () => {
    b.innerHTML = on() ? ICONS.phones : ICONS.phonesOff;
    b.setAttribute('aria-label', on() ? '음악 끄기' : '음악 켜기');
    b.setAttribute('aria-pressed', on() ? 'true' : 'false');
  };
  b.addEventListener('click', () => {
    store.update((s) => { s.settings.music = !s.settings.music; });
    music.unlock();
    paint();
  });
  paint();
  return b;
}

// 이번 주 월~일 점 7개 (연속 기록이나 깨짐 표시는 없음)
export function weekDots(today = dayKey()) {
  const days = weekDays(today);
  const written = new Set(store.state.diaries.map((d) => d.day));
  const count = days.filter((d) => written.has(d)).length;
  return {
    count,
    el: h('div', { class: 'week', role: 'img', 'aria-label': `이번 주에 일기를 쓴 날 ${count}일` },
      days.map((d) => h('div', { class: ['week-day', d === today ? 'today' : null] },
        h('span', { class: ['week-dot', written.has(d) ? 'on' : null] }, written.has(d) ? svg(ICONS.check) : null),
        h('span', { class: 'week-label' }, shortDay(d))))),
  };
}

export function stickerNode(id, size = 72, extra) {
  const m = stickerMeta(id);
  const el = h('span', { class: ['sticker', m && m.shine ? 'shine' : null, m && m.big ? 'big' : null, extra], style: { width: `${size}px`, height: `${m && m.big ? Math.round(size * 1.36) : size}px` }, role: 'img', 'aria-label': m ? m.name : '스티커' });
  el.innerHTML = stickerSVG(id);
  return el;
}

export function weatherIcon(id) {
  const w = WEATHER.find((x) => x.id === id);
  if (!w) return null;
  return h('span', { class: 'weather-ico', role: 'img', 'aria-label': `날씨 ${w.label}`, html: WEATHER_ICONS[id] });
}

// 일기 한 쪽 (일기장 읽기, 꾸미기)
// 배경(표지 그림)이 쪽 전체에 깔리고, 글은 그 위의 종이 칸에 놓이고, 스티커는 쪽 어디에나 얹힙니다.
// opts: { after: 글 아래에 더할 것(사진), bookmark: 책갈피 표시(기본 켬), edit: 스티커를 끌 수 있게(js/sticker-layer.js) }
export function diaryPage(d, opts = {}) {
  const plain = store.state.settings.plainFonts;
  const frame = d.frame && FRAMES[d.frame] ? d.frame : null;
  const bg = h('div', { class: 'page-bg', html: coverSVG(d.cover, '') });
  const title = h('h2', { class: 'page-title', style: pageFont(d.font, { plain }) }, d.title || '오늘의 일기');
  const meta = h('div', { class: 'page-meta' }, h('span', null, koreanDate(d.day)), weatherIcon(d.weather));
  const body = h('div', { class: 'page-text', style: pageFont(d.font, { plain, body: true }) }, paragraphs(d.text, opts.bookmark !== false ? d.bookmark : null));
  return h('article', { class: ['page', frame ? `frame-${frame}` : null], 'aria-label': `${koreanDate(d.day)} 일기` },
    bg,
    h('div', { class: 'page-in' }, meta, title, body, opts.after || null),
    stickerLayer(d.stickers, opts.edit));
}

// 글을 문단으로. 책갈피 문장에는 표시
function paragraphs(text, bookmark) {
  const parts = String(text || '').split(/\n+/);
  return parts.map((p) => {
    if (bookmark && bookmark.s && p.includes(bookmark.s)) {
      const [a, ...rest] = p.split(bookmark.s);
      return h('p', null, a, h('mark', { class: 'bookmark', title: '토리가 책갈피를 꽂은 문장' }, bookmark.s), rest.join(bookmark.s));
    }
    return h('p', null, p);
  });
}

// 나란히 보기: diffWords 결과를 처음 글(left)과 고친 글(right)로 나눔
export function diffSides(tokens) {
  return {
    left: tokens.filter((t) => t.type !== 'add').map((t) => (t.type === 'del' && !t.ws ? h('del', null, t.t) : t.t)),
    right: tokens.filter((t) => t.type !== 'del').map((t) => (t.type === 'add' && !t.ws ? h('mark', { class: 'add' }, t.t) : t.t)),
  };
}

// 용돈 카드 (일기 완성, 다듬기 보너스, 주간 보너스)
export function rewardCard({ title, amount, note }) {
  return h('div', { class: 'reward-card reward-in', role: 'status' },
    h('span', { class: 'reward-coin', html: coinSVG() }),
    h('div', { class: 'grow' }, h('div', { class: 'reward-title ui' }, title), note ? h('div', { class: 'muted small' }, note) : null),
    amount ? h('div', { class: 'reward-amount ui' }, `+${won(amount)}`) : null);
}

// 선물 모양: 스티커는 그림, 표지는 작은 그림, 글씨는 견본, 쪽 테두리는 색 띠
export function giftLook(entry, size = 64) {
  if (entry.kind === 'sticker') return stickerNode(entry.id, size);
  if (entry.kind === 'cover') return h('span', { class: 'gift-cover', html: coverSVG(entry.id, '') });
  if (entry.kind === 'font') return h('span', { class: 'gift-font', style: fontStyle(entry.id) }, '토리 일기');
  const fr = FRAMES[entry.id];
  return h('span', { class: 'gift-frame', style: `--frame:${fr ? fr.color : '#B9C5DA'}`, role: 'img', 'aria-label': fr ? fr.name : '쪽 테두리' });
}

// 선물 카드 (일기를 완성했을 때 토리가 주는 선물)
export function giftCard(entry, { title = '토리의 선물', note } = {}) {
  const info = giftInfo(entry);
  return h('div', { class: 'gift-card reward-in', role: 'status' },
    h('div', { class: 'gift-look' }, giftLook(entry)),
    h('div', { class: 'grow' },
      h('div', { class: 'reward-title ui' }, title),
      h('div', { class: 'gift-name' }, info.text),
      note ? h('div', { class: 'muted small' }, note) : null));
}

// 위쪽 작은 제목 줄
export function topBar(title, { back, right } = {}) {
  return h('div', { class: 'topbar wrap' },
    back ? h('a', { class: 'btn-icon', href: back, 'aria-label': '뒤로' }, icon('back')) : null,
    h('h1', { class: 'grow topbar-title' }, title),
    right || null);
}
