// ④ 완성. docs/DESIGN.md 4.3 ④
// 글이 먼저, 용돈과 선물은 그다음. 금액과 선물은 장부에서 이 일기 몫을 찾아 보여 주므로 다시 열어도 두 번 주지 않습니다.

import { h, pick, seedOf } from '../util.js';
import { store, findDiary } from '../store.js';
import { flowbar, bubble, withQuotes, toast } from '../ui.js';
import { toriNode } from '../tori.js';
import { LINES, fill } from '../data/tori-lines.js';
import { canEarnPolish } from '../rewards.js';
import { giftsForDiary } from '../gifts.js';
import { dayKey } from '../dates.js';
import { music } from '../music.js';
import { musicButton, rewardCard, giftCard } from './common.js';

export const meta = { tab: null, flow: true, music: 'library' };

const celebrated = new Set();
const q = (line) => (String(line).includes('‘') ? withQuotes(line) : line);

export function render(root, params, app) {
  const d = findDiary(params.id);
  if (!d) {
    app.go('/', { replace: true });
    return;
  }
  const s = store.state;
  const today = dayKey();
  const seed = seedOf(d.id);
  const photoOnly = d.input === 'photo' && !String(d.text || '').trim();

  // 토리 말: 첫 마디 + 인용이 들어간 칭찬
  const first = [photoOnly ? LINES.donePhoto : pick(LINES.doneOpen, seed)];
  const praise = d.praise && d.praise.line ? d.praise.line : '';
  if (praise && !praise.includes('‘') && d.bookmark && d.bookmark.quote) first.push(fill(LINES.doneQuote, { quote: d.bookmark.quote }));
  const talkBox = h('div', { class: 'done-talk' },
    toriNode('cheer', { size: 'lg' }),
    h('div', { class: 'stack-sm grow' },
      bubble(first.map(q), 'up'),
      praise ? bubble([q(praise)], 'no-tail') : null));

  // 용돈 카드, 주간 보너스 카드, 선물 카드
  const entry = s.purse.ledger.find((e) => e.type === 'diary' && e.diaryId === d.id);
  const weekEntry = s.purse.ledger.find((e) => e.type === 'week' && e.diaryId === d.id);
  const gifts = giftsForDiary(s, d.id);
  const card = entry
    ? rewardCard({ title: '일기 완성', amount: entry.amount, note: entry.pending ? '월요일에 한꺼번에 들어와.' : null })
    : h('div', { class: 'reward-card reward-in plain', role: 'status' }, h('p', { class: 'grow' }, LINES.sameDay));
  const weekCard = weekEntry
    ? rewardCard({ title: '한 주 7일 보너스', amount: weekEntry.amount, note: weekEntry.pending ? '월요일에 한꺼번에 들어와.' : LINES.weekDone })
    : null;
  const giftCards = gifts.map((g) => giftCard(g, { note: LINES.giftOnDone }));
  if ((entry || weekEntry) && !celebrated.has(d.id)) {
    celebrated.add(d.id);
    setTimeout(() => music.sfx('coin'), 900);
  }
  // 선물을 보여 줬으니 홈에서 다시 알리지 않습니다
  if (gifts.some((g) => !g.seen)) store.update((st) => { for (const g of giftsForDiary(st, d.id)) g.seen = true; });

  // 단추
  const helper = s.parent.helper;
  const bonusOpen = canEarnPolish(s, today) && d.day === today;
  const buttons = helper
    ? h('div', { class: 'stack-sm' },
      h('a', { class: 'btn btn-primary btn-big', href: `#/write/polish/${d.id}` }, '다듬어 볼래?'),
      h('p', { class: 'muted small center bonus-note' }, bonusOpen ? LINES.bonusInfo : LINES.bonusDone),
      h('button', { class: 'btn btn-soft btn-big', type: 'button', on: { click: () => {
        toast(LINES.polishSkip);
        app.go(`/write/decorate/${d.id}`);
      } } }, '오늘은 그대로 둘래'))
    : h('a', { class: 'btn btn-primary btn-big', href: `#/write/decorate/${d.id}` }, '꾸미러 가기');

  root.appendChild(flowbar({ step: 3, music: musicButton() }));
  root.appendChild(h('div', { class: 'wrap stack done' }, talkBox, card, weekCard, giftCards, buttons));
}
