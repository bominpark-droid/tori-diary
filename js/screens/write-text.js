// ③ 쓰기. docs/DESIGN.md 4.3 ③
// 글자 수와 문장 수는 보여 주지 않습니다. 브라우저 맞춤법 빨간 줄도 끕니다.

import { h, clear, svg, pick, seedOf, put } from '../util.js';
import { store } from '../store.js';
import { flowbar, talk, sayIn, openSheet, toast, icon, seg, ICONS, WEATHER_ICONS } from '../ui.js';
import { WEATHER, WHEN_ICONS, FEELINGS, starters } from '../data/plan.js';
import { LINES } from '../data/tori-lines.js';
import { allFolded } from '../hints.js';
import { dayKey, koreanDate } from '../dates.js';
import { startDraft, updateDraft, readyToFinish, finishDraft } from '../flow.js';
import { sentenceCount } from '../feedback.js';
import { speechSupported, listen } from '../speech.js';
import { compressImage, savePhoto, photoURL } from '../photos.js';
import { musicButton } from './common.js';

export const meta = { tab: null, flow: true, music: 'writing' };

// 계획 요약 띠 (접고 펼 수 있음)
export function planStrip(p, open = true) {
  if (!p || p.skipped) return null;
  const when = WHEN_ICONS.find((w) => w.id === p.when);
  const feel = FEELINGS.find((f) => f.id === p.feeling);
  const join = (list) => list.map((x) => String(x || '').trim()).filter(Boolean).join(', ');
  const rows = [
    ['처음', join([p.who, p.where, when && when.label])],
    ['가운데', join([p.what])],
    ['끝', join([p.how, feel && feel.label])],
  ].filter(([, v]) => v);
  if (!rows.length) return null;
  return h('details', { class: 'plan-strip', open },
    h('summary', null, '내 계획'),
    h('dl', { class: 'plan-sum' }, rows.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)])));
}

export function render(root, params, app) {
  const d = startDraft();
  const today = dayKey();
  const seed = seedOf(today);
  if (!d.steps.writeAt) updateDraft((dr) => { dr.steps.writeAt = Date.now(); }, false);
  const voiceAllowed = store.state.parent.voice && speechSupported();
  let mode = d.input === 'voice' && !voiceAllowed ? 'keyboard' : (d.input || 'keyboard');
  let stopListening = null;
  let previewURL = null;

  const stop = () => {
    store.flush();
    toast('쓰던 내용은 저장해 뒀어.');
    app.go('/');
  };
  const back = () => {
    const dr = store.state.draft;
    app.go(dr.plan.skipped || allFolded(store.state.hints) ? '/write/scene' : '/write/plan');
  };

  const tori = talk('smile', [pick(LINES.write, seed)], { size: 'xs', cls: 'write-talk' });

  // ---------- 날짜와 날씨 ----------
  const weatherBox = h('div', { class: 'weather-pick', role: 'group', 'aria-label': '날씨' });
  const paintWeather = () => {
    clear(weatherBox);
    for (const w of WEATHER) {
      const on = store.state.draft.weather === w.id;
      weatherBox.appendChild(h('button', {
        class: 'weather-btn', type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': `날씨 ${w.label}`,
        on: { click: () => { updateDraft((dr) => { dr.weather = dr.weather === w.id ? null : w.id; }, false); paintWeather(); } },
      }, svg(WEATHER_ICONS[w.id], 'weather-ico'), h('span', null, w.label)));
    }
  };
  paintWeather();

  // ---------- 제목 ----------
  const titleInput = h('input', { class: 'field title-field', type: 'text', maxlength: 30, value: d.title || '', placeholder: '제목 (안 써도 돼)', 'aria-label': '제목', autocomplete: 'off' });
  titleInput.addEventListener('input', () => updateDraft((dr) => { dr.title = titleInput.value; }));

  // ---------- 쓰는 칸 ----------
  const area = h('textarea', {
    class: 'notebook', rows: 8, 'aria-label': '일기 쓰기', spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off',
  });
  area.value = d.text || '';
  const grow = () => {
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight + 4}px`;
  };
  area.addEventListener('input', () => {
    updateDraft((dr) => { dr.text = area.value; });
    grow();
    paintDone();
  });

  // ---------- 말하기 ----------
  const micBig = h('button', { class: 'btn btn-primary btn-big mic-big', type: 'button' });
  const micLabel = (listening) => {
    clear(micBig);
    put(micBig, icon('mic'), listening ? '듣는 중이야. 다 말했으면 눌러 줘' : '눌러서 말하기');
    micBig.classList.toggle('listening', listening);
    micBig.setAttribute('aria-pressed', listening ? 'true' : 'false');
  };
  micLabel(false);
  micBig.addEventListener('click', () => {
    if (stopListening) { stopListening(); return; }
    const base = area.value.trim() ? `${area.value.trimEnd()} ` : '';
    micLabel(true);
    stopListening = listen({
      onText: (t) => {
        area.value = base + t;
        updateDraft((dr) => { dr.text = area.value; });
        grow();
        paintDone();
      },
      onEnd: () => {
        micLabel(false);
        stopListening = null;
        if (area.value.trim()) sayIn(tori, [LINES.voiceOops]);
      },
      onError: () => {
        micLabel(false);
        stopListening = null;
        toast('잘 못 들었어. 다시 눌러 보거나 글자로 써도 돼.');
      },
    });
  });

  // ---------- 손글씨 사진 ----------
  const fileInput = h('input', { type: 'file', accept: 'image/*', class: 'sr-only', id: 'photo-file', 'aria-label': '사진 고르기' });
  const photoBox = h('div', { class: 'photo-box' });
  const showPhoto = (url) => {
    clear(photoBox);
    if (url) photoBox.appendChild(h('img', { class: 'photo-preview', src: url, alt: '내가 찍은 일기 사진' }));
  };
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    photoBox.textContent = '사진을 담는 중…';
    try {
      const blob = await compressImage(file);
      const id = store.state.draft.id;
      await savePhoto(id, blob);
      updateDraft((dr) => { dr.photoId = id; }, false);
      if (previewURL) URL.revokeObjectURL(previewURL);
      previewURL = URL.createObjectURL(blob);
      showPhoto(previewURL);
      sayIn(tori, [LINES.photoDone]);
      paintDone();
    } catch (e) {
      console.warn(e);
      showPhoto(null);
      toast('사진을 열지 못했어. 다른 사진으로 해 볼래?');
    }
    fileInput.value = '';
  });
  if (d.photoId) {
    photoURL(d.photoId).then((url) => { if (url) { previewURL = url; showPhoto(url); } }).catch(() => {});
  }

  // ---------- 고르는 방식에 따라 ----------
  const panel = h('div', { class: 'stack-sm input-panel' });
  const helpBtn = h('button', { class: 'btn btn-soft', type: 'button', on: { click: () => openHelp() } }, icon('help'), '도와줘');
  const paintInput = () => {
    clear(panel);
    if (stopListening) stopListening();
    if (mode === 'voice') {
      put(panel, h('p', { class: 'muted small' }, LINES.voice), micBig);
      area.placeholder = '말한 내용이 여기에 글자로 나와. 손으로 바꿔도 돼.';
      area.rows = 6;
    } else if (mode === 'photo') {
      put(panel, 
        h('p', { class: 'muted small' }, LINES.photo),
        fileInput,
        h('label', { class: 'btn btn-primary btn-big', for: 'photo-file' }, icon('camera'), store.state.draft.photoId ? '다른 사진으로 바꾸기' : '사진 찍기 또는 고르기'),
        photoBox);
      area.placeholder = '사진 아래에 붙일 한 줄 (안 써도 돼)';
      area.rows = 3;
    } else {
      area.placeholder = '여기에 편하게 써 봐.';
      area.rows = 8;
    }
    helpBtn.hidden = mode === 'photo';
    area.classList.toggle('short', mode === 'photo');
    requestAnimationFrame(grow);
  };

  const options = [{ value: 'keyboard', label: '쓰기', icon: ICONS.keyboard }];
  if (voiceAllowed) options.push({ value: 'voice', label: '말하기', icon: ICONS.mic });
  options.push({ value: 'photo', label: '손글씨 사진', icon: ICONS.camera });
  const modeSeg = seg(options, mode, (v) => {
    mode = v;
    updateDraft((dr) => { dr.input = v; }, false);
    paintInput();
    paintDone();
  }, '쓰는 방법');

  // ---------- 도와줘: 문장 시작 틀 ----------
  const insertStarter = (st) => {
    const cur = area.value;
    const sep = !cur.trim() || /\s$/.test(cur) ? '' : ' ';
    area.value = cur + sep + st;
    updateDraft((dr) => { dr.text = area.value; dr.stats.starter += 1; }, false);
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
    grow();
    paintDone();
  };
  function openHelp() {
    const n = sentenceCount(area.value);
    let part = n === 0 ? 'start' : n <= 2 ? 'middle' : 'end';
    openSheet((close) => {
      const list = h('div', { class: 'stack-sm' });
      const paintList = () => {
        clear(list);
        for (const st of starters(part, store.state.draft.plan)) {
          list.appendChild(h('button', { class: 'btn btn-soft starter-btn', type: 'button', on: { click: () => { close(); insertStarter(st); } } }, `${st.trim()} …`));
        }
        list.appendChild(h('button', { class: 'btn btn-soft starter-btn', type: 'button', on: { click: () => { close(); area.focus(); } } }, icon('pencil'), '내 말로 쓰기'));
      };
      paintList();
      return h('div', { class: 'stack' },
        talk('think', [LINES.help], { size: 'sm' }),
        h('p', { class: 'small-title' }, LINES.helpWhich),
        seg([{ value: 'start', label: '처음' }, { value: 'middle', label: '가운데' }, { value: 'end', label: '끝' }], part, (v) => { part = v; paintList(); }, LINES.helpWhich),
        list);
    }, { label: '도와줘' });
  }

  // ---------- 다 썼어 ----------
  const doneBtn = h('button', { class: 'btn btn-primary btn-big', type: 'button' }, icon('check'), '다 썼어');
  const doneNote = h('p', { class: 'muted small center' });
  function paintDone() {
    const ok = readyToFinish(store.state.draft);
    doneBtn.disabled = !ok;
    doneNote.textContent = ok ? '' : mode === 'photo' ? '사진 한 장이 있으면 끝낼 수 있어.' : '한 문장만 써도 끝낼 수 있어.';
  }
  doneBtn.addEventListener('click', () => {
    updateDraft((dr) => { dr.text = area.value; dr.title = titleInput.value; }, false);
    if (!readyToFinish(store.state.draft)) return;
    if (stopListening) stopListening();
    const res = finishDraft();
    if (res) app.go(`/write/done/${res.diary.id}`);
  });

  const view = h('div', { class: 'wrap stack write' },
    tori,
    h('div', { class: 'date-weather' }, h('span', { class: 'date-label ui' }, koreanDate(today)), weatherBox),
    titleInput,
    planStrip(d.plan),
    modeSeg,
    panel,
    area,
    h('div', { class: 'row' }, helpBtn),
    h('div', { class: 'stack-sm' }, doneBtn, doneNote));

  root.appendChild(flowbar({ step: 2, onBack: back, onStop: stop, music: musicButton() }));
  root.appendChild(view);
  paintInput();
  paintDone();

  if (d.openHelp) {
    updateDraft((dr) => { delete dr.openHelp; }, false);
    setTimeout(openHelp, 250);
  }

  return () => {
    if (stopListening) stopListening();
    if (previewURL) URL.revokeObjectURL(previewURL);
  };
}
