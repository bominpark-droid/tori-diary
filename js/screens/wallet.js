// 용돈 지갑과 토리의 선물. docs/DESIGN.md 4.5, 6, 7절
// - 용돈은 실제 돈과 1원 = 1원입니다. 아이가 <받을래>를 누르면 영수증이 생기고, 보호자가 직접 전해 준 뒤 표시합니다.
// - 선물은 일기를 쓴 날이 3일 쌓일 때마다 토리가 하나씩 줍니다. 사고파는 것이 아니고, 뽑기나 확률이 없습니다.

import { h, clear, put, won } from '../util.js';
import { store } from '../store.js';
import { talk, icon, openSheet, toast, ask, screenTitle, coinSVG } from '../ui.js';
import { LINES } from '../data/tori-lines.js';
import { GIFTS, GIFT_EVERY } from '../data/gifts.js';
import { AMOUNT, MIN_CASHOUT, balance, pendingTotal, canCashOut, cashOut, cancelCashOut, receipts, daysWritten } from '../rewards.js';
import { giftInfo } from '../gifts.js';
import { dayKey, koreanDate } from '../dates.js';
import { music } from '../music.js';
import { josa } from '../josa.js';
import { musicButton, giftLook } from './common.js';

export const meta = { tab: 'wallet', flow: false, music: 'decorate' };

export function render(root) {
  const today = dayKey();
  const wrap = h('div', { class: 'wrap stack wallet' });
  const purseBox = h('div');
  const receiptBox = h('div');
  const giftBox = h('div');
  root.appendChild(wrap);

  // ---------- 용돈 ----------
  const paintPurse = () => {
    clear(purseBox);
    const s = store.state;
    const bal = balance(s);
    const pending = pendingTotal(s);
    const ready = canCashOut(s);
    put(purseBox, h('section', { class: 'card purse-card stack-sm' },
      h('div', { class: 'purse-row' },
        h('span', { class: 'purse-coin', html: coinSVG() }),
        h('div', { class: 'grow' },
          h('div', { class: 'muted small' }, '내 용돈'),
          h('div', { class: 'purse-amount ui', 'aria-live': 'polite' }, won(bal)))),
      pending > 0 ? h('p', { class: 'pill' }, `월요일에 들어올 용돈 ${won(pending)}`) : null,
      ready
        ? h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: askCash } }, icon('check'), '용돈 받을래')
        : h('p', { class: 'muted' }, LINES.walletNeed)));
  };

  async function askCash() {
    const bal = balance(store.state);
    if (!canCashOut(store.state)) return;
    const price = won(bal);
    const yes = await ask({ title: `${price}${josa(price, '을/를')} 받을래?`, body: LINES.walletCashAsk, yes: '받을래', no: '다음에', mood: 'cheer' });
    if (!yes) return;
    let made = null;
    store.update((st) => { made = cashOut(st, today); });
    if (!made) {
      toast('지금은 받을 수 없어.');
      return;
    }
    music.sfx('coin');
    paintPurse();
    paintReceipts();
    openSheet((close) => h('div', { class: 'stack' },
      talk('cheer', [LINES.walletCashDone], { size: 'md' }),
      receiptRow(made, false),
      h('button', { class: 'btn btn-primary btn-big', type: 'button', autofocus: true, on: { click: () => close() } }, '알겠어')), { label: '영수증' });
  }

  // ---------- 영수증 ----------
  function receiptRow(e, withCancel) {
    const status = e.canceled
      ? h('span', { class: 'pill' }, '취소했어')
      : e.given
        ? h('span', { class: 'pill owned-pill' }, icon('check'), '받았어')
        : h('span', { class: 'pill wait-pill' }, '전달 대기');
    return h('div', { class: ['receipt-row', e.canceled ? 'canceled' : null] },
      h('div', { class: 'grow' },
        h('div', { class: 'ui receipt-amount' }, won(-e.amount)),
        h('div', { class: 'muted small' }, koreanDate(e.day))),
      status,
      withCancel && !e.given && !e.canceled
        ? h('button', { class: 'btn btn-soft', type: 'button', on: { click: () => cancel(e) } }, '취소할래')
        : null);
  }

  async function cancel(e) {
    const yes = await ask({ title: '이 영수증을 취소할까?', body: `${won(-e.amount)}이 다시 내 용돈으로 돌아와.`, yes: '취소할래', no: '그대로 둘래' });
    if (!yes) return;
    let ok = false;
    store.update((st) => { ok = cancelCashOut(st, e.id); });
    toast(ok ? LINES.walletCancel : '이미 받은 영수증이야.');
    paintPurse();
    paintReceipts();
  }

  const paintReceipts = () => {
    clear(receiptBox);
    const list = receipts(store.state).slice(0, 8);
    if (!list.length) return;
    put(receiptBox, h('section', { class: 'card stack-sm' },
      h('h2', { class: 'card-title' }, '영수증'),
      h('p', { class: 'muted small' }, '가족에게 보여 주면 용돈을 전해 줘. 전해 주면 <받았어>로 바뀌어.'),
      list.map((e) => receiptRow(e, true))));
  };

  // ---------- 규칙 ----------
  const rules = h('section', { class: 'card stack-sm' },
    h('h2', { class: 'card-title' }, '용돈이 모이는 때'),
    h('ul', { class: 'rule-list' },
      h('li', null, h('b', null, `일기를 쓰면 ${won(AMOUNT.diary)}`), ' (그날 첫 일기)'),
      h('li', null, h('b', null, `토리 제안을 보고 글을 고치면 ${won(AMOUNT.polish)}`), ' (하루 한 번)'),
      h('li', null, h('b', null, `한 주(월~일) 7일을 모두 쓰면 ${won(AMOUNT.week)}`), ' (일요일에 7일이 채워지면)')),
    h('p', { class: 'muted small' }, `같은 날 또 쓴 일기에는 용돈이 없어. ${won(MIN_CASHOUT)}이 되면 받을 수 있어.`));

  // ---------- 선물 ----------
  const paintGifts = () => {
    clear(giftBox);
    const s = store.state;
    const days = daysWritten(s);
    const got = s.gifts.log.slice().reverse();
    const filled = days % GIFT_EVERY;
    const dots = h('div', { class: 'gift-dots', role: 'img', 'aria-label': `선물이 오기까지 일기를 쓴 날 ${filled}일, 모두 ${GIFT_EVERY}일` },
      Array.from({ length: GIFT_EVERY }, (_, i) => h('span', { class: ['gift-dot', i < filled ? 'on' : null] })));
    const done = s.gifts.next >= GIFTS.length;
    const grid = h('div', { class: 'gift-grid' }, got.map((g) => {
      const info = giftInfo(g);
      return h('button', { class: 'gift-cell', type: 'button', on: { click: () => lookGift(g) } },
        h('span', { class: 'gift-cell-look' }, giftLook(g, 56)),
        h('span', { class: 'small gift-cell-name' }, info.text));
    }));
    put(giftBox, h('section', { class: 'card stack-sm' },
      h('h2', { class: 'card-title' }, '토리의 선물'),
      h('p', null, done ? LINES.giftAllGiven : LINES.giftHello),
      h('div', { class: 'gift-progress' }, dots, h('span', { class: 'muted small' }, `일기를 쓴 날 ${days}일`)),
      got.length ? grid : h('p', { class: 'muted' }, LINES.giftEmpty)));
  };

  function lookGift(g) {
    const info = giftInfo(g);
    openSheet((close) => h('div', { class: 'stack' },
      h('div', { class: 'buy-preview gift-big' }, giftLook(g, 120)),
      h('h2', null, info.text),
      h('button', { class: 'btn btn-soft btn-big', type: 'button', autofocus: true, on: { click: () => close() } }, '닫기')), { label: info.text });
  }

  put(wrap,
    screenTitle('용돈', { right: musicButton() }),
    talk('happy', [LINES.walletHello], { size: 'xs' }),
    purseBox,
    receiptBox,
    giftBox,
    rules);
  paintPurse();
  paintReceipts();
  paintGifts();
}
