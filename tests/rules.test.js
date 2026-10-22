// 용돈, 선물, 힌트, 조사 규칙 테스트: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import * as rewards from '../js/rewards.js';
import {
  AMOUNT, MIN_CASHOUT, balance, pendingTotal, earnDiary, earnPolish, earnWeek, canEarnPolish, canEarnWeek,
  settle, settleAll, cashOut, cancelCashOut, markGiven, receipts, owedTotal, givenTotal, daysWritten,
} from '../js/rewards.js';
import { grantDue, convertLegacy, catchUp, giftsDue, daysToNextGift, giftInfo, unseenLoose } from '../js/gifts.js';
import { defaultHints, recordPlan, acceptFold, unfold, allFolded } from '../js/hints.js';
import { josa, callName, softName, withJosa } from '../js/josa.js';
import { LINES, fill } from '../js/data/tori-lines.js';
import { GIFTS, FREE, GIFT_EVERY } from '../js/data/gifts.js';
import { STICKERS } from '../js/art/stickers.js';
import { COVERS, FRAMES } from '../js/art/covers.js';
import { FONTS } from '../js/data/fonts.js';
import { weekStart, inTimeRange, weekDays } from '../js/dates.js';

function state(over = {}) {
  return {
    parent: { helper: true, payout: 'daily', ...(over.parent || {}) },
    purse: { ledger: [] },
    wallet: { ledger: over.legacy || [] },
    owned: { covers: [...FREE.covers], stickers: [...FREE.stickers], fonts: [...FREE.fonts], frames: [] },
    gifts: { earned: 0, next: 0, log: [] },
    seen: {},
    diaries: [],
  };
}

// 그날 일기를 쓴 것으로 치고 용돈과 선물을 계산 (js/flow.js의 finishDraft와 같은 순서)
function write(s, day, id = `d-${day}-${s.diaries.length}`) {
  s.diaries.push({ id, day });
  return {
    diary: earnDiary(s, day, id),
    week: earnWeek(s, day, id),
    gifts: grantDue(s, day, id),
  };
}

test('일기 완성 300원은 그날 첫 일기에만', () => {
  const s = state();
  assert.equal(AMOUNT.diary, 300);
  assert.deepEqual(earnDiary(s, '2026-10-16', 'd1'), { amount: 300, pending: false });
  assert.deepEqual(earnDiary(s, '2026-10-16', 'd2'), { amount: 0, pending: false });
  assert.equal(earnDiary(s, '2026-10-17', 'd3').amount, 300);
  assert.equal(balance(s), 600);
});

test('다듬기 보너스 200원은 하루 한 번, 도우미를 끄면 없음', () => {
  const s = state();
  assert.equal(AMOUNT.polish, 200);
  assert.equal(earnPolish(s, '2026-10-16', 'd1').amount, 200);
  assert.equal(earnPolish(s, '2026-10-16', 'd1').amount, 0);
  const off = state({ parent: { helper: false } });
  assert.equal(canEarnPolish(off, '2026-10-16'), false);
  assert.equal(earnPolish(off, '2026-10-16', 'd1').amount, 0);
});

test('주간 보너스 500원: 월~일 7일을 모두 썼을 때 일요일에 한 번', () => {
  const s = state();
  const days = weekDays('2026-10-14'); // 2026-10-12(월) ~ 10-18(일)
  for (const d of days.slice(0, 6)) {
    assert.equal(write(s, d).week.amount, 0, `${d}에는 아직 없음`);
  }
  assert.equal(canEarnWeek(s, days[6]), false, '일요일 일기를 쓰기 전에는 7일이 안 채워짐');
  const sunday = write(s, days[6]);
  assert.equal(sunday.week.amount, AMOUNT.week);
  assert.equal(write(s, days[6], 'extra').week.amount, 0, '같은 일요일에 또 써도 한 번만');
  assert.equal(balance(s), 7 * AMOUNT.diary + AMOUNT.week);
  // 다음 주에 하루를 빼먹으면 없음
  for (const d of weekDays('2026-10-21').slice(0, 5)) write(s, d);
  assert.equal(write(s, '2026-10-25').week.amount, 0, '다음 주는 5일만 썼으니 없음');
});

test('주간 정산: 월요일에 지난주 것이 들어옴', () => {
  const s = state({ parent: { payout: 'weekly' } });
  earnDiary(s, '2026-10-14', 'd1'); // 수요일
  earnPolish(s, '2026-10-14', 'd1');
  assert.equal(balance(s), 0);
  assert.equal(pendingTotal(s), 500);
  assert.equal(settle(s, '2026-10-18'), 0, '같은 주 일요일에는 아직');
  assert.equal(settle(s, '2026-10-19'), 500, '다음 주 월요일');
  assert.equal(balance(s), 500);
  earnDiary(s, '2026-10-19', 'd2');
  assert.equal(settleAll(s), 300, '매일 지급으로 돌아가면 바로 넣음');
});

test('용돈 받기: 1,000원부터, 잔액 전부가 영수증이 되고, 취소하면 돌아옴', () => {
  const s = state();
  for (let d = 1; d <= 3; d++) earnDiary(s, `2026-10-0${d}`, `d${d}`);
  assert.equal(balance(s), 900);
  assert.equal(cashOut(s, '2026-10-04'), null, '1,000원이 안 되면 못 받음');
  earnPolish(s, '2026-10-03', 'd3');
  assert.equal(balance(s), 1100);
  assert.ok(balance(s) >= MIN_CASHOUT);
  const r = cashOut(s, '2026-10-04');
  assert.equal(r.amount, -1100);
  assert.equal(balance(s), 0);
  assert.equal(owedTotal(s), 1100);
  assert.equal(cancelCashOut(s, r.id), true);
  assert.equal(balance(s), 1100, '취소하면 용돈이 다시 지갑으로');
  assert.equal(owedTotal(s), 0);
  assert.equal(receipts(s).length, 1, '취소한 영수증도 기록으로 남음');
});

test('영수증: 보호자가 줬어요로 표시하면 취소할 수 없고, 되돌릴 수 있음', () => {
  const s = state();
  for (let d = 1; d <= 4; d++) earnDiary(s, `2026-10-0${d}`, `d${d}`);
  earnPolish(s, '2026-10-01', 'd1');
  const r = cashOut(s, '2026-10-05');
  assert.equal(markGiven(s, r.id, true), true);
  assert.equal(givenTotal(s), 1400);
  assert.equal(owedTotal(s), 0);
  assert.equal(cancelCashOut(s, r.id), false, '전해 준 영수증은 취소 못 함');
  assert.equal(markGiven(s, r.id, false), true, '잘못 눌렀으면 되돌림');
  assert.equal(owedTotal(s), 1400);
  assert.equal(balance(s), 0);
});

test('보호자는 용돈을 주거나 뺄 수 없다: 그런 함수가 없음', () => {
  const names = Object.keys(rewards);
  const allowed = new Set(['AMOUNT', 'MIN_CASHOUT', 'balance', 'pendingTotal', 'earnedOn', 'canEarnDiary', 'canEarnPolish', 'weekComplete', 'canEarnWeek',
    'earnDiary', 'earnPolish', 'earnWeek', 'settle', 'settleAll', 'canCashOut', 'cashOut', 'receipts', 'cancelCashOut', 'markGiven',
    'owedTotal', 'givenTotal', 'writtenDaysThisWeek', 'daysWritten']);
  assert.deepEqual(names.filter((n) => !allowed.has(n)), [], '새 함수를 더했다면 보호자가 용돈을 바꾸는 함수가 아닌지 확인하고 이 목록에 더하세요');
});

test('선물 순서표: 75개, 모두 그림이 있고, 겹치지 않고, 처음부터 가진 것과 안 겹침', () => {
  assert.equal(GIFTS.length, 75);
  const seen = new Set();
  for (const g of GIFTS) {
    const key = `${g.kind}:${g.id}`;
    assert.ok(!seen.has(key), `겹침: ${key}`);
    seen.add(key);
    if (g.kind === 'sticker') { assert.ok(STICKERS[g.id], `스티커 그림 없음: ${g.id}`); assert.ok(!FREE.stickers.includes(g.id)); }
    if (g.kind === 'cover') { assert.ok(COVERS[g.id], `표지 그림 없음: ${g.id}`); assert.ok(!FREE.covers.includes(g.id)); }
    if (g.kind === 'font') { assert.ok(FONTS[g.id], `글꼴 없음: ${g.id}`); assert.ok(!FREE.fonts.includes(g.id)); }
    if (g.kind === 'frame') assert.ok(FRAMES[g.id], `테두리 없음: ${g.id}`);
  }
  // 그려 둔 스티커와 표지, 글꼴은 하나도 빠짐없이 선물로 나옴
  for (const id of Object.keys(STICKERS)) assert.ok(FREE.stickers.includes(id) || seen.has(`sticker:${id}`), `선물에 없는 스티커: ${id}`);
  for (const id of Object.keys(COVERS)) assert.ok(FREE.covers.includes(id) || seen.has(`cover:${id}`), `선물에 없는 표지: ${id}`);
  for (const id of Object.keys(FONTS)) assert.ok(FREE.fonts.includes(id) || seen.has(`font:${id}`), `선물에 없는 글꼴: ${id}`);
  // 첫 선물은 스티커
  assert.equal(GIFTS[0].kind, 'sticker');
});

test('선물: 일기를 쓴 날 3일마다 하나, 같은 날 여러 편은 하루, 순서는 늘 같음', () => {
  const s = state();
  assert.equal(GIFT_EVERY, 3);
  assert.equal(write(s, '2026-10-01').gifts.length, 0);
  assert.equal(write(s, '2026-10-01', 'again').gifts.length, 0, '같은 날 또 써도 하루');
  assert.equal(write(s, '2026-10-02').gifts.length, 0);
  assert.equal(daysToNextGift(s), 1);
  const third = write(s, '2026-10-03');
  assert.equal(third.gifts.length, 1);
  assert.equal(third.gifts[0].id, GIFTS[0].id);
  assert.ok(s.owned.stickers.includes(GIFTS[0].id));
  assert.equal(third.gifts[0].diaryId, 'd-2026-10-03-3');
  assert.equal(daysToNextGift(s), 3);
  for (const d of ['2026-10-04', '2026-10-05']) write(s, d);
  const sixth = write(s, '2026-10-06');
  assert.equal(sixth.gifts[0].id, GIFTS[1].id, '두 번째 선물은 순서표의 다음 것');
  assert.equal(s.gifts.log.length, 2);
});

test('선물: 일기를 지우고 다시 써도 두 번 주지 않고, 이미 가진 것은 건너뜀', () => {
  const s = state();
  s.owned.stickers.push(GIFTS[0].id, GIFTS[1].id); // 옛 문구점에서 산 것
  for (const d of ['2026-10-01', '2026-10-02']) write(s, d);
  const third = write(s, '2026-10-03');
  assert.equal(third.gifts[0].id, GIFTS[2].id, '가진 것 둘을 건너뛰고 세 번째');
  s.diaries = s.diaries.filter((x) => x.day !== '2026-10-03'); // 일기를 지움
  assert.equal(giftsDue(s), 0);
  assert.equal(write(s, '2026-10-03', 'redo').gifts.length, 0, '같은 날 다시 써도 선물은 그대로');
  assert.equal(s.gifts.earned, 1);
});

test('선물을 다 주면 더 줄 것이 없고 오류도 없음', () => {
  const s = state();
  s.gifts.next = GIFTS.length;
  for (let d = 1; d <= 3; d++) write(s, `2026-10-0${d}`);
  assert.equal(s.gifts.log.length, 0);
  assert.equal(s.gifts.earned, 1);
});

test('문구점이 없어질 때: 남은 옛 문구머니 500원마다 선물 하나, 한 번만, 옛 기록은 그대로', () => {
  const legacy = [{ amount: 2000 }, { amount: 2000 }, { amount: -3000 }, { amount: 1000 }]; // 잔액 2,000원
  const s = state({ legacy });
  const got = convertLegacy(s, '2026-10-22');
  assert.equal(got.length, 4);
  assert.ok(got.every((g) => g.legacy && !g.seen));
  assert.equal(s.wallet.ledger.length, 4, '옛 기록은 지우지 않음');
  assert.deepEqual(s.seen.legacyNotice, { shown: false });
  assert.equal(convertLegacy(s, '2026-10-22').length, 0, '두 번째는 없음');
  assert.equal(unseenLoose(s).length, 4);
  // 문구점을 안 쓰던 새 기기는 알림도 선물도 없음
  const fresh = state();
  assert.equal(convertLegacy(fresh, '2026-10-22').length, 0);
  assert.equal(fresh.seen.legacyNotice, undefined);
});

test('앱을 열 때 정리: 이미 쓴 날이 쌓여 있으면 선물을 줌', () => {
  const s = state();
  for (let d = 1; d <= 7; d++) s.diaries.push({ id: `d${d}`, day: `2026-10-0${d}` });
  const got = catchUp(s, '2026-10-22');
  assert.equal(got.length, 2, '7일이면 선물 2개');
  assert.ok(got.every((g) => g.diaryId === null));
  assert.equal(catchUp(s, '2026-10-22').length, 0);
  assert.equal(daysWritten(s), 7);
  assert.equal(giftInfo(got[0]).text, '해 스티커');
});

test('토리 말에 금액이 규칙과 같다', () => {
  assert.ok(LINES.bonusInfo.includes('200원'));
  assert.ok(LINES.bonusGot.includes('200원'));
  assert.ok(LINES.walletNeed.includes('1,000원'));
});

test('힌트: 3일 연속 힌트 없이 채우면 접어 볼지 묻고, 하루 한 번만 셈', () => {
  const h = defaultHints();
  const clean = { start: { filled: true, hintOpened: false }, middle: { filled: true, hintOpened: true }, end: { filled: false } };
  assert.deepEqual(recordPlan(h, clean, '2026-10-14'), []);
  assert.deepEqual(recordPlan(h, clean, '2026-10-14'), [], '같은 날 두 번째는 안 셈');
  assert.deepEqual(recordPlan(h, clean, '2026-10-15'), []);
  assert.deepEqual(recordPlan(h, clean, '2026-10-16'), ['start']);
  acceptFold(h, 'start');
  assert.equal(h.start.level, 2);
  unfold(h, 'start');
  assert.equal(h.start.level, 1);
  assert.equal(allFolded(h), false);
});

test('조사와 이름 부르기', () => {
  assert.equal(callName('민준'), '민준아');
  assert.equal(callName('지호'), '지호야');
  assert.equal(softName('민준'), '민준이');
  assert.equal(softName('지호'), '지호');
  assert.equal(josa('책', '으로/로'), '으로');
  assert.equal(josa('연필', '으로/로'), '로', 'ㄹ 받침은 로');
  assert.equal(withJosa('친구', '이랑/랑'), '친구랑');
  assert.equal(fill('맞아, 책에서는 ‘{right}’{j:right:으로/로} 써.', { right: '됐다' }), '맞아, 책에서는 ‘됐다’로 써.');
  assert.equal(fill('{soft} 왔구나!', { soft: '민준이' }), '민준이 왔구나!');
});

test('날짜: 주 시작은 월요일, 밤을 넘는 쉬는 시간', () => {
  assert.equal(weekStart('2026-10-18'), '2026-10-12');
  assert.equal(weekStart('2026-10-19'), '2026-10-19');
  assert.equal(inTimeRange('21:00', '07:00', new Date(2026, 9, 16, 22, 30)), true);
  assert.equal(inTimeRange('21:00', '07:00', new Date(2026, 9, 16, 12, 0)), false);
});
