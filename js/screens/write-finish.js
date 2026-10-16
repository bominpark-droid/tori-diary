// ⑦ 마무리. docs/DESIGN.md 4.3 ⑦
// 자기 점검 하나(정답 확인 없음) → 가족에게 보여 줄지 → 끝 화면. 다음 할 일로 자동으로 넘어가지 않습니다.

import { h, clear, pick, seedOf, put } from '../util.js';
import { findDiary } from '../store.js';
import { talk, bubble, icon, chip } from '../ui.js';
import { toriNode } from '../tori.js';
import { LINES } from '../data/tori-lines.js';
import { updateDiary } from '../flow.js';
import { music } from '../music.js';
import { musicButton, weekDots } from './common.js';

export const meta = { tab: null, flow: true, music: 'finish' };

const CHECKS = [
  { id: 'who', label: '누가 나왔지?' },
  { id: 'when', label: '언제였지?' },
  { id: 'what', label: '가장 큰 일은?' },
];

const STAMP = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#B24F49" stroke-width="5" stroke-dasharray="3 5"/><path d="m50 18 9 19 21 3-15 14 4 21-19-10-19 10 4-21-15-14 21-3z" fill="#F2A19B" stroke="#B24F49" stroke-width="3" stroke-linejoin="round"/></svg>';

export function render(root, params, app) {
  const d = findDiary(params.id);
  if (!d) {
    app.go('/', { replace: true });
    return;
  }
  const id = d.id;
  const seed = seedOf(id);
  const box = h('div', { class: 'wrap stack finish' });
  const top = h('div', { class: 'row-between finish-top' }, h('span'), musicButton());
  put(root, top, box);

  const selfCheck = () => {
    clear(box);
    const stampBox = h('div', { class: 'stamp-box', 'aria-hidden': 'true' });
    const chips = h('div', { class: 'chips center-chips', role: 'group', 'aria-label': '자기 점검' });
    const tori = talk('think', [LINES.selfCheck], { size: 'sm' });
    for (const c of CHECKS) {
      chips.appendChild(chip(c.label, { onClick: () => {
        updateDiary(id, (x) => { x.selfCheck = c.id; });
        chips.querySelectorAll('.chip').forEach((el) => { el.disabled = true; el.setAttribute('aria-pressed', el.textContent === c.label ? 'true' : 'false'); });
        stampBox.innerHTML = `<span class="stamp">${STAMP}</span>`;
        tori.replaceWith(talk('happy', [LINES.selfCheckDone], { size: 'sm' }));
        music.sfx('sticker');
        setTimeout(share, 1300);
      } }));
    }
    put(box, tori, chips, stampBox, h('button', { class: 'btn-text', type: 'button', on: { click: share } }, '넘어갈래'));
  };

  const share = () => {
    clear(box);
    const pickShare = (shared) => {
      updateDiary(id, (x) => { x.shared = shared; });
      end();
    };
    put(box, 
      talk('smile', [LINES.share], { size: 'sm' }),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-primary btn-big', type: 'button', autofocus: true, on: { click: () => pickShare(false) } }, '나만 볼래'),
        h('button', { class: 'btn btn-soft btn-big', type: 'button', on: { click: () => pickShare(true) } }, '보여 줄래')),
      h('p', { class: 'muted small center' }, '나중에 일기장에서 바꿀 수 있어.'));
  };

  const end = () => {
    clear(box);
    const week = weekDots();
    put(box, 
      h('div', { class: 'finish-hero' }, toriNode('wave', { size: 'xl' })),
      bubble([pick(LINES.finish, seed)], 'up'),
      h('section', { class: 'card week-card' }, h('h2', { class: 'card-title' }, `이번 주 쓴 날 ${week.count}일`), week.el),
      h('a', { class: 'btn btn-primary btn-big', href: '#/' }, icon('home'), '서재로 가기'));
  };

  if (d.selfCheck) share();
  else selfCheck();
}
