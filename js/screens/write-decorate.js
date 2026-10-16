// ⑥ 꾸미기. docs/DESIGN.md 4.3 ⑥
// 가진 스티커를 누르면 다음 빈자리에 붙고, 붙은 스티커를 누르면 떨어집니다(끌기 없음).
// 표지, 글꼴, 테두리는 이 일기에만 적용됩니다. 앞으로 쓸 일기의 기본 표지는 설정에서 바꿉니다.

import { h, clear, put } from '../util.js';
import { store, findDiary } from '../store.js';
import { flowbar, talk, toast, icon, seg } from '../ui.js';
import { coverSVG, coverMeta, FRAMES } from '../art/covers.js';
import { FONTS, fontStyle } from '../data/fonts.js';
import { LINES } from '../data/tori-lines.js';
import { updateDiary } from '../flow.js';
import { music } from '../music.js';
import { musicButton, diaryPage, stickerNode } from './common.js';

export const meta = { tab: null, flow: true, music: 'shop' };

export function render(root, params, app) {
  const first = findDiary(params.id);
  if (!first) {
    app.go('/', { replace: true });
    return;
  }
  const id = first.id;
  const diary = () => findDiary(id);
  let pop = null;
  let tab = 'stickers';

  // ---------- 일기 쪽 미리보기 ----------
  const pageBox = h('div', { class: 'decorate-page' });
  const paintPage = () => {
    clear(pageBox);
    pageBox.appendChild(diaryPage(diary(), { excerpt: true, onSlot: (i) => removeAt(i), popSlot: pop }));
    pop = null;
  };
  const removeAt = (i) => {
    const had = diary().stickers.some((s) => s.slot === i);
    if (!had) {
      toast('아래에서 스티커를 눌러 봐.');
      return;
    }
    updateDiary(id, (x) => { x.stickers = x.stickers.filter((s) => s.slot !== i); });
    paintPage();
  };
  const place = (sid) => {
    const used = new Set(diary().stickers.map((s) => s.slot));
    const slot = [0, 1, 2, 3].find((i) => !used.has(i));
    if (slot === undefined) {
      toast(LINES.stickerFull);
      return;
    }
    updateDiary(id, (x) => { x.stickers.push({ id: sid, slot }); });
    pop = slot;
    music.sfx('sticker');
    paintPage();
  };

  // ---------- 고르기 칸 ----------
  const picker = h('div', { class: 'decorate-picker stack-sm' });
  const paintPicker = () => {
    clear(picker);
    const s = store.state;
    const d = diary();
    if (tab === 'stickers') {
      const tray = h('div', { class: 'sticker-tray', role: 'group', 'aria-label': '가진 스티커' });
      for (const sid of s.owned.stickers) {
        tray.appendChild(h('button', { class: 'tray-btn', type: 'button', on: { click: () => place(sid) } }, stickerNode(sid, 54)));
      }
      put(picker, tray, h('p', { class: 'muted small' }, '문구점에서 스티커를 더 살 수 있어.'));
    } else if (tab === 'covers') {
      const grid = h('div', { class: 'cover-grid small', role: 'radiogroup', 'aria-label': '이 일기 표지' });
      for (const cid of s.owned.covers) {
        const on = d.cover === cid;
        grid.appendChild(h('button', { class: ['cover-pick', on ? 'on' : null], type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', on: { click: () => {
          updateDiary(id, (x) => { x.cover = cid; });
          paintPage();
          paintPicker();
        } } }, h('span', { class: 'cover-thumb', html: coverSVG(cid) }), h('span', { class: 'cover-name' }, coverMeta(cid).name)));
      }
      picker.appendChild(grid);
    } else if (tab === 'fonts') {
      const list = h('div', { class: 'font-list', role: 'radiogroup', 'aria-label': '제목 글씨' });
      for (const fid of s.owned.fonts) {
        const f = FONTS[fid];
        if (!f) continue;
        const on = d.font === fid;
        list.appendChild(h('button', { class: ['font-pick', on ? 'on' : null], type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', on: { click: () => {
          updateDiary(id, (x) => { x.font = fid; });
          paintPage();
          paintPicker();
        } } }, h('span', { class: 'font-sample', style: fontStyle(fid, false) }, d.title || '오늘의 일기'), h('span', { class: 'muted small' }, f.name)));
      }
      picker.appendChild(list);
    } else if (tab === 'frames') {
      const list = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': '쪽 테두리' });
      const opts = [null, ...s.owned.frames];
      for (const fr of opts) {
        const on = (d.frame || null) === fr;
        list.appendChild(h('button', { class: ['chip', on ? 'on' : null], type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', on: { click: () => {
          updateDiary(id, (x) => { x.frame = fr; });
          paintPage();
          paintPicker();
        } } }, fr ? FRAMES[fr].name : '테두리 없음'));
      }
      picker.appendChild(list);
    }
  };

  const tabs = [
    { value: 'stickers', label: '스티커' },
    { value: 'covers', label: '표지' },
    { value: 'fonts', label: '글씨' },
  ];
  if (store.state.owned.frames.length) tabs.push({ value: 'frames', label: '테두리' });

  const goFinish = () => app.go(`/write/finish/${id}`);
  const view = h('div', { class: 'wrap stack decorate' },
    talk('happy', [LINES.decorate], { size: 'xs' }),
    pageBox,
    seg(tabs, tab, (v) => { tab = v; paintPicker(); }, '꾸밀 것'),
    picker,
    h('div', { class: 'stack-sm' },
      h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: goFinish } }, icon('check'), '다 꾸몄어'),
      h('button', { class: 'btn-text', type: 'button', on: { click: goFinish } }, '건너뛰기')));

  root.appendChild(flowbar({ step: 4, onBack: () => app.go(`/write/done/${id}`), music: musicButton() }));
  root.appendChild(view);
  paintPage();
  paintPicker();
}
