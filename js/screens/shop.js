// 문구점. docs/DESIGN.md 4.5, 7절
// 뽑기, 확률, 한정 판매, 카운트다운은 없습니다. 목표 막대는 저절로 줄지 않습니다.
// 다른 상품을 사서 목표에서 멀어질 때만 사기 전에 알려 줍니다.

import { h, clear, pick, won, put } from '../util.js';
import { store } from '../store.js';
import { talk, icon, openSheet, toast, coinBadge, seg, screenTitle, coinSVG } from '../ui.js';
import { ITEMS, itemById, previewOf } from '../data/shop-items.js';
import { coverSVG } from '../art/covers.js';
import { fontStyle } from '../data/fonts.js';
import { LINES } from '../data/tori-lines.js';
import { balance, buy } from '../rewards.js';
import { dayKey } from '../dates.js';
import { latestToday } from '../flow.js';
import { music } from '../music.js';
import { josa } from '../josa.js';
import { stickerNode, musicButton } from './common.js';

export const meta = { tab: 'shop', flow: false, music: 'shop' };

let lastTab = 'covers';

const TAB_OF = { cover: 'covers', set: 'covers', stickers: 'stickers', font: 'fonts' };

// size: 'grid'(상품 칸) | 'big'(크게 보기) | 'thumb'(목표 카드의 작은 그림)
function preview(item, size = 'grid') {
  const p = previewOf(item);
  const g = item.grants || {};
  const big = size === 'big';
  if (item.kind === 'set' && big) {
    return h('div', { class: 'stack-sm' },
      h('div', { class: 'item-cover', html: coverSVG(g.covers[0]) }),
      h('div', { class: 'item-stickers' }, (g.stickers || []).map((id) => stickerNode(id, 64))));
  }
  if (p.type === 'cover') return h('div', { class: 'item-cover', html: coverSVG(p.id) });
  if (p.type === 'font') return h('div', { class: 'item-font', style: fontStyle(p.id) }, '토리 일기');
  if (p.type === 'stickers') {
    const ids = big ? p.ids : p.ids.slice(0, size === 'thumb' ? 2 : 3);
    const px = big ? 64 : size === 'thumb' ? (ids.length === 1 ? 52 : 34) : (ids.length === 1 ? 70 : 40);
    return h('div', { class: ['item-stickers', ids.length === 1 ? 'single' : null] }, ids.map((id) => stickerNode(id, px)));
  }
  return h('div', { class: 'item-cover' });
}

export function render(root, params, app) {
  const t0 = Date.now();
  const today = dayKey();
  const wrap = h('div', { class: 'wrap stack shop' });
  const goalBox = h('div');
  const list = h('div', { class: 'item-grid' });
  const badgeBox = h('span');
  root.appendChild(wrap);

  const paintBadge = () => {
    clear(badgeBox);
    badgeBox.appendChild(coinBadge(balance(store.state), { href: null }));
  };

  const paintGoal = () => {
    clear(goalBox);
    const s = store.state;
    const item = s.goal ? itemById(s.goal) : null;
    if (!item || s.owned.items.includes(item.id)) {
      goalBox.appendChild(h('p', { class: 'muted goal-hint' }, LINES.goalHint));
      return;
    }
    const bal = balance(s);
    const have = Math.min(bal, item.price);
    const pct = Math.round((have / item.price) * 100);
    goalBox.appendChild(h('section', { class: 'card goal-card' },
      h('div', { class: 'row' },
        h('div', { class: 'goal-thumb' }, preview(item, 'thumb')),
        h('div', { class: 'grow stack-sm' },
          h('div', { class: 'ui goal-name' }, `목표: ${item.name}`),
          h('div', { class: 'goal-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(item.price), 'aria-valuenow': String(have), 'aria-label': '목표까지 모인 문구머니' },
            h('span', { style: { width: `${pct}%` } })),
          h('div', { class: 'muted small' }, `${won(have)} / ${won(item.price)}`))),
      bal >= item.price ? h('p', { class: 'goal-ready ui' }, LINES.goalReady) : null,
      h('button', { class: 'btn-text small', type: 'button', on: { click: () => { store.update((st) => { st.goal = null; }); paintAll(); } } }, '목표 내려놓기')));
  };

  const paintList = () => {
    clear(list);
    const s = store.state;
    const bal = balance(s);
    for (const item of ITEMS.filter((i) => TAB_OF[i.kind] === lastTab)) {
      const owned = s.owned.items.includes(item.id);
      const isGoal = s.goal === item.id;
      let action;
      if (owned) action = h('span', { class: 'pill owned-pill' }, icon('check'), '가지고 있어');
      else if (bal >= item.price) action = h('button', { class: 'btn btn-primary', type: 'button', on: { click: () => buySheet(item) } }, '살래');
      else if (isGoal) action = h('span', { class: 'pill goal-pill' }, '내 목표');
      else action = h('button', { class: 'btn btn-soft', type: 'button', on: { click: () => { store.update((st) => { st.goal = item.id; }); toast('목표로 정했어!'); paintAll(); } } }, '목표로 정하기');
      list.appendChild(h('article', { class: ['item', owned ? 'owned' : null, isGoal ? 'goal' : null] },
        item.isNew ? h('span', { class: 'new-badge' }, '새로 왔어') : null,
        h('button', { class: 'item-look', type: 'button', 'aria-label': `${item.name} 크게 보기`, on: { click: () => lookSheet(item) } }, preview(item)),
        h('h3', { class: 'item-name' }, item.name),
        h('p', { class: 'muted small item-desc' }, item.desc),
        h('div', { class: 'item-foot' },
          h('span', { class: 'price ui', html: `${coinSVG()}<span>${won(item.price)}</span>` }),
          action),
        !owned && bal < item.price ? h('p', { class: 'muted small' }, `${won(item.price - bal)} 더 모으면 살 수 있어`) : null));
    }
  };

  const paintAll = () => {
    paintBadge();
    paintGoal();
    paintList();
  };

  function lookSheet(item) {
    const s = store.state;
    const owned = s.owned.items.includes(item.id);
    openSheet((close) => h('div', { class: 'stack' },
      h('div', { class: 'buy-preview' }, preview(item, 'big')),
      h('h2', null, item.name),
      h('p', { class: 'muted' }, item.desc),
      owned ? h('p', { class: 'pill owned-pill' }, icon('check'), '가지고 있어')
        : balance(s) >= item.price ? h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => { close(); buySheet(item); } } }, '살래')
          : h('p', { class: 'muted' }, LINES.shopNotEnough),
      h('button', { class: 'btn btn-soft btn-big', type: 'button', on: { click: () => close() } }, '닫기')), { label: item.name });
  }

  function buySheet(item) {
    const s = store.state;
    const bal = balance(s);
    const goal = s.goal && s.goal !== item.id ? itemById(s.goal) : null;
    const warn = goal && !s.owned.items.includes(goal.id) && bal - item.price < goal.price;
    const price = won(item.price);
    openSheet((close) => h('div', { class: 'stack' },
      h('div', { class: 'buy-preview' }, preview(item, 'big')),
      h('h2', null, item.name),
      warn ? talk('think', [LINES.shopGoalWarn], { size: 'xs' }) : null,
      h('p', { class: 'ui buy-ask' }, `${price}${josa(price, '을/를')} 써서 살래?`),
      h('p', { class: 'muted small' }, `사고 나면 ${won(bal - item.price)} 남아.`),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-primary btn-big', type: 'button', on: { click: () => {
          let ok = false;
          store.update((st) => { ok = buy(st, item, today); });
          close();
          if (!ok) {
            toast('지금은 살 수 없어.');
            return;
          }
          music.sfx('coin');
          paintAll();
          cheerSheet(item);
        } } }, '살래'),
        h('button', { class: 'btn btn-soft btn-big', type: 'button', on: { click: () => close() } }, '다음에'))), { label: `${item.name} 사기` });
  }

  function cheerSheet(item) {
    const g = item.grants || {};
    const tryNow = () => {
      const cover = g.covers && g.covers[0];
      const font = g.fonts && g.fonts[0];
      store.update((st) => {
        if (cover) st.current.cover = cover;
        if (font) st.current.font = font;
      });
      const diary = latestToday();
      if (diary) {
        app.go(`/write/decorate/${diary.id}`);
        return;
      }
      if (cover) { toast('이제 새 일기는 이 표지로 시작해.'); app.go('/'); return; }
      if (font) { toast('이제 새 일기 제목은 이 글씨로 써.'); return; }
      toast('오늘 일기를 쓰고 나면 꾸미기에서 붙일 수 있어.');
    };
    openSheet((close) => h('div', { class: 'stack' },
      talk('cheer', [pick(LINES.shopBuy)], { size: 'md' }),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-primary btn-big', type: 'button', autofocus: true, on: { click: () => { close(); tryNow(); } } }, '바로 써 볼래'),
        h('button', { class: 'btn btn-soft btn-big', type: 'button', on: { click: () => close() } }, '나중에'))), { label: '샀어!' });
  }

  put(wrap, 
    screenTitle('문구점', { right: h('div', { class: 'row' }, badgeBox, musicButton()) }),
    talk('happy', [LINES.shopHello], { size: 'xs' }),
    goalBox,
    seg([{ value: 'covers', label: '표지' }, { value: 'stickers', label: '스티커' }, { value: 'fonts', label: '글꼴' }], lastTab, (v) => { lastTab = v; paintList(); }, '상품 종류'),
    list);
  paintAll();

  return () => {
    const ms = Date.now() - t0;
    store.update((st) => { st.metrics.shopMs[today] = (st.metrics.shopMs[today] || 0) + ms; });
  };
}
