// 3칸 계획의 힌트 단계와 떼기 규칙 (docs/DESIGN.md 4.3 ②)
// 칸마다 따로: 1단계 묻는 말 + <힌트> 단추, 2단계 한 줄 힌트만, 3단계 칸 접힘.
// 한 칸을 3일 연속 힌트 없이 채우면 접어 볼지 묻고, 접는 것은 아이가 정합니다.

export const PARTS = ['start', 'middle', 'end'];
export const FOLD_AFTER_DAYS = 3;

export function defaultHints() {
  return {
    start: { level: 1, clean: 0, lastDay: null },
    middle: { level: 1, clean: 0, lastDay: null },
    end: { level: 1, clean: 0, lastDay: null },
  };
}

// 하루 한 번(그날 첫 계획)만 셉니다. 접어 볼지 물어볼 칸 목록을 돌려줍니다.
export function recordPlan(hints, results, day) {
  const offers = [];
  for (const part of PARTS) {
    const h = hints[part];
    const r = results[part];
    if (!h || !r || h.level >= 3) continue;
    if (h.lastDay === day) continue;
    h.lastDay = day;
    if (r.filled && !r.hintOpened) h.clean += 1;
    else h.clean = 0;
    if (h.clean >= FOLD_AFTER_DAYS) offers.push(part);
  }
  return offers;
}

export function acceptFold(hints, part) {
  const h = hints[part];
  if (!h) return;
  h.level = Math.min(3, h.level + 1);
  h.clean = 0;
}

export function declineFold(hints, part) {
  const h = hints[part];
  if (h) h.clean = 0;
}

export function unfold(hints, part) {
  const h = hints[part];
  if (!h) return;
  h.level = Math.max(1, h.level - 1);
  h.clean = 0;
}

export function allFolded(hints) {
  return PARTS.every((p) => hints[p] && hints[p].level >= 3);
}
