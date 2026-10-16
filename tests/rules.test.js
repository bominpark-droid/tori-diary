// 문구머니, 힌트, 조사 규칙 테스트: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { balance, pendingTotal, earnDiary, earnBonus, canEarnBonus, settle, settleAll, buy, canBuy } from '../js/rewards.js';
import { defaultHints, recordPlan, acceptFold, unfold, allFolded } from '../js/hints.js';
import { josa, callName, softName, withJosa } from '../js/josa.js';
import { fill } from '../js/data/tori-lines.js';
import { ITEMS, FREE, itemById } from '../js/data/shop-items.js';
import { STICKERS } from '../js/art/stickers.js';
import { COVERS } from '../js/art/covers.js';
import { weekStart, inTimeRange } from '../js/dates.js';

function state(over = {}) {
  return {
    parent: { helper: true, payout: 'daily', ...(over.parent || {}) },
    wallet: { ledger: [] },
    owned: { covers: [...FREE.covers], stickers: [...FREE.stickers], fonts: [...FREE.fonts], frames: [], items: [] },
    goal: null,
    diaries: [],
  };
}

test('일기 완성 1,000원은 그날 첫 일기에만', () => {
  const s = state();
  assert.deepEqual(earnDiary(s, '2026-10-16', 'd1'), { amount: 1000, pending: false });
  assert.deepEqual(earnDiary(s, '2026-10-16', 'd2'), { amount: 0, pending: false });
  assert.equal(earnDiary(s, '2026-10-17', 'd3').amount, 1000);
  assert.equal(balance(s), 2000);
});

test('다듬기 보너스는 하루 한 번, 도우미를 끄면 없음', () => {
  const s = state();
  assert.equal(earnBonus(s, '2026-10-16', 'd1').amount, 1000);
  assert.equal(earnBonus(s, '2026-10-16', 'd1').amount, 0);
  const off = state({ parent: { helper: false } });
  assert.equal(canEarnBonus(off, '2026-10-16'), false);
  assert.equal(earnBonus(off, '2026-10-16', 'd1').amount, 0);
});

test('주간 정산: 월요일에 지난주 것이 들어옴', () => {
  const s = state({ parent: { payout: 'weekly' } });
  earnDiary(s, '2026-10-14', 'd1'); // 수요일
  earnBonus(s, '2026-10-14', 'd1');
  assert.equal(balance(s), 0);
  assert.equal(pendingTotal(s), 2000);
  assert.equal(settle(s, '2026-10-18'), 0, '같은 주 일요일에는 아직');
  assert.equal(settle(s, '2026-10-19'), 2000, '다음 주 월요일');
  assert.equal(balance(s), 2000);
  earnDiary(s, '2026-10-19', 'd2');
  assert.equal(settleAll(s), 1000, '매일 지급으로 돌아가면 바로 넣음');
});

test('문구점: 잔액이 있어야 사고, 두 번 못 사고, 받은 것이 생김', () => {
  const s = state();
  for (let d = 1; d <= 3; d++) earnDiary(s, `2026-10-0${d}`, `d${d}`);
  const pack = itemById('pack-weather');
  assert.equal(canBuy(s, pack), true);
  assert.equal(buy(s, pack, '2026-10-04'), true);
  assert.equal(balance(s), 0);
  assert.ok(s.owned.stickers.includes('w-sun'));
  assert.equal(buy(s, pack, '2026-10-04'), false);
  s.goal = 'cover-grid';
  earnDiary(s, '2026-10-05', 'x');
  assert.equal(buy(s, itemById('cover-grid'), '2026-10-05'), false, '돈이 모자라면 못 삼');
});

test('상품표: 22개, 160,000원, 그림이 모두 있음', () => {
  assert.equal(ITEMS.length, 22);
  assert.equal(ITEMS.reduce((a, i) => a + i.price, 0), 160000);
  for (const item of ITEMS) {
    for (const id of item.grants.stickers || []) assert.ok(STICKERS[id], `스티커 그림 없음: ${id}`);
    for (const id of item.grants.covers || []) assert.ok(COVERS[id], `표지 그림 없음: ${id}`);
  }
  for (const id of FREE.covers) assert.ok(COVERS[id]);
  for (const id of FREE.stickers) assert.ok(STICKERS[id]);
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
