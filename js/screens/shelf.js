// 일기장: 책장. docs/DESIGN.md 4.4
// 달마다 한 칸, 일기 한 편이 책 한 권(책등에 날짜와 제목, 표지 색). 가족 답장이 온 책에는 편지 표시.
// /shelf/reread 는 이번 주 되돌아보기(이번 주 일기만).

import { h, put } from '../util.js';
import { store } from '../store.js';
import { talk, icon, screenTitle } from '../ui.js';
import { coverMeta } from '../art/covers.js';
import { fontStyle } from '../data/fonts.js';
import { LINES } from '../data/tori-lines.js';
import { monthLabel, weekStart, dayKey, fromKey, koreanDate } from '../dates.js';

export const meta = { tab: 'shelf', flow: false, music: 'library' };

function spine(d, { reread, plain }) {
  const m = coverMeta(d.cover);
  const unread = (d.replies || []).some((r) => !r.read);
  const hasReply = (d.replies || []).length > 0;
  const title = d.title || '오늘의 일기';
  const label = `${koreanDate(d.day)}, ${title}${unread ? ', 새 답장 있음' : hasReply ? ', 답장 있음' : ''}`;
  return h('a', {
    class: ['spine', unread ? 'unread' : null],
    href: `#/diary/${d.id}${reread ? '/reread' : ''}`,
    style: `--spine:${m.color};--spine-ink:${m.ink}`,
    'aria-label': label,
  },
  h('span', { class: 'spine-day', 'aria-hidden': 'true' }, `${fromKey(d.day).getDate()}일`),
  h('span', { class: 'spine-title', style: { fontFamily: fontStyle(d.font, plain).fontFamily }, 'aria-hidden': 'true' }, title),
  hasReply ? h('span', { class: 'spine-letter', 'aria-hidden': 'true' }, icon('letter')) : null,
  d.reread ? h('span', { class: 'spine-mark', 'aria-hidden': 'true' }) : null);
}

export function render(root, params) {
  const s = store.state;
  const reread = params.mode === 'reread';
  const today = dayKey();
  const ws = weekStart(today);
  const plain = s.settings.plainFonts;
  const all = s.diaries.slice().sort((a, b) => (a.day === b.day ? String(a.createdAt).localeCompare(String(b.createdAt)) : a.day.localeCompare(b.day)));

  const wrap = h('div', { class: 'wrap stack shelf-screen' });
  root.appendChild(wrap);

  if (reread) {
    const week = all.filter((d) => d.day >= ws && d.day <= today);
    put(wrap, 
      screenTitle('이번 주 되돌아보기', { back: '#/shelf' }),
      talk('read', [LINES.reread], { size: 'sm' }),
      week.length
        ? h('section', { class: 'shelf' }, h('div', { class: 'shelf-row big' }, week.map((d) => spine(d, { reread: true, plain }))))
        : h('p', { class: 'muted' }, '이번 주에 쓴 일기가 아직 없어.'));
    return;
  }

  wrap.appendChild(screenTitle('일기장'));
  if (!all.length) {
    put(wrap, 
      talk('read', [LINES.shelfEmpty], { size: 'md' }),
      h('a', { class: 'btn btn-primary btn-big', href: '#/write/scene' }, icon('pencil'), '오늘 일기 쓰기'));
    return;
  }

  const months = new Map();
  for (const d of all) {
    const key = d.day.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(d);
  }
  const keys = [...months.keys()].sort().reverse();
  wrap.appendChild(h('p', { class: 'muted small' }, `책장에 꽂힌 일기 ${all.length}권`));
  for (const key of keys) {
    const list = months.get(key);
    wrap.appendChild(h('section', { class: 'shelf', 'aria-label': monthLabel(`${key}-01`) },
      h('h2', { class: 'shelf-label' }, monthLabel(`${key}-01`), h('span', { class: 'muted small' }, ` ${list.length}권`)),
      h('div', { class: 'shelf-row' }, list.map((d) => spine(d, { reread: false, plain })))));
  }
}
