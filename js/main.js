// 앱 시작: 설정 적용, 소리 준비, 주간 정산, 화면 바꾸기 시작, 오프라인 준비(서비스 워커)

import { store } from './store.js';
import { startRouter } from './router.js';
import { music } from './music.js';
import { settle } from './rewards.js';
import { dayKey } from './dates.js';

const root = document.documentElement;

function applySettings(s) {
  const set = s.settings;
  if (set.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', set.theme);
  root.setAttribute('data-write-size', set.writeSize);
  root.setAttribute('data-leading', set.leading);
  document.body.classList.toggle('plain-fonts', !!set.plainFonts);
  music.setEnabled(set.music);
  music.setVolume(set.volume);
  music.setMaxVolume(s.parent.maxVolume);
  music.setSfx(set.sfx);
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.content = getComputedStyle(document.body).backgroundColor;
}

function boot() {
  const today = dayKey();
  store.update((s) => {
    // 주간 정산: 월요일이 지나면 지난주 것을 넣어 줌
    if (s.parent.payout === 'weekly') {
      const amount = settle(s, today);
      if (amount > 0) s.seen.settled = { amount, day: today };
    }
    if (!s.metrics.openDays.includes(today)) s.metrics.openDays.push(today);
    if (s.metrics.openDays.length > 400) s.metrics.openDays = s.metrics.openDays.slice(-400);
  });

  applySettings(store.state);
  store.subscribe(applySettings);

  // 소리는 아이가 처음 누른 뒤에만
  const unlock = () => {
    music.unlock();
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  startRouter();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('오프라인 준비를 못 했어요', e));
  }
}

boot();
