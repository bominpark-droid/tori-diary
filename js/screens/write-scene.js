// ① 오늘의 장면 고르기. docs/DESIGN.md 4.3 ①

import { h, clear, svg, seedOf, pick, put } from '../util.js';
import { store } from '../store.js';
import { flowbar, talk, sayIn, openSheet, chip, toast, SLOT_ICONS, icon } from '../ui.js';
import { DAY_SLOTS, TOPIC_GROUPS, LADDER, TORI_ASKS, pickCards } from '../data/topics.js';
import { FEELINGS } from '../data/plan.js';
import { LINES } from '../data/tori-lines.js';
import { allFolded } from '../hints.js';
import { dayKey } from '../dates.js';
import { startDraft, updateDraft } from '../flow.js';
import { speechSupported, listen } from '../speech.js';
import { musicButton } from './common.js';

export const meta = { tab: null, flow: true, music: 'writing' };

const WHEN_OF_SLOT = { morning: 'morning', class: 'day', break: 'day', lunch: 'day', after: 'day', evening: 'evening' };

export function render(root, params, app) {
  const d = startDraft();
  const today = dayKey();
  const seed = seedOf(today);
  let offset = 0;
  let chosenCard = d.topic && d.topic.kind === 'card' ? d.topic.cardId : null;
  let custom = d.topic && d.topic.kind === 'custom' ? d.topic.text : '';
  const open = new Set(Object.keys(d.scene.slots || {}));

  const stop = () => {
    store.flush();
    toast('쓰던 내용은 저장해 뒀어.');
    app.go('/');
  };

  const filledSlots = () => Object.entries(store.state.draft.scene.slots).filter(([, v]) => String(v || '').trim());

  const tori = talk('smile', [LINES.sceneStart], { size: 'sm' });

  // ---------- 하루 칸 ----------
  // 글을 쓰는 동안에는 칸을 다시 그리지 않고 별 단추만 바꿉니다(다른 칸을 한 번에 누를 수 있게).
  const STAR_ON = '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="#F4C24F" stroke="#C98A12" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const STAR_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" stroke-linejoin="round"/></svg>';
  const slotGrid = h('div', { class: 'slot-grid' });
  const paintStars = () => {
    const scene = store.state.draft.scene;
    const many = filledSlots().length >= 2;
    for (const card of slotGrid.querySelectorAll('.slot')) {
      const id = card.dataset.slot;
      const btn = card.querySelector('.star-btn');
      const has = String(scene.slots[id] || '').trim() !== '';
      const starred = many && has && scene.star === id;
      card.classList.toggle('starred', starred);
      if (!btn) continue;
      btn.hidden = !(many && has);
      btn.classList.toggle('on', starred);
      btn.setAttribute('aria-pressed', starred ? 'true' : 'false');
      clear(btn);
      put(btn, svg(starred ? STAR_ON : STAR_OFF), starred ? '이거 얘기할래' : '별 붙이기');
    }
  };
  const paintSlots = () => {
    clear(slotGrid);
    const scene = store.state.draft.scene;
    for (const slot of DAY_SLOTS) {
      const isOpen = open.has(slot.id);
      const value = scene.slots[slot.id] || '';
      const card = h('div', { class: ['slot', isOpen ? 'open' : null], dataset: { slot: slot.id } });
      const head = h('button', {
        class: 'slot-head',
        type: 'button',
        'aria-expanded': isOpen ? 'true' : 'false',
        on: { click: () => {
          const now = String(store.state.draft.scene.slots[slot.id] || '').trim();
          if (open.has(slot.id) && !now) open.delete(slot.id);
          else open.add(slot.id);
          paintSlots();
          const inp = slotGrid.querySelector(`input[data-slot="${slot.id}"]`);
          if (inp) inp.focus();
        } },
      }, svg(SLOT_ICONS[slot.icon], 'slot-ico'), h('span', { class: 'slot-label' }, slot.label));
      card.appendChild(head);
      if (isOpen) {
        const inp = h('input', {
          class: 'field slot-input', type: 'text', maxlength: 40, value, placeholder: '무슨 일이었어?', 'aria-label': `${slot.label}에 있었던 일`, dataset: { slot: slot.id },
        });
        inp.addEventListener('input', () => {
          updateDraft((dr) => {
            dr.scene.slots[slot.id] = inp.value;
            const f = Object.entries(dr.scene.slots).filter(([, v]) => String(v || '').trim());
            if (f.length >= 2 && !f.some(([k]) => k === dr.scene.star)) dr.scene.star = f[0][0];
            if (f.length < 2) dr.scene.star = f.length === 1 ? f[0][0] : null;
          });
          paintStars();
          paintStarHint();
          paintNext();
        });
        card.appendChild(inp);
        card.appendChild(h('button', {
          class: 'star-btn', type: 'button', hidden: true, 'aria-label': `${slot.label} 장면에 별 붙이기`,
          on: { click: () => { updateDraft((dr) => { dr.scene.star = slot.id; }, false); paintStars(); paintNext(); } },
        }));
      }
      slotGrid.appendChild(card);
    }
    paintStars();
  };
  const paintStarHint = () => {
    const f = filledSlots();
    sayIn(tori, [f.length >= 2 ? LINES.sceneStar : LINES.sceneStart]);
  };

  // ---------- 주제 카드 ----------
  const cardBox = h('div', { class: 'topic-cards' });
  const paintCards = () => {
    clear(cardBox);
    const s = store.state;
    const { group, cards } = pickCards({ recent: s.topics.recent, custom: s.topics.custom, offset, seed });
    if (s.seen.cardsDay !== today) {
      store.update((st) => {
        st.seen.cardsDay = today;
        st.topics.recent = [...st.topics.recent, group].slice(-6);
      });
    }
    for (const c of cards) {
      cardBox.appendChild(h('button', {
        class: ['topic-card', chosenCard === c.id ? 'on' : null], type: 'button', 'aria-pressed': chosenCard === c.id ? 'true' : 'false',
        on: { click: () => {
          chosenCard = chosenCard === c.id ? null : c.id;
          updateDraft((dr) => { dr.topic = chosenCard ? { kind: 'card', text: c.text, cardId: c.id, group: c.group } : null; }, false);
          paintCards();
          paintNext();
        } },
      }, h('span', { class: 'topic-group' }, TOPIC_GROUPS[c.group] || '내 카드'), h('span', { class: 'topic-text' }, c.text)));
    }
  };

  // ---------- 내가 정하기 ----------
  const ownInput = h('input', { class: 'field', type: 'text', maxlength: 40, value: custom, placeholder: '예: 새로 산 운동화', 'aria-label': '오늘 쓰고 싶은 이야기' });
  ownInput.addEventListener('input', () => {
    custom = ownInput.value;
    if (custom.trim()) chosenCard = null;
    updateDraft((dr) => { dr.topic = custom.trim() ? { kind: 'custom', text: custom.trim() } : null; });
    paintNext();
  });
  const ownBox = h('div', { class: 'own-topic', hidden: !custom }, h('label', { class: 'lbl' }, LINES.topicOwnAsk), ownInput);

  // ---------- 다음 ----------
  const nextBtn = h('button', { class: 'btn btn-primary btn-big', type: 'button' }, '다음');
  const nextNote = h('p', { class: 'muted small center' });
  const topicNow = () => {
    const dr = store.state.draft;
    if (dr.topic && dr.topic.kind === 'card' && chosenCard) return dr.topic;
    if (custom.trim()) return { kind: 'custom', text: custom.trim() };
    const f = filledSlots();
    if (!f.length) return null;
    const key = f.some(([k]) => k === dr.scene.star) ? dr.scene.star : f[0][0];
    return { kind: 'slot', slot: key, text: dr.scene.slots[key].trim() };
  };
  const paintNext = () => {
    const t = topicNow();
    nextBtn.disabled = !t;
    nextNote.textContent = t ? `오늘 이야기: ${t.text}` : '칸 하나를 채우거나 카드를 골라 줘.';
  };
  const goNext = (topic = topicNow(), to) => {
    if (!topic) return;
    updateDraft((dr) => {
      dr.topic = topic;
      if (topic.kind === 'slot') {
        const slot = DAY_SLOTS.find((x) => x.id === topic.slot);
        dr.plan.what = dr.plan.what || topic.text;
        if (WHEN_OF_SLOT[topic.slot] && !dr.plan.when) dr.plan.when = WHEN_OF_SLOT[topic.slot];
        if (slot && slot.where && !dr.plan.where) dr.plan.where = slot.where;
      } else if (topic.kind === 'custom' && !dr.plan.what) {
        dr.plan.what = topic.text;
      }
    }, false);
    if (to) return app.go(to);
    app.go(allFolded(store.state.hints) ? '/write/text' : '/write/plan');
  };
  nextBtn.addEventListener('click', () => goNext());

  // ---------- 막혔어 ----------
  const ladder = () => {
    const s = store.state;
    const record = (id) => updateDraft((dr) => { dr.stats.ladder.push(id); }, false);
    openSheet((close) => {
      const list = h('div', { class: 'stack-sm' });
      for (const step of LADDER) {
        if (step.needsVoice && !(s.parent.voice && speechSupported())) continue;
        list.appendChild(h('button', { class: 'btn btn-soft ladder-btn', type: 'button', on: { click: () => { record(step.id); close(); runLadder(step.id); } } }, step.label));
      }
      return h('div', { class: 'stack' }, talk('think', [LINES.stuck], { size: 'sm' }), list);
    }, { label: '막혔을 때' });
  };

  const runLadder = (id) => {
    if (id === 'rest') {
      store.update((st) => { if (!st.rests.includes(today)) st.rests.push(today); });
      toast(pick(LINES.rest, seed));
      return app.go('/');
    }
    if (id === 'photo') {
      updateDraft((dr) => { dr.input = 'photo'; }, false);
      return goNext({ kind: 'photo', text: '그림 한 컷' }, '/write/text');
    }
    if (id === 'starter') {
      updateDraft((dr) => { dr.openHelp = true; }, false);
      return goNext(topicNow() || { kind: 'free', text: '오늘 있었던 일' }, '/write/text');
    }
    if (id === 'favorite') {
      updateDraft((dr) => { if (!dr.title) dr.title = '내가 좋아하는 것'; }, false);
      return goNext({ kind: 'favorite', text: LINES.favorite });
    }
    if (id === 'mood') {
      openSheet((close) => h('div', { class: 'stack' },
        talk('smile', [LINES.moodPick], { size: 'sm' }),
        h('div', { class: 'chips' }, FEELINGS.map((f) => chip(f.label, { onClick: () => {
          updateDraft((dr) => { dr.plan.feeling = f.id; }, false);
          close();
          goNext({ kind: 'mood', text: `오늘 기분: ${f.label}` });
        } })))), { label: '기분 낱말' });
      return;
    }
    if (id === 'ask' || id === 'voice') {
      const q = pick(TORI_ASKS, seed + offset);
      openSheet((close) => {
        const inp = h('input', { class: 'field', type: 'text', maxlength: 40, placeholder: '한 마디만', 'aria-label': q.q, autofocus: true });
        const ok = h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => {
          const v = inp.value.trim();
          if (!v) return;
          updateDraft((dr) => { if (q.field === 'who') dr.plan.who = v; else dr.plan.what = v; }, false);
          close();
          goNext({ kind: 'ask', text: q.field === 'who' ? `${v}랑 있었던 일` : v });
        } } }, '좋아');
        const extra = [];
        if (id === 'voice') {
          const mic = h('button', { class: 'btn btn-soft', type: 'button' }, icon('mic'), '말하기');
          let stopFn = null;
          mic.addEventListener('click', () => {
            if (stopFn) { stopFn(); stopFn = null; return; }
            mic.classList.add('listening');
            stopFn = listen({
              onText: (t) => { inp.value = t.slice(0, 40); },
              onEnd: () => { mic.classList.remove('listening'); stopFn = null; },
              onError: () => { mic.classList.remove('listening'); toast('잘 못 들었어. 글자로 써도 돼.'); },
            });
          });
          extra.push(mic);
        }
        return h('div', { class: 'stack' }, talk('think', [q.q], { size: 'sm' }), inp, ...extra, ok);
      }, { label: '토리의 질문' });
    }
  };

  const view = h('div', { class: 'wrap stack scene' },
    tori,
    h('section', { class: 'stack-sm' }, h('h2', null, '오늘 하루'), slotGrid),
    h('section', { class: 'stack-sm' },
      h('div', { class: 'row-between' }, h('h2', null, '이야기 카드'), h('button', { class: 'btn btn-ghost', type: 'button', on: { click: () => { offset++; paintCards(); } } }, '다른 카드')),
      h('p', { class: 'muted small' }, LINES.cards),
      cardBox,
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-soft', type: 'button', on: { click: () => { ownBox.hidden = false; ownInput.focus(); } } }, icon('pencil'), '내가 정하기'),
        h('button', { class: 'btn btn-soft', type: 'button', on: { click: makeCard } }, icon('plus'), '내 카드 만들기')),
      ownBox),
    h('div', { class: 'stack-sm' },
      nextBtn,
      nextNote,
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('button', { class: 'btn-text', type: 'button', on: { click: () => goNext({ kind: 'free', text: '자유롭게' }) } }, '오늘은 그냥 쓸래'),
        h('button', { class: 'btn-text', type: 'button', on: { click: ladder } }, '막혔어'))));

  function makeCard() {
    openSheet((close) => {
      const inp = h('input', { class: 'field', type: 'text', maxlength: 40, placeholder: '예: 오늘 제일 신기했던 건?', 'aria-label': '내 카드 질문', autofocus: true });
      return h('div', { class: 'stack' },
        h('h2', null, '내 카드 만들기'),
        h('p', { class: 'muted' }, '나중에 카드에 섞여서 나와. 설정에서 지울 수 있어.'),
        inp,
        h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => {
          const v = inp.value.trim();
          if (!v) return;
          store.update((st) => { st.topics.custom.push({ id: `c${Date.now().toString(36)}`, text: v }); });
          close();
          toast('카드를 만들었어!');
          paintCards();
        } } }, '만들기'));
    }, { label: '내 카드 만들기' });
  }

  root.appendChild(flowbar({ step: 0, onBack: () => app.go('/'), onStop: stop, music: musicButton() }));
  root.appendChild(view);
  paintSlots();
  paintCards();
  paintNext();
}
