// 표지 그림 (SVG, 400×300, 어떤 크기에도 꽉 차게 잘려 보임)
// 새 표지를 넣으려면: COVERS에 하나 더하고, js/data/gifts.js의 GIFTS에 선물을 더합니다.
// color: 책등(일기장 책장) 색, ink: 책등 글자 색

let n = 0;
const uid = () => `cv${++n}`;

// ---------- 작은 그림 도우미 ----------
const cloud = (x, y, s = 1, fill = '#fff', op = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}" opacity="${op}">
    <ellipse cx="0" cy="0" rx="34" ry="18"/><ellipse cx="-22" cy="6" rx="22" ry="14"/><ellipse cx="24" cy="6" rx="24" ry="14"/><ellipse cx="6" cy="-10" rx="20" ry="16"/>
  </g>`;

const star4 = (x, y, s = 1, fill = '#FFF4C2', cls = '') =>
  `<path class="${cls}" transform="translate(${x} ${y}) scale(${s})" d="M0 -6 C 0.9 -1.6, 1.6 -0.9, 6 0 C 1.6 0.9, 0.9 1.6, 0 6 C -0.9 1.6, -1.6 0.9, -6 0 C -1.6 -0.9, -0.9 -1.6, 0 -6 Z" fill="${fill}"/>`;

function dotsStars(count, seed, w = 400, h = 300, color = '#FFFFFF', maxR = 1.8) {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = (rnd() * w).toFixed(1);
    const y = (rnd() * h).toFixed(1);
    const r = (0.5 + rnd() * maxR).toFixed(2);
    const o = (0.45 + rnd() * 0.55).toFixed(2);
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${o}"/>`;
  }
  return out;
}

const blossom = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})">
    ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-6" rx="4.6" ry="6.4" transform="rotate(${a})" fill="#FFC9D6"/>`).join('')}
    <circle r="2.6" fill="#F28CA6"/>
  </g>`;

const tree = (x, y, s = 1, c1 = '#7CC37A', c2 = '#5DAA62') =>
  `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-5" y="-6" width="10" height="34" rx="4" fill="#9B6B45"/>
    <circle cx="0" cy="-26" r="26" fill="${c1}"/><circle cx="-16" cy="-12" r="16" fill="${c2}"/><circle cx="17" cy="-14" r="17" fill="${c2}"/>
    <circle cx="-8" cy="-34" r="6" fill="#fff" opacity=".18"/>
  </g>`;

const bookRow = (x, y, w, h, colors, seed = 1) => {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  let cx = x;
  let out = '';
  let i = 0;
  while (cx < x + w - 6) {
    const bw = 9 + Math.floor(rnd() * 9);
    const bh = h - Math.floor(rnd() * h * 0.32);
    const c = colors[i % colors.length];
    const tilt = rnd() < 0.12 ? -8 : 0;
    out += `<rect x="${cx}" y="${y + h - bh}" width="${bw}" height="${bh}" rx="1.5" fill="${c}" transform="rotate(${tilt} ${cx} ${y + h})"/>`;
    out += `<rect x="${cx + 2}" y="${y + h - bh + 6}" width="${bw - 4}" height="2" fill="#fff" opacity=".35" transform="rotate(${tilt} ${cx} ${y + h})"/>`;
    cx += bw + 1;
    i++;
  }
  return out;
};

const fish = (x, y, s, c, dir = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s * dir} ${s})">
    <ellipse cx="0" cy="0" rx="16" ry="10" fill="${c}"/><path d="M14 0 L26 -9 L26 9 Z" fill="${c}"/>
    <circle cx="-8" cy="-2" r="2.4" fill="#1F2A44"/><circle cx="-8.6" cy="-2.6" r=".8" fill="#fff"/>
  </g>`;

// ---------- 표지들 ----------
export const COVERS = {
  spring: {
    name: '맑은 봄날', color: '#8FCB7B', ink: '#1E3B1E',
    svg: (id) => `
      <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FD6FF"/><stop offset="1" stop-color="#E9F7FF"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#${id}s)"/>
      <circle cx="330" cy="64" r="34" fill="#FFE27A"/><circle cx="330" cy="64" r="48" fill="#FFE27A" opacity=".25"/>
      ${cloud(110, 70, 1.1)}${cloud(250, 110, 0.8, '#fff', 0.9)}
      <path d="M0 220 Q 90 170 190 210 T 400 200 L400 300 L0 300 Z" fill="#B7E39B"/>
      <path d="M0 250 Q 120 210 240 248 T 400 240 L400 300 L0 300 Z" fill="#8CCB75"/>
      <path d="M-10 20 Q 60 40 120 26" stroke="#8B5A3C" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M50 34 Q 60 52 54 70" stroke="#8B5A3C" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${blossom(20, 28, 1.3)}${blossom(48, 40, 1)}${blossom(80, 30, 1.2)}${blossom(112, 26, 0.9)}${blossom(56, 70, 1.1)}
      ${blossom(160, 160, 0.6)}${blossom(220, 190, 0.5)}${blossom(300, 170, 0.55)}${blossom(360, 230, 0.5)}
      <g fill="#FFF7B0"><circle cx="70" cy="258" r="4"/><circle cx="96" cy="270" r="3.5"/><circle cx="300" cy="262" r="4"/><circle cx="338" cy="276" r="3.5"/></g>`,
  },
  rain: {
    name: '비 오는 창가', color: '#7D95B8', ink: '#162338',
    svg: (id) => `
      <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7B92B5"/><stop offset="1" stop-color="#B9C9DD"/></linearGradient></defs>
      <rect width="400" height="300" fill="#F3E9DC"/>
      <rect x="40" y="24" width="320" height="214" rx="10" fill="url(#${id}s)"/>
      ${cloud(120, 64, 1.2, '#E7EEF7', 0.7)}${cloud(280, 90, 1, '#E7EEF7', 0.6)}
      <g stroke="#E8F1FB" stroke-width="2" stroke-linecap="round" opacity=".8">
        ${Array.from({ length: 22 }, (_, i) => {
          const x = 52 + ((i * 47) % 300);
          const y = 40 + ((i * 71) % 170);
          return `<path d="M${x} ${y} l-5 14"/>`;
        }).join('')}
      </g>
      <g fill="#fff" opacity=".7">${Array.from({ length: 14 }, (_, i) => `<ellipse cx="${60 + ((i * 89) % 290)}" cy="${50 + ((i * 53) % 170)}" rx="3" ry="4"/>`).join('')}</g>
      <rect x="40" y="24" width="320" height="214" rx="10" fill="none" stroke="#FFFFFF" stroke-width="12"/>
      <path d="M200 24 V238 M40 131 H360" stroke="#FFFFFF" stroke-width="9"/>
      <rect x="20" y="238" width="360" height="18" rx="6" fill="#D2B48C"/>
      <rect x="0" y="256" width="400" height="44" fill="#E9DCCB"/>
      <path d="M262 238 l6 -26 h28 l6 26 Z" fill="#E98E72"/><path d="M282 212 q -10 -26 -2 -44 q 6 16 2 44 M282 212 q 14 -20 10 -40 q -12 12 -10 40" fill="#6FB46F"/>
      <rect x="96" y="214" width="30" height="24" rx="6" fill="#FFFFFF"/><path d="M126 220 q 12 0 12 8 q 0 8 -12 8" stroke="#FFFFFF" stroke-width="5" fill="none"/>
      <path d="M104 206 q 4 -8 0 -14 M114 206 q 4 -8 0 -14" stroke="#fff" stroke-width="2.4" fill="none" opacity=".8" stroke-linecap="round"/>`,
  },
  winter: {
    name: '눈 내리는 겨울밤', color: '#3D4F8C', ink: '#F4F6FF',
    svg: (id) => `
      <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D2A55"/><stop offset="1" stop-color="#46589A"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#${id}s)"/>
      ${dotsStars(40, 7, 400, 170, '#FFFFFF', 1.2)}
      <circle cx="320" cy="62" r="26" fill="#FFF6D6"/><circle cx="331" cy="55" r="24" fill="#2B3A70"/>
      <path d="M0 210 Q 100 170 200 205 T 400 196 L400 300 L0 300 Z" fill="#E9F0FA"/>
      <path d="M0 246 Q 140 214 260 244 T 400 236 L400 300 L0 300 Z" fill="#FFFFFF"/>
      <g transform="translate(90 168)"><rect x="0" y="16" width="56" height="40" fill="#C9845A"/><path d="M-6 18 L28 -8 L62 18 Z" fill="#FFFFFF"/><rect x="10" y="28" width="14" height="14" fill="#FFD66B"/><rect x="34" y="34" width="12" height="22" fill="#8C5A3A"/></g>
      <g transform="translate(250 174)"><rect x="0" y="14" width="46" height="34" fill="#7DA0C9"/><path d="M-5 16 L23 -6 L51 16 Z" fill="#FFFFFF"/><rect x="8" y="24" width="12" height="12" fill="#FFD66B"/><rect x="26" y="24" width="12" height="12" fill="#FFD66B"/></g>
      <g fill="#FFFFFF">${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 53) % 400}" cy="${(i * 37) % 260}" r="${1.5 + (i % 3)}" opacity=".9"/>`).join('')}</g>`,
  },
  sunset: {
    name: '노을 지는 바닷가', color: '#F28E86', ink: '#3B1730',
    svg: (id) => `
      <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E7AD6"/><stop offset=".45" stop-color="#FF8FA3"/><stop offset="1" stop-color="#FFC48A"/></linearGradient>
      <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E73C8"/><stop offset="1" stop-color="#4C5AA8"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#${id}s)"/>
      <circle cx="200" cy="176" r="52" fill="#FFE29A"/>
      ${cloud(90, 70, 0.9, '#FFD0D8', 0.75)}${cloud(320, 96, 0.7, '#FFD0D8', 0.7)}
      <rect y="176" width="400" height="80" fill="url(#${id}w)"/>
      <g stroke="#FFE29A" stroke-width="4" stroke-linecap="round" opacity=".7"><path d="M170 190 H230"/><path d="M180 204 H220"/><path d="M188 218 H212"/></g>
      <g stroke="#9FA8E6" stroke-width="3" stroke-linecap="round" opacity=".6"><path d="M40 200 H80"/><path d="M300 212 H350"/><path d="M90 232 H120"/></g>
      <path d="M0 244 Q 120 232 220 246 T 400 240 L400 300 L0 300 Z" fill="#F6D6A8"/>
      <path d="M96 64 q 8 -8 16 0 q 8 -8 16 0" stroke="#5B3B6B" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M140 92 q 6 -6 12 0 q 6 -6 12 0" stroke="#5B3B6B" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <g transform="translate(320 262)"><path d="M0 0 q 10 -14 20 0 Z" fill="#F7A57C"/><circle cx="10" cy="-2" r="2" fill="#fff"/></g>`,
  },
  space: {
    name: '별이 가득한 우주', color: '#4B3A99', ink: '#F5F2FF',
    svg: (id) => `
      <defs><radialGradient id="${id}s" cx="30%" cy="30%" r="90%"><stop offset="0" stop-color="#4A3A9C"/><stop offset="1" stop-color="#150F3A"/></radialGradient>
      <linearGradient id="${id}p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB7C5"/><stop offset="1" stop-color="#F77E9C"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#${id}s)"/>
      ${dotsStars(90, 11, 400, 300, '#FFFFFF', 1.6)}
      ${star4(60, 60, 1.6)}${star4(340, 240, 1.3)}${star4(250, 40, 1.1)}${star4(120, 230, 1.2, '#CDE7FF')}
      <g transform="translate(270 130)"><ellipse cx="0" cy="0" rx="74" ry="18" fill="none" stroke="#FFE29A" stroke-width="6" transform="rotate(-18)"/><circle r="42" fill="url(#${id}p)"/><path d="M-30 -10 q 30 10 60 -6" stroke="#fff" stroke-width="5" fill="none" opacity=".35" stroke-linecap="round"/><path d="M-74 22 a 74 18 -18 0 0 148 -46" fill="none" stroke="#FFE29A" stroke-width="6" transform="rotate(0)"/></g>
      <circle cx="96" cy="120" r="18" fill="#CFE3FF"/><circle cx="90" cy="114" r="4" fill="#AFC8EE"/><circle cx="102" cy="126" r="3" fill="#AFC8EE"/>
      <g transform="translate(150 200) rotate(-35)"><path d="M0 -26 C 12 -14 12 10 8 18 H -8 C -12 10 -12 -14 0 -26 Z" fill="#FFFFFF"/><circle cy="-6" r="5" fill="#7FB0FF"/><path d="M-8 12 L-16 22 L-8 20 Z M8 12 L16 22 L8 20 Z" fill="#F2A19B"/><path d="M-5 19 Q 0 34 5 19 Z" fill="#FFC14F"/></g>
      <path d="M30 40 L 90 70" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>`,
  },
  forest: {
    name: '숲속 동물 친구', color: '#5DAA62', ink: '#123117',
    svg: (id) => `
      <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8F2D2"/><stop offset="1" stop-color="#F3FBEF"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#${id}s)"/>
      ${tree(40, 150, 1.4, '#9AD08E', '#7CC37A')}${tree(360, 140, 1.5, '#9AD08E', '#7CC37A')}${tree(130, 170, 1.1)}${tree(290, 176, 1.05)}
      <path d="M0 220 Q 100 200 200 222 T 400 214 L400 300 L0 300 Z" fill="#A6D98F"/>
      <path d="M0 254 Q 130 236 250 256 T 400 250 L400 300 L0 300 Z" fill="#86C76F"/>
      <g transform="translate(176 232)"><ellipse cx="0" cy="0" rx="18" ry="14" fill="#FFFFFF"/><circle cx="0" cy="-16" r="11" fill="#FFFFFF"/><ellipse cx="-5" cy="-34" rx="3.6" ry="11" fill="#FFFFFF"/><ellipse cx="5" cy="-34" rx="3.6" ry="11" fill="#FFFFFF"/><ellipse cx="-5" cy="-34" rx="1.8" ry="7" fill="#FFC9D6"/><ellipse cx="5" cy="-34" rx="1.8" ry="7" fill="#FFC9D6"/><circle cx="-4" cy="-17" r="1.6" fill="#1F2A44"/><circle cx="4" cy="-17" r="1.6" fill="#1F2A44"/><ellipse cx="-8" cy="-12" rx="2.6" ry="1.6" fill="#F7A9A3"/><ellipse cx="8" cy="-12" rx="2.6" ry="1.6" fill="#F7A9A3"/></g>
      <g transform="translate(236 236)"><path d="M14 -6 C 34 -18 34 -44 18 -46 C 6 -46 10 -30 16 -24" fill="#D9925A"/><ellipse cx="0" cy="0" rx="14" ry="12" fill="#C47A45"/><circle cx="-2" cy="-14" r="9.5" fill="#C47A45"/><path d="M-8 -21 l-2 -8 l6 4 Z M3 -22 l3 -8 l3 7 Z" fill="#C47A45"/><circle cx="-5" cy="-15" r="1.5" fill="#1F2A44"/><circle cx="2" cy="-15" r="1.5" fill="#1F2A44"/><ellipse cx="-2" cy="-4" rx="7" ry="6" fill="#F3D2B0"/></g>
      <g transform="translate(320 250)"><path d="M-14 0 Q 0 -22 14 0 Z" fill="#F07C6E"/><rect x="-4" y="0" width="8" height="10" rx="3" fill="#FFF6E8"/><circle cx="-5" cy="-7" r="2.4" fill="#fff"/><circle cx="5" cy="-9" r="2" fill="#fff"/></g>
      <g transform="translate(80 256)"><path d="M-10 0 Q 0 -16 10 0 Z" fill="#F2B65C"/><rect x="-3" y="0" width="6" height="8" rx="2" fill="#FFF6E8"/></g>
      <g fill="#FFF7B0"><circle cx="110" cy="276" r="3.4"/><circle cx="270" cy="282" r="3.4"/><circle cx="360" cy="276" r="3"/></g>`,
  },

  // ---------- 2단계 ----------
  grid: {
    name: '모눈 공책', color: '#9DB6DA', ink: '#1F2E4D',
    svg: (id) => `
      <defs><pattern id="${id}g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0 H0 V20" fill="none" stroke="#C9D8EE" stroke-width="1"/></pattern></defs>
      <rect width="400" height="300" fill="#FDFBF6"/><rect width="400" height="300" fill="url(#${id}g)"/>
      <path d="M60 0 V300" stroke="#F2A19B" stroke-width="2" opacity=".7"/>
      <rect x="250" y="16" width="120" height="30" rx="4" fill="#F4C24F" opacity=".8" transform="rotate(8 310 31)"/>
      <path d="M262 22 l8 18 M282 22 l8 18 M302 22 l8 18 M322 22 l8 18 M342 22 l8 18" stroke="#fff" stroke-width="3" opacity=".5" transform="rotate(8 310 31)"/>
      ${star4(110, 220, 2.6, '#9DB6DA')}${star4(330, 200, 1.8, '#F2A19B')}
      <path d="M120 120 q 20 -30 40 0 t 40 0" stroke="#2F4A7A" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>`,
  },
  dots: {
    name: '구름 땡땡이', color: '#8EC3EC', ink: '#173351',
    svg: (id) => `
      <defs><pattern id="${id}d" width="80" height="64" patternUnits="userSpaceOnUse">
        ${cloud(20, 18, 0.28, '#FFFFFF', 0.95)}${cloud(60, 50, 0.28, '#FFFFFF', 0.95)}
      </pattern></defs>
      <rect width="400" height="300" fill="#BFE0F8"/><rect width="400" height="300" fill="url(#${id}d)"/>`,
  },

  // ---------- 3단계 ----------
  study: {
    name: '토리의 서재', color: '#B9835A', ink: '#2B1A0E',
    svg: (id) => `
      <defs><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7EBDC"/><stop offset="1" stop-color="#EBD9C4"/></linearGradient>
      <linearGradient id="${id}n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#253764"/><stop offset="1" stop-color="#3F5A94"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#${id}w)"/>
      <rect x="262" y="30" width="110" height="120" rx="8" fill="url(#${id}n)"/><circle cx="330" cy="70" r="14" fill="#FFF3C4"/>${dotsStars(14, 3, 100, 100, '#fff', 1).replace(/cx="([\d.]+)" cy="([\d.]+)"/g, (m, x, y) => `cx="${270 + +x}" cy="${36 + +y}"`)}
      <path d="M262 90 H372 M317 30 V150" stroke="#FFFFFF" stroke-width="6"/><rect x="262" y="30" width="110" height="120" rx="8" fill="none" stroke="#FFFFFF" stroke-width="8"/>
      <rect x="20" y="20" width="220" height="230" rx="8" fill="#B9835A"/>
      <rect x="30" y="30" width="200" height="62" fill="#8E5E39"/><rect x="30" y="100" width="200" height="62" fill="#8E5E39"/><rect x="30" y="170" width="200" height="62" fill="#8E5E39"/>
      ${bookRow(34, 34, 192, 58, ['#2F4A7A', '#F2A19B', '#F4C24F', '#7CC37A', '#FFFFFF', '#8E7AD6'], 3)}
      ${bookRow(34, 104, 192, 58, ['#F4C24F', '#2F4A7A', '#E98E72', '#9DB6DA', '#F2A19B'], 9)}
      ${bookRow(34, 174, 150, 58, ['#7CC37A', '#FFFFFF', '#2F4A7A', '#F2A19B'], 21)}
      <rect x="0" y="250" width="400" height="50" fill="#C99A6E"/>
      <rect x="250" y="210" width="140" height="12" rx="4" fill="#9C6B3F"/><rect x="262" y="222" width="10" height="40" fill="#9C6B3F"/><rect x="368" y="222" width="10" height="40" fill="#9C6B3F"/>
      <path d="M350 210 V170 L326 152" stroke="#2F4A7A" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M308 150 L344 136 L352 158 Z" fill="#F4C24F"/><path d="M314 158 L300 196 L360 196 L352 158" fill="#FFF3C4" opacity=".5"/>
      <rect x="276" y="192" width="44" height="9" rx="2" fill="#F2A19B"/><rect x="272" y="200" width="52" height="10" rx="2" fill="#2F4A7A"/>
      <path d="M282 192 C 280 168, 316 168, 314 192" stroke="#FFFFFF" stroke-width="5" fill="none"/><rect x="276" y="180" width="9" height="14" rx="4" fill="#FFFFFF"/><rect x="311" y="180" width="9" height="14" rx="4" fill="#FFFFFF"/>`,
  },
  sea: {
    name: '바닷속 도서관', color: '#2B8FA8', ink: '#F2FCFF',
    svg: (id) => `
      <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FD3E0"/><stop offset="1" stop-color="#1D6F8C"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#${id}s)"/>
      <g fill="#fff" opacity=".18"><path d="M40 0 L90 0 L160 300 L110 300 Z"/><path d="M220 0 L250 0 L300 300 L270 300 Z"/></g>
      <rect x="130" y="110" width="140" height="150" rx="10" fill="#E9C9A0"/><rect x="140" y="120" width="120" height="40" fill="#C69C6D"/><rect x="140" y="168" width="120" height="40" fill="#C69C6D"/><rect x="140" y="216" width="120" height="36" fill="#C69C6D"/>
      ${bookRow(143, 122, 114, 38, ['#F2A19B', '#FFE29A', '#FFFFFF', '#8E7AD6'], 5)}${bookRow(143, 170, 114, 38, ['#FFFFFF', '#F4C24F', '#7CC37A', '#F2A19B'], 13)}${bookRow(143, 218, 90, 34, ['#8E7AD6', '#FFE29A', '#FFFFFF'], 17)}
      <path d="M0 270 Q 100 252 200 270 T 400 266 L400 300 L0 300 Z" fill="#F2D7A6"/>
      <path d="M40 270 C 30 230, 60 220, 46 190 M54 270 C 64 240, 40 226, 58 200" stroke="#3FAE7A" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M350 272 C 340 240, 366 226, 352 196" stroke="#3FAE7A" stroke-width="7" fill="none" stroke-linecap="round"/>
      <g transform="translate(320 250)"><path d="M0 0 C -6 -20 6 -28 0 -44 M0 -18 C 10 -26 16 -22 20 -34 M0 -26 C -10 -30 -16 -26 -20 -36" stroke="#F28CA6" stroke-width="6" fill="none" stroke-linecap="round"/></g>
      ${fish(70, 90, 1, '#FFC14F')}${fish(330, 70, 0.8, '#F2A19B', -1)}${fish(300, 150, 0.65, '#FFFFFF', -1)}${fish(90, 160, 0.6, '#8EF0D1')}
      <g fill="none" stroke="#fff" stroke-width="2" opacity=".8"><circle cx="110" cy="60" r="6"/><circle cx="120" cy="40" r="4"/><circle cx="104" cy="26" r="3"/><circle cx="290" cy="100" r="5"/><circle cx="296" cy="80" r="3"/></g>`,
  },

  // ---------- 4단계 (움직임) ----------
  firefly: {
    name: '반딧불 여름밤', color: '#2C5A4C', ink: '#F2FFF7', animated: true,
    svg: (id) => `
      <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14263F"/><stop offset="1" stop-color="#22504A"/></linearGradient>
      <radialGradient id="${id}g"><stop offset="0" stop-color="#FFF9B0"/><stop offset=".4" stop-color="#F5F27A" stop-opacity=".7"/><stop offset="1" stop-color="#F5F27A" stop-opacity="0"/></radialGradient></defs>
      <rect width="400" height="300" fill="url(#${id}s)"/>
      ${dotsStars(30, 5, 400, 140, '#FFFFFF', 1)}
      <circle cx="80" cy="60" r="20" fill="#FFF6D6"/>
      ${tree(330, 190, 1.5, '#2F6B55', '#25594A')}${tree(60, 210, 1.2, '#2F6B55', '#25594A')}
      <path d="M0 240 Q 100 222 200 240 T 400 236 L400 300 L0 300 Z" fill="#1E4A3E"/>
      <g stroke="#2F6B55" stroke-width="3" stroke-linecap="round">${Array.from({ length: 30 }, (_, i) => `<path d="M${i * 14} 300 q 2 -${14 + (i % 4) * 5} ${4 + (i % 3)} -${22 + (i % 5) * 4}"/>`).join('')}</g>
      <g class="anim-fireflies">${Array.from({ length: 12 }, (_, i) => `<circle class="ff ff${i % 4}" cx="${30 + ((i * 67) % 340)}" cy="${80 + ((i * 41) % 160)}" r="10" fill="url(#${id}g)" style="animation-delay:-${(i * 1.7).toFixed(1)}s"/>`).join('')}</g>`,
  },
  bubble: {
    name: '비눗방울 놀이터', color: '#7FC7E8', ink: '#123247', animated: true,
    svg: (id) => `
      <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ED8FF"/><stop offset="1" stop-color="#E6F7FF"/></linearGradient>
      <radialGradient id="${id}b" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".9"/><stop offset=".55" stop-color="#E7F5FF" stop-opacity=".25"/><stop offset=".85" stop-color="#C8B6FF" stop-opacity=".35"/><stop offset="1" stop-color="#9FE3FF" stop-opacity=".7"/></radialGradient></defs>
      <rect width="400" height="300" fill="url(#${id}s)"/>
      ${cloud(80, 60, 0.9)}${cloud(300, 40, 0.7, '#fff', 0.9)}
      <path d="M0 236 Q 120 220 240 238 T 400 232 L400 300 L0 300 Z" fill="#9FDB8A"/>
      <g transform="translate(240 150)"><rect x="0" y="0" width="10" height="92" fill="#F2A19B"/><rect x="40" y="0" width="10" height="92" fill="#F2A19B"/><rect x="-4" y="-6" width="58" height="10" rx="4" fill="#F4C24F"/><path d="M50 10 C 90 30, 100 70, 130 86" stroke="#7FB0FF" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M4 30 H46 M4 50 H46 M4 70 H46" stroke="#F2A19B" stroke-width="6"/></g>
      <g class="anim-bubbles">${Array.from({ length: 11 }, (_, i) => `<circle class="bb bb${i % 3}" cx="${24 + ((i * 59) % 350)}" cy="${120 + ((i * 47) % 150)}" r="${9 + (i % 4) * 5}" fill="url(#${id}b)" stroke="#FFFFFF" stroke-opacity=".8" stroke-width="1.4" style="animation-delay:-${(i * 1.9).toFixed(1)}s"/>`).join('')}</g>`,
  },

  // ---------- 5단계 (특별 세트) ----------
  cloudlib: {
    name: '구름 위 도서관', color: '#B7A6F2', ink: '#251A52', animated: true,
    svg: (id) => `
      <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C7B8FF"/><stop offset=".6" stop-color="#FFD6E7"/><stop offset="1" stop-color="#FFF0DA"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#${id}s)"/>
      <g fill="none" stroke-width="10" opacity=".5" stroke-linecap="round"><path d="M30 250 A 170 170 0 0 1 370 250" stroke="#FF9AA2"/><path d="M48 250 A 152 152 0 0 1 352 250" stroke="#FFD27A"/><path d="M66 250 A 134 134 0 0 1 334 250" stroke="#9EE6A8"/><path d="M84 250 A 116 116 0 0 1 316 250" stroke="#8FC7FF"/></g>
      ${cloud(80, 230, 1.8)}${cloud(320, 236, 1.9)}${cloud(200, 262, 2.4)}
      <g transform="translate(150 150)"><rect x="0" y="0" width="100" height="80" rx="8" fill="#FFFFFF"/><rect x="8" y="8" width="84" height="30" fill="#E9E2FF"/><rect x="8" y="44" width="84" height="30" fill="#E9E2FF"/>${bookRow(10, 10, 80, 28, ['#8E7AD6', '#F2A19B', '#F4C24F', '#7FB0FF'], 4)}${bookRow(10, 46, 80, 28, ['#F4C24F', '#7CC37A', '#8E7AD6', '#F2A19B'], 8)}</g>
      <g class="anim-float">
        <g transform="translate(70 90) rotate(-12)"><path d="M0 0 L22 -6 L22 18 L0 24 Z" fill="#2F4A7A"/><path d="M0 0 L-22 -6 L-22 18 L0 24 Z" fill="#F2A19B"/><path d="M-22 -2 q -16 -14 -26 -2 q 12 0 26 10 Z M22 -2 q 16 -14 26 -2 q -12 0 -26 10 Z" fill="#FFFFFF"/></g>
        <g transform="translate(320 80) rotate(10)"><path d="M0 0 L18 -5 L18 15 L0 20 Z" fill="#F4C24F"/><path d="M0 0 L-18 -5 L-18 15 L0 20 Z" fill="#7FB0FF"/><path d="M-18 -2 q -14 -12 -22 -2 q 10 0 22 8 Z M18 -2 q 14 -12 22 -2 q -10 0 -22 8 Z" fill="#FFFFFF"/></g>
      </g>
      ${star4(200, 40, 2, '#FFFFFF')}${star4(260, 60, 1.2, '#FFFFFF')}${star4(140, 54, 1.4, '#FFFFFF')}`,
  },
  spacelib: {
    name: '한밤의 우주 도서관', color: '#2B2466', ink: '#F5F2FF', animated: true,
    svg: (id) => `
      <defs><radialGradient id="${id}s" cx="60%" cy="40%" r="90%"><stop offset="0" stop-color="#3B2F8F"/><stop offset="1" stop-color="#0E0A2B"/></radialGradient></defs>
      <rect width="400" height="300" fill="url(#${id}s)"/>
      ${dotsStars(110, 23, 400, 300, '#FFFFFF', 1.5)}
      <g stroke="#9DB6FF" stroke-width="1.2" opacity=".6" fill="none"><path d="M40 60 L80 40 L120 70 L150 50"/><path d="M290 220 L330 200 L360 230"/></g>
      <g fill="#FFFFFF"><circle cx="40" cy="60" r="2.4"/><circle cx="80" cy="40" r="2.4"/><circle cx="120" cy="70" r="2.4"/><circle cx="150" cy="50" r="2.4"/><circle cx="290" cy="220" r="2.4"/><circle cx="330" cy="200" r="2.4"/><circle cx="360" cy="230" r="2.4"/></g>
      <circle cx="320" cy="80" r="34" fill="#F4C24F"/><path d="M296 70 q 24 10 48 -2" stroke="#fff" stroke-width="5" opacity=".35" fill="none" stroke-linecap="round"/>
      <circle cx="70" cy="220" r="20" fill="#7FD3E0"/>
      <g class="anim-float">
        <g transform="translate(150 120) rotate(-6)"><rect x="0" y="0" width="110" height="70" rx="8" fill="#5B4CC2" stroke="#9DB6FF" stroke-width="2"/><rect x="8" y="8" width="94" height="24" fill="#3B2F8F"/><rect x="8" y="38" width="94" height="24" fill="#3B2F8F"/>${bookRow(10, 10, 90, 22, ['#F4C24F', '#F2A19B', '#FFFFFF', '#7FD3E0'], 6)}${bookRow(10, 40, 90, 22, ['#FFFFFF', '#7FD3E0', '#F4C24F', '#F2A19B'], 12)}</g>
        <g transform="translate(250 230) rotate(14)"><rect x="0" y="0" width="70" height="40" rx="6" fill="#5B4CC2" stroke="#9DB6FF" stroke-width="2"/><rect x="6" y="6" width="58" height="28" fill="#3B2F8F"/>${bookRow(8, 8, 54, 26, ['#F2A19B', '#F4C24F', '#FFFFFF'], 15)}</g>
      </g>
      ${star4(210, 40, 2, '#FFF4C2')}${star4(110, 250, 1.4, '#CDE7FF')}`,
  },
};

// 표지 SVG 만들기
export function coverSVG(id, label) {
  const c = COVERS[id] || COVERS.spring;
  const gid = uid();
  const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="cover-art${c.animated ? ' cover-anim' : ''}" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" ${aria} xmlns="http://www.w3.org/2000/svg">${c.svg(gid)}</svg>`;
}

export function coverMeta(id) {
  return COVERS[id] || COVERS.spring;
}

// 쪽 테두리 (특별 세트)
export const FRAMES = {
  cloud: { name: '구름 테두리', color: '#B7A6F2' },
  space: { name: '별 테두리', color: '#2B2466' },
};
