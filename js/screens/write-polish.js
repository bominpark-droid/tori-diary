// ⑤ 다듬기 도우미 (아이가 눌러야 시작). docs/DESIGN.md 4.3 ⑤, 5절
// 한 번에 제안 하나만 보여 줍니다.
// 1회차: 더하기형 하나 → 두 번째 종류(표기, 점 찍기, 나누기, 잇기) 하나. 두 번째는 바뀐 글로 다시 찾습니다.
// 1회차에서 처음 고치면 다듬기 보너스(하루 한 번). <한 번 더>(2회차)는 토리 반응만 있고 용돈은 없습니다.
// 보기를 고르든 자기 말로 쓰든 글이 바뀌면 <따라 고쳤다>로 봅니다(사용자 결정).

import { h, clear, pick, seedOf, put } from '../util.js';
import { store, findDiary } from '../store.js';
import { flowbar, bubble, withQuotes, toast, icon } from '../ui.js';
import { toriNode, setMood } from '../tori.js';
import { LINES, fill } from '../data/tori-lines.js';
import {
  pickSuggestion, pickRoundTwo, applyOption, applyOwn, previewOption, isChanged, ownReady,
  reactionFor, afterChangeLine, diffWords, splitSentences,
} from '../feedback.js';
import { canEarnPolish, earnPolish } from '../rewards.js';
import { updateDiary } from '../flow.js';
import { dayKey } from '../dates.js';
import { music } from '../music.js';
import { photoURL } from '../photos.js';
import { musicButton, rewardCard, diffSides } from './common.js';

export const meta = { tab: null, flow: true, music: 'writing' };

const q = (line) => (typeof line === 'string' && line.includes('‘') ? withQuotes(line) : line);

// 바뀐 곳이 들어 있는 문장(들)만 잘라 처음 글과 고친 글로
function changedRegion(a, b) {
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let k = 0;
  while (k < a.length - p && k < b.length - p && a[a.length - 1 - k] === b[b.length - 1 - k]) k++;
  const ss = splitSentences(a);
  let start = 0;
  for (const s of ss) if (s.start <= p) start = s.start;
  const endA = a.length - k;
  let end = a.length;
  for (const s of ss) {
    if (s.end >= endA) { end = s.end; break; }
  }
  if (end < start) end = start;
  return { before: a.slice(start, end), after: b.slice(start, b.length - (a.length - end)) };
}

function compareView(oldText, newText) {
  const { before, after } = changedRegion(oldText, newText);
  const { left, right } = diffSides(diffWords(before, after));
  return h('div', { class: 'compare', role: 'group', 'aria-label': '처음 글과 고친 글' },
    h('div', { class: 'cmp-col' }, h('div', { class: 'cmp-label' }, '처음 글'), h('p', { class: 'cmp-text' }, before.trim() ? left : '(없음)')),
    h('div', { class: 'cmp-arrow', 'aria-hidden': 'true' }, icon('next')),
    h('div', { class: 'cmp-col now' }, h('div', { class: 'cmp-label' }, '고친 글'), h('p', { class: 'cmp-text' }, right)));
}

// 보기 단추 안에 새로 들어간 말 표시
function markText(text, mark) {
  const t = String(text);
  if (!mark || !t.includes(mark)) return t;
  const i = t.indexOf(mark);
  return [t.slice(0, i), h('mark', null, mark), t.slice(i + mark.length)];
}

export function render(root, params, app) {
  const d = findDiary(params.id);
  if (!d) {
    app.go('/', { replace: true });
    return;
  }
  const today = dayKey();
  const seed = seedOf(d.id);
  const isPhoto = d.input === 'photo' && !!d.photo;
  const spellAllowed = store.state.seen.spellDay !== today;
  const bonusDay = d.day === today; // 지난 일기를 다듬을 때는 보너스 없음

  const st = {
    text: d.text || '',
    round: 1,
    family: 'add',
    sug: null,
    rejected: new Set(),
    shownKinds: [],
    spellShown: false,
    spellAgainUsed: false,
    paidNow: 0,
  };
  const opts = () => ({ plan: d.plan, spellAllowed: spellAllowed && !st.spellShown, isPhoto, seed });

  updateDiary(d.id, (x) => { x.polish.opened = true; });

  const save = (patch) => updateDiary(d.id, (x) => {
    x.text = st.text;
    x.polish.rounds = Math.max(x.polish.rounds || 0, st.round);
    if (patch) patch(x.polish);
  });
  const log = (action, changed) => save((p) => {
    p.history.push({ round: st.round, kind: st.sug ? st.sug.kind : null, action, changed, at: new Date().toISOString() });
    if (changed) {
      p.changed = true;
      if (st.sug && !p.kinds.includes(st.sug.kind)) p.kinds.push(st.sug.kind);
    }
  });

  // ---------- 토리 ----------
  const toriBox = toriNode('read', { size: 'sm' });
  const bubbles = h('div', { class: 'stack-sm grow' });
  const speak = (mood, ...groups) => {
    setMood(toriBox, mood);
    clear(bubbles);
    groups.filter((g) => g && g.length).forEach((g, i) => bubbles.appendChild(bubble(g.map(q), i ? 'no-tail' : null)));
  };

  // ---------- 내 일기 (제안 자리에 점선 밑줄) ----------
  const textBox = h('div', { class: 'polish-text', 'aria-label': '내 일기' });
  let photoEl = null;
  if (isPhoto) {
    photoURL(d.photo).then((url) => {
      if (!url) return;
      photoEl = h('img', { class: 'polish-photo', src: url, alt: '내 일기 사진' });
      textBox.prepend(photoEl);
    }).catch(() => {});
  }
  const paintText = (sug) => {
    clear(textBox);
    if (photoEl) textBox.appendChild(photoEl);
    const t = st.text;
    if (!t.trim()) {
      textBox.appendChild(h('p', { class: 'muted' }, '(사진 일기)'));
      return;
    }
    let a = -1;
    let b = -1;
    if (sug && sug.target) {
      if (sug.kind === 'spell' && sug.spell) { a = sug.spell.start; b = sug.spell.end; }
      else if (sug.kind === 'connect' && sug.prev) {
        const prev = splitSentences(t)[sug.prev.index];
        a = prev ? prev.start : sug.target.start;
        b = sug.target.end;
      } else { a = sug.target.start; b = sug.target.end; }
    }
    if (a < 0) textBox.appendChild(h('p', { class: 'polish-p' }, t));
    else textBox.appendChild(h('p', { class: 'polish-p' }, t.slice(0, a), h('span', { class: 'target' }, t.slice(a, b)), t.slice(b)));
    const tg = textBox.querySelector('.target');
    if (tg && textBox.scrollHeight > textBox.clientHeight) tg.scrollIntoView({ block: 'nearest' });
  };

  const area = h('div', { class: 'stack polish-area', 'aria-live': 'polite' });
  const view = h('div', { class: 'wrap stack polish' }, h('div', { class: 'talk' }, toriBox, bubbles), textBox, area);

  // ---------- 단계 ----------
  const show = (sug, lead) => {
    st.sug = sug;
    st.shownKinds.push(sug.kind);
    if (sug.kind === 'spell') {
      st.spellShown = true;
      store.update((s) => { s.seen.spellDay = today; });
    }
    speak('think', lead ? [lead] : null, [sug.why, sug.say]);
    paintText(sug);
    clear(area);
    const box = h('div', { class: 'stack-sm' });
    if (sug.kind === 'connect') box.appendChild(h('p', { class: 'muted small' }, LINES.connectHelp));
    if (sug.example) box.appendChild(h('p', { class: 'muted small' }, sug.example));
    for (const o of sug.options) box.appendChild(optionButton(sug, o));
    if (sug.own) box.appendChild(h('button', { class: 'btn btn-soft option-btn own', type: 'button', on: { click: () => ownEditor(sug) } }, icon('pencil'), '내 말로 쓸래'));
    put(area, box,
      h('div', { class: 'row sug-more' },
        h('button', { class: 'btn-text', type: 'button', on: { click: () => reject(sug) } }, '이건 아닌 것 같아'),
        h('button', { class: 'btn-text', type: 'button', on: { click: () => keep() } }, '그대로 둘래')),
      h('p', { class: 'muted small' }, LINES.mightBeWrong));
  };

  function optionButton(sug, o) {
    let content;
    if (o.type === 'prefill' || o.type === 'prefill-edit') content = o.label;
    else if (sug.kind === 'spell' && sug.target) content = markText(sug.target.text.replace(sug.spell.wrong, o.value), o.value);
    else {
      const pv = previewOption(st.text, sug, o);
      content = o.type === 'append' ? ['+ ', h('mark', null, pv.text)] : markText(pv.text, pv.mark);
    }
    return h('button', { class: 'btn btn-soft option-btn', type: 'button', on: { click: () => choose(sug, o) } }, content);
  }

  function choose(sug, o) {
    if (o.type === 'prefill' || o.type === 'prefill-edit') return ownEditor(sug, o.value);
    if (o.type === 'keep') {
      if (!st.spellAgainUsed && sug.spell) {
        log('spell-keep', false);
        return spellAgain(sug);
      }
      return keep();
    }
    const next = applyOption(st.text, sug, o);
    if (!isChanged(st.text, next)) return keep();
    changed(sug, next, 'option');
  }

  function ownEditor(sug, prefill) {
    const mode = sug.own.mode;
    const init = mode === 'edit' ? (prefill ?? sug.own.prefill ?? '') : (prefill || '');
    const ta = h('textarea', { class: 'field own-field', rows: 3, spellcheck: 'false', autocorrect: 'off', placeholder: sug.own.placeholder || '', 'aria-label': '내 말로 쓰기' });
    ta.value = init;
    const ok = h('button', { class: 'btn btn-primary btn-big', type: 'button' }, '이렇게 바꿀래');
    const check = () => { ok.disabled = !ownReady(sug, ta.value, mode === 'edit' ? undefined : (prefill || '')); };
    ta.addEventListener('input', check);
    check();
    ok.addEventListener('click', () => {
      if (ok.disabled) return;
      const next = applyOwn(st.text, sug, ta.value);
      if (!isChanged(st.text, next)) return;
      changed(sug, next, 'own');
    });
    clear(area);
    put(area, 
      h('p', { class: 'small-title' }, mode === 'edit' ? '이 문장을 네 말로 바꿔 봐.' : '붙일 문장을 네 말로 써 봐.'),
      ta,
      ok,
      h('button', { class: 'btn-text', type: 'button', on: { click: () => show(sug) } }, '보기로 돌아가기'));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 40);
  }

  function spellAgain(sug) {
    st.spellAgainUsed = true;
    speak('think', [fill(LINES.spellKept, { right: sug.spell.right })]);
    const fixed = { label: sug.spell.right, type: 'replace', value: sug.spell.right };
    clear(area);
    put(area, h('div', { class: 'stack-sm' },
      h('button', { class: 'btn btn-soft option-btn', type: 'button', on: { click: () => changed(sug, applyOption(st.text, sug, fixed), 'option') } }, markText(sug.target.text.replace(sug.spell.wrong, sug.spell.right), sug.spell.right)),
      h('button', { class: 'btn btn-soft option-btn', type: 'button', on: { click: () => keep() } }, '그대로 둘래')));
  }

  function changed(sug, next, how) {
    const old = st.text;
    st.text = next;
    log(how, true);
    let reward = null;
    if (st.round === 1 && bonusDay && !st.paidNow && canEarnPolish(store.state, today)) {
      store.update((s) => { reward = earnPolish(s, today, d.id); });
      if (reward && reward.amount) {
        st.paidNow = reward.amount;
        save((p) => { p.bonus = (p.bonus || 0) + reward.amount; });
        music.sfx('coin');
      }
    }
    speak('happy', [afterChangeLine(sug)], reward && reward.amount ? [LINES.bonusGot] : null);
    paintText(null);
    clear(area);
    put(area, 
      compareView(old, next),
      reward && reward.amount ? rewardCard({ title: '다듬기 보너스', amount: reward.amount, note: reward.pending ? '월요일에 한꺼번에 들어와.' : null }) : null,
      h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => advance() } }, '다음', icon('next')));
  }

  function keep() {
    log('keep', false);
    advance(pick(LINES.kept, seed + st.shownKinds.length));
  }

  function reject(sug) {
    st.rejected.add(sug.id);
    log('reject', false);
    const ex = new Set(st.rejected);
    if (st.spellShown) ex.add('spell');
    if (st.round === 2) {
      ex.add('add-detail');
      st.shownKinds.forEach((k) => ex.add(k));
    }
    const next = pickSuggestion(st.text, sug.family, opts(), ex);
    if (next) return show(next, pick(LINES.rejected, seed + st.rejected.size));
    advance(LINES.noMore);
  }

  // 다음 제안으로, 없으면 회차 끝
  function advance(lead) {
    if (st.round === 1 && st.family === 'add') {
      st.family = 'second';
      const ex = new Set(st.rejected);
      if (st.spellShown) ex.add('spell');
      const next = pickSuggestion(st.text, 'second', opts(), ex);
      if (next) return show(next, lead);
    }
    if (st.round === 1) return roundEnd(lead);
    return end(lead);
  }

  function roundEnd(lead) {
    save();
    speak('smile', lead ? [lead] : null, [LINES.againAsk]);
    paintText(null);
    clear(area);
    put(area, h('div', { class: 'btn-row' },
      h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: roundTwo } }, '한 번 더'),
      h('button', { class: 'btn btn-soft btn-big', type: 'button', on: { click: () => end() } }, '여기까지')));
  }

  function roundTwo() {
    st.round = 2;
    save();
    const next = pickRoundTwo(st.text, opts(), st.shownKinds);
    if (next) return show(next);
    speak('happy', [LINES.roundTwoNone]);
    paintText(null);
    clear(area);
    put(area, decorateBtn());
  }

  function end(lead) {
    save();
    speak('happy', lead ? [lead] : null, [LINES.roundEnd]);
    paintText(null);
    clear(area);
    put(area, decorateBtn());
  }

  const decorateBtn = () => h('a', { class: 'btn btn-primary btn-big', href: `#/write/decorate/${d.id}` }, '꾸미러 가기', icon('next'));

  // ---------- 시작: 내용에 먼저 반응 ----------
  const intro = () => {
    speak('read', [reactionFor(st.text, { seed, isPhoto })], [LINES.polishOpen]);
    paintText(null);
    clear(area);
    put(area, h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => {
      const first = pickSuggestion(st.text, 'add', opts(), new Set());
      if (first) show(first);
      else advance();
    } } }, '좋아, 들려줘'));
  };

  const stop = () => {
    save();
    toast('일기는 책장에 잘 넣어 뒀어.');
    app.go('/');
  };
  root.appendChild(flowbar({ step: 3, onBack: () => app.go(`/write/done/${d.id}`), onStop: stop, music: musicButton() }));
  root.appendChild(view);
  intro();
}
