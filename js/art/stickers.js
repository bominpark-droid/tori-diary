// 스티커 그림 (SVG, 100×100). 하얀 오림 테두리는 css/art.css의 .sticker가 그립니다.
// 새 스티커: STICKERS에 하나 더하고, 파는 묶음은 js/data/shop-items.js의 grants에 id를 넣습니다.

import { toriSVG } from '../tori.js';

let n = 0;
const gid = () => `st${++n}`;

const O = 'stroke="#4A3F3A" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"';
const INK = '#3A302C';

// 귀여운 얼굴 (x, y 가운데, s 크기)
const face = (x, y, s = 1, mood = 'smile') => {
  const e = 5.5 * s;
  const eyes =
    mood === 'happy'
      ? `<path d="M${x - e - 2.5 * s} ${y} q ${2.5 * s} ${-3 * s} ${5 * s} 0 M${x + e - 2.5 * s} ${y} q ${2.5 * s} ${-3 * s} ${5 * s} 0" stroke="${INK}" stroke-width="${1.8 * s}" fill="none" stroke-linecap="round"/>`
      : `<circle cx="${x - e}" cy="${y}" r="${1.9 * s}" fill="${INK}"/><circle cx="${x + e}" cy="${y}" r="${1.9 * s}" fill="${INK}"/>`;
  return `${eyes}<path d="M${x - 2.2 * s} ${y + 2.6 * s} q ${2.2 * s} ${2.4 * s} ${4.4 * s} 0" stroke="${INK}" stroke-width="${1.5 * s}" fill="none" stroke-linecap="round"/>
    <ellipse cx="${x - e - 2.4 * s}" cy="${y + 3.4 * s}" rx="${2.4 * s}" ry="${1.4 * s}" fill="#F49A95" opacity=".8"/><ellipse cx="${x + e + 2.4 * s}" cy="${y + 3.4 * s}" rx="${2.4 * s}" ry="${1.4 * s}" fill="#F49A95" opacity=".8"/>`;
};

const wrap = (inner, vb = '0 0 100 100') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

const starPath = (cx, cy, r1, r2, pts = 5) => {
  let d = '';
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = (Math.PI / pts) * i - Math.PI / 2;
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)} `;
  }
  return `${d}Z`;
};
const heartPath = 'M50 86 C 18 64, 8 44, 18 28 C 28 14, 46 18, 50 32 C 54 18, 72 14, 82 28 C 92 44, 82 64, 50 86 Z';

const moodFace = (bg, inner) =>
  wrap(`<circle cx="50" cy="52" r="38" fill="${bg}" ${O}/>${inner}`);

const animal = (inner) => wrap(inner);

export const STICKERS = {
  // ---------- 기본 (무료) ----------
  star: { name: '별', pack: 'basic', svg: () => wrap(`<path d="${starPath(50, 52, 40, 18)}" fill="#FFD25E" ${O}/>${face(50, 54, 1.1)}`) },
  heart: { name: '하트', pack: 'basic', svg: () => wrap(`<path d="${heartPath}" fill="#FF8FA3" ${O}/>${face(50, 50, 1.05)}`) },
  flower: {
    name: '꽃', pack: 'basic',
    svg: () => wrap(`${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="50" cy="26" rx="15" ry="19" transform="rotate(${a} 50 50)" fill="#FFB6C8" ${O}/>`).join('')}<circle cx="50" cy="50" r="16" fill="#FFE07A" ${O}/>${face(50, 50, 0.8)}`),
  },
  'tori-face': { name: '토리 얼굴', pack: 'basic', svg: () => toriSVG('smile', { fuzzy: false, headOnly: true }).replace('viewBox="0 0 220 260"', 'viewBox="4 2 212 166"') },

  // ---------- 날씨 ----------
  'w-sun': {
    name: '해', pack: 'weather',
    svg: () => wrap(`<g stroke="#F4A93A" stroke-width="6" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => `<path d="M50 8 V18" transform="rotate(${i * 45} 50 50)"/>`).join('')}</g><circle cx="50" cy="50" r="26" fill="#FFD25E" ${O}/>${face(50, 50, 1.1)}`),
  },
  'w-cloud': {
    name: '구름', pack: 'weather',
    svg: () => wrap(`<path d="M24 74 C 8 74, 8 52, 24 50 C 22 34, 42 26, 52 38 C 58 26, 80 28, 80 46 C 96 46, 96 74, 78 74 Z" fill="#FFFFFF" ${O}/>${face(52, 58, 1)}`),
  },
  'w-rain': {
    name: '비', pack: 'weather',
    svg: () => wrap(`<path d="M24 60 C 8 60, 8 38, 24 36 C 22 20, 42 12, 52 24 C 58 12, 80 14, 80 32 C 96 32, 96 60, 78 60 Z" fill="#CFE3FF" ${O}/>${face(52, 44, 0.9)}
      <g fill="#6FA8F2" ${O}><path d="M30 70 q -5 9 0 12 q 5 -3 0 -12 Z"/><path d="M52 74 q -5 9 0 12 q 5 -3 0 -12 Z"/><path d="M74 70 q -5 9 0 12 q 5 -3 0 -12 Z"/></g>`),
  },
  'w-snow': {
    name: '눈송이', pack: 'weather',
    svg: () => wrap(`<g stroke="#7FB7F0" stroke-width="7" stroke-linecap="round">${[0, 60, 120].map((a) => `<path d="M50 12 V88" transform="rotate(${a} 50 50)"/>`).join('')}</g>
      <g stroke="#7FB7F0" stroke-width="5" stroke-linecap="round" fill="none">${[0, 60, 120, 180, 240, 300].map((a) => `<path d="M42 22 L50 30 L58 22" transform="rotate(${a} 50 50)"/>`).join('')}</g>
      <circle cx="50" cy="50" r="15" fill="#FFFFFF" ${O}/>${face(50, 50, 0.7)}`),
  },
  'w-rainbow': {
    name: '무지개', pack: 'weather',
    svg: () => wrap(`<g fill="none" stroke-width="9" stroke-linecap="round"><path d="M12 70 A 38 38 0 0 1 88 70" stroke="#FF8A8A"/><path d="M21 70 A 29 29 0 0 1 79 70" stroke="#FFC75E"/><path d="M30 70 A 20 20 0 0 1 70 70" stroke="#8ED68B"/><path d="M39 70 A 11 11 0 0 1 61 70" stroke="#7FB0FF"/></g>
      <path d="M2 76 C -2 66, 12 60, 18 66 C 22 58, 34 62, 32 72 C 38 74, 34 84, 26 82 H8 C 0 82, 0 78, 2 76 Z" fill="#fff" ${O}/><path d="M70 76 C 66 66, 80 60, 86 66 C 90 58, 102 62, 100 72 C 106 74, 102 84, 94 82 H76 C 68 82, 68 78, 70 76 Z" fill="#fff" ${O}/>`),
  },
  'w-wind': {
    name: '바람', pack: 'weather',
    svg: () => wrap(`<g fill="none" stroke="#8FC4E8" stroke-width="7" stroke-linecap="round"><path d="M12 38 H62 C 76 38, 76 18, 62 20"/><path d="M12 56 H78 C 92 56, 92 78, 78 76"/><path d="M20 72 H48"/></g>
      <g fill="#A7E0A0" ${O}><path d="M64 84 q 10 -12 22 -6 q -10 12 -22 6 Z"/></g>`),
  },

  // ---------- 계절 ----------
  's-blossom': {
    name: '벚꽃', pack: 'season',
    svg: () => wrap(`${[0, 72, 144, 216, 288].map((a) => `<path d="M50 50 C 36 34, 40 14, 50 20 C 60 14, 64 34, 50 50 Z" transform="rotate(${a} 50 50)" fill="#FFC9D6" ${O}/>`).join('')}<circle cx="50" cy="50" r="7" fill="#F27EA0" ${O}/>`),
  },
  's-watermelon': {
    name: '수박', pack: 'season',
    svg: () => wrap(`<path d="M10 40 A 40 40 0 0 0 90 40 Z" fill="#5DBB63" ${O}/><path d="M17 40 A 33 33 0 0 0 83 40 Z" fill="#FF7B85"/><path d="M17 40 H83" ${O}/>
      <g fill="${INK}"><ellipse cx="35" cy="52" rx="2" ry="3"/><ellipse cx="50" cy="58" rx="2" ry="3"/><ellipse cx="65" cy="52" rx="2" ry="3"/></g>${face(50, 45, 0.8)}`),
  },
  's-maple': {
    name: '단풍잎', pack: 'season',
    svg: () => wrap(`<path d="M50 8 L58 30 L74 22 L70 40 L90 42 L74 56 L80 70 L60 66 L54 80 H46 L40 66 L20 70 L26 56 L10 42 L30 40 L26 22 L42 30 Z" fill="#FF9248" ${O}/><path d="M50 80 V94" ${O}/>${face(50, 48, 0.9)}`),
  },
  's-snowman': {
    name: '눈사람', pack: 'season',
    svg: () => wrap(`<circle cx="50" cy="68" r="24" fill="#FFFFFF" ${O}/><circle cx="50" cy="34" r="17" fill="#FFFFFF" ${O}/>${face(50, 34, 0.9)}
      <path d="M50 37 l9 2 l-9 2 Z" fill="#FF9248"/><path d="M34 47 Q 50 54 66 47" stroke="#F25F5C" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M36 18 H64 L60 6 H40 Z" fill="#2F4A7A" ${O}/><g fill="${INK}"><circle cx="50" cy="62" r="2.4"/><circle cx="50" cy="74" r="2.4"/></g>`),
  },
  's-sprout': {
    name: '새싹', pack: 'season',
    svg: () => wrap(`<path d="M30 70 h40 l-5 24 h-30 Z" fill="#E59866" ${O}/><path d="M50 70 V44" ${O}/>
      <path d="M50 50 C 30 52, 18 36, 22 26 C 36 24, 50 34, 50 50 Z" fill="#8ED68B" ${O}/><path d="M50 44 C 66 46, 80 32, 76 20 C 62 18, 50 28, 50 44 Z" fill="#6CC46F" ${O}/>${face(50, 82, 0.7)}`),
  },
  's-acorn': {
    name: '도토리', pack: 'season',
    svg: () => wrap(`<path d="M24 46 C 24 76, 40 92, 50 92 C 60 92, 76 76, 76 46 Z" fill="#D9925A" ${O}/><path d="M18 46 C 18 26, 82 26, 82 46 Z" fill="#8C5A3A" ${O}/><path d="M50 26 V14" ${O}/>
      <path d="M30 38 l6 -4 M44 34 l6 -4 M58 34 l6 -4" stroke="#6E4428" stroke-width="2" stroke-linecap="round"/>${face(50, 64, 1)}`),
  },

  // ---------- 간식 ----------
  'f-icecream': {
    name: '아이스크림', pack: 'snack',
    svg: () => wrap(`<path d="M30 50 L50 94 L70 50 Z" fill="#F2C27D" ${O}/><path d="M36 58 L64 58 M40 68 H60" stroke="#D29B52" stroke-width="2"/>
      <circle cx="50" cy="38" r="22" fill="#FFB6C8" ${O}/><path d="M30 46 q 6 8 12 0 q 6 8 12 0 q 6 8 12 0" fill="#FFB6C8" ${O}/>${face(50, 38, 0.9)}<circle cx="56" cy="16" r="5" fill="#F25F5C" ${O}/>`),
  },
  'f-apple': {
    name: '사과', pack: 'snack',
    svg: () => wrap(`<path d="M50 30 C 30 18, 12 34, 16 56 C 20 80, 38 92, 50 86 C 62 92, 80 80, 84 56 C 88 34, 70 18, 50 30 Z" fill="#FF6B6B" ${O}/><path d="M50 30 V14" ${O}/><path d="M52 20 C 60 8, 74 10, 74 14 C 66 22, 58 22, 52 20 Z" fill="#6CC46F" ${O}/>${face(50, 58, 1.1)}`),
  },
  'f-donut': {
    name: '도넛', pack: 'snack',
    svg: () => wrap(`<circle cx="50" cy="52" r="38" fill="#E9A866" ${O}/><path d="M16 46 C 20 22, 80 18, 86 46 C 88 58, 78 54, 74 62 C 66 72, 58 60, 50 66 C 40 72, 34 60, 26 62 C 16 64, 14 56, 16 46 Z" fill="#FF9BC0" ${O}/><circle cx="50" cy="50" r="11" fill="#FFF8EE" ${O}/>
      <g stroke-width="3" stroke-linecap="round"><path d="M28 38 l5 -3" stroke="#7FB0FF"/><path d="M66 32 l5 3" stroke="#FFE07A"/><path d="M72 48 l3 5" stroke="#8ED68B"/><path d="M36 26 l4 2" stroke="#FFFFFF"/></g>`),
  },
  'f-milk': {
    name: '우유', pack: 'snack',
    svg: () => wrap(`<path d="M28 34 L50 18 L72 34 V90 H28 Z" fill="#FFFFFF" ${O}/><path d="M28 34 H72" ${O}/><path d="M28 54 H72 V76 H28 Z" fill="#8FC4F2"/><path d="M28 54 H72 M28 76 H72" ${O}/>${face(50, 44, 0.8)}<path d="M50 18 V8 H58" ${O} fill="none"/>`),
  },
  'f-gimbap': {
    name: '김밥', pack: 'snack',
    svg: () => wrap(`<circle cx="50" cy="52" r="38" fill="#2E3B32" ${O}/><circle cx="50" cy="52" r="29" fill="#FFFFFF"/><circle cx="40" cy="44" r="6" fill="#FFD25E"/><circle cx="58" cy="42" r="6" fill="#FF8A5B"/><circle cx="50" cy="60" r="7" fill="#6CC46F"/><circle cx="62" cy="58" r="5" fill="#F27EA0"/><circle cx="38" cy="60" r="4" fill="#C98A4A"/>`),
  },
  'f-cookie': {
    name: '쿠키', pack: 'snack',
    svg: () => wrap(`<path d="M50 12 C 72 12, 90 30, 88 52 C 86 74, 70 90, 50 88 C 28 90, 12 72, 12 50 C 12 28, 28 12, 50 12 Z" fill="#E1A45E" ${O}/><g fill="#6E4428"><circle cx="34" cy="34" r="4"/><circle cx="68" cy="30" r="4"/><circle cx="72" cy="66" r="4"/><circle cx="30" cy="68" r="3.5"/></g>${face(50, 52, 1.1)}`),
  },

  // ---------- 학교 ----------
  'c-pencil': {
    name: '연필', pack: 'school',
    svg: () => wrap(`<g transform="rotate(-40 50 50)"><rect x="40" y="10" width="20" height="62" fill="#FFD25E" ${O}/><path d="M40 72 L50 92 L60 72 Z" fill="#F7D9A8" ${O}/><path d="M46 84 L50 92 L54 84 Z" fill="${INK}"/><rect x="40" y="4" width="20" height="10" rx="3" fill="#FF8FA3" ${O}/><path d="M50 14 V72" stroke="#E6B83F" stroke-width="2"/></g>`),
  },
  'c-bag': {
    name: '책가방', pack: 'school',
    svg: () => wrap(`<path d="M36 22 C 36 6, 64 6, 64 22" fill="none" ${O}/><rect x="18" y="20" width="64" height="72" rx="18" fill="#7FB0FF" ${O}/><rect x="30" y="56" width="40" height="26" rx="8" fill="#5D8FE0" ${O}/><path d="M18 44 H82" ${O}/>${face(50, 36, 0.9)}<circle cx="50" cy="56" r="3" fill="#FFD25E" ${O}/>`),
  },
  'c-book': {
    name: '공책', pack: 'school',
    svg: () => wrap(`<rect x="22" y="12" width="58" height="78" rx="6" fill="#8ED68B" ${O}/><rect x="22" y="12" width="12" height="78" rx="4" fill="#6CC46F" ${O}/><rect x="42" y="28" width="30" height="16" rx="3" fill="#FFFFFF" ${O}/>${face(57, 64, 1)}`),
  },
  'c-crayon': {
    name: '크레파스', pack: 'school',
    svg: () => wrap(`${['#FF6B6B', '#FFD25E', '#7FB0FF'].map((c, i) => `<g transform="translate(${22 + i * 20} 0)"><rect x="0" y="30" width="16" height="58" rx="3" fill="${c}" ${O}/><path d="M0 30 L8 12 L16 30 Z" fill="${c}" ${O}/><rect x="0" y="46" width="16" height="10" fill="#FFFFFF" opacity=".7"/></g>`).join('')}`),
  },
  'c-ruler': {
    name: '자', pack: 'school',
    svg: () => wrap(`<g transform="rotate(-30 50 50)"><rect x="4" y="38" width="92" height="24" rx="4" fill="#FFE07A" ${O}/><g stroke="${INK}" stroke-width="2" stroke-linecap="round">${Array.from({ length: 9 }, (_, i) => `<path d="M${14 + i * 9} 38 v${i % 2 ? 6 : 10}"/>`).join('')}</g></g>`),
  },
  'c-eraser': {
    name: '지우개', pack: 'school',
    svg: () => wrap(`<rect x="16" y="30" width="68" height="40" rx="8" fill="#FFFFFF" ${O}/><rect x="16" y="30" width="30" height="40" rx="8" fill="#7FB0FF" ${O}/>${face(64, 50, 1)}`),
  },

  // ---------- 운동 ----------
  'p-ball': {
    name: '축구공', pack: 'sport',
    svg: () => {
      const g = gid();
      const pt = (cx, cy, r, a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
      const pent = (cx, cy, r, rot) => `M${[0, 1, 2, 3, 4].map((i) => pt(cx, cy, r, rot + (Math.PI * 2 * i) / 5)).join(' L')} Z`;
      const up = -Math.PI / 2;
      const dirs = [0, 1, 2, 3, 4].map((i) => up + (Math.PI * 2 * i) / 5);
      const outer = dirs.map((a) => { const [x, y] = pt(50, 50, 41, a).split(' ').map(Number); return pent(x, y, 13, a + Math.PI); }).join(' ');
      const lines = dirs.map((a) => `M${pt(50, 50, 12, a)} L${pt(50, 50, 28, a)}`).join(' ');
      return wrap(`<defs><clipPath id="${g}"><circle cx="50" cy="50" r="38"/></clipPath></defs>
        <circle cx="50" cy="50" r="38" fill="#FFFFFF"/>
        <g clip-path="url(#${g})"><path d="${pent(50, 50, 12, up)} ${outer}" fill="${INK}"/><path d="${lines}" stroke="${INK}" stroke-width="2.2"/></g>
        <circle cx="50" cy="50" r="38" fill="none" ${O}/>`);
    },
  },
  'p-rope': {
    name: '줄넘기', pack: 'sport',
    svg: () => wrap(`<path d="M26 70 C 2 40, 30 10, 50 40 C 66 64, 98 52, 76 28" fill="none" stroke="#FF8FA3" stroke-width="4" stroke-linecap="round"/>
      <g transform="rotate(-150 26 70)"><rect x="19" y="70" width="14" height="24" rx="7" fill="#F4C24F" ${O}/><path d="M19 76 H33" stroke="#4A3F3A" stroke-width="2"/></g>
      <g transform="rotate(30 76 28)"><rect x="69" y="4" width="14" height="24" rx="7" fill="#F4C24F" ${O}/><path d="M69 22 H83" stroke="#4A3F3A" stroke-width="2"/></g>`),
  },
  'p-bike': {
    name: '자전거', pack: 'sport',
    svg: () => wrap(`<circle cx="26" cy="66" r="17" fill="none" ${O}/><circle cx="74" cy="66" r="17" fill="none" ${O}/><path d="M26 66 L42 38 H66 L74 66 M42 38 L52 66 L66 38 M40 30 H50 M66 38 L62 26 H72" fill="none" stroke="#F25F5C" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="52" cy="66" r="4" fill="${INK}"/>`),
  },
  'p-shoe': {
    name: '운동화', pack: 'sport',
    svg: () => wrap(`<path d="M10 70 V42 C 10 34, 26 32, 30 40 L40 52 C 52 56, 76 54, 86 62 C 92 66, 92 74, 86 76 H14 C 10 76, 10 74, 10 70 Z" fill="#7FB0FF" ${O}/><path d="M10 76 H90 V82 H10 Z" fill="#FFFFFF" ${O}/><path d="M32 46 l8 -4 M38 54 l8 -4" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>`),
  },
  'p-kite': {
    name: '연', pack: 'sport',
    svg: () => wrap(`<path d="M50 6 L80 40 L50 74 L20 40 Z" fill="#FFD25E" ${O}/><path d="M50 6 V74 M20 40 H80" stroke="#4A3F3A" stroke-width="2"/><path d="M50 6 L80 40 L50 40 Z" fill="#FF8FA3"/><path d="M20 40 L50 74 L50 40 Z" fill="#FF8FA3"/>
      <path d="M50 74 C 40 82, 60 86, 50 94" stroke="#4A3F3A" stroke-width="2.4" fill="none"/><path d="M44 82 l-6 -2 l2 6 Z M56 90 l6 -2 l-2 6 Z" fill="#7FB0FF"/>`),
  },
  'p-medal': {
    name: '메달', pack: 'sport',
    svg: () => wrap(`<path d="M30 6 L44 40 H56 L70 6 H58 L50 26 L42 6 Z" fill="#7FB0FF" ${O}/><circle cx="50" cy="64" r="26" fill="#FFD25E" ${O}/><path d="${starPath(50, 64, 13, 6)}" fill="#F4A93A"/>`),
  },

  // ---------- 기분 얼굴 ----------
  'm-happy': { name: '웃음', pack: 'mood', svg: () => moodFace('#FFE07A', `${face(50, 48, 2, 'happy')}`) },
  'm-excited': {
    name: '신남', pack: 'mood',
    svg: () => moodFace('#FFB36B', `<path d="M30 42 l8 5 l-8 5 M70 42 l-8 5 l8 5" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M36 60 Q 50 80 64 60 Z" fill="${INK}"/><path d="M42 66 Q 50 74 58 66 Z" fill="#F0928C"/><ellipse cx="26" cy="62" rx="6" ry="3.5" fill="#F27E7A" opacity=".7"/><ellipse cx="74" cy="62" rx="6" ry="3.5" fill="#F27E7A" opacity=".7"/>`),
  },
  'm-wow': {
    name: '놀람', pack: 'mood',
    svg: () => moodFace('#BFE3FF', `<circle cx="36" cy="46" r="5.5" fill="${INK}"/><circle cx="64" cy="46" r="5.5" fill="${INK}"/><circle cx="34.5" cy="44" r="1.8" fill="#fff"/><circle cx="62.5" cy="44" r="1.8" fill="#fff"/><ellipse cx="50" cy="66" rx="7" ry="9" fill="${INK}"/><path d="M28 30 q 6 -6 12 -2 M60 28 q 6 -4 12 2" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`),
  },
  'm-sleepy': {
    name: '졸림', pack: 'mood',
    svg: () => moodFace('#D9CCFF', `<path d="M28 48 q 8 6 16 0 M56 48 q 8 6 16 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="66" rx="5" ry="4" fill="${INK}"/><path d="M70 22 h8 l-8 9 h8" stroke="#6B5FB8" stroke-width="2.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`),
  },
  'm-sad': {
    name: '슬픔', pack: 'mood',
    svg: () => moodFace('#A9D3FF', `<circle cx="36" cy="48" r="4.5" fill="${INK}"/><circle cx="64" cy="48" r="4.5" fill="${INK}"/><path d="M38 70 Q 50 60 62 70" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M30 56 q -4 8 0 10 q 4 -2 0 -10 Z" fill="#5FA0F2"/><path d="M28 36 l12 4 M72 36 l-12 4" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`),
  },
  'm-angry': {
    name: '화남', pack: 'mood',
    svg: () => moodFace('#FF9A8A', `<path d="M26 36 l14 6 M74 36 l-14 6" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><circle cx="36" cy="50" r="4.5" fill="${INK}"/><circle cx="64" cy="50" r="4.5" fill="${INK}"/><path d="M38 70 Q 50 62 62 70" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M70 16 l4 6 l6 -2 l-2 6 l6 4" stroke="#E2453F" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  },

  // ---------- 토리 ----------
  't-wave': { name: '인사하는 토리', pack: 'tori', svg: () => toriSVG('wave', { fuzzy: false }) },
  't-read': { name: '책 읽는 토리', pack: 'tori', svg: () => toriSVG('read', { fuzzy: false }) },
  't-happy': { name: '기쁜 토리', pack: 'tori', svg: () => toriSVG('happy', { fuzzy: false }) },
  't-sleepy': { name: '졸린 토리', pack: 'tori', svg: () => toriSVG('sleepy', { fuzzy: false }) },
  't-listen': { name: '음악 듣는 토리', pack: 'tori', svg: () => toriSVG('listen', { fuzzy: false }) },
  't-wow': { name: '놀란 토리', pack: 'tori', svg: () => toriSVG('wow', { fuzzy: false }) },

  // ---------- 숲속 친구 ----------
  'a-rabbit': {
    name: '토끼', pack: 'forest',
    svg: () => animal(`<ellipse cx="38" cy="26" rx="8" ry="22" fill="#FFFFFF" ${O}/><ellipse cx="62" cy="26" rx="8" ry="22" fill="#FFFFFF" ${O}/><ellipse cx="38" cy="26" rx="3.6" ry="14" fill="#FFC9D6"/><ellipse cx="62" cy="26" rx="3.6" ry="14" fill="#FFC9D6"/><circle cx="50" cy="64" r="30" fill="#FFFFFF" ${O}/>${face(50, 64, 1.4)}`),
  },
  'a-squirrel': {
    name: '다람쥐', pack: 'forest',
    svg: () => animal(`<path d="M70 70 C 96 60, 96 18, 74 14 C 58 12, 60 34, 70 40" fill="#E0A066" ${O}/><circle cx="44" cy="58" r="28" fill="#C98552" ${O}/><path d="M24 36 l-2 -14 l12 8 Z M58 32 l6 -12 l4 14 Z" fill="#C98552" ${O}/><ellipse cx="44" cy="68" rx="15" ry="12" fill="#F5D7B5"/>${face(44, 56, 1.2)}`),
  },
  'a-owl': {
    name: '부엉이', pack: 'forest',
    svg: () => animal(`<path d="M22 30 L30 12 L40 26 H60 L70 12 L78 30 C 92 54, 82 92, 50 92 C 18 92, 8 54, 22 30 Z" fill="#A57A5A" ${O}/><ellipse cx="50" cy="70" rx="20" ry="18" fill="#E9CFAF"/><circle cx="36" cy="44" r="12" fill="#FFFFFF" ${O}/><circle cx="64" cy="44" r="12" fill="#FFFFFF" ${O}/><circle cx="36" cy="44" r="5" fill="${INK}"/><circle cx="64" cy="44" r="5" fill="${INK}"/><path d="M46 54 L50 62 L54 54 Z" fill="#F4A93A"/>`),
  },
  'a-hedgehog': {
    name: '고슴도치', pack: 'forest',
    svg: () => animal(`<path d="M14 70 L10 52 L22 54 L20 36 L34 44 L38 26 L50 40 L58 24 L64 42 L78 32 L76 50 L90 50 L84 66 C 80 84, 20 86, 14 70 Z" fill="#8C6448" ${O}/><path d="M20 72 C 26 56, 56 52, 66 64 C 72 72, 70 84, 50 86 C 32 86, 18 82, 20 72 Z" fill="#F2D3B0" ${O}/>${face(40, 71, 1.1)}<circle cx="63" cy="69" r="3.2" fill="${INK}"/>`),
  },
  'a-fox': {
    name: '여우', pack: 'forest',
    svg: () => animal(`<path d="M16 22 L34 34 H66 L84 22 L80 56 C 76 80, 60 90, 50 90 C 40 90, 24 80, 20 56 Z" fill="#F4934A" ${O}/><path d="M24 30 L32 36 L28 46 Z M76 30 L68 36 L72 46 Z" fill="#FFE7D1"/><path d="M28 60 C 34 70, 44 72, 50 82 C 56 72, 66 70, 72 60 C 64 64, 56 62, 50 66 C 44 62, 36 64, 28 60 Z" fill="#FFF5EA"/>${face(50, 56, 1.2)}<circle cx="50" cy="66" r="3" fill="${INK}"/>`),
  },
  'a-bear': {
    name: '곰', pack: 'forest',
    svg: () => animal(`<circle cx="26" cy="28" r="12" fill="#B9835A" ${O}/><circle cx="74" cy="28" r="12" fill="#B9835A" ${O}/><circle cx="26" cy="28" r="5" fill="#E9C29A"/><circle cx="74" cy="28" r="5" fill="#E9C29A"/><circle cx="50" cy="56" r="34" fill="#B9835A" ${O}/><ellipse cx="50" cy="66" rx="14" ry="10" fill="#E9C29A"/><ellipse cx="50" cy="62" rx="4.4" ry="3.2" fill="${INK}"/>${face(50, 50, 1.3)}`),
  },

  // ---------- 큰 스티커 ----------
  'big-tori-books': {
    name: '책 더미 위의 토리', pack: 'big', big: true,
    svg: () => {
      const tori = toriSVG('read', { fuzzy: false })
        .replace(/^<svg[^>]*>/, '<g transform="translate(20 0) scale(0.82)">')
        .replace(/<\/svg>\s*$/, '</g>');
      return `<svg viewBox="0 0 220 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="250" width="184" height="24" rx="5" fill="#2F4A7A" ${O}/><rect x="30" y="226" width="160" height="24" rx="5" fill="#F2A19B" ${O}/><rect x="24" y="274" width="172" height="22" rx="5" fill="#F4C24F" ${O}/>
        <path d="M40 238 H180 M36 262 H190 M34 285 H186" stroke="#fff" stroke-width="3" opacity=".6"/>
        <g transform="translate(0 21)">${tori}</g>
      </svg>`;
    },
  },

  // ---------- 반짝이 ----------
  'g-star': {
    name: '반짝 별', pack: 'sparkle', shine: true,
    svg: () => { const g = gid(); return wrap(`<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6B0"/><stop offset=".5" stop-color="#FFD25E"/><stop offset="1" stop-color="#F4A93A"/></linearGradient></defs><path d="${starPath(50, 52, 42, 19)}" fill="url(#${g})" ${O}/><path d="M36 34 l6 8" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>`); },
  },
  'g-heart': {
    name: '반짝 하트', pack: 'sparkle', shine: true,
    svg: () => { const g = gid(); return wrap(`<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD1DC"/><stop offset=".5" stop-color="#FF8FA3"/><stop offset="1" stop-color="#E85F86"/></linearGradient></defs><path d="${heartPath}" fill="url(#${g})" ${O}/><path d="M28 34 q 4 -8 12 -6" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>`); },
  },
  'g-crown': {
    name: '반짝 왕관', pack: 'sparkle', shine: true,
    svg: () => { const g = gid(); return wrap(`<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0A0"/><stop offset="1" stop-color="#F4B13A"/></linearGradient></defs><path d="M12 76 L16 30 L34 52 L50 22 L66 52 L84 30 L88 76 Z" fill="url(#${g})" ${O}/><rect x="12" y="76" width="76" height="12" rx="4" fill="#F4B13A" ${O}/><circle cx="50" cy="58" r="6" fill="#FF8FA3" ${O}/><circle cx="30" cy="66" r="4" fill="#7FB0FF" ${O}/><circle cx="70" cy="66" r="4" fill="#8ED68B" ${O}/>`); },
  },
  'g-gem': {
    name: '반짝 보석', pack: 'sparkle', shine: true,
    svg: () => wrap(`<path d="M24 20 H76 L92 40 L50 90 L8 40 Z" fill="#8FD3FF" ${O}/><path d="M8 40 H92 M24 20 L36 40 L50 90 L64 40 L76 20 M36 40 L50 20 L64 40" fill="none" stroke="#4A3F3A" stroke-width="2"/><path d="M24 20 L36 40 H8 Z" fill="#C6ECFF"/><path d="M64 40 L76 20 L92 40 Z" fill="#5FB4F0"/>`),
  },
  'g-ribbon': {
    name: '반짝 리본', pack: 'sparkle', shine: true,
    svg: () => wrap(`<path d="M50 50 C 30 30, 8 30, 10 48 C 12 66, 32 66, 50 50 Z" fill="#FF8FA3" ${O}/><path d="M50 50 C 70 30, 92 30, 90 48 C 88 66, 68 66, 50 50 Z" fill="#FF8FA3" ${O}/><path d="M44 54 L34 88 L44 82 L50 92 L54 56 Z" fill="#F26B8A" ${O}/><path d="M56 54 L66 88 L56 82 L50 92 Z" fill="#F26B8A" ${O}/><circle cx="50" cy="50" r="9" fill="#FFB6C8" ${O}/>`),
  },
  'g-twinkle': {
    name: '반짝반짝', pack: 'sparkle', shine: true,
    svg: () => wrap(`<path d="M44 8 C 46 34, 52 40, 78 44 C 52 48, 46 54, 44 80 C 42 54, 36 48, 10 44 C 36 40, 42 34, 44 8 Z" fill="#FFE07A" ${O}/><path d="M78 62 C 79 74, 82 77, 94 78 C 82 79, 79 82, 78 94 C 77 82, 74 79, 62 78 C 74 77, 77 74, 78 62 Z" fill="#FFB6C8" ${O}/>`),
  },

  // ---------- 특별 세트: 구름 위 도서관 ----------
  'x-wingbook': {
    name: '날개 달린 책', pack: 'set-cloud',
    svg: () => {
      const wing = 'M20 46 C 14 30, 4 22, 2 28 C 0 34, 4 38, 8 40 C 2 42, 2 50, 10 50 C 6 54, 10 60, 20 58 Z';
      return wrap(`<path d="${wing}" fill="#FFFFFF" ${O}/><path d="${wing}" transform="translate(100 0) scale(-1 1)" fill="#FFFFFF" ${O}/>
        <path d="M50 36 C 38 28, 26 28, 18 32 V78 C 26 74, 38 74, 50 82 Z" fill="#8E7AD6" ${O}/><path d="M50 36 C 62 28, 74 28, 82 32 V78 C 74 74, 62 74, 50 82 Z" fill="#B7A6F2" ${O}/>${face(50, 60, 0.9)}`);
    },
  },
  'x-plane': {
    name: '종이비행기', pack: 'set-cloud',
    svg: () => wrap(`<path d="M8 50 L92 16 L64 86 L48 60 Z" fill="#FFFFFF" ${O}/><path d="M48 60 L92 16 L40 68 Z" fill="#DDE6FF" ${O}/><path d="M10 80 q 10 -6 20 0 q 10 6 20 0" stroke="#B7A6F2" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="4 6"/>`),
  },
  'x-bookmark': {
    name: '무지개 책갈피', pack: 'set-cloud',
    svg: () => wrap(`<path d="M34 6 H66 V92 L50 78 L34 92 Z" fill="#FFFFFF" ${O}/>${['#FF8A8A', '#FFC75E', '#8ED68B', '#7FB0FF', '#B7A6F2'].map((c, i) => `<rect x="34" y="${12 + i * 12}" width="32" height="10" fill="${c}"/>`).join('')}<path d="M34 6 H66 V92 L50 78 L34 92 Z" fill="none" ${O}/>`),
  },

  // ---------- 특별 세트: 한밤의 우주 도서관 ----------
  'x-planetbook': {
    name: '행성 책', pack: 'set-space',
    svg: () => wrap(`<ellipse cx="50" cy="52" rx="46" ry="12" fill="none" stroke="#FFD25E" stroke-width="5" transform="rotate(-14 50 52)"/><circle cx="50" cy="50" r="28" fill="#8E7AD6" ${O}/><path d="M50 36 C 42 32, 34 32, 28 34 V62 C 34 60, 42 60, 50 64 Z" fill="#FFFFFF" ${O}/><path d="M50 36 C 58 32, 66 32, 72 34 V62 C 66 60, 58 60, 50 64 Z" fill="#E9E2FF" ${O}/>`),
  },
  'x-astro': {
    name: '우주복 토리', pack: 'set-space',
    svg: () => {
      const face2 = toriSVG('happy', { fuzzy: false, headOnly: true })
        .replace(/^<svg[^>]*>/, '<g transform="translate(13 10) scale(0.34)">')
        .replace(/<\/svg>\s*$/, '</g>');
      return wrap(`<circle cx="50" cy="40" r="34" fill="#DDF1FF" ${O}/>${face2}<path d="M24 22 q 10 -10 20 -8" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/><rect x="26" y="72" width="48" height="22" rx="10" fill="#FFFFFF" ${O}/><circle cx="50" cy="83" r="5" fill="#F2A19B" ${O}/>`);
    },
  },
  'x-telescope': {
    name: '별 망원경', pack: 'set-space',
    svg: () => wrap(`<g transform="rotate(-28 50 50)"><rect x="14" y="36" width="56" height="20" rx="6" fill="#2F4A7A" ${O}/><rect x="66" y="32" width="20" height="28" rx="5" fill="#7FB0FF" ${O}/><rect x="6" y="40" width="10" height="12" rx="3" fill="#7FB0FF" ${O}/></g><path d="M44 62 L30 94 M52 62 L66 94 M48 62 V94" ${O}/><path d="${starPath(82, 16, 10, 4.5)}" fill="#FFD25E" ${O}/>`),
  },
};

export function stickerSVG(id) {
  const s = STICKERS[id];
  return s ? s.svg() : '';
}

export function stickerMeta(id) {
  return STICKERS[id] || null;
}
