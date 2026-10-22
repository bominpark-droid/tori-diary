// 화면 공통 부품: 아이콘, 토리 말풍선, 아래 창, 확인 창, 알림 띠, 탭 막대, 쓰기 흐름 막대, 용돈 배지.
// 모양(CSS)은 css/base.css, 움직임은 css/art.css에 있습니다.

import { h, svg, clear, won } from './util.js';
import { toriNode } from './tori.js';

// ---------- 아이콘 (선 굵기 2.2, 24×24) ----------
const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const ICONS = {
  home: I('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  book: I('<path d="M4 5c3-1.4 5.6-1.4 8 0v15c-2.4-1.4-5-1.4-8 0z"/><path d="M12 5c2.4-1.4 5-1.4 8 0v15c-3-1.4-5.6-1.4-8 0"/>'),
  wallet: I('<path d="M5 7.5V6a2 2 0 0 1 2-2h10v3.5"/><rect x="3.5" y="7.5" width="17" height="12.5" rx="2.5"/><path d="M16.5 12.5h4v4h-4a2 2 0 0 1 0-4z"/>'),
  gear: I('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M4.2 16.5l2.2-1.3M17.6 8.8l2.2-1.3"/><circle cx="12" cy="12" r="7"/>'),
  phones: I('<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="5" height="7" rx="2.2"/><rect x="16" y="14" width="5" height="7" rx="2.2"/>'),
  phonesOff: I('<path d="M4 15v-3a8 8 0 0 1 12.4-6.7M20 12v3"/><rect x="3" y="14" width="5" height="7" rx="2.2"/><rect x="16" y="14" width="5" height="7" rx="2.2"/><path d="M3 3l18 18"/>'),
  back: I('<path d="M15 5l-7 7 7 7"/>'),
  next: I('<path d="M9 5l7 7-7 7"/>'),
  close: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  mic: I('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
  camera: I('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.6"/>'),
  keyboard: I('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
  star: I('<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>'),
  starOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="#F4C24F" stroke="#C98A12" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  check: I('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  letter: I('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>'),
  lock: I('<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  help: I('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.6v.4M12 17h.01"/>'),
  pencil: I('<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>'),
  trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  sparkle: I('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
  moon: I('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  eye: I('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  download: I('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  upload: I('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
};

// 날씨 (색이 있는 작은 그림)
export const WEATHER_ICONS = {
  sun: '<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="#F4A93A" stroke-width="2.6" stroke-linecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/></g><circle cx="16" cy="16" r="6.5" fill="#FFD25E" stroke="#F4A93A" stroke-width="2"/></svg>',
  cloud: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 24a5.5 5.5 0 0 1-.6-11A7.5 7.5 0 0 1 22.6 11 6.5 6.5 0 0 1 23 24z" fill="#E6EDF7" stroke="#8BA0BE" stroke-width="2" stroke-linejoin="round"/></svg>',
  rain: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 19a5 5 0 0 1-.5-10A7 7 0 0 1 21.7 7.6 6 6 0 0 1 22 19z" fill="#CFE0F6" stroke="#7D95B8" stroke-width="2" stroke-linejoin="round"/><g stroke="#4C86D6" stroke-width="2.4" stroke-linecap="round"><path d="M11 23l-1.5 4M16.5 23 15 27M22 23l-1.5 4"/></g></svg>',
  snow: '<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="#6FA6E0" stroke-width="2.4" stroke-linecap="round"><path d="M16 4v24M5.6 10l20.8 12M5.6 22l20.8-12"/><path d="M12.5 6 16 9l3.5-3M12.5 26l3.5-3 3.5 3"/></g></svg>',
  wind: '<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="#6FAFD6" stroke-width="2.6" stroke-linecap="round"><path d="M4 12h15a3.5 3.5 0 1 0-3.5-3.5"/><path d="M4 18h20a3.5 3.5 0 1 1-3.5 3.5"/><path d="M4 24h9"/></g></svg>',
};

// 하루 칸 그림
export const SLOT_ICONS = {
  sunrise: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 22h24" stroke="#8BA0BE" stroke-width="2.4" stroke-linecap="round"/><path d="M9 22a7 7 0 0 1 14 0z" fill="#FFD25E" stroke="#F4A93A" stroke-width="2"/><g stroke="#F4A93A" stroke-width="2.2" stroke-linecap="round"><path d="M16 6v4M7 11l2.4 2.4M25 11l-2.4 2.4"/></g></svg>',
  book: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 8c4-1.8 7.5-1.8 11 0v17c-3.5-1.8-7-1.8-11 0z" fill="#9DB8F2" stroke="#2F4A7A" stroke-width="2" stroke-linejoin="round"/><path d="M16 8c3.5-1.8 7-1.8 11 0v17c-4-1.8-7.5-1.8-11 0z" fill="#C9D8F7" stroke="#2F4A7A" stroke-width="2" stroke-linejoin="round"/></svg>',
  ball: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" fill="#FF9A8A" stroke="#B24F49" stroke-width="2"/><path d="M6 13c6 2 14 2 20 0M6.5 20c6-2 13-2 19 0" stroke="#fff" stroke-width="2" fill="none"/></svg>',
  bowl: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 15h24a12 12 0 0 1-24 0z" fill="#F7D9A8" stroke="#C48F5E" stroke-width="2" stroke-linejoin="round"/><path d="M9 14c0-3 3-5 7-5s7 2 7 5" fill="#FFFFFF" stroke="#C48F5E" stroke-width="2"/><path d="M20 4l-4 9M24 5l-6 8" stroke="#8C5A3A" stroke-width="2" stroke-linecap="round"/></svg>',
  bag: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 8a4 4 0 0 1 8 0" fill="none" stroke="#2F4A7A" stroke-width="2.2"/><rect x="6" y="8" width="20" height="20" rx="6" fill="#7FB0FF" stroke="#2F4A7A" stroke-width="2"/><rect x="10" y="17" width="12" height="7" rx="2.5" fill="#5D8FE0" stroke="#2F4A7A" stroke-width="1.8"/></svg>',
  moon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M25 19.5A10 10 0 0 1 12.5 7 10 10 0 1 0 25 19.5z" fill="#FFE07A" stroke="#C98A12" stroke-width="2" stroke-linejoin="round"/></svg>',
  magnifier: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="14" cy="14" r="8" fill="#DFF3EA" stroke="#3E8F70" stroke-width="2.4"/><path d="m20 20 7 7" stroke="#3E8F70" stroke-width="3" stroke-linecap="round"/></svg>',
};

export function icon(name, cls) {
  return svg(ICONS[name] || '', cls ? `ico ${cls}` : 'ico');
}

export function coinSVG() {
  return '<svg class="coin" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#F4C24F" stroke="#C98A12" stroke-width="2"/><circle cx="16" cy="16" r="9.5" fill="none" stroke="#FFF2C2" stroke-width="2"/><path d="M11.5 12.5 13 20l3-5 3 5 1.5-7.5" fill="none" stroke="#9C6B0F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

// ---------- 토리 말풍선 ----------
// lines: 글자 또는 요소의 배열. 한 줄이 한 문단입니다(말풍선 하나에 두 문장 이내 권장).
export function bubble(lines, cls) {
  const list = Array.isArray(lines) ? lines : [lines];
  return h('div', { class: ['bubble', 'bubble-in', cls], role: 'status', 'aria-live': 'polite' },
    list.filter(Boolean).map((l) => (l instanceof Node ? l : h('p', null, l))));
}

export function talk(mood, lines, opts = {}) {
  const tori = toriNode(mood, { size: opts.size || 'sm', notes: opts.notes, label: opts.label || '토리' });
  return h('div', { class: ['talk', opts.cls] }, tori, bubble(lines, opts.bubbleCls));
}

// 말풍선 글만 바꾸기
export function sayIn(talkEl, lines) {
  const old = talkEl.querySelector('.bubble');
  const next = bubble(lines);
  if (old) old.replaceWith(next);
  else talkEl.appendChild(next);
  return next;
}

// 아이 글 인용을 강조해서 보여 주는 문장 (‘…’ 부분에 색)
export function withQuotes(text) {
  const parts = String(text).split(/(‘[^’]*’)/);
  return h('p', null, parts.map((p) => (p.startsWith('‘') ? h('span', { class: 'quote' }, p) : p)));
}

// ---------- 아래 창 ----------
let openCount = 0;
export function openSheet(build, opts = {}) {
  const layer = document.getElementById('layer') || document.body;
  const prevFocus = document.activeElement;
  const sheetEl = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label || '창', tabindex: '-1' });
  const veil = h('div', { class: 'veil' }, sheetEl);
  let closed = false;
  const close = (result) => {
    if (closed) return;
    closed = true;
    veil.remove();
    openCount--;
    document.removeEventListener('keydown', onKey);
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    if (opts.onClose) opts.onClose(result);
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && opts.dismissable !== false) close();
  };
  if (opts.dismissable !== false) {
    veil.addEventListener('click', (e) => {
      if (e.target === veil) close();
    });
  }
  sheetEl.appendChild(h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }));
  const content = build(close);
  if (content) sheetEl.appendChild(content);
  layer.appendChild(veil);
  openCount++;
  document.addEventListener('keydown', onKey);
  setTimeout(() => {
    const first = sheetEl.querySelector('[autofocus]') || sheetEl;
    first.focus();
  }, 30);
  return { close, el: sheetEl };
}

export function sheetOpen() {
  return openCount > 0;
}

// 화면 안 확인 창 (브라우저 confirm 대신). 돌려주는 값: true / false
export function ask({ title, body, yes = '좋아', no = '다음에', mood, danger = false, extra }) {
  return new Promise((resolve) => {
    openSheet((close) => h('div', { class: 'stack' },
      mood ? talk(mood, [title], { size: 'sm' }) : h('h2', null, title),
      body ? (body instanceof Node ? body : h('p', { class: 'muted' }, body)) : null,
      extra || null,
      h('div', { class: 'btn-row' },
        h('button', { class: ['btn', danger ? 'btn-blush' : 'btn-primary', 'btn-big'], type: 'button', on: { click: () => close(true) } }, yes),
        h('button', { class: 'btn btn-soft btn-big', type: 'button', on: { click: () => close(false) } }, no))), {
      label: title,
      onClose: (r) => resolve(r === true),
    });
  });
}

// ---------- 알림 띠 ----------
let toastTimer = null;
export function toast(text, ms = 2600) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = h('div', { class: 'toast', role: 'status' }, text);
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), ms);
}

// ---------- 용돈 배지 ----------
export function coinBadge(amount, opts = {}) {
  const el = h(opts.href === null ? 'span' : 'a', {
    class: ['coin-badge', opts.hop ? 'coin-hop' : null],
    href: opts.href === null ? undefined : opts.href || '#/wallet',
    'aria-label': `용돈 ${won(amount)}${opts.href === null ? '' : ', 용돈 화면으로 가기'}`,
  });
  el.innerHTML = coinSVG();
  el.appendChild(h('span', null, won(amount)));
  return el;
}

// ---------- 켜고 끄는 단추, 고르기 묶음, 칩 ----------
export function switchEl({ checked, onChange, label }) {
  const b = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': checked ? 'true' : 'false', 'aria-label': label });
  b.addEventListener('click', () => {
    const next = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', next ? 'true' : 'false');
    onChange(next);
  });
  return b;
}

export function switchRow(label, checked, onChange, note) {
  return h('div', { class: 'switch-row' },
    h('div', { class: 'grow' }, h('div', { class: 'ui', style: { fontSize: '19px' } }, label), note ? h('div', { class: 'muted small' }, note) : null),
    switchEl({ checked, onChange, label }));
}

export function seg(options, value, onChange, label) {
  const wrap = h('div', { class: 'seg', role: 'group', 'aria-label': label || '' });
  const render = (v) => {
    clear(wrap);
    for (const o of options) {
      wrap.appendChild(h('button', {
        type: 'button',
        'aria-pressed': o.value === v ? 'true' : 'false',
        on: { click: () => { render(o.value); onChange(o.value); } },
      }, o.icon ? svg(o.icon, 'ico') : null, o.label));
    }
  };
  render(value);
  return wrap;
}

export function chip(label, { pressed = false, onClick, iconSvg, cls } = {}) {
  const c = h('button', { class: ['chip', cls], type: 'button', 'aria-pressed': pressed ? 'true' : 'false' },
    iconSvg ? svg(iconSvg, 'ico') : null, label);
  if (onClick) c.addEventListener('click', () => onClick(c));
  return c;
}

// ---------- 탭 막대 ----------
const TABS = [
  { id: 'home', href: '#/', label: '서재', icon: 'home' },
  { id: 'shelf', href: '#/shelf', label: '일기장', icon: 'book' },
  { id: 'wallet', href: '#/wallet', label: '용돈', icon: 'wallet' },
  { id: 'settings', href: '#/settings', label: '설정', icon: 'gear' },
];

export function renderTabbar(current) {
  const bar = document.getElementById('tabbar');
  if (!bar) return;
  clear(bar);
  bar.setAttribute('aria-label', '아래 메뉴');
  const tabs = h('div', { class: 'tabs' });
  for (const t of TABS) {
    const a = h('a', { class: 'tab', href: t.href, 'aria-current': t.id === current ? 'page' : undefined }, icon(t.icon), h('span', null, t.label), h('span', { class: 'tab-dot', 'aria-hidden': 'true' }));
    tabs.appendChild(a);
  }
  bar.appendChild(tabs);
}

// ---------- 쓰기 흐름 위 막대 ----------
export const FLOW_STEPS = ['고르기', '계획', '쓰기', '다듬기', '꾸미기'];

export function flowbar({ step = 0, onBack, onStop, music }) {
  const dots = h('div', { class: 'steps', role: 'img', 'aria-label': `${FLOW_STEPS.length}단계 중 ${step + 1}단계: ${FLOW_STEPS[step]}` },
    FLOW_STEPS.map((_, i) => h('span', { class: ['step-dot', i < step ? 'done' : null, i === step ? 'now' : null] })));
  return h('header', { class: 'flowbar' },
    h('div', { class: 'flowbar-in' },
      onBack ? h('button', { class: 'btn-icon', type: 'button', 'aria-label': '뒤로', on: { click: onBack } }, icon('back')) : h('span', { style: { width: '48px' } }),
      dots,
      music || null,
      onStop ? h('button', { class: 'btn btn-ghost', type: 'button', on: { click: onStop } }, '그만할래') : null));
}

// ---------- 화면 제목 ----------
export function screenTitle(title, { back, right } = {}) {
  return h('div', { class: 'screen-title' },
    back ? h('a', { class: 'btn-icon', href: back, 'aria-label': '뒤로' }, icon('back')) : null,
    h('h1', { class: 'grow' }, title),
    right || null);
}
