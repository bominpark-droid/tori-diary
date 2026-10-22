// 용돈 규칙 (docs/DESIGN.md 6절). 화면과 상관없는 순수한 계산만 둡니다.
// 용돈은 실제 돈과 1원 = 1원으로 바뀝니다. 앱이 돈을 보내지는 않고, 아이가 <받을래>를 누르면 영수증이 생기며
// 보호자가 직접 전해 준 뒤 <줬어요>를 누릅니다.
// - 그날 첫 일기 완성: 300원
// - 그날 다듬기 1회차에서 토리 제안(세 가지쯤)을 모두 고침: 다듬기 보너스 200원 (보호자가 도우미를 끄면 없음)
// - 한 주(월~일) 7일을 모두 씀: 주간 보너스 500원 (일요일에 7일이 채워질 때 한 번)
// - 같은 날 추가 일기: 용돈 없음
// - 보호자는 주거나 뺄 수 없음 (이 파일에 그런 함수가 없음. 보호자 화면은 영수증을 <줬어요>로 표시할 수만 있음)
// - 주간 정산: 한 주 동안 모은 것이 다음 주 월요일에 들어옴
// 장부는 state.purse.ledger입니다. 예전 문구머니 기록(state.wallet.ledger)은 읽기만 합니다(js/gifts.js).

import { weekStart, weekDays } from './dates.js';
import { uid } from './util.js';

export const AMOUNT = { diary: 300, polish: 200, week: 500 };

// 이 금액이 되면 <받을래>를 누를 수 있어요 (보호자가 자주 조금씩 전해 주지 않도록)
export const MIN_CASHOUT = 1000;

function ledger(state) {
  return state.purse.ledger;
}

// 취소한 영수증은 없던 일로 칩니다.
const counted = (e) => (e.canceled ? 0 : e.amount);

export function balance(state) {
  return ledger(state).reduce((sum, e) => (e.pending ? sum : sum + counted(e)), 0);
}

export function pendingTotal(state) {
  return ledger(state).reduce((sum, e) => (e.pending ? sum + counted(e) : sum), 0);
}

export function earnedOn(state, day, type) {
  return ledger(state).some((e) => e.day === day && e.type === type);
}

export function canEarnDiary(state, day) {
  return !earnedOn(state, day, 'diary');
}

export function canEarnPolish(state, day) {
  return state.parent.helper && !earnedOn(state, day, 'polish');
}

// 이 날이 든 주(월~일) 7일에 모두 일기가 있는가
export function weekComplete(state, day) {
  const written = new Set(state.diaries.map((d) => d.day));
  return weekDays(day).every((d) => written.has(d));
}

export function canEarnWeek(state, day) {
  const start = weekStart(day);
  return weekComplete(state, day) && !ledger(state).some((e) => e.type === 'week' && e.week === start);
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

// 다듬기 보너스 (1회차 제안을 모두 고쳤을 때만 부르기. 판정은 feedback.js의 bonusReady)
export function earnPolish(state, day, diaryId) {
  if (!canEarnPolish(state, day)) return { amount: 0, pending: false };
  const e = add(state, { day, type: 'polish', amount: AMOUNT.polish, diaryId });
  return { amount: e.amount, pending: e.pending };
}

// 주간 보너스 (일기를 장부에 넣은 뒤에 부르기)
export function earnWeek(state, day, diaryId) {
  if (!canEarnWeek(state, day)) return { amount: 0, pending: false };
  const e = add(state, { day, type: 'week', amount: AMOUNT.week, week: weekStart(day), diaryId });
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

// ---------- 용돈 받기 (영수증) ----------

export function canCashOut(state) {
  return balance(state) >= MIN_CASHOUT;
}

// 아이가 <받을래>를 누름: 잔액 전부를 영수증으로 바꿉니다. 영수증을 돌려주고, 못 받으면 null.
export function cashOut(state, day) {
  if (!canCashOut(state)) return null;
  const amount = balance(state);
  return add(state, { day, type: 'cashout', amount: -amount, given: false, canceled: false });
}

export function receipts(state) {
  return ledger(state).filter((e) => e.type === 'cashout').slice().reverse();
}

// 아이가 아직 전해 받지 못한 영수증은 취소할 수 있고, 그러면 돈이 다시 잔액으로 돌아옵니다.
export function cancelCashOut(state, id) {
  const e = ledger(state).find((x) => x.id === id && x.type === 'cashout');
  if (!e || e.given || e.canceled) return false;
  e.canceled = true;
  return true;
}

// 보호자가 직접 전해 준 뒤 표시 (잘못 눌렀으면 되돌릴 수 있음)
export function markGiven(state, id, given) {
  const e = ledger(state).find((x) => x.id === id && x.type === 'cashout');
  if (!e || e.canceled) return false;
  e.given = !!given;
  e.givenAt = given ? new Date().toISOString() : null;
  return true;
}

// 아직 안 전해 준 돈, 지금까지 전해 준 돈
export function owedTotal(state) {
  return receipts(state).filter((e) => !e.given && !e.canceled).reduce((a, e) => a - e.amount, 0);
}

export function givenTotal(state) {
  return receipts(state).filter((e) => e.given && !e.canceled).reduce((a, e) => a - e.amount, 0);
}

// 이번 주(월~일)에 일기를 쓴 날
export function writtenDaysThisWeek(state, days) {
  const set = new Set(state.diaries.map((d) => d.day));
  return days.filter((d) => set.has(d));
}

// 일기를 쓴 날 수 (여러 편을 쓴 날도 하루)
export function daysWritten(state) {
  return new Set(state.diaries.map((d) => d.day)).size;
}
