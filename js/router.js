// 화면 바꾸기 (주소의 # 뒤를 봅니다. 예: #/shop, #/diary/abc)
// 새 화면을 더하려면 아래 ROUTES에 한 줄을 더하고 js/screens/에 파일을 만듭니다.
// 각 화면 파일은 render(root, params, app)를 내보내고, 필요하면 정리 함수를 돌려줍니다.
// meta: { tab: 아래 탭 이름 | null, flow: 쓰기 흐름인지, music: 'library' | 'shop' | 'finish' | 'writing' | 'silent' }

import { store } from './store.js';
import { renderTabbar } from './ui.js';
import { clear } from './util.js';
import { music } from './music.js';
import { inTimeRange } from './dates.js';

const ROUTES = [
  ['/', () => import('./screens/home.js')],
  ['/welcome', () => import('./screens/welcome.js')],
  ['/write/scene', () => import('./screens/write-scene.js')],
  ['/write/plan', () => import('./screens/write-plan.js')],
  ['/write/text', () => import('./screens/write-text.js')],
  ['/write/done/:id', () => import('./screens/write-done.js')],
  ['/write/polish/:id', () => import('./screens/write-polish.js')],
  ['/write/decorate/:id', () => import('./screens/write-decorate.js')],
  ['/write/finish/:id', () => import('./screens/write-finish.js')],
  ['/shelf', () => import('./screens/shelf.js')],
  ['/shelf/:mode', () => import('./screens/shelf.js')],
  ['/diary/:id', () => import('./screens/diary-view.js')],
  ['/diary/:id/:mode', () => import('./screens/diary-view.js')],
  ['/shop', () => import('./screens/shop.js')],
  ['/settings', () => import('./screens/settings.js')],
  ['/parent', () => import('./screens/parent.js')],
];

function match(path) {
  for (const [pattern, load] of ROUTES) {
    const keys = [];
    const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
    const m = path.match(re);
    if (m) return { load, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

export function quietNow(s = store.state) {
  const q = s.parent.quiet;
  return !!(q && q.on && inTimeRange(q.start, q.end));
}

let cleanup = null;
let renderId = 0;

export function go(path, { replace = false } = {}) {
  const hash = `#${path}`;
  if (location.hash === hash) render();
  else if (replace) {
    history.replaceState(null, '', hash);
    render();
  } else location.hash = hash;
}

export function currentPath() {
  return (location.hash || '#/').slice(1) || '/';
}

export function musicScene(meta) {
  const s = store.state.settings;
  if (!meta || !meta.music) return 'library';
  if (meta.music === 'writing') return s.musicWhileWriting ? 'library' : 'silent';
  return meta.music;
}

async function render() {
  const id = ++renderId;
  let path = currentPath();
  const s = store.state;
  if (!s.profile.onboarded && path !== '/welcome' && path !== '/parent') path = '/welcome';
  // 쉬는 시간대: 서재(졸린 토리)만, 보호자 화면은 들어갈 수 있음
  if (quietNow() && !['/', '/parent', '/settings'].includes(path)) path = '/';
  const found = match(path) || match('/');
  let mod;
  try {
    mod = await found.load();
  } catch (e) {
    console.error(e);
    return;
  }
  if (id !== renderId) return;
  if (typeof cleanup === 'function') {
    try { cleanup(); } catch (e) { console.error(e); }
  }
  cleanup = null;
  const root = document.getElementById('screen');
  clear(root);
  const meta = mod.meta || {};
  document.body.classList.toggle('flow', !!meta.flow);
  renderTabbar(meta.tab || null);
  document.getElementById('tabbar').hidden = !meta.tab;
  music.setScene(musicScene(meta));
  window.scrollTo(0, 0);
  try {
    cleanup = mod.render(root, found.params, { go });
  } catch (e) {
    console.error(e);
    root.textContent = '화면을 여는 중에 문제가 생겼어요. 새로 고침을 눌러 주세요.';
  }
  // 화면이 바뀌면 읽기 프로그램이 새 화면 처음부터 읽게
  root.focus({ preventScroll: true });
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}
