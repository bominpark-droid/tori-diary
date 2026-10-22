// 꾸미기 시험: 스티커 위치와 크기 계산(js/decor.js), 일기 쪽 글꼴(js/data/fonts.js)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_STICKERS, SIZE_STEPS, DEFAULT_SIZE, EDGE,
  clampPos, clampSize, spotOf, settle, addSticker, moveSticker, resizeSticker, removeSticker, nextOffset,
} from '../js/decor.js';
import { FONTS, pageFont } from '../js/data/fonts.js';

test('위치는 쪽 가장자리 안으로 들어온다', () => {
  assert.equal(clampPos(-3), EDGE);
  assert.equal(clampPos(9), 1 - EDGE);
  assert.equal(clampPos(0.5), 0.5);
  assert.equal(clampPos(NaN), 0.5);
  assert.equal(clampPos(undefined), 0.5);
});

test('크기 단계는 0부터 끝 단계 사이', () => {
  assert.equal(clampSize(-2), 0);
  assert.equal(clampSize(99), SIZE_STEPS.length - 1);
  assert.equal(clampSize(undefined), DEFAULT_SIZE);
  assert.equal(clampSize(1.5), DEFAULT_SIZE);
  assert.ok(SIZE_STEPS.every((v, i) => i === 0 || v > SIZE_STEPS[i - 1]), '단계는 점점 커져야 해요');
});

test('예전 스티커(slot만 있음)는 위쪽 한 줄 자리에 보이고, 기록은 바뀌지 않는다', () => {
  const old = [{ id: 'star', slot: 0 }, { id: 'heart', slot: 3 }];
  const a = spotOf(old[0]);
  const b = spotOf(old[1]);
  assert.ok(a.x < b.x, '자리 번호가 클수록 오른쪽');
  assert.equal(a.y, b.y);
  assert.equal(a.s, DEFAULT_SIZE);
  assert.deepEqual(old, [{ id: 'star', slot: 0 }, { id: 'heart', slot: 3 }]);
  // 만지면 위치가 생기고, 예전 slot 값은 지우지 않는다
  const moved = moveSticker(old, 1, 0.4, 0.6);
  assert.deepEqual(moved[1], { id: 'heart', slot: 3, x: 0.4, y: 0.6, s: DEFAULT_SIZE });
  assert.equal(moved[0].x, a.x, '건드리지 않은 스티커도 있던 자리 그대로');
});

test('스티커 붙이기, 옮기기, 크기 바꾸기, 떼기', () => {
  let list = addSticker([], 'star', 0.3, 0.2);
  assert.deepEqual(list, [{ id: 'star', x: 0.3, y: 0.2, s: DEFAULT_SIZE }]);
  list = addSticker(list, 'star', 0.9999, -5); // 같은 스티커를 또 붙일 수 있고, 쪽 밖으로는 못 나간다
  assert.equal(list.length, 2);
  assert.equal(list[1].x, 1 - EDGE);
  assert.equal(list[1].y, EDGE);
  list = moveSticker(list, 0, 0.7, 0.8);
  assert.deepEqual([list[0].x, list[0].y], [0.7, 0.8]);
  list = resizeSticker(list, 0, 1);
  assert.equal(list[0].s, DEFAULT_SIZE + 1);
  for (let i = 0; i < 10; i++) list = resizeSticker(list, 0, 1);
  assert.equal(list[0].s, SIZE_STEPS.length - 1, '가장 큰 단계를 넘지 않는다');
  for (let i = 0; i < 10; i++) list = resizeSticker(list, 0, -1);
  assert.equal(list[0].s, 0, '가장 작은 단계 아래로 내려가지 않는다');
  list = removeSticker(list, 0);
  assert.equal(list.length, 1);
  assert.equal(list[0].x, 1 - EDGE);
});

test('없는 번호를 만져도 다른 스티커가 바뀌지 않는다', () => {
  const list = [{ id: 'star', x: 0.5, y: 0.5, s: 2 }];
  assert.deepEqual(moveSticker(list, 5, 0.1, 0.1), list);
  assert.deepEqual(resizeSticker(list, 5, 1), list);
  assert.deepEqual(removeSticker(list, 5), list);
});

test('스티커는 한 쪽에 정해진 개수까지만 붙는다', () => {
  let list = [];
  for (let i = 0; i < MAX_STICKERS; i++) list = addSticker(list, 'star', 0.5, 0.5);
  assert.equal(list.length, MAX_STICKERS);
  assert.equal(addSticker(list, 'star', 0.5, 0.5), null);
  assert.equal(removeSticker(list, 0).length, MAX_STICKERS - 1);
});

test('settle은 빈 목록과 없는 값을 다룬다', () => {
  assert.deepEqual(settle(undefined), []);
  assert.deepEqual(settle(null), []);
  const [st] = settle([{ id: 'star' }]);
  assert.ok(Number.isFinite(st.x) && Number.isFinite(st.y) && st.s === DEFAULT_SIZE);
});

test('새 스티커를 겹치지 않게 비껴 놓되 멀리 가지는 않는다', () => {
  const seen = new Set();
  for (let n = 0; n < 6; n++) {
    const { dx, dy } = nextOffset(n);
    assert.ok(Math.abs(dx) <= 0.1 && Math.abs(dy) <= 0.06 + 1e-9);
    seen.add(`${dx.toFixed(3)},${dy.toFixed(3)}`);
  }
  assert.equal(seen.size, 6, '여섯 개까지는 자리가 모두 다르다');
});

test('일기 쪽 글꼴: 본문은 기본 글씨이면 그대로, 선물 글꼴이면 바뀐다', () => {
  assert.equal(pageFont('basic', { body: true }), '', '기본 글씨는 본문 글꼴(돋움체)을 그대로 둔다');
  assert.equal(pageFont('nope', { body: true }), '');
  for (const id of Object.keys(FONTS)) {
    const title = pageFont(id);
    assert.ok(title.includes(FONTS[id].family), `${id} 제목 글꼴`);
    assert.ok(title.includes(`--fscale:${FONTS[id].scale}`), `${id} 제목 크기 배율`);
    if (id !== 'basic') {
      const body = pageFont(id, { body: true });
      assert.ok(body.includes(FONTS[id].family) && body.includes('var(--font-body)'), `${id} 본문은 선물 글꼴 다음에 본문 글꼴`);
    }
  }
});

test('읽기 쉬운 글꼴로 보기가 켜져 있으면 모두 기본 글꼴', () => {
  for (const id of Object.keys(FONTS)) {
    assert.equal(pageFont(id, { plain: true, body: true }), '');
    assert.ok(pageFont(id, { plain: true }).includes(FONTS.basic.family));
    assert.ok(pageFont(id, { plain: true }).includes('--fscale:1'));
  }
});
