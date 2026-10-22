// 일기 읽기. docs/DESIGN.md 4.4
// 처음 글이랑 나란히 보기, 꾸미기(스티커, 배경, 글씨), 가족에게 보여 주기, 다시 고치기(용돈 없음), 지우기.
// /diary/:id/reread 는 이번 주 되돌아보기에서 연 경우(다 읽고 스티커 하나 고르기).

import { h, svg, put } from '../util.js';
import { store, findDiary } from '../store.js';
import { talk, icon, toast, ask, openSheet, switchRow, chip, SLOT_ICONS } from '../ui.js';
import { stickerSVG } from '../art/stickers.js';
import { LINES } from '../data/tori-lines.js';
import { koreanDate, weekStart, dayKey } from '../dates.js';
import { updateDiary } from '../flow.js';
import { diffWords } from '../feedback.js';
import { photoURL, deletePhoto } from '../photos.js';
import { diaryPage, topBar, diffSides } from './common.js';

export const meta = { tab: 'shelf', flow: false, music: 'library' };

export const REREAD = [
  { id: 'fun', label: '재밌어', icon: () => stickerSVG('m-happy') },
  { id: 'detail', label: '자세해', icon: () => SLOT_ICONS.magnifier },
  { id: 'again', label: '또 보고 싶어', icon: () => stickerSVG('heart') },
];

function compareSheet(d) {
  const { left, right } = diffSides(diffWords(d.original || '', d.text || ''));
  openSheet((close) => h('div', { class: 'stack' },
    h('h2', null, '처음 글이랑 나란히 보기'),
    h('div', { class: 'compare stacked' },
      h('div', { class: 'cmp-col' }, h('div', { class: 'cmp-label' }, '처음 글'), h('p', { class: 'cmp-text' }, left)),
      h('div', { class: 'cmp-col now' }, h('div', { class: 'cmp-label' }, '지금 글'), h('p', { class: 'cmp-text' }, right))),
    h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => close() } }, '닫기')), { label: '처음 글이랑 나란히 보기' });
}

function editSheet(d, onSaved) {
  openSheet((close) => {
    const title = h('input', { class: 'field', type: 'text', maxlength: 30, value: d.title || '', placeholder: '제목 (안 써도 돼)', 'aria-label': '제목' });
    const area = h('textarea', { class: 'notebook', rows: 8, spellcheck: 'false', autocorrect: 'off', 'aria-label': '일기 다시 고치기' });
    area.value = d.text || '';
    return h('div', { class: 'stack' },
      talk('smile', [LINES.editAgain], { size: 'xs' }),
      title,
      area,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => {
          updateDiary(d.id, (x) => { x.text = area.value.trim(); x.title = title.value.trim(); x.edited = (x.edited || 0) + 1; });
          close();
          toast('고친 글을 저장했어.');
          onSaved();
        } } }, '저장'),
        h('button', { class: 'btn btn-soft btn-big', type: 'button', on: { click: () => close() } }, '그만두기')));
  }, { label: '다시 고치기' });
}

export function render(root, params, app) {
  const d = findDiary(params.id);
  if (!d) {
    app.go('/shelf', { replace: true });
    return;
  }
  const reread = params.mode === 'reread';
  const today = dayKey();
  let url = null;

  // 답장을 읽은 것으로
  if ((d.replies || []).some((r) => !r.read)) updateDiary(d.id, (x) => x.replies.forEach((r) => { r.read = true; }));

  const photo = d.photo ? h('figure', { class: 'diary-photo' }) : null;
  if (photo) {
    photoURL(d.photo).then((u) => {
      if (!u) { photo.remove(); return; }
      url = u;
      photo.appendChild(h('img', { src: u, alt: '내가 찍은 일기 사진' }));
    }).catch(() => photo.remove());
  }

  const replies = (d.replies || []).length
    ? h('section', { class: 'card replies' },
      h('h2', { class: 'card-title' }, icon('letter'), '가족 답장'),
      d.replies.map((r) => h('div', { class: 'reply' }, h('p', null, r.text), h('div', { class: 'muted small' }, koreanDate(dayKey(new Date(r.at)), false)))))
    : null;

  const rereadPicked = d.reread ? REREAD.find((x) => x.id === d.reread.pick) : null;
  const wrap = h('div', { class: 'wrap stack diary-view' },
    diaryPage(findDiary(d.id), { after: photo }),
    rereadPicked ? h('p', { class: 'pill reread-pill' }, svg(rereadPicked.icon(), 'ico'), `다시 읽고 고른 말: ${rereadPicked.label}`) : null,
    replies);

  if (reread) {
    const chips = h('div', { class: 'chips center-chips' }, REREAD.map((r) => chip(r.label, { iconSvg: r.icon(), onClick: () => {
      updateDiary(d.id, (x) => { x.reread = { pick: r.id, day: today }; });
      store.update((s) => { s.seen.reread = weekStart(today); });
      toast(LINES.rereadThanks);
      app.go('/shelf');
    } })));
    wrap.appendChild(h('section', { class: 'card seam stack-sm' }, talk('read', [LINES.rereadAsk], { size: 'xs' }), chips));
  }

  // 할 수 있는 것
  const actions = h('section', { class: 'stack-sm diary-actions' });
  actions.appendChild(h('a', { class: 'btn btn-primary', href: `#/diary/${d.id}/decorate` }, icon('sparkle'), '꾸미기'));
  if (d.original && d.original.trim() && d.original !== d.text) {
    actions.appendChild(h('button', { class: 'btn btn-soft', type: 'button', on: { click: () => compareSheet(findDiary(d.id)) } }, icon('eye'), '처음 글이랑 나란히 보기'));
  }
  actions.appendChild(h('div', { class: 'card' }, switchRow('가족에게 보여 주기', !!d.shared, (v) => updateDiary(d.id, (x) => { x.shared = v; }), '켜 두면 보호자 화면에서 이 일기를 읽고 답장할 수 있어.')));
  actions.appendChild(h('div', { class: 'btn-row' },
    h('button', { class: 'btn btn-soft', type: 'button', on: { click: () => editSheet(findDiary(d.id), () => app.go(`/diary/${d.id}`, { replace: true })) } }, icon('pencil'), '다시 고치기'),
    h('button', { class: 'btn btn-ghost danger-text', type: 'button', on: { click: async () => {
      const yes = await ask({ title: LINES.deleteAsk, mood: 'think', yes: '지울래', no: '그대로 둘래', danger: true });
      if (!yes) return;
      store.update((s) => { s.diaries = s.diaries.filter((x) => x.id !== d.id); });
      if (d.photo) deletePhoto(d.photo).catch(() => {});
      toast('일기를 지웠어.');
      app.go('/shelf');
    } } }, icon('trash'), '이 일기 지우기')));
  wrap.appendChild(actions);

  put(root, topBar(koreanDate(d.day), { back: reread ? '#/shelf/reread' : '#/shelf' }), wrap);
  return () => { if (url) URL.revokeObjectURL(url); };
}
