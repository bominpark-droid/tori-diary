// 보호자 화면 (PIN 4자리). docs/DESIGN.md 4.7
// - 이번 주 한눈에는 숫자만 보여 줍니다. 아이 글 내용과 다듬기 내용은 보이지 않습니다.
// - 글은 아이가 <보여 줄래>를 고른 일기만 읽고 답장할 수 있습니다.
// - 보호자는 문구머니를 주거나 뺄 수 없습니다(이 화면에 그런 단추가 없음).

import { h, clear, downloadText, seedOf, won, put } from '../util.js';
import { store, askPersistentStorage } from '../store.js';
import { icon, toast, ask, openSheet, switchRow, seg, screenTitle } from '../ui.js';
import { balance, pendingTotal, settleAll } from '../rewards.js';
import { dayKey, weekStart, addDays, koreanDate, daysBetween } from '../dates.js';
import { speechSupported, listen, similarity, VOICE_TEST } from '../speech.js';
import { exportPhotos, importPhotos, deletePhoto } from '../photos.js';

export const meta = { tab: null, flow: false, music: 'silent' };

let unlocked = false; // 새로 고침하면 다시 잠김
const RESET_PHRASE = '보호자가 PIN을 새로 정합니다';

async function hashPin(pin, kind) {
  const text = `tori-diary:${pin}`;
  if (kind !== 'simple') {
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return `sha256:${[...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
      }
    } catch (e) {
      /* 안전하지 않은 주소(http)에서는 아래 간단한 방법 */
    }
  }
  return `simple:${seedOf(text).toString(16)}`;
}

async function checkPin(pin, stored) {
  if (!stored) return false;
  return (await hashPin(pin, stored.startsWith('simple:') ? 'simple' : 'sha')) === stored;
}

function pinInput(label) {
  return h('input', { class: 'field pin-field', type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: 4, autocomplete: 'off', 'aria-label': label, placeholder: '••••' });
}

// ---------- 이번 주 숫자 ----------
function weekStats(s, start, end) {
  const inRange = (day) => day >= start && day <= end;
  const ds = s.diaries.filter((d) => inRange(d.day));
  const daysWith = (fn) => new Set(ds.filter(fn).map((d) => d.day)).size;
  const sum = (obj) => Object.entries(obj || {}).filter(([k]) => inRange(k)).reduce((a, [, v]) => a + v, 0);
  const inputs = { keyboard: 0, voice: 0, photo: 0 };
  for (const d of ds) inputs[d.input] = (inputs[d.input] || 0) + 1;
  const ledger = s.wallet.ledger.filter((e) => inRange(e.day));
  return {
    wrote: daysWith(() => true),
    rested: (s.rests || []).filter(inRange).length,
    extra: ds.filter((d) => d.first === false).length,
    polishOpened: daysWith((d) => d.polish && d.polish.opened),
    polishChanged: daysWith((d) => d.polish && d.polish.changed),
    oneLine: daysWith((d) => d.input !== 'photo' && (d.stats.sentences || 0) <= 1),
    planSkipped: ds.filter((d) => d.stats.planSkipped).length,
    hints: ds.reduce((a, d) => a + (d.stats.hintsOpened || 0), 0),
    inputs,
    shopMin: Math.round(sum(s.metrics.shopMs) / 60000),
    flowMin: Math.round(sum(s.metrics.flowMs) / 60000),
    earned: ledger.filter((e) => e.amount > 0).reduce((a, e) => a + e.amount, 0),
    spent: -ledger.filter((e) => e.amount < 0).reduce((a, e) => a + e.amount, 0),
  };
}

function statRow(label, value) {
  return h('div', { class: 'stat-row' }, h('span', { class: 'grow' }, label), h('b', null, value));
}

export function render(root, params, app) {
  const wrap = h('div', { class: 'wrap stack parent' });
  root.appendChild(wrap);
  const paint = () => {
    clear(wrap);
    if (!store.state.parent.pin) setupPin();
    else if (!unlocked) enterPin();
    else main();
  };

  // ---------- PIN 정하기 ----------
  function setupPin() {
    let first = null;
    const input = pinInput('PIN 4자리');
    const title = h('h2', null, '보호자 화면에 쓸 PIN 4자리를 정해 주세요.');
    const note = h('p', { class: 'muted' }, '아이가 모르는 숫자로 정해 주세요. PIN은 이 기기에만 저장됩니다.');
    const btn = h('button', { class: 'btn btn-primary btn-big', type: 'button' }, '다음');
    const go = async () => {
      const v = input.value.trim();
      if (!/^\d{4}$/.test(v)) { toast('숫자 4자리를 넣어 주세요.'); return; }
      if (first === null) {
        first = v;
        input.value = '';
        title.textContent = '한 번 더 넣어 주세요.';
        btn.textContent = 'PIN 정하기';
        input.focus();
        return;
      }
      if (v !== first) {
        first = null;
        input.value = '';
        title.textContent = '두 번 넣은 숫자가 달라요. 처음부터 다시 정해 주세요.';
        btn.textContent = '다음';
        return;
      }
      const hash = await hashPin(v);
      store.update((s) => { s.parent.pin = hash; });
      unlocked = true;
      toast('PIN을 정했어요.');
      paint();
    };
    btn.addEventListener('click', go);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    put(wrap, screenTitle('보호자 화면', { back: '#/settings' }), h('section', { class: 'card stack' }, title, input, btn, note));
    setTimeout(() => input.focus(), 60);
  }

  // ---------- PIN 넣기 ----------
  function enterPin() {
    const input = pinInput('PIN');
    const go = async () => {
      if (await checkPin(input.value.trim(), store.state.parent.pin)) {
        unlocked = true;
        paint();
      } else {
        input.value = '';
        toast('번호가 달라요.');
      }
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    input.addEventListener('input', () => { if (input.value.length === 4) go(); });
    put(wrap, 
      screenTitle('보호자 화면', { back: '#/settings' }),
      h('section', { class: 'card stack' },
        h('h2', null, 'PIN 4자리를 넣어 주세요.'),
        input,
        h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: go } }, '열기'),
        h('button', { class: 'btn-text', type: 'button', on: { click: forgot } }, 'PIN을 잊었어요')));
    setTimeout(() => input.focus(), 60);
  }

  function forgot() {
    openSheet((close) => {
      const input = h('input', { class: 'field', type: 'text', 'aria-label': '확인 문장', autocomplete: 'off' });
      return h('div', { class: 'stack' },
        h('h2', null, 'PIN 새로 정하기'),
        h('p', null, '아래 문장을 그대로 입력하면 PIN을 새로 정할 수 있어요. 일기와 문구머니 기록은 지워지지 않습니다.'),
        h('p', { class: 'pill' }, RESET_PHRASE),
        input,
        h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => {
          if (input.value.replace(/\s+/g, ' ').trim() !== RESET_PHRASE) { toast('문장이 달라요.'); return; }
          store.update((s) => { s.parent.pin = null; });
          close();
          paint();
        } } }, '새로 정하기'));
    }, { label: 'PIN 새로 정하기' });
  }

  // ---------- 본 화면 ----------
  function main() {
    const s = store.state;
    const today = dayKey();
    put(wrap, screenTitle('보호자 화면', {
      back: '#/settings',
      right: h('button', { class: 'btn btn-ghost', type: 'button', on: { click: () => { unlocked = false; app.go('/settings'); } } }, icon('lock'), '잠그기'),
    }));

    // 3개월 안내 (안전장치 7)
    if (s.parent.payout === 'daily' && !s.parent.fadeReminderSeen && daysBetween(s.firstDay, today) >= 90) {
      wrap.appendChild(h('section', { class: 'card seam stack-sm notice' },
        h('h2', { class: 'card-title' }, '주간 정산으로 바꿀 시기를 생각해 보세요'),
        h('p', null, '처음 쓴 날로부터 3개월쯤 지났어요. 매일 받던 문구머니를 일주일에 한 번 받는 방식으로 바꾸면 보상이 일기 쓰기의 중심이 되는 것을 줄이는 데 도움이 될 수 있어요. 바꾸면 서재에서 토리가 아이에게 먼저 알려 줍니다.'),
        h('button', { class: 'btn btn-soft', type: 'button', on: { click: () => { store.update((st) => { st.parent.fadeReminderSeen = true; }); paint(); } } }, '알겠어요')));
    }

    wrap.appendChild(weekSection(today));
    wrap.appendChild(sharedSection());
    wrap.appendChild(settingsSection());
    wrap.appendChild(backupSection(today));
    wrap.appendChild(h('p', { class: 'muted small center' }, '보호자는 문구머니를 주거나 뺄 수 없어요. 보상이 그날 기분에 따라 바뀌지 않게 하려는 설계입니다.'));
  }

  function weekSection(today) {
    let offset = 0;
    const body = h('div', { class: 'stack-sm' });
    const draw = () => {
      clear(body);
      const s = store.state;
      const start = addDays(weekStart(today), -7 * offset);
      const end = offset === 0 ? today : addDays(start, 6);
      const w = weekStats(s, start, end);
      put(body, 
        h('p', { class: 'muted small' }, `${koreanDate(start, false)} ~ ${koreanDate(end, false)}`),
        statRow('쓴 날', `${w.wrote}일`),
        statRow('쉰 날 (오늘은 쉴래)', `${w.rested}일`),
        statRow('하루 첫 일기 뒤에 더 쓴 일기', `${w.extra}편`),
        statRow('다듬기를 누른 날 / 고친 날', `${w.polishOpened}일 / ${w.polishChanged}일`),
        statRow('한 문장으로 끝낸 날', `${w.oneLine}일`),
        statRow('계획 건너뜀', `${w.planSkipped}번`),
        statRow('계획 힌트를 연 횟수', `${w.hints}번`),
        statRow('쓰는 방법', `쓰기 ${w.inputs.keyboard || 0} · 말하기 ${w.inputs.voice || 0} · 사진 ${w.inputs.photo || 0}`),
        statRow('문구점에 머문 시간 / 쓰기 흐름 시간', `${w.shopMin}분 / ${w.flowMin}분`),
        statRow('들어온 문구머니 / 쓴 문구머니', `${won(w.earned)} / ${won(w.spent)}`),
        offset === 0 ? statRow('지금 잔액', won(balance(s))) : null,
        offset === 0 && pendingTotal(s) > 0 ? statRow('월요일에 들어올 문구머니', won(pendingTotal(s))) : null,
        h('p', { class: 'muted small' }, '글 내용과 다듬기 내용은 여기에 나오지 않아요.'));
    };
    draw();
    return h('section', { class: 'card stack-sm' },
      h('h2', { class: 'card-title' }, '한 주 한눈에'),
      seg([{ value: 0, label: '이번 주' }, { value: 1, label: '지난주' }], 0, (v) => { offset = v; draw(); }, '주 고르기'),
      body);
  }

  function sharedSection() {
    const s = store.state;
    const list = s.diaries.filter((d) => d.shared).sort((a, b) => (a.day < b.day ? 1 : -1));
    const box = h('section', { class: 'card stack-sm' }, h('h2', { class: 'card-title' }, '가족에게 보여 준 일기'));
    if (!list.length) {
      box.appendChild(h('p', { class: 'muted' }, '아이가 <보여 줄래>를 고른 일기만 여기에 나와요. 아직 없어요.'));
      return box;
    }
    box.appendChild(h('p', { class: 'muted small' }, '답장은 60자 이내로, 궁금한 점 하나나 공감 한 줄을 권해요. 글을 고쳐 주거나 점수를 매기는 말은 피해 주세요.'));
    for (const d of list.slice(0, 20)) {
      const replies = h('div', { class: 'stack-sm' }, (d.replies || []).map((r) => h('div', { class: 'reply' }, h('p', null, r.text), h('div', { class: 'muted small' }, r.read ? '아이가 읽었어요' : '아직 안 읽었어요'))));
      const input = h('input', { class: 'field', type: 'text', maxlength: 60, placeholder: '예: 그 공은 어떻게 내려왔어?', 'aria-label': '답장' });
      const count = h('span', { class: 'muted small' }, '0/60');
      input.addEventListener('input', () => { count.textContent = `${input.value.length}/60`; });
      const send = () => {
        const v = input.value.trim().slice(0, 60);
        if (!v) return;
        store.update((st) => {
          const x = st.diaries.find((y) => y.id === d.id);
          if (x) x.replies.push({ id: `r${Date.now().toString(36)}`, text: v, at: new Date().toISOString(), read: false });
        });
        toast('답장을 남겼어요. 아이가 서재에서 알림을 봐요.');
        paint();
      };
      box.appendChild(h('article', { class: 'shared-diary stack-sm' },
        h('div', { class: 'ui' }, `${koreanDate(d.day)} · ${d.title || '제목 없음'}`),
        d.text ? h('p', { class: 'shared-text' }, d.text) : h('p', { class: 'muted' }, '(사진 일기)'),
        replies,
        h('div', { class: 'field-row' }, input, h('button', { class: 'btn btn-primary', type: 'button', on: { click: send } }, '답장')),
        count));
    }
    return box;
  }

  function settingsSection() {
    const s = store.state;
    const p = s.parent;
    const box = h('section', { class: 'card stack-sm' }, h('h2', { class: 'card-title' }, '설정'));

    box.appendChild(switchRow('다듬기 도우미', p.helper, (v) => store.update((st) => { st.parent.helper = v; }), '끄면 다듬기 단추와 다듬기 보너스가 없어져요. 일기 완성 1,000원은 그대로예요.'));

    // 말하기 입력
    const supported = speechSupported();
    const voiceNote = supported
      ? '켜면 쓰기 화면에 <말하기>가 생겨요. 목소리는 브라우저 회사(구글, 애플 등)의 음성 인식 서버로 보내질 수 있어요.'
      : '이 브라우저는 말하기 입력을 지원하지 않아요.';
    const voiceRow = switchRow('말하기 입력', p.voice && supported, async (v) => {
      if (v) {
        const yes = await ask({ title: '말하기 입력을 켤까요?', body: '아이 목소리가 브라우저 회사의 음성 인식 서버로 보내질 수 있어요. 일기 글 자체는 이 기기에만 저장됩니다. 켜기 전에 아래 정확도 시험을 권해요.', yes: '켤게요', no: '그대로 둘게요' });
        if (!yes) { paint(); return; }
      }
      store.update((st) => { st.parent.voice = v; });
      paint();
    }, voiceNote);
    if (!supported) voiceRow.querySelector('.switch').disabled = true;
    box.appendChild(voiceRow);
    if (supported) {
      const vt = p.voiceTest;
      box.appendChild(h('div', { class: 'row-between' },
        h('span', { class: 'muted small' }, vt ? `지난 정확도 시험: 약 ${vt.score}% (${koreanDate(dayKey(new Date(vt.at)), false)})` : '아이 목소리로 문장 10개를 읽어 정확도를 볼 수 있어요.'),
        h('button', { class: 'btn btn-soft', type: 'button', on: { click: voiceTest } }, icon('mic'), '정확도 시험')));
    }

    // 최대 음량
    const maxVol = h('input', { type: 'range', min: '0.2', max: '1', step: '0.05', value: String(p.maxVolume), 'aria-label': '최대 음량' });
    maxVol.addEventListener('change', () => store.update((st) => {
      st.parent.maxVolume = Number(maxVol.value);
      st.settings.volume = Math.min(st.settings.volume, st.parent.maxVolume);
    }));
    box.appendChild(h('div', { class: 'set-row' }, h('div', { class: 'grow' }, h('div', { class: 'ui set-label' }, '최대 음량'), h('div', { class: 'muted small' }, '아이 설정의 음량이 이보다 커지지 않아요.')), maxVol));

    // 쉬는 시간대
    const q = p.quiet;
    const start = h('input', { class: 'field time-field', type: 'time', value: q.start, 'aria-label': '쉬는 시간 시작' });
    const end = h('input', { class: 'field time-field', type: 'time', value: q.end, 'aria-label': '쉬는 시간 끝' });
    const saveQuiet = () => store.update((st) => { st.parent.quiet.start = start.value || '21:00'; st.parent.quiet.end = end.value || '07:00'; });
    start.addEventListener('change', saveQuiet);
    end.addEventListener('change', saveQuiet);
    box.appendChild(switchRow('쉬는 시간대', q.on, (v) => store.update((st) => { st.parent.quiet.on = v; }), '이 시간에는 졸린 토리만 보이고 쓰기 화면이 열리지 않아요.'));
    box.appendChild(h('div', { class: 'row time-row' }, start, h('span', null, '부터'), end, h('span', null, '까지')));

    // 지급 방식
    box.appendChild(h('div', { class: 'set-row' },
      h('div', { class: 'grow' }, h('div', { class: 'ui set-label' }, '문구머니 지급 방식'), h('div', { class: 'muted small' }, '주간 정산: 한 주 동안 모은 것이 다음 주 월요일에 들어와요. 바꾸면 토리가 서재에서 아이에게 먼저 알려 줘요.')),
      seg([{ value: 'daily', label: '매일' }, { value: 'weekly', label: '주간 정산' }], p.payout, async (v) => {
        if (v === store.state.parent.payout) return;
        if (v === 'weekly') {
          const yes = await ask({ title: '주간 정산으로 바꿀까요?', body: '이제부터 생기는 문구머니는 월요일에 한꺼번에 들어가요. 지금 잔액은 그대로예요.', yes: '바꿀게요', no: '그대로 둘게요' });
          if (!yes) { paint(); return; }
          store.update((st) => { st.parent.payout = 'weekly'; });
        } else {
          let paid = 0;
          store.update((st) => { st.parent.payout = 'daily'; paid = settleAll(st); });
          if (paid) toast(`모여 있던 ${won(paid)}을 바로 넣었어요.`);
        }
        paint();
      }, '지급 방식')));

    box.appendChild(h('button', { class: 'btn btn-soft', type: 'button', on: { click: () => { store.update((st) => { st.parent.pin = null; }); unlocked = false; paint(); } } }, 'PIN 바꾸기'));
    return box;
  }

  function voiceTest() {
    let i = 0;
    const scores = [];
    openSheet((close) => {
      const box = h('div', { class: 'stack' });
      let stopFn = null;
      const step = () => {
        clear(box);
        if (stopFn) { stopFn(); stopFn = null; }
        if (i >= VOICE_TEST.length) {
          const avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : 0;
          if (scores.length) store.update((st) => { st.parent.voiceTest = { at: new Date().toISOString(), score: avg, count: scores.length }; });
          put(box, 
            h('h2', null, scores.length ? `정확도 약 ${avg}% (${scores.length}문장)` : '읽은 문장이 없어요'),
            h('p', { class: 'muted' }, '글자가 얼마나 같은지로 잰 값이에요. 틀린 곳이 많으면 아이가 고치느라 힘들 수 있으니, 낮게 나오면 말하기 입력을 꺼 두는 것을 권해요.'),
            h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => { close(); paint(); } } }, '닫기'));
          return;
        }
        const target = VOICE_TEST[i];
        const heard = h('p', { class: 'voice-heard', 'aria-live': 'polite' });
        const mic = h('button', { class: 'btn btn-primary btn-big', type: 'button' }, icon('mic'), '읽기 시작');
        mic.addEventListener('click', () => {
          if (stopFn) { stopFn(); return; }
          mic.classList.add('listening');
          stopFn = listen({
            onText: (t, done) => {
              heard.textContent = t;
              if (done) {
                const sc = similarity(target, t);
                scores.push(sc);
                heard.textContent = `${t} (${Math.round(sc * 100)}%)`;
              }
            },
            onEnd: () => {
              mic.classList.remove('listening');
              stopFn = null;
              if (heard.textContent) { i++; setTimeout(step, 1200); }
            },
            onError: () => { mic.classList.remove('listening'); stopFn = null; heard.textContent = '잘 듣지 못했어요. 다시 눌러 주세요.'; },
          });
        });
        put(box, 
          h('p', { class: 'muted small' }, `${i + 1} / ${VOICE_TEST.length} · 아이가 아래 문장을 소리 내어 읽게 해 주세요.`),
          h('p', { class: 'voice-target ui' }, target),
          mic,
          heard,
          h('button', { class: 'btn-text', type: 'button', on: { click: () => { i++; step(); } } }, '이 문장 건너뛰기'));
      };
      step();
      return box;
    }, { label: '말하기 정확도 시험', onClose: () => {} });
  }

  function backupSection(today) {
    const box = h('section', { class: 'card stack-sm' }, h('h2', { class: 'card-title' }, '저장과 백업'),
      h('p', { class: 'muted small' }, '기록은 이 기기의 브라우저 안에만 있어요. 브라우저 기록을 지우거나 기기를 바꾸면 사라질 수 있으니 가끔 파일로 내보내 주세요.'));

    box.appendChild(h('button', { class: 'btn btn-soft', type: 'button', on: { click: async () => {
      try {
        const s = store.state;
        const ids = s.diaries.map((d) => d.photo).filter(Boolean);
        const photos = await exportPhotos(ids);
        const data = { app: 'tori-diary', version: s.version, exportedAt: new Date().toISOString(), state: s, photos };
        downloadText(`tori-diary-backup-${today}.json`, JSON.stringify(data));
        store.update((st) => { st.seen.lastBackup = today; });
        toast('백업 파일을 만들었어요.');
      } catch (e) {
        console.error(e);
        toast('백업 파일을 만들지 못했어요.');
      }
    } } }, icon('download'), '파일로 내보내기'));
    if (store.state.seen.lastBackup) box.appendChild(h('p', { class: 'muted small' }, `마지막으로 내보낸 날: ${koreanDate(store.state.seen.lastBackup, false)}`));

    const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', id: 'backup-file', 'aria-label': '백업 파일 고르기' });
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0];
      file.value = '';
      if (!f) return;
      let data;
      try {
        data = JSON.parse(await f.text());
      } catch (e) {
        toast('파일을 읽지 못했어요.');
        return;
      }
      if (!data || data.app !== 'tori-diary' || !data.state || !Array.isArray(data.state.diaries)) {
        toast('토리 일기장 백업 파일이 아니에요.');
        return;
      }
      const yes = await ask({ title: '이 파일로 바꿀까요?', body: `파일 속 일기 ${data.state.diaries.length}편으로 바뀌고, 지금 이 기기에 있는 기록은 사라져요.`, yes: '바꿀게요', no: '그만둘게요', danger: true });
      if (!yes) return;
      try {
        await importPhotos(data.photos || {});
      } catch (e) {
        console.warn(e);
        toast('사진 일부를 가져오지 못했어요.');
      }
      store.replace(data.state);
      unlocked = !!store.state.parent.pin;
      toast('백업 파일을 가져왔어요.');
      paint();
    });
    put(box, file, h('label', { class: 'btn btn-soft', for: 'backup-file' }, icon('upload'), '파일 가져오기'));

    box.appendChild(h('button', { class: 'btn btn-soft', type: 'button', on: { click: async () => {
      const ok = await askPersistentStorage();
      toast(ok ? '이 기기에 기록을 오래 두도록 요청했어요.' : '이 브라우저는 요청을 받지 않았어요. 백업 파일을 가끔 내보내 주세요.', 4000);
    } } }, '저장 공간 보호 요청'));

    box.appendChild(h('details', { class: 'howto' },
      h('summary', null, '홈 화면에 앱처럼 추가하는 법'),
      h('p', null, '아이폰, 아이패드: 사파리로 이 주소를 연 뒤 아래쪽 공유 단추를 누르고 <홈 화면에 추가>를 고릅니다.'),
      h('p', null, '안드로이드: 크롬으로 연 뒤 오른쪽 위 점 세 개 메뉴에서 <홈 화면에 추가> 또는 <앱 설치>를 고릅니다.'),
      h('p', { class: 'muted small' }, '홈 화면에서 열면 주소창 없이 앱처럼 보여요. 기록은 같은 브라우저 안에 저장됩니다.')));

    box.appendChild(h('button', { class: 'btn btn-ghost danger-text', type: 'button', on: { click: async () => {
      const yes = await ask({ title: '모든 기록을 지울까요?', body: '일기, 사진, 문구머니, 산 물건, 설정이 모두 지워지고 되돌릴 수 없어요. 먼저 파일로 내보내기를 권해요.', yes: '모두 지울게요', no: '그만둘게요', danger: true });
      if (!yes) return;
      const again = await ask({ title: '정말 모두 지울까요?', body: '한 번 더 확인할게요.', yes: '네, 지울게요', no: '아니요', danger: true });
      if (!again) return;
      const ids = store.state.diaries.map((d) => d.photo).filter(Boolean);
      for (const id of ids) { try { await deletePhoto(id); } catch (e) { /* 넘어감 */ } }
      if (store.state.draft && store.state.draft.photoId) { try { await deletePhoto(store.state.draft.photoId); } catch (e) { /* 넘어감 */ } }
      store.resetAll();
      unlocked = false;
      app.go('/welcome');
    } } }, icon('trash'), '모두 지우기'));
    return box;
  }

  paint();
}
