// 일기 쪽 꾸미기 계산 (docs/DESIGN.md 4.3 ⑥). 화면과 상관없는 순수한 계산만 둡니다.
// 스티커는 일기 쪽 어디에나 붙일 수 있습니다: { id, x, y, s }
//   x, y: 쪽 안의 위치(0~1, 스티커 한가운데 기준. 가로는 쪽 너비, 세로는 쪽 높이에 대한 비율이라 화면 크기가 달라도 같은 곳에 붙습니다)
//   s: 크기 단계(0~4, 기본 2)
// 예전 기록의 스티커는 { id, slot }(위쪽 4자리)만 있습니다. 지우지 않고, 위치가 없으면 slot 자리로 보여 줍니다.

export const MAX_STICKERS = 12;
// 크기 단계별 스티커 너비 (쪽 너비에 대한 비율)
export const SIZE_STEPS = [0.11, 0.15, 0.2, 0.27, 0.36];
export const DEFAULT_SIZE = 2;
// 쪽 가장자리에서 이만큼은 비워 둡니다(스티커가 쪽 밖으로 사라지지 않게)
export const EDGE = 0.04;

export function clampPos(v) {
  const n = Number.isFinite(v) ? v : 0.5;
  return Math.min(1 - EDGE, Math.max(EDGE, n));
}

export function clampSize(s) {
  const n = Number.isInteger(s) ? s : DEFAULT_SIZE;
  return Math.min(SIZE_STEPS.length - 1, Math.max(0, n));
}

// 스티커 하나의 보이는 자리. 위치가 없는 예전 스티커는 위쪽 한 줄(slot 0~3)에 둡니다.
export function spotOf(st) {
  const hasPos = Number.isFinite(st.x) && Number.isFinite(st.y);
  const slot = Number.isInteger(st.slot) ? st.slot : 0;
  return {
    x: clampPos(hasPos ? st.x : 0.14 + 0.24 * Math.min(3, Math.max(0, slot))),
    y: clampPos(hasPos ? st.y : 0.09),
    s: clampSize(st.s),
  };
}

// 편집하기 전에 모든 스티커에 위치와 크기를 채웁니다(예전 스티커가 있던 자리 그대로).
export function settle(list) {
  return (list || []).map((st) => ({ ...st, ...spotOf(st) }));
}

// 새 스티커를 (x, y)에 붙인 목록. 가득 찼으면 null.
export function addSticker(list, id, x = 0.5, y = 0.5) {
  const cur = settle(list);
  if (cur.length >= MAX_STICKERS) return null;
  return [...cur, { id, x: clampPos(x), y: clampPos(y), s: DEFAULT_SIZE }];
}

export function moveSticker(list, i, x, y) {
  const cur = settle(list);
  if (!cur[i]) return cur;
  cur[i] = { ...cur[i], x: clampPos(x), y: clampPos(y) };
  return cur;
}

// delta: +1 크게, -1 작게. 더 못 바꾸면 그대로.
export function resizeSticker(list, i, delta) {
  const cur = settle(list);
  if (!cur[i]) return cur;
  cur[i] = { ...cur[i], s: clampSize(cur[i].s + delta) };
  return cur;
}

export function removeSticker(list, i) {
  return settle(list).filter((_, k) => k !== i);
}

// 새 스티커를 붙일 때 겹치지 않게 조금씩 비껴 놓는 자리 (n번째 스티커).
// dx, dy 모두 쪽 너비에 대한 비율입니다(세로를 쪽 높이로 재면 긴 글에서 너무 멀리 비껴 놓게 되므로).
export function nextOffset(n) {
  const k = n % 6;
  return { dx: ((k % 3) - 1) * 0.1, dy: (Math.floor(k / 3) - 0.5) * 0.12 };
}
