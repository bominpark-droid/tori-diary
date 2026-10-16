// ② 3칸 계획. docs/DESIGN.md 4.3 ②
// 칸마다 힌트 단계가 따로 있습니다(js/hints.js).
// 1단계: 묻는 말 + 낱말 칩 + <힌트> 단추, 2단계: 낱말 칸만(칩은 <힌트 보기> 뒤에), 3단계: 칸 접힘.

import { h, clear } from '../util.js';
import { store } from '../store.js';
import { flowbar, talk, openSheet, chip, toast, icon, ask, SLOT_ICONS, WEATHER_ICONS } from '../ui.js';
import { WHO_CHIPS, WHERE_CHIPS, WHEN_ICONS, FEELINGS, READERS, PLAN_PARTS } from '../data/plan.js';
import { MODEL_DIARIES } from '../data/tori-diaries.js';
import { LINES, fill } from '../data/tori-lines.js';
import { recordPlan, acceptFold, declineFold, unfold } from '../hints.js';
import { dayKey, daysBetween } from '../dates.js';
import { startDraft, updateDraft } from '../flow.js';
import { speechSupported, listen, keepFewWords } from '../speech.js';
import { musicButton } from './common.js';

export const meta = { tab: null, flow: true, music: 'writing' };

const DUSK = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 22h24" stroke="#8BA0BE" stroke-width="2.4" stroke-linecap="round"/><path d="M9 22a7 7 0 0 1 14 0z" fill="#FFB27A" stroke="#E07B4F" stroke-width="2"/><path d="M24 7l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1z" fill="#F4C24F"/></svg>';
export const WHEN_SVG = { morning: SLOT_ICONS.sunrise, day: WEATHER_ICONS.sun, evening: DUSK, night: SLOT_ICONS.moon };

const plan = () => store.state.draft.plan;
const voiceOn = () => store.state.parent.voice && speechSupported();

// 말해서 낱말 1~3개만 넣는 마이크 단추 (말하기 입력을 켠 경우만)
function micButton(onValue) {
  if (!voiceOn()) return null;
  const b = h('button', { class: 'btn-icon mic-btn', type: 'button', 'aria-label': '말해서 낱말 넣기' }, icon('mic'));
  let stopFn = null;
  b.addEventListener('click', () => {
    if (stopFn) { stopFn(); return; }
    b.classList.add('listening');
    stopFn = listen({
      onText: (t, done) => { if (done) onValue(keepFewWords(t, 3)); },
      onEnd: () => { b.classList.remove('listening'); stopFn = null; },
      onError: () => { b.classList.remove('listening'); stopFn = null; toast('잘 못 들었어. 글자로 써도 돼.'); },
    });
  });
  return b;
}

function textField(key, { label, placeholder, maxlength = 30 }) {
  const input = h('input', { class: 'field', type: 'text', maxlength, value: plan()[key] || '', placeholder, 'aria-label': label, autocomplete: 'off' });
  input.addEventListener('input', () => updateDraft((dr) => { dr.plan[key] = input.value; }));
  const mic = micButton((t) => {
    input.value = t;
    updateDraft((dr) => { dr.plan[key] = t; }, false);
    input.dispatchEvent(new Event('input'));
  });
  return { el: mic ? h('div', { class: 'field-row' }, input, mic) : input, input };
}

// 칩을 누르면 그 낱말이 칸에 들어감 (다시 누르면 빠짐)
function wordChips(key, words, input, label) {
  const box = h('div', { class: 'chips', role: 'group', 'aria-label': label });
  const paint = () => {
    clear(box);
    for (const w of words) {
      box.appendChild(chip(w, { pressed: plan()[key] === w, onClick: () => {
        const v = plan()[key] === w ? '' : w;
        input.value = v;
        updateDraft((dr) => { dr.plan[key] = v; }, false);
        paint();
      } }));
    }
  };
  input.addEventListener('input', paint);
  paint();
  return box;
}

function whenChips() {
  const box = h('div', { class: 'chips', role: 'group', 'aria-label': '언제' });
  const paint = () => {
    clear(box);
    for (const w of WHEN_ICONS) {
      box.appendChild(chip(w.label, { pressed: plan().when === w.id, iconSvg: WHEN_SVG[w.id], onClick: () => {
        updateDraft((dr) => { dr.plan.when = dr.plan.when === w.id ? '' : w.id; }, false);
        paint();
      } }));
    }
  };
  paint();
  return box;
}

function feelingChips() {
  const box = h('div', { class: 'chips', role: 'group', 'aria-label': '기분' });
  const paint = () => {
    clear(box);
    for (const f of FEELINGS) {
      box.appendChild(chip(f.label, { pressed: plan().feeling === f.id, onClick: () => {
        updateDraft((dr) => { dr.plan.feeling = dr.plan.feeling === f.id ? '' : f.id; }, false);
        paint();
      } }));
    }
  };
  paint();
  return box;
}

// 가운데 칸 칩: 오늘 하루 칸에 쓴 낱말들
function sceneWords() {
  const slots = store.state.draft.scene.slots || {};
  return [...new Set(Object.values(slots).map((v) => String(v || '').trim()).filter(Boolean))].slice(0, 6);
}

function modelSheet(dayNo) {
  const m = MODEL_DIARIES[dayNo % MODEL_DIARIES.length];
  const feel = FEELINGS.find((f) => f.id === m.plan.feeling);
  const when = WHEN_ICONS.find((w) => w.id === m.plan.when);
  openSheet((close) => h('div', { class: 'stack' },
    talk('read', [LINES.model], { size: 'sm' }),
    h('div', { class: 'card model-plan' },
      h('h3', null, m.title),
      h('dl', { class: 'plan-sum' },
        h('dt', null, '처음'), h('dd', null, [m.plan.who, m.plan.where, when && when.label].filter(Boolean).join(', ')),
        h('dt', null, '가운데'), h('dd', null, m.plan.what),
        h('dt', null, '끝'), h('dd', null, [m.plan.how, feel && feel.label].filter(Boolean).join(', '))),
      h('p', { class: 'model-text' }, m.text)),
    h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => close() } }, '알겠어')), { label: '토리의 계획' });
}

export function render(root, params, app) {
  const d = startDraft();
  const today = dayKey();
  const enteredAt = Date.now();
  if (!d.steps.planAt) updateDraft((dr) => { dr.steps.planAt = Date.now(); }, false);

  const stop = () => {
    store.flush();
    toast('쓰던 내용은 저장해 뒀어.');
    app.go('/');
  };

  const openHint = (part) => {
    updateDraft((dr) => {
      if (!dr.hintUse[part]) dr.hintUse[part] = true;
      dr.stats.hintsOpened += 1;
    }, false);
  };

  // ---------- 칸 하나 ----------
  // 줄마다 { label, input, chips(힌트로 숨길 수 있음), always(늘 보임) }
  const fieldsOf = (part) => {
    if (part === 'start') {
      const who = textField('who', { label: '누구랑', placeholder: '누구랑?' });
      const where = textField('where', { label: '어디서', placeholder: '어디서?' });
      return [
        { label: '누구랑', input: who.el, chips: wordChips('who', WHO_CHIPS, who.input, '누구랑 낱말') },
        { label: '어디서', input: where.el, chips: wordChips('where', WHERE_CHIPS, where.input, '어디서 낱말') },
        { label: '언제', always: whenChips() },
      ];
    }
    if (part === 'middle') {
      const what = textField('what', { label: '가장 큰 일', placeholder: '가장 큰 일 한 가지', maxlength: 40 });
      const words = sceneWords();
      return [{ input: what.el, chips: words.length > 1 ? wordChips('what', words, what.input, '오늘 하루 낱말') : null }];
    }
    const how = textField('how', { label: '어떻게 끝났어', placeholder: '어떻게 끝났어?', maxlength: 40 });
    return [{ input: how.el }, { label: '기분', always: feelingChips() }];
  };

  const partCard = (part, n) => {
    const P = PLAN_PARTS[part];
    const level = store.state.hints[part].level;
    if (level >= 3) {
      return h('div', { class: 'plan-part folded' },
        h('span', { class: 'plan-num', 'aria-hidden': 'true' }, n),
        h('span', { class: 'plan-title' }, P.title),
        h('span', { class: 'muted grow small' }, '힌트 없이 바로 쓰기'),
        h('button', { class: 'btn btn-ghost', type: 'button', on: { click: () => {
          store.update((st) => unfold(st.hints, part));
          paintParts();
        } } }, '펴기'));
    }
    const rows = fieldsOf(part);
    const chipEls = rows.map((r) => r.chips).filter(Boolean);
    for (const c of chipEls) c.hidden = level >= 2;
    const hintLine = h('p', { class: 'plan-hint', hidden: true }, P.hint);
    const used = () => store.state.draft.hintUse[part];
    const hintBtn = h('button', { class: level >= 2 ? 'btn-text small' : 'btn btn-ghost hint-btn', type: 'button', 'aria-expanded': 'false', on: { click: () => {
      hintLine.hidden = false;
      for (const c of chipEls) c.hidden = false;
      hintBtn.remove();
      if (!used()) openHint(part);
      else updateDraft((dr) => { dr.stats.hintsOpened += 1; }, false);
    } } }, level >= 2 ? '힌트 보기' : [icon('help'), '힌트']);
    return h('section', { class: ['plan-part', `level-${level}`], 'aria-label': `${P.title} 칸` },
      h('div', { class: 'plan-head' },
        h('span', { class: 'plan-num', 'aria-hidden': 'true' }, n),
        h('span', { class: 'plan-title' }, P.title),
        level === 1 ? h('span', { class: 'plan-ask grow' }, P.ask) : h('span', { class: 'grow' }),
        hintBtn),
      hintLine,
      rows.map((r) => h('div', { class: 'plan-field' },
        r.label ? h('span', { class: 'plan-label' }, r.label) : null,
        r.input || null, r.chips || null, r.always || null)));
  };

  // ---------- 자세히 (6칸) ----------
  const detailed = () => {
    const who = textField('who', { label: '누가', placeholder: '누가 나와?' });
    const where = textField('where', { label: '어디서', placeholder: '어디서?' });
    const what = textField('what', { label: '무슨 일', placeholder: '무슨 일이 있었어?', maxlength: 40 });
    const how = textField('how', { label: '어떻게 끝났나', placeholder: '어떻게 끝났어?', maxlength: 40 });
    const words = sceneWords();
    const row = (label, ...kids) => h('div', { class: 'plan-field' }, h('span', { class: 'plan-label' }, label), ...kids);
    return h('section', { class: 'plan-part detailed', 'aria-label': '자세한 계획' },
      row('누가', who.el, wordChips('who', WHO_CHIPS, who.input, '누가 낱말')),
      row('언제', whenChips()),
      row('어디서', where.el, wordChips('where', WHERE_CHIPS, where.input, '어디서 낱말')),
      row('무슨 일', what.el, words.length > 1 ? wordChips('what', words, what.input, '오늘 하루 낱말') : null),
      row('어떻게 끝났나', how.el),
      row('기분', feelingChips()));
  };

  const partsBox = h('div', { class: 'stack plan-parts' });
  const detailBtn = h('button', { class: 'btn btn-ghost', type: 'button' });
  function paintParts() {
    clear(partsBox);
    const isDetailed = store.state.draft.plan.detailed;
    if (isDetailed) partsBox.appendChild(detailed());
    else ['start', 'middle', 'end'].forEach((p, i) => partsBox.appendChild(partCard(p, i + 1)));
    detailBtn.textContent = isDetailed ? '3칸으로 보기' : '자세히';
    detailBtn.setAttribute('aria-pressed', isDetailed ? 'true' : 'false');
  }
  detailBtn.addEventListener('click', () => {
    updateDraft((dr) => { dr.plan.detailed = !dr.plan.detailed; }, false);
    paintParts();
  });

  // ---------- 읽는 사람 ----------
  const readerBox = h('div', { class: 'chips', role: 'group', 'aria-label': '읽는 사람' });
  const paintReader = () => {
    clear(readerBox);
    for (const r of READERS) {
      readerBox.appendChild(chip(r.label, { pressed: plan().reader === r.id, onClick: () => {
        updateDraft((dr) => { dr.plan.reader = dr.plan.reader === r.id ? '' : r.id; }, false);
        paintReader();
      } }));
    }
  };
  paintReader();

  // ---------- 쓰러 가기 ----------
  const goWrite = async () => {
    const p = store.state.draft.plan;
    const hu = store.state.draft.hintUse;
    const results = {
      start: { filled: !!(String(p.who).trim() || String(p.where).trim() || p.when), hintOpened: !!hu.start },
      middle: { filled: !!String(p.what).trim(), hintOpened: !!hu.middle },
      end: { filled: !!(String(p.how).trim() || p.feeling), hintOpened: !!hu.end },
    };
    let offers = [];
    store.update((st) => {
      offers = recordPlan(st.hints, results, today);
      st.draft.plan.skipped = false;
    });
    for (const part of offers) {
      const yes = await ask({ title: fill(LINES.foldOffer, { part: PLAN_PARTS[part].title }), mood: 'happy', yes: '접어 볼래', no: '아직 펴 둘래' });
      store.update((st) => (yes ? acceptFold : declineFold)(st.hints, part));
    }
    app.go('/write/text');
  };
  const skip = () => {
    updateDraft((dr) => { dr.plan.skipped = true; }, false);
    app.go('/write/text');
  };

  // ---------- 화면 ----------
  const s = store.state;
  const dayNo = Math.max(0, daysBetween(s.firstDay, today));
  const topic = d.topic;
  const view = h('div', { class: 'wrap stack plan' },
    talk('think', [LINES.plan], { size: 'sm' }),
    topic && topic.text ? h('p', { class: 'topic-pill' }, h('span', { class: 'muted' }, '오늘 이야기'), h('b', null, topic.text)) : null,
    h('div', { class: 'row-between' },
      dayNo < 14 ? h('button', { class: 'btn btn-soft', type: 'button', on: { click: () => modelSheet(dayNo) } }, icon('book'), '토리는 이렇게 했어') : h('span'),
      detailBtn),
    partsBox,
    h('section', { class: 'stack-sm' }, h('h2', { class: 'small-title' }, '누가 읽을 거야? (안 골라도 돼)'), readerBox),
    h('div', { class: 'stack-sm' },
      h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: goWrite } }, '쓰러 가기', icon('next')),
      h('button', { class: 'btn-text', type: 'button', on: { click: skip } }, '건너뛰기')));

  root.appendChild(flowbar({ step: 1, onBack: () => app.go('/write/scene'), onStop: stop, music: musicButton() }));
  root.appendChild(view);
  paintParts();

  return () => {
    if (store.state.draft) updateDraft((dr) => { dr.stats.planMs += Date.now() - enteredAt; }, false);
  };
}
