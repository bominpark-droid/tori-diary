// 토리 그림 (보호자가 준 사진을 바탕으로 다시 그린 SVG). docs/DESIGN.md 1.2
// toriSVG('happy') 처럼 표정 이름을 넣으면 SVG 글을 돌려줍니다.
// 표정: smile wave read think wow happy cheer sleepy listen

let counter = 0;

const MOODS = {
  smile: { eyes: 'dot', mouth: 'smile', arms: 'down' },
  wave: { eyes: 'dot', mouth: 'smile', arms: 'wave' },
  read: { eyes: 'down', mouth: 'smile', arms: 'hold', extra: ['book'] },
  think: { eyes: 'up', mouth: 'flat', arms: 'down', extra: ['dots'] },
  wow: { eyes: 'big', mouth: 'o', arms: 'down' },
  happy: { eyes: 'happy', mouth: 'grin', arms: 'down', extra: ['sparkle'] },
  cheer: { eyes: 'happy', mouth: 'grin', arms: 'up', extra: ['sparkle'] },
  sleepy: { eyes: 'closed', mouth: 'flat', arms: 'down', extra: ['zzz'] },
  listen: { eyes: 'closed', mouth: 'smile', arms: 'down', extra: ['notes'] },
};

export const TORI_MOODS = Object.keys(MOODS);

const INK = '#1F1B1A';
const LINE = '#D6CEC2';
const SEAM = '#CFC5B7';

function eyes(kind) {
  const L = 77;
  const R = 143;
  const Y = 100;
  const bead = (cx, cy, r, hl = 1) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK}"/>` +
    `<circle cx="${cx - r * 0.33}" cy="${cy - r * 0.36}" r="${r * 0.33 * hl}" fill="#fff"/>` +
    `<circle cx="${cx + r * 0.3}" cy="${cy + r * 0.32}" r="${r * 0.13 * hl}" fill="#fff" opacity=".75"/>`;
  const arc = (cx, up) =>
    up
      ? `<path d="M${cx - 8.5} ${Y + 3} Q ${cx} ${Y - 8} ${cx + 8.5} ${Y + 3}" stroke="${INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`
      : `<path d="M${cx - 8.5} ${Y - 1} Q ${cx} ${Y + 7} ${cx + 8.5} ${Y - 1}" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  switch (kind) {
    case 'happy':
      return arc(L, true) + arc(R, true);
    case 'closed':
      return arc(L, false) + arc(R, false);
    case 'big':
      return bead(L, Y - 1, 10.5, 1.15) + bead(R, Y - 1, 10.5, 1.15);
    case 'down':
      return bead(L, Y + 3, 8.2) + bead(R, Y + 3, 8.2);
    case 'up':
      return bead(L + 2, Y - 3, 8.5) + bead(R + 2, Y - 3, 8.5);
    default:
      return bead(L, Y, 8.6) + bead(R, Y, 8.6);
  }
}

function mouth(kind) {
  switch (kind) {
    case 'grin':
      return (
        `<path d="M99.5 104.5 Q 110 121 120.5 104.5 Z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
        `<path d="M104.5 111.5 Q 110 117.5 115.5 111.5 Q 110 109.5 104.5 111.5 Z" fill="#F0928C"/>`
      );
    case 'o':
      return `<ellipse cx="110" cy="109" rx="4.6" ry="5.6" fill="${INK}"/>`;
    case 'flat':
      return `<path d="M103 107 Q 110 110.5 117 107" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
    default:
      return `<path d="M100 104.6 Q 101.6 103.4 102.9 105 Q 110 113.2 117.1 105 Q 118.4 103.4 120 104.6" stroke="${INK}" stroke-width="2.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
}

function arm(cx, cy, rot, fill, cls = '') {
  return `<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="15" ry="27" transform="rotate(${rot} ${cx} ${cy})" fill="${fill}" stroke="${LINE}" stroke-width="1.5"/>`;
}

// back: 머리 뒤에 그리는 팔, front: 머리 앞에 그리는 팔(든 팔)
function arms(kind, fill) {
  switch (kind) {
    case 'wave':
      return {
        back: arm(70, 186, 24, fill),
        front: `<g class="t-wave">${arm(178, 142, 38, fill)}</g>`,
      };
    case 'up':
      return {
        back: '',
        front: `<g class="t-cheer-l">${arm(42, 142, -38, fill)}</g><g class="t-cheer-r">${arm(178, 142, 38, fill)}</g>`,
      };
    case 'hold':
      return { back: arm(72, 192, 30, fill) + arm(148, 192, -30, fill), front: '' };
    default:
      return { back: arm(70, 186, 24, fill) + arm(150, 186, -24, fill), front: '' };
  }
}

function book() {
  return `<g class="t-book">
    <path d="M110 176 C 94 166, 74 164, 56 168 L58 222 C 76 218, 94 220, 110 228 Z" fill="#2F4A7A"/>
    <path d="M110 176 C 126 166, 146 164, 164 168 L162 222 C 144 218, 126 220, 110 228 Z" fill="#2F4A7A"/>
    <path d="M110 180 C 95 171, 78 170, 62 173 L63 217 C 79 214, 95 216, 110 223 Z" fill="#FFFDF8"/>
    <path d="M110 180 C 125 171, 142 170, 158 173 L157 217 C 141 214, 125 216, 110 223 Z" fill="#F3EDE3"/>
    <path d="M71 182 L101 186 M71 190 L101 194 M71 198 L101 202 M71 206 L94 209" stroke="#CFC6B8" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M119 186 L149 182 M119 194 L149 190 M119 202 L141 199" stroke="#D8CFC2" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M110 180 L110 223" stroke="#D9CFC0" stroke-width="1.6"/>
    <ellipse cx="60" cy="204" rx="9" ry="11" fill="#F7F3ED" stroke="#D6CEC2" stroke-width="1.4"/>
    <ellipse cx="160" cy="204" rx="9" ry="11" fill="#F7F3ED" stroke="#D6CEC2" stroke-width="1.4"/>
  </g>`;
}

function extras(list) {
  let out = '';
  for (const kind of list) {
    if (kind === 'notes') {
      out += `<g class="t-notes">
        <g class="t-note n1"><ellipse cx="192" cy="64" rx="5.6" ry="4.4" transform="rotate(-22 192 64)" fill="#2F4A7A"/><path d="M197 62 V44 Q 204 46 206 53" stroke="#2F4A7A" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>
        <g class="t-note n2"><ellipse cx="206" cy="34" rx="4.4" ry="3.5" transform="rotate(-22 206 34)" fill="#F2A19B"/><path d="M210 32.5 V19" stroke="#F2A19B" stroke-width="2.3" stroke-linecap="round"/></g>
      </g>`;
    } else if (kind === 'sparkle') {
      const star = (x, y, s, c) =>
        `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 C 1.4 -2.6, 2.6 -1.4, 10 0 C 2.6 1.4, 1.4 2.6, 0 10 C -1.4 2.6, -2.6 1.4, -10 0 C -2.6 -1.4, -1.4 -2.6, 0 -10 Z" fill="${c}"/>`;
      out += `<g class="t-sparkle">${star(30, 40, 1, '#F4C24F')}${star(192, 30, 0.8, '#F2A19B')}${star(202, 84, 0.6, '#F4C24F')}</g>`;
    } else if (kind === 'zzz') {
      out += `<g class="t-zzz" stroke="#8D96AE" stroke-width="2.8" fill="none" stroke-linejoin="round" stroke-linecap="round">
        <path class="z1" d="M180 44 h11 l-11 12 h11"/>
        <path class="z2" d="M198 22 h8 l-8 9 h8"/>
      </g>`;
    } else if (kind === 'dots') {
      out += `<g class="t-dots">
        <circle cx="160" cy="70" r="3" fill="#fff" stroke="${LINE}" stroke-width="1.5"/>
        <circle cx="170" cy="56" r="5" fill="#fff" stroke="${LINE}" stroke-width="1.5"/>
        <ellipse cx="192" cy="34" rx="20" ry="15" fill="#fff" stroke="${LINE}" stroke-width="1.5"/>
        <circle cx="184" cy="34" r="2.6" fill="#8D96AE"/><circle cx="192" cy="34" r="2.6" fill="#8D96AE"/><circle cx="200" cy="34" r="2.6" fill="#8D96AE"/>
      </g>`;
    }
  }
  return out;
}

export function toriSVG(mood = 'smile', opts = {}) {
  const m = MOODS[mood] || MOODS.smile;
  const id = `tori${++counter}`;
  const fuzzy = opts.fuzzy !== false;
  const extra = (m.extra || []).slice();
  if (opts.notes && !extra.includes('notes')) extra.push('notes');
  const label = opts.label || '토리';
  const fur = `url(#${id}f)`;
  const body = `url(#${id}b)`;
  const noBlink = m.eyes === 'happy' || m.eyes === 'closed' ? ' no-blink' : '';
  const armSet = arms(m.arms, body);
  const headOnly = opts.headOnly === true;
  return `<svg class="tori tori-${mood}${noBlink}" viewBox="0 0 220 260" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="${id}f" cx="38%" cy="26%" r="82%">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#F8F5F0"/><stop offset="1" stop-color="#E2DAce"/>
    </radialGradient>
    <radialGradient id="${id}b" cx="40%" cy="22%" r="88%">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset=".58" stop-color="#F5F1EA"/><stop offset="1" stop-color="#DDD4C7"/>
    </radialGradient>
    <linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E3DCD1"/>
    </linearGradient>
    <filter id="${id}k" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.8"/></filter>
    ${fuzzy ? `<filter id="${id}z" x="-4%" y="-4%" width="108%" height="108%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/></filter>` : ''}
  </defs>
  ${headOnly ? '' : '<ellipse cx="110" cy="250" rx="68" ry="7" fill="#25304A" opacity=".10"/>'}
  <g class="t-all">
    ${headOnly ? '' : `<ellipse cx="80" cy="232" rx="29" ry="16" fill="${body}" stroke="${LINE}" stroke-width="1.5"/>
    <ellipse cx="140" cy="232" rx="29" ry="16" fill="${body}" stroke="${LINE}" stroke-width="1.5"/>
    <path d="M62 233 Q 80 225 98 233 M122 233 Q 140 225 158 233" stroke="${SEAM}" stroke-width="1.4" fill="none" stroke-dasharray="2.5 3"/>
    <path d="M73 160 C 64 196, 70 230, 110 232 C 150 230, 156 196, 147 160 C 139 146, 81 146, 73 160 Z" fill="${body}" stroke="${LINE}" stroke-width="1.5"${fuzzy ? ` filter="url(#${id}z)"` : ''}/>
    <path d="M110 160 L110 228" stroke="${SEAM}" stroke-width="1.5" stroke-dasharray="3 4" fill="none"/>
    ${armSet.back}`}
    <g class="t-head">
      <ellipse cx="110" cy="96" rx="76" ry="68" fill="${fur}" stroke="#D9D1C5" stroke-width="1.5"${fuzzy ? ` filter="url(#${id}z)"` : ''}/>
      <path d="M50 70 C 78 46, 142 46, 170 70" stroke="${SEAM}" stroke-width="1.6" fill="none" stroke-dasharray="3 5" opacity=".85"/>
      <ellipse cx="66" cy="118" rx="13" ry="7.5" fill="#F4A7A3" opacity=".78" filter="url(#${id}k)"/>
      <ellipse cx="154" cy="118" rx="13" ry="7.5" fill="#F4A7A3" opacity=".78" filter="url(#${id}k)"/>
      <g class="t-eyes">${eyes(m.eyes)}</g>
      ${mouth(m.mouth)}
      <path d="M40 106 C 30 -10, 190 -10, 180 106" stroke="#E0D9CE" stroke-width="15" fill="none" stroke-linecap="round"/>
      <path d="M40 106 C 30 -10, 190 -10, 180 106" stroke="#FBF9F6" stroke-width="10.5" fill="none" stroke-linecap="round"/>
      <rect x="29" y="64" width="13" height="16" rx="5" fill="#F3F0EA" stroke="${LINE}" stroke-width="1.2"/>
      <rect x="178" y="64" width="13" height="16" rx="5" fill="#F3F0EA" stroke="${LINE}" stroke-width="1.2"/>
      <rect x="14" y="76" width="42" height="68" rx="20" fill="url(#${id}c)" stroke="${LINE}" stroke-width="1.5"/>
      <rect x="44" y="83" width="16" height="54" rx="8" fill="#ECE6DC" stroke="${LINE}" stroke-width="1"/>
      <rect x="164" y="76" width="42" height="68" rx="20" fill="url(#${id}c)" stroke="${LINE}" stroke-width="1.5"/>
      <rect x="160" y="83" width="16" height="54" rx="8" fill="#ECE6DC" stroke="${LINE}" stroke-width="1"/>
      <path d="M22 96 Q 24 88 32 86" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>
      <path d="M172 96 Q 174 88 182 86" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>
    </g>
    ${headOnly ? '' : armSet.front}
    ${!headOnly && m.arms === 'hold' ? book() : ''}
    ${extras(extra)}
  </g>
</svg>`;
}

// 작은 얼굴 (스티커, 아이콘용): 머리와 헤드폰만
export function toriFaceSVG(mood = 'smile', opts = {}) {
  const full = toriSVG(mood, { fuzzy: false, ...opts, headOnly: true });
  return full.replace('viewBox="0 0 220 260"', 'viewBox="4 2 212 166"');
}

// 화면 요소로 만들기
export function toriNode(mood = 'smile', opts = {}) {
  const box = document.createElement('div');
  box.className = `tori-box ${opts.size ? `tori-${opts.size}` : ''}`.trim();
  box.innerHTML = toriSVG(mood, opts);
  return box;
}

// 표정 바꾸기 (같은 상자 안에서)
export function setMood(box, mood, opts = {}) {
  if (!box) return;
  box.innerHTML = toriSVG(mood, opts);
}
