// ⑥ 꾸미기. docs/DESIGN.md 4.3 ⑥
// 쓴 글이 다 보이는 일기 쪽 위에서 배경, 글씨, 쪽 테두리를 바꾸고, 스티커를 끌어서 원하는 곳에 붙입니다.
// 가진 것(토리의 선물)만 고를 수 있고, 바꾼 것은 바로 저장됩니다(위치와 크기 포함).
// 쓰기 흐름의 한 단계로도 열리고, 일기장에서 <꾸미기>를 눌러도(/diary/:id/decorate) 같은 화면이 열립니다.
// 배경, 글씨, 테두리는 이 일기에만 적용됩니다. 앞으로 쓸 일기의 기본 표지는 설정에서 바꿉니다.

import { h, clear, put } from '../util.js';
import { store, findDiary } from '../store.js';
import { flowbar, talk, toast, icon, seg } from '../ui.js';
import { coverSVG, coverMeta, FRAMES } from '../art/covers.js';
import { stickerMeta } from '../art/stickers.js';
import { FONTS, pageFont } from '../data/fonts.js';
import { LINES } from '../data/tori-lines.js';
import { updateDiary } from '../flow.js';
import { music } from '../music.js';
import { currentPath } from '../router.js';
import { addSticker, moveSticker, resizeSticker, removeSticker, nextOffset, spotOf, SIZE_STEPS } from '../decor.js';
import { stickerLayer } from '../sticker-layer.js';
import { musicButton, diaryPage, stickerNode, topBar } from './common.js';

export const meta = { tab: null, flow: true, music: 'decorate' };

export function render(root, params, app) {
  const first = findDiary(params.id);
  if (!first) {
    app.go('/', { replace: true });
    return;
  }
  const id = first.id;
  const diary = () => findDiary(id);
  // 일기장에서 연 경우에는 쓰기 흐름 막대 대신 일기장으로 돌아가는 막대를 씁니다
  const fromShelf = currentPath().startsWith('/diary/');
  let tab = 'stickers';
  let sel = null; // 고른 스티커 번호
  let pop = null; // 방금 붙인 스티커 번호(붙는 모양을 보여 줌)

  // ---------- 일기 쪽 ----------
  const pageBox = h('div', { class: 'decorate-page' });
  const edit = () => ({ selected: sel, pop, onSelect, onMove, onRemove });
  const layerEl = () => pageBox.querySelector('.sticker-layer');
  const paintPage = () => {
    clear(pageBox);
    put(pageBox, diaryPage(diary(), { edit: edit() }));
    pop = null;
  };
  // 스티커만 다시 그림 (붙이기, 떼기, 크기 바꾸기)
  const paintLayer = () => {
    const old = layerEl();
    if (old) old.replaceWith(stickerLayer(diary().stickers, edit()));
    pop = null;
  };
  const saveStickers = (fn) => updateDiary(id, (d) => { d.stickers = fn(d.stickers || []); });

  function onSelect(i) {
    sel = i;
    paintSel();
  }
  function onMove(i, x, y) {
    saveStickers((list) => moveSticker(list, i, x, y));
  }
  function onRemove(i) {
    saveStickers((list) => removeSticker(list, i));
    sel = null;
    paintLayer();
    paintSel();
  }
  // 빈 곳을 누르면 선택이 풀림
  pageBox.addEventListener('pointerdown', (e) => {
    if (sel === null || e.target.closest('.free-sticker')) return;
    const layer = layerEl();
    if (layer && layer.deselect) layer.deselect();
  });

  // 지금 화면에 보이는 쪽의 가운데쯤에 새 스티커를 붙임 (위쪽 막대와 아래 도구함에 가리지 않게)
  const place = (sid) => {
    const list = diary().stickers || [];
    const box = pageBox.getBoundingClientRect();
    const bar = document.querySelector('.flowbar');
    const top = Math.max(box.top, bar ? bar.offsetHeight : 0);
    const bottom = Math.min(box.bottom, window.innerHeight - dock.getBoundingClientRect().height);
    const cy = bottom > top ? (top + bottom) / 2 : box.top + box.height / 2;
    const off = nextOffset(list.length);
    const next = addSticker(list, sid, 0.5 + off.dx, (cy - box.top + off.dy * box.width) / Math.max(1, box.height));
    if (!next) {
      toast(LINES.stickerFull);
      return;
    }
    updateDiary(id, (d) => { d.stickers = next; });
    sel = next.length - 1;
    pop = sel;
    music.sfx('sticker');
    paintLayer();
    paintSel();
  };

  // ---------- 고른 스티커 만지기 ----------
  const selBox = h('div', { class: 'dock-sel' });
  function paintSel() {
    clear(selBox);
    const st = tab === 'stickers' && sel !== null ? (diary().stickers || [])[sel] : null;
    const m = st && stickerMeta(st.id);
    if (!m) return;
    const spot = spotOf(st);
    const resize = (delta) => {
      saveStickers((list) => resizeSticker(list, sel, delta));
      paintLayer();
      paintSel();
    };
    put(selBox,
      h('span', { class: 'dock-sel-name ui' }, m.name),
      h('button', { class: 'btn btn-soft', type: 'button', disabled: spot.s <= 0, on: { click: () => resize(-1) } }, '작게'),
      h('button', { class: 'btn btn-soft', type: 'button', disabled: spot.s >= SIZE_STEPS.length - 1, on: { click: () => resize(1) } }, '크게'),
      h('button', { class: 'btn btn-blush', type: 'button', on: { click: () => onRemove(sel) } }, icon('trash'), '떼기'));
  }

  // ---------- 고르기 칸 ----------
  const note = h('p', { class: 'muted small dock-note' });
  const picker = h('div', { class: 'dock-strip' });
  const choose = (apply) => {
    updateDiary(id, apply);
    paintPage();
    paintPicker(true);
  };
  function paintPicker(keepScroll = false) {
    const left = keepScroll ? picker.scrollLeft : 0;
    clear(picker);
    clear(note);
    const s = store.state;
    const d = diary();
    if (tab === 'stickers') {
      picker.setAttribute('role', 'group');
      picker.setAttribute('aria-label', '가진 스티커');
      for (const sid of s.owned.stickers) {
        const m = stickerMeta(sid);
        if (!m) continue;
        picker.appendChild(h('button', { class: 'tray-btn', type: 'button', 'aria-label': `${m.name} 붙이기`, on: { click: () => place(sid) } }, stickerNode(sid, 48)));
      }
    } else if (tab === 'covers') {
      picker.setAttribute('role', 'radiogroup');
      picker.setAttribute('aria-label', '이 일기 배경');
      for (const cid of s.owned.covers) {
        const on = d.cover === cid;
        picker.appendChild(h('button', { class: ['cover-pick', on ? 'on' : null], type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', on: { click: () => choose((x) => { x.cover = cid; }) } },
          h('span', { class: 'cover-thumb', html: coverSVG(cid) }), h('span', { class: 'cover-name' }, coverMeta(cid).name)));
      }
    } else if (tab === 'fonts') {
      picker.setAttribute('role', 'radiogroup');
      picker.setAttribute('aria-label', '글씨');
      if (s.settings.plainFonts) put(note, '설정에서 <읽기 쉬운 글꼴로 보기>가 켜져 있어서 글씨가 바뀌어 보이지 않아.');
      // 견본은 내 글의 첫 낱말(글씨가 바뀐 모양을 내 글자로 봄)
      const sample = String(d.text || '').trim().split(/\s+/)[0].slice(0, 5) || '토리 일기';
      for (const fid of s.owned.fonts) {
        const f = FONTS[fid];
        if (!f) continue;
        const on = d.font === fid;
        picker.appendChild(h('button', { class: ['font-pick', on ? 'on' : null], type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', on: { click: () => choose((x) => { x.font = fid; }) } },
          h('span', { class: 'font-sample', style: pageFont(fid, { plain: s.settings.plainFonts }) }, sample), h('span', { class: 'muted small' }, f.name)));
      }
    } else if (tab === 'frames') {
      picker.setAttribute('role', 'radiogroup');
      picker.setAttribute('aria-label', '쪽 테두리');
      for (const fr of [null, ...s.owned.frames]) {
        const on = (d.frame || null) === fr;
        picker.appendChild(h('button', { class: ['chip', on ? 'on' : null], type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', on: { click: () => choose((x) => { x.frame = fr; }) } }, fr ? FRAMES[fr].name : '테두리 없음'));
      }
    }
    picker.scrollLeft = left;
  }

  const tabs = [
    { value: 'stickers', label: '스티커' },
    { value: 'covers', label: '배경' },
    { value: 'fonts', label: '글씨' },
  ];
  if (store.state.owned.frames.length) tabs.push({ value: 'frames', label: '테두리' });

  const goNext = () => app.go(fromShelf ? `/diary/${id}` : `/write/finish/${id}`);
  const dock = h('div', { class: 'decorate-dock stack-sm' },
    seg(tabs, tab, (v) => { tab = v; paintSel(); paintPicker(); }, '꾸밀 것'),
    selBox,
    note,
    picker,
    h('div', { class: 'dock-done' },
      fromShelf ? null : h('button', { class: 'btn-text', type: 'button', on: { click: goNext } }, '건너뛰기'),
      h('button', { class: 'btn btn-primary grow', type: 'button', on: { click: goNext } }, icon('check'), '다 꾸몄어')));

  const view = h('div', { class: 'wrap stack decorate' },
    talk('happy', [LINES.decorate], { size: 'xs' }),
    pageBox,
    dock);

  put(root,
    fromShelf
      ? topBar('일기 꾸미기', { back: `#/diary/${id}`, right: musicButton() })
      : flowbar({ step: 4, onBack: () => app.go(`/write/done/${id}`), music: musicButton() }),
    view);
  paintPage();
  paintSel();
  paintPicker();
}
