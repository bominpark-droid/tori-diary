// 화면을 만드는 작은 도우미들.
// h('div', { class: 'card', on: { click: fn } }, '글자', 다른요소) 처럼 씁니다.

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') el.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
      else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
      else if (key === 'on') for (const [ev, fn] of Object.entries(value)) el.addEventListener(ev, fn);
      else if (key === 'html') el.innerHTML = value;
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key === 'value') el.value = value;
      else if (key in el && typeof value !== 'string' && key !== 'list') el[key] = value;
      else el.setAttribute(key, value === true ? '' : value);
    }
  }
  append(el, children);
  return el;
}

// <도와줘> 같은 단추 이름에서 줄 끝에 '<'만 따로 남지 않게 보이지 않는 글자(U+2060)를 넣음
function keepBrackets(s) {
  return s.includes('<') || s.includes('>') ? s.replace(/<(?=\S)/g, '<⁠').replace(/(\S)>/g, '$1⁠>') : s;
}

function append(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else if (child instanceof Node) el.appendChild(child);
    else el.appendChild(document.createTextNode(keepBrackets(String(child))));
  }
}

// 이미 있는 요소에 더 붙이기. el.append()는 null을 'null' 글자로 찍으니 이것을 씁니다.
export function put(el, ...children) {
  append(el, children);
  return el;
}

// SVG 글을 화면 요소로 바꿉니다.
export function svg(markup, className) {
  const span = document.createElement('span');
  span.className = className ? `svg-box ${className}` : 'svg-box';
  span.innerHTML = markup;
  return span;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function uid(prefix = '') {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

export function pick(list, seed) {
  if (!list || list.length === 0) return undefined;
  const i = seed === undefined ? Math.floor(Math.random() * list.length) : Math.abs(seed) % list.length;
  return list[i];
}

export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

export function won(n) {
  return `${Number(n).toLocaleString('ko-KR')}원`;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 문자열에서 간단한 숫자 씨앗을 만듭니다(같은 날 같은 대사가 나오게).
export function seedOf(text) {
  let s = 0;
  for (const ch of String(text)) s = (s * 31 + ch.codePointAt(0)) | 0;
  return Math.abs(s);
}

export function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// 파일 내려받기 (보호자 화면 백업용)
export function downloadText(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
