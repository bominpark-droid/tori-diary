// 토리의 선물 순서표 (docs/DESIGN.md 7절)
// 일기를 쓴 날이 GIFT_EVERY일 쌓일 때마다 토리가 아래 순서대로 하나씩 선물합니다.
// 사고파는 것이 아닙니다. 뽑기나 확률이 없고, 순서는 늘 같습니다(스티커 4개마다 표지, 글씨, 테두리 중 하나).
// 새 선물을 넣을 때: 그림은 js/art/stickers.js 또는 js/art/covers.js에 그리고, 아래 GIFTS 맨 뒤에 한 줄을 더합니다.
// 이미 가진 것은 건너뛰고 다음 것을 줍니다.

// 처음부터 가지고 있는 것
export const FREE = {
  covers: ['spring', 'rain', 'winter', 'sunset', 'space', 'forest'],
  stickers: ['star', 'heart', 'flower', 'tori-face'],
  fonts: ['basic'],
};

// 일기를 쓴 날이 몇 일 쌓일 때마다 선물이 하나 오는지 (여러 편을 써도 하루는 하루로 셉니다)
export const GIFT_EVERY = 3;

// 예전 문구점의 남은 문구머니를 선물로 바꿀 때, 이 금액마다 선물 하나 (옛 스티커 한 개 값)
export const LEGACY_PER_GIFT = 500;

const stickers = (...ids) => ids.map((id) => ({ kind: 'sticker', id }));
const cover = (id) => ({ kind: 'cover', id });
const font = (id) => ({ kind: 'font', id });
const frame = (id) => ({ kind: 'frame', id });

export const GIFTS = [
  ...stickers('w-sun', 'w-cloud', 'w-rain', 'w-snow'), cover('grid'),
  ...stickers('w-rainbow', 'w-wind', 's-blossom', 's-watermelon'), font('gamja'),
  ...stickers('s-maple', 's-snowman', 's-sprout', 's-acorn'), cover('dots'),
  ...stickers('f-icecream', 'f-apple', 'f-donut', 'f-milk'), font('gaegu'),
  ...stickers('f-gimbap', 'f-cookie', 'c-pencil', 'c-bag'), cover('study'),
  ...stickers('c-book', 'c-crayon', 'c-ruler', 'c-eraser'), font('dongle'),
  ...stickers('p-ball', 'p-rope', 'p-bike', 'p-shoe'), cover('sea'),
  ...stickers('p-kite', 'p-medal', 'm-happy', 'm-excited'), font('bold'),
  ...stickers('m-wow', 'm-sleepy', 'm-sad', 'm-angry'), cover('firefly'),
  ...stickers('t-wave', 't-read', 't-happy', 't-sleepy'), cover('bubble'),
  ...stickers('t-listen', 't-wow', 'a-rabbit', 'a-squirrel'), cover('cloudlib'),
  ...stickers('a-owl', 'a-hedgehog', 'a-fox', 'a-bear'), frame('cloud'),
  ...stickers('big-tori-books', 'g-star', 'g-heart', 'g-crown'), cover('spacelib'),
  ...stickers('g-gem', 'g-ribbon', 'g-twinkle', 'x-wingbook'), frame('space'),
  ...stickers('x-plane', 'x-bookmark', 'x-planetbook', 'x-astro', 'x-telescope'),
];

// 선물 종류 이름 (화면 글)
export const GIFT_KIND_NAME = { sticker: '스티커', cover: '표지', font: '제목 글씨', frame: '쪽 테두리' };
