// 일기 쪽 위에 스티커를 얹는 층. 보기만 하는 때와, 끌어서 옮길 수 있는 꾸미기 때가 있습니다.
// 위치와 크기를 다루는 계산은 js/decor.js에 있습니다.
//
// edit를 주면 꾸미기 모드: { selected, pop, onSelect(i), onMove(i, x, y), onRemove(i) }
//   손가락(마우스)으로 끌면 따라 움직이고, 놓을 때 onMove가 한 번 불립니다.
//   스티커를 끄는 동안에는 화면을 다시 그리지 않습니다(그리면 잡고 있던 스티커가 사라지므로).
//   키보드: 스티커에 맞추고 방향키로 옮기기(Shift를 같이 누르면 크게), Delete로 떼기.

import { h } from './util.js';
import { stickerSVG, stickerMeta } from './art/stickers.js';
import { spotOf, SIZE_STEPS, clampPos } from './decor.js';

const KEY_STEP = 0.02;
const pct = (v) => `${(v * 100).toFixed(2)}%`;

export function stickerLayer(stickers, edit) {
  const layer = h('div', { class: ['sticker-layer', edit ? 'editing' : null] });
  let selected = edit && Number.isInteger(edit.selected) ? edit.selected : null;

  const paintSelected = () => {
    [...layer.children].forEach((el, k) => {
      const on = k === selected;
      el.classList.toggle('selected', on);
      if (el.getAttribute('role') === 'button') el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };
  const select = (i) => {
    if (selected === i) return;
    selected = i;
    paintSelected();
    edit.onSelect(i);
  };

  (stickers || []).forEach((st, i) => {
    const m = stickerMeta(st.id);
    // 그림이 없어진 스티커도 자리(번호)는 지키도록 빈 칸을 둡니다
    const el = h('div', { class: ['free-sticker', m && m.big ? 'big' : null] });
    layer.appendChild(el);
    if (!m) { el.hidden = true; return; }
    let pos = spotOf(st);
    const size = SIZE_STEPS[pos.s];
    const set = (x, y) => {
      pos = { ...pos, x, y };
      el.style.left = pct(x);
      el.style.top = pct(y);
    };
    el.style.width = pct(size);
    set(pos.x, pos.y);
    el.appendChild(h('span', { class: ['sticker', m.shine ? 'shine' : null, edit && edit.pop === i ? 'pop-in' : null], html: stickerSVG(st.id) }));

    if (!edit) {
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', m.name);
      return;
    }
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `${m.name} 스티커. 끌어서 옮기고, 방향키로도 옮길 수 있어`);
    el.setAttribute('aria-pressed', 'false');

    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const r = layer.getBoundingClientRect();
      drag = { pid: e.pointerId, dx: e.clientX - (r.left + pos.x * r.width), dy: e.clientY - (r.top + pos.y * r.height), moved: false };
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* 지원하지 않으면 그냥 넘어감 */ }
      el.focus({ preventScroll: true });
      select(i);
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.pid) return;
      const r = layer.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = clampPos((e.clientX - drag.dx - r.left) / r.width);
      const y = clampPos((e.clientY - drag.dy - r.top) / r.height);
      if (Math.abs(x - pos.x) > 0.001 || Math.abs(y - pos.y) > 0.001) drag.moved = true;
      set(x, y);
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.pid) return;
      const moved = drag.moved;
      drag = null;
      if (moved) edit.onMove(i, pos.x, pos.y);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? KEY_STEP * 3 : KEY_STEP;
      const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (move) {
        e.preventDefault();
        select(i);
        set(clampPos(pos.x + move[0]), clampPos(pos.y + move[1]));
        edit.onMove(i, pos.x, pos.y);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        edit.onRemove(i);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select(i);
      }
    });
  });

  if (edit) {
    paintSelected();
    // 화면 파일이 빈 곳을 눌렀을 때 선택을 풀 수 있게 건네줍니다
    layer.deselect = () => select(null);
  }
  return layer;
}
