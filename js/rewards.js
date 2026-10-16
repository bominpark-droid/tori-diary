// 문구머니 규칙 (docs/DESIGN.md 6절). 화면과 상관없는 순수한 계산만 둡니다.
// - 그날 첫 일기 완성: 1,000원
// - 그날 처음 다듬기 제안을 따라 고침: 다듬기 보너스 1,000원 (보호자가 도우미를 끄면 없음)
// - 같은 날 추가 일기: 문구머니 없음
// - 보호자는 주거나 뺏을 수 없음 (이 파일에 그런 함수가 없음)
// - 주간 정산: 한 주 동안 모은 것이 다음 주 월요일에 들어옴

import { weekStart } from './dates.js';
import { uid } from './util.js';

export const AMOUNT = { diary: 1000, bonus: 1000 };

function ledger(state) {
  return state.wallet.ledger;
}

export function balance(state) {
  return ledger(state).reduce((sum, e) => (e.pending ? sum : sum + e.amount), 0);
}

export function pendingTotal(state) {
  return ledger(state).reduce((sum, e) => (e.pending ? sum + e.amount : sum), 0);
}

export function earnedOn(state, day, type) {
  return ledger(state).some((e) => e.day === day && e.type === type);
}

export function canEarnDiary(state, day) {
  return !earnedOn(state, day, 'diary');
}

export function canEarnBonus(state, day) {
  return state.parent.helper && !earnedOn(state, day, 'bonus');
}

function add(state, entry) {
  const weekly = state.parent.payout === 'weekly' && entry.amount > 0;
  const e = {
    id: uid('m'),
    at: new Date().toISOString(),
    pending: weekly,
    ...entry,
  };
  ledger(state).push(e);
  return e;
}

// 일기 완성. 받았으면 금액, 아니면 0을 돌려줍니다.
export function earnDiary(state, day, diaryId) {
  if (!canEarnDiary(state, day)) return { amount: 0, pending: false };
  const e = add(state, { day, type: 'diary', amount: AMOUNT.diary, diaryId });
  return { amount: e.amount, pending: e.pending };
}

// 다듬기 보너스 (제안을 따라 실제로 고쳤을 때만 부르기)
export function earnBonus(state, day, diaryId) {
  if (!canEarnBonus(state, day)) return { amount: 0, pending: false };
  const e = add(state, { day, type: 'bonus', amount: AMOUNT.bonus, diaryId });
  return { amount: e.amount, pending: e.pending };
}

// 주간 정산: 지난주까지 모인 것을 넣어 줍니다. 넣은 금액을 돌려줍니다.
export function settle(state, today) {
  const thisWeek = weekStart(today);
  let total = 0;
  for (const e of ledger(state)) {
    if (e.pending && weekStart(e.day) < thisWeek) {
      e.pending = false;
      e.settledAt = new Date().toISOString();
      total += e.amount;
    }
  }
  return total;
}

// 매일 지급으로 돌아갈 때: 모여 있던 것을 바로 넣어 줍니다.
export function settleAll(state) {
  let total = 0;
  for (const e of ledger(state)) {
    if (e.pending) {
      e.pending = false;
      e.settledAt = new Date().toISOString();
      total += e.amount;
    }
  }
  return total;
}

export function canBuy(state, item) {
  return !state.owned.items.includes(item.id) && balance(state) >= item.price;
}

// 사기: 성공하면 true
export function buy(state, item, day) {
  if (!canBuy(state, item)) return false;
  add(state, { day, type: 'purchase', amount: -item.price, itemId: item.id });
  state.owned.items.push(item.id);
  const g = item.grants || {};
  for (const kind of ['covers', 'stickers', 'fonts', 'frames']) {
    for (const id of g[kind] || []) if (!state.owned[kind].includes(id)) state.owned[kind].push(id);
  }
  if (state.goal === item.id) state.goal = null;
  return true;
}

// 이번 주(월~일)에 일기를 쓴 날
export function writtenDaysThisWeek(state, days) {
  const set = new Set(state.diaries.map((d) => d.day));
  return days.filter((d) => set.has(d));
}
