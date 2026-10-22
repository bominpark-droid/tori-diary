// 토리의 서재 (홈). docs/DESIGN.md 4.2

import { h, pick, seedOf } from '../util.js';
import { store } from '../store.js';
import { bubble, coinBadge, icon, ask, toast } from '../ui.js';
import { toriNode } from '../tori.js';
import { coverSVG } from '../art/covers.js';
import { LINES, fill } from '../data/tori-lines.js';
import { balance, pendingTotal } from '../rewards.js';
import { unseenLoose } from '../gifts.js';
import { dayKey, partOfDay, weekStart, fromKey } from '../dates.js';
import { won } from '../util.js';
import { music } from '../music.js';
import { quietNow } from '../router.js';
import { musicButton, weekDots, nameVars } from './common.js';

export const meta = { tab: 'home', flow: false, music: 'library' };

function greeting(s, today) {
  const vars = nameVars();
  const seed = seedOf(today);
  const wrote = s.diaries.some((d) => d.day === today);
  const unread = s.diaries.some((d) => (d.replies || []).some((r) => !r.read));
  if (unread) return { mood: 'wow', lines: [LINES.greetReply] };
  // 문구점이 없어지면서 생긴 선물, 쌓여 있던 선물
  const loose = unseenLoose(s);
  if (s.seen.legacyNotice && !s.seen.legacyNotice.shown) {
    return { mood: 'cheer', lines: [loose.length ? fill(LINES.greetLegacy, { count: loose.length }) : LINES.greetLegacyNone], once: 'legacy' };
  }
  if (loose.length) return { mood: 'cheer', lines: [fill(LINES.greetGifts, { count: loose.length })], once: 'gifts' };
  if (s.seen.settled && s.seen.settled.day === today && !s.seen.settled.shown) {
    return { mood: 'cheer', lines: [fill(LINES.greetSettled, { amount: won(s.seen.settled.amount) })], once: 'settled' };
  }
  if (s.parent.payout !== s.parent.payoutAnnounced) {
    return { mood: 'think', lines: [s.parent.payout === 'weekly' ? LINES.payoutWeekly : LINES.payoutDaily], once: 'payout' };
  }
  if (wrote) return { mood: 'happy', lines: [pick(LINES.greetDone, seed)] };
  if ((s.rests || []).includes(today)) return { mood: 'sleepy', lines: [pick(LINES.rest, seed)] };
  const part = partOfDay();
  return { mood: part === 'night' ? 'smile' : 'wave', lines: [fill(pick(LINES.greet[part], seed), vars)] };
}

export function render(root, params, app) {
  const s = store.state;
  const today = dayKey();

  // 쉬는 시간대
  if (quietNow(s)) {
    root.appendChild(h('div', { class: 'wrap quiet stack' },
      h('div', { class: 'quiet-sky', 'aria-hidden': 'true' }),
      toriNode('sleepy', { size: 'xl' }),
      bubble([LINES.quiet]),
      h('a', { class: 'btn-text', href: '#/parent' }, '보호자 화면')));
    music.setScene('silent');
    return;
  }

  const g = greeting(s, today);
  if (g.once === 'settled') store.update((st) => { st.seen.settled.shown = true; });
  if (g.once === 'payout') store.update((st) => { st.parent.payoutAnnounced = st.parent.payout; });
  if (g.once === 'legacy' || g.once === 'gifts') {
    store.update((st) => {
      if (st.seen.legacyNotice) st.seen.legacyNotice.shown = true;
      for (const x of unseenLoose(st)) x.seen = true;
    });
  }

  const wrote = s.diaries.some((d) => d.day === today);
  const rested = (s.rests || []).includes(today);
  const draft = s.draft;

  const toriBox = toriNode(g.mood, { size: 'lg', notes: s.settings.music && music.isPlaying() });
  const off = music.onChange((playing) => {
    toriBox.innerHTML = toriNode(g.mood, { size: 'lg', notes: playing && store.state.settings.music }).innerHTML;
  });

  const hero = h('section', { class: 'hero', 'aria-label': '토리의 서재' },
    h('div', { class: 'hero-window', html: coverSVG(s.current.cover, '') }),
    h('div', { class: 'hero-top' },
      h('span', { class: 'hero-name ui' }, '토리의 서재'),
      h('div', { class: 'row' }, coinBadge(balance(s)), musicButton())),
    h('div', { class: 'hero-tori' }, h('div', { class: 'book-stack', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), toriBox));

  const actions = h('div', { class: 'stack-sm' });
  if (draft) {
    actions.appendChild(h('a', { class: 'btn btn-primary btn-big', href: draft.steps && draft.steps.writeAt ? '#/write/text' : draft.steps && draft.steps.planAt ? '#/write/plan' : '#/write/scene' }, icon('pencil'), '이어서 쓰기'));
    actions.appendChild(h('button', { class: 'btn-text', type: 'button', on: { click: async () => {
      if (await ask({ title: '쓰던 일기를 지우고 새로 쓸래?', yes: '새로 쓸래', no: '이어서 쓸래' })) {
        store.update((st) => { st.draft = null; });
        app.go('/write/scene');
      } else app.go(draft.steps && draft.steps.writeAt ? '/write/text' : '/write/scene');
    } } }, '처음부터 새로 쓰기'));
  } else if (wrote) {
    actions.appendChild(h('a', { class: 'btn btn-soft btn-big', href: '#/write/scene' }, icon('pencil'), '또 쓰고 싶은 이야기 쓰기'));
    actions.appendChild(h('a', { class: 'btn-text', href: '#/shelf' }, '오늘 쓴 일기 다시 보기'));
  } else {
    actions.appendChild(h('a', { class: 'btn btn-primary btn-big', href: '#/write/scene' }, icon('pencil'), rested ? '그래도 쓸래' : '오늘 일기 쓰기'));
    if (!rested) {
      actions.appendChild(h('button', { class: 'btn-text', type: 'button', on: { click: () => {
        store.update((st) => { if (!st.rests.includes(today)) st.rests.push(today); });
        app.go('/');
      } } }, '오늘은 쉴래'));
    }
  }

  const week = weekDots(today);
  const pending = pendingTotal(s);
  const weekCard = h('section', { class: 'card week-card' },
    h('div', { class: 'row-between' },
      h('h2', { class: 'card-title' }, `이번 주 쓴 날 ${week.count}일`),
      pending > 0 ? h('span', { class: 'pill' }, `월요일에 들어올 용돈 ${won(pending)}`) : null),
    week.el);

  // 이번 주 되돌아보기 (토, 일 또는 3일 이상 쓴 주)
  const dow = fromKey(today).getDay();
  const ws = weekStart(today);
  const weekDiaries = s.diaries.filter((d) => d.day >= ws && d.day <= today);
  const rereadDone = s.seen.reread === ws;
  const reread = !rereadDone && weekDiaries.length >= 2 && (dow === 0 || dow === 6 || weekDiaries.length >= 3)
    ? h('section', { class: 'card seam reread-card' },
      h('div', { class: 'row' }, toriNode('read', { size: 'xs' }), h('p', { class: 'grow ui' }, LINES.reread)),
      h('a', { class: 'btn btn-soft', href: '#/shelf/reread' }, '골라 보기'))
    : null;

  root.appendChild(h('div', { class: 'home' },
    hero,
    h('div', { class: 'wrap stack home-body' },
      bubble(g.lines, 'up home-bubble'),
      actions,
      weekCard,
      reread)));

  return () => off();
}
