// 날짜 도우미. 날짜는 'YYYY-MM-DD'(기기 시간 기준) 글자로 저장합니다.

const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const DAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n) {
  return String(n).padStart(2, '0');
}

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

// 그 주 월요일
export function weekStart(key) {
  const d = fromKey(key);
  const dow = (d.getDay() + 6) % 7; // 월=0 … 일=6
  d.setDate(d.getDate() - dow);
  return dayKey(d);
}

export function weekDays(key) {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function daysBetween(a, b) {
  return Math.round((fromKey(b) - fromKey(a)) / 86400000);
}

export function koreanDate(key, withDay = true) {
  const d = fromKey(key);
  const base = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return withDay ? `${base} ${DAY_NAMES[d.getDay()]}` : base;
}

export function shortDay(key) {
  return DAY_SHORT[fromKey(key).getDay()];
}

export function monthLabel(key) {
  const d = fromKey(key);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

// 아침(5~11시), 오후(11~17시), 저녁(17~21시), 밤(21~5시)
export function partOfDay(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

// '21:00' 같은 시각 두 개 사이에 지금이 있는지 (밤을 넘어가는 구간도 됨)
export function inTimeRange(start, end, date = new Date()) {
  const toMin = (t) => {
    const [hh, mm] = String(t).split(':').map(Number);
    return hh * 60 + (mm || 0);
  };
  const now = date.getHours() * 60 + date.getMinutes();
  const s = toMin(start);
  const e = toMin(end);
  if (s === e) return false;
  return s < e ? now >= s && now < e : now >= s || now < e;
}
