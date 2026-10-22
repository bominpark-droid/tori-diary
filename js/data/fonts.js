// 제목 글꼴 (토리의 선물로 하나씩 늘어납니다. 제목과 책등에만 씁니다. 일기 본문 글꼴은 바꾸지 않습니다. docs/DESIGN.md 3.3)
// gf: Google Fonts에서 불러올 이름. scale: 글꼴마다 크기 차이를 맞추는 배율.

export const FONTS = {
  basic: { name: '기본 글씨', family: "'Jua'", gf: null, scale: 1 },
  gamja: { name: '감자꽃 글씨', family: "'Gamja Flower'", gf: 'Gamja+Flower', scale: 1.08 },
  gaegu: { name: '개구쟁이 글씨', family: "'Gaegu'", gf: 'Gaegu:wght@700', scale: 1.12 },
  dongle: { name: '동글동글 글씨', family: "'Dongle'", gf: 'Dongle:wght@700', scale: 1.5 },
  bold: { name: '굵은 제목 글씨', family: "'Black Han Sans'", gf: 'Black+Han+Sans', scale: 0.95 },
};

const FALLBACK = "'Jua', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
const loaded = new Set();

export function loadFont(id) {
  const f = FONTS[id];
  if (!f || !f.gf || loaded.has(id) || typeof document === 'undefined') return;
  loaded.add(id);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${f.gf}&display=swap`;
  document.head.appendChild(link);
}

// plain이 참이면(읽기 쉬운 글꼴로 보기) 기본 글꼴을 씁니다.
export function fontStyle(id, plain = false) {
  const f = (!plain && FONTS[id]) || FONTS.basic;
  if (!plain) loadFont(id);
  return { fontFamily: `${f.family}, ${FALLBACK}`, fontSize: `${f.scale}em` };
}
