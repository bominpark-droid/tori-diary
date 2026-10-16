// 문구점 상품표 (docs/DESIGN.md 7절)
// 가격 단계: 3,000 / 5,000 / 8,000 / 12,000 / 18,000원. 22개, 합계 160,000원.
// 새 상품을 넣을 때: 아래 ITEMS에 한 줄을 더하고, 그림은 js/art/covers.js 또는 js/art/stickers.js에 그립니다.
// isNew: true 를 붙이면 문구점에 <새로 왔어> 표시가 붙습니다(한 번에 3~4개까지만 권장).
// 뽑기, 확률, 한정 판매, 카운트다운은 넣지 않습니다.

// 처음부터 가지고 있는 것 (무료)
export const FREE = {
  covers: ['spring', 'rain', 'winter', 'sunset', 'space', 'forest'],
  stickers: ['star', 'heart', 'flower', 'tori-face'],
  fonts: ['basic'],
};

export const ITEMS = [
  // ---------- 1단계 3,000원 ----------
  { id: 'pack-weather', kind: 'stickers', tier: 1, price: 3000, name: '날씨 스티커', desc: '해, 구름, 비, 눈송이, 무지개, 바람',
    grants: { stickers: ['w-sun', 'w-cloud', 'w-rain', 'w-snow', 'w-rainbow', 'w-wind'] } },
  { id: 'pack-season', kind: 'stickers', tier: 1, price: 3000, name: '계절 스티커', desc: '벚꽃, 수박, 단풍잎, 눈사람, 새싹, 도토리',
    grants: { stickers: ['s-blossom', 's-watermelon', 's-maple', 's-snowman', 's-sprout', 's-acorn'] } },
  { id: 'pack-snack', kind: 'stickers', tier: 1, price: 3000, name: '간식 스티커', desc: '아이스크림, 사과, 도넛, 우유, 김밥, 쿠키',
    grants: { stickers: ['f-icecream', 'f-apple', 'f-donut', 'f-milk', 'f-gimbap', 'f-cookie'] } },
  { id: 'pack-school', kind: 'stickers', tier: 1, price: 3000, name: '학교 스티커', desc: '연필, 책가방, 공책, 크레파스, 자, 지우개',
    grants: { stickers: ['c-pencil', 'c-bag', 'c-book', 'c-crayon', 'c-ruler', 'c-eraser'] } },
  { id: 'pack-sport', kind: 'stickers', tier: 1, price: 3000, name: '운동 스티커', desc: '축구공, 줄넘기, 자전거, 운동화, 연, 메달',
    grants: { stickers: ['p-ball', 'p-rope', 'p-bike', 'p-shoe', 'p-kite', 'p-medal'] } },
  { id: 'pack-mood', kind: 'stickers', tier: 1, price: 3000, name: '기분 얼굴 스티커', desc: '웃음, 신남, 놀람, 졸림, 슬픔, 화남',
    grants: { stickers: ['m-happy', 'm-excited', 'm-wow', 'm-sleepy', 'm-sad', 'm-angry'] } },

  // ---------- 2단계 5,000원 ----------
  { id: 'pack-tori', kind: 'stickers', tier: 2, price: 5000, name: '토리 스티커', desc: '인사, 책 읽기, 기쁨, 졸림, 음악, 놀람',
    grants: { stickers: ['t-wave', 't-read', 't-happy', 't-sleepy', 't-listen', 't-wow'] } },
  { id: 'pack-forest', kind: 'stickers', tier: 2, price: 5000, name: '숲속 친구 스티커', desc: '토끼, 다람쥐, 부엉이, 고슴도치, 여우, 곰',
    grants: { stickers: ['a-rabbit', 'a-squirrel', 'a-owl', 'a-hedgehog', 'a-fox', 'a-bear'] } },
  { id: 'cover-grid', kind: 'cover', tier: 2, price: 5000, name: '모눈 공책 표지', desc: '깔끔한 모눈 무늬',
    grants: { covers: ['grid'] } },
  { id: 'cover-dots', kind: 'cover', tier: 2, price: 5000, name: '구름 땡땡이 표지', desc: '하늘색 구름 땡땡이',
    grants: { covers: ['dots'] } },
  { id: 'font-gamja', kind: 'font', tier: 2, price: 5000, name: '감자꽃 글씨', desc: '제목과 책등에 쓰는 손글씨',
    grants: { fonts: ['gamja'] } },
  { id: 'font-gaegu', kind: 'font', tier: 2, price: 5000, name: '개구쟁이 글씨', desc: '제목과 책등에 쓰는 장난스러운 글씨',
    grants: { fonts: ['gaegu'] } },

  // ---------- 3단계 8,000원 ----------
  { id: 'big-tori-books', kind: 'stickers', tier: 3, price: 8000, name: '큰 스티커: 책 더미 위의 토리', desc: '일기 쪽에 크게 붙는 스티커',
    grants: { stickers: ['big-tori-books'] } },
  { id: 'cover-study', kind: 'cover', tier: 3, price: 8000, name: '토리의 서재 표지', desc: '책장과 스탠드가 있는 토리 방',
    grants: { covers: ['study'] } },
  { id: 'cover-sea', kind: 'cover', tier: 3, price: 8000, name: '바닷속 도서관 표지', desc: '물고기와 책장이 있는 바닷속',
    grants: { covers: ['sea'] } },
  { id: 'font-dongle', kind: 'font', tier: 3, price: 8000, name: '동글동글 글씨', desc: '둥글둥글한 제목 글씨',
    grants: { fonts: ['dongle'] } },
  { id: 'font-bold', kind: 'font', tier: 3, price: 8000, name: '굵은 제목 글씨', desc: '힘 있는 제목 글씨',
    grants: { fonts: ['bold'] } },

  // ---------- 4단계 12,000원 ----------
  { id: 'pack-sparkle', kind: 'stickers', tier: 4, price: 12000, name: '반짝이 스티커', desc: '반짝반짝 빛나는 별, 하트, 왕관, 보석, 리본, 반짝',
    grants: { stickers: ['g-star', 'g-heart', 'g-crown', 'g-gem', 'g-ribbon', 'g-twinkle'] } },
  { id: 'cover-firefly', kind: 'cover', tier: 4, price: 12000, name: '반딧불 여름밤 표지', desc: '반딧불이가 느리게 날아다녀요',
    grants: { covers: ['firefly'] } },
  { id: 'cover-bubble', kind: 'cover', tier: 4, price: 12000, name: '비눗방울 놀이터 표지', desc: '비눗방울이 천천히 떠올라요',
    grants: { covers: ['bubble'] } },

  // ---------- 5단계 18,000원 ----------
  { id: 'set-cloud', kind: 'set', tier: 5, price: 18000, name: '구름 위 도서관 세트', desc: '표지, 쪽 테두리, 스티커 3개(날개 달린 책, 종이비행기, 무지개 책갈피)',
    grants: { covers: ['cloudlib'], frames: ['cloud'], stickers: ['x-wingbook', 'x-plane', 'x-bookmark'] } },
  { id: 'set-space', kind: 'set', tier: 5, price: 18000, name: '한밤의 우주 도서관 세트', desc: '표지, 쪽 테두리, 스티커 3개(행성 책, 우주복 토리, 망원경)',
    grants: { covers: ['spacelib'], frames: ['space'], stickers: ['x-planetbook', 'x-astro', 'x-telescope'] } },
];

export function itemById(id) {
  return ITEMS.find((i) => i.id === id) || null;
}

// 상품 미리보기에 쓸 그림 id
export function previewOf(item) {
  const g = item.grants || {};
  if (g.covers && g.covers.length) return { type: 'cover', id: g.covers[0] };
  if (g.fonts && g.fonts.length) return { type: 'font', id: g.fonts[0] };
  if (g.stickers && g.stickers.length) return { type: 'stickers', ids: g.stickers };
  return { type: 'none' };
}
