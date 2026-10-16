// 첫 만남 (처음 한 번). docs/DESIGN.md 4.1

import { h, clear } from '../util.js';
import { store } from '../store.js';
import { talk, bubble } from '../ui.js';
import { toriNode } from '../tori.js';
import { coverSVG, coverMeta } from '../art/covers.js';
import { FREE } from '../data/shop-items.js';
import { LINES, fill } from '../data/tori-lines.js';
import { music } from '../music.js';
import { nameVars } from './common.js';

export const meta = { tab: null, flow: false, music: 'library' };

export function photoCard(cls) {
  const img = h('img', { src: 'assets/tori-photo.jpg', alt: '진짜 토리 사진: 하얀 헤드폰을 쓴 하얀 인형', width: 391, height: 580, loading: 'lazy' });
  const card = h('figure', { class: ['polaroid', cls] }, img, h('figcaption', null, '진짜 토리'));
  img.addEventListener('error', () => card.remove());
  return card;
}

export function render(root, params, app) {
  let step = 1;
  let name = store.state.profile.name || '';
  let cover = store.state.current.cover || 'spring';
  const wrap = h('div', { class: 'wrap welcome' });
  root.appendChild(wrap);

  const next = (n) => {
    step = n;
    draw();
  };

  const steps = {
    1: () => h('div', { class: 'stack welcome-1' },
      h('div', { class: 'welcome-hero' }, photoCard(), toriNode('wave', { size: 'lg' })),
      bubble([LINES.hello[0], LINES.hello[1]], 'up'),
      h('button', { class: 'btn btn-primary btn-big', type: 'button', autofocus: true, on: { click: () => { music.unlock(); next(2); } } }, '반가워!')),

    2: () => {
      const input = h('input', { class: 'field name-field', type: 'text', maxlength: 10, value: name, placeholder: '이름 또는 별명', 'aria-label': '이름', autocomplete: 'off' });
      const save = () => {
        name = input.value.trim().slice(0, 10);
        store.update((s) => { s.profile.name = name; });
        next(3);
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
      setTimeout(() => input.focus(), 60);
      return h('div', { class: 'stack' },
        talk('think', [LINES.hello[2], LINES.askName], { size: 'md' }),
        input,
        h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: save } }, '이렇게 불러 줘'),
        h('button', { class: 'btn-text', type: 'button', on: { click: () => { name = ''; store.update((s) => { s.profile.name = ''; }); next(3); } } }, '이름 없이 할래'));
    },

    3: () => {
      const grid = h('div', { class: 'cover-grid', role: 'radiogroup', 'aria-label': '일기장 표지' });
      const paint = () => {
        clear(grid);
        for (const id of FREE.covers) {
          const m = coverMeta(id);
          grid.appendChild(h('button', {
            class: ['cover-pick', id === cover ? 'on' : null],
            type: 'button',
            role: 'radio',
            'aria-checked': id === cover ? 'true' : 'false',
            on: { click: () => { cover = id; paint(); } },
          }, h('span', { class: 'cover-thumb', html: coverSVG(id) }), h('span', { class: 'cover-name' }, m.name)));
        }
      };
      paint();
      const lines = name ? [fill(LINES.niceName, nameVars()), LINES.pickCover] : [LINES.pickCover];
      return h('div', { class: 'stack' },
        talk('happy', lines, { size: 'sm' }),
        grid,
        h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => { store.update((s) => { s.current.cover = cover; }); next(4); } } }, '이걸로 할래'));
    },

    4: () => {
      const choose = (withMusic) => {
        store.update((s) => {
          s.settings.music = withMusic;
          s.settings.musicWhileWriting = withMusic;
        });
        music.unlock();
        next(5);
      };
      return h('div', { class: 'stack' },
        talk('listen', [LINES.pickMusic], { size: 'md', notes: true }),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => choose(true) } }, '음악 있게'),
          h('button', { class: 'btn btn-soft btn-big', type: 'button', on: { click: () => choose(false) } }, '조용히')),
        h('p', { class: 'muted small center' }, '헤드폰 단추로 언제든 켜고 끌 수 있어요.'));
    },

    5: () => h('div', { class: 'stack' },
      talk('cheer', [LINES.ready], { size: 'lg' }),
      h('button', { class: 'btn btn-primary btn-big', type: 'button', autofocus: true, on: { click: () => {
        store.update((s) => { s.profile.onboarded = true; });
        app.go('/');
      } } }, '서재로 가기')),
  };

  const draw = () => {
    clear(wrap);
    wrap.appendChild(h('div', { class: 'welcome-steps', 'aria-label': `5단계 중 ${step}단계` }, [1, 2, 3, 4, 5].map((i) => h('span', { class: ['step-dot', i < step ? 'done' : null, i === step ? 'now' : null] }))));
    wrap.appendChild(steps[step]());
    const f = wrap.querySelector('[autofocus]');
    if (f) setTimeout(() => f.focus(), 40);
  };
  draw();
}
