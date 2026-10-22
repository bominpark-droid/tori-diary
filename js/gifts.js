// 토리의 선물 (docs/DESIGN.md 7절). 화면과 상관없는 순수한 계산만 둡니다.
// 일기를 쓴 날이 GIFT_EVERY일 쌓일 때마다 순서표(js/data/gifts.js)의 다음 선물을 하나 줍니다.
// 이미 가진 것은 건너뜁니다. 선물은 state.owned에 들어가고, 받은 기록은 state.gifts.log에 남습니다.

import { GIFTS, GIFT_EVERY, LEGACY_PER_GIFT, GIFT_KIND_NAME } from './data/gifts.js';
import { daysWritten } from './rewards.js';
import { stickerMeta } from './art/stickers.js';
import { COVERS, FRAMES } from './art/covers.js';
import { FONTS } from './data/fonts.js';

const OWNED_KEY = { sticker: 'stickers', cover: 'covers', font: 'fonts', frame: 'frames' };

export function owns(state, gift) {
  return state.owned[OWNED_KEY[gift.kind]].includes(gift.id);
}

// 지금까지 쓴 날 수로 받았어야 하는 선물 가운데 아직 못 받은 개수
export function giftsDue(state) {
  return Math.max(0, Math.floor(daysWritten(state) / GIFT_EVERY) - state.gifts.earned);
}

// 다음 선물까지 쓸 날 수 (1 ~ GIFT_EVERY). 선물을 막 받았으면 GIFT_EVERY
export function daysToNextGift(state) {
  return GIFT_EVERY - (daysWritten(state) % GIFT_EVERY);
}

// 순서표에서 아직 없는 첫 선물을 주고 받은 기록을 돌려줍니다. 줄 것이 없으면 null.
function grantNext(state, extra) {
  let i = state.gifts.next;
  while (i < GIFTS.length && owns(state, GIFTS[i])) i++;
  state.gifts.next = i;
  if (i >= GIFTS.length) return null;
  const g = GIFTS[i];
  state.owned[OWNED_KEY[g.kind]].push(g.id);
  state.gifts.next = i + 1;
  const entry = { n: i, kind: g.kind, id: g.id, at: new Date().toISOString(), seen: false, ...extra };
  state.gifts.log.push(entry);
  return entry;
}

// 일기를 장부에 넣은 뒤에 부릅니다. 새로 받은 선물 기록을 돌려줍니다.
export function grantDue(state, day, diaryId = null) {
  const out = [];
  while (giftsDue(state) > 0) {
    state.gifts.earned += 1;
    const e = grantNext(state, { day, diaryId });
    if (e) out.push(e);
  }
  return out;
}

// 문구점이 없어질 때 한 번: 남은 옛 문구머니 500원마다 선물 하나. 옛 기록은 지우지 않고 그대로 둡니다.
export function convertLegacy(state, day) {
  if (state.seen.legacyConverted) return [];
  state.seen.legacyConverted = true;
  const ledger = (state.wallet && state.wallet.ledger) || [];
  const old = ledger.reduce((a, e) => a + (e.amount || 0), 0);
  const out = [];
  for (let i = 0; i < Math.floor(old / LEGACY_PER_GIFT); i++) {
    const e = grantNext(state, { day, diaryId: null, legacy: true });
    if (!e) break;
    out.push(e);
  }
  // 예전에 문구점을 쓰던 기록이 있으면 홈에서 토리가 한 번 알려 줍니다(js/screens/home.js)
  if (ledger.length) state.seen.legacyNotice = { shown: false };
  return out;
}

// 앱을 열 때와 백업을 가져온 뒤에 부르는 정리: 옛 문구머니 바꾸기, 쌓여 있던 선물 주기
export function catchUp(state, day) {
  return [...convertLegacy(state, day), ...grantDue(state, day, null)];
}

// 화면에 보일 이름: { label: '스티커', name: '해', text: '해 스티커' }
export function giftInfo(entry) {
  let name = '';
  if (entry.kind === 'sticker') name = (stickerMeta(entry.id) || {}).name || '';
  else if (entry.kind === 'cover') name = (COVERS[entry.id] || {}).name || '';
  else if (entry.kind === 'font') name = (FONTS[entry.id] || {}).name || '';
  else if (entry.kind === 'frame') name = (FRAMES[entry.id] || {}).name || '';
  const label = GIFT_KIND_NAME[entry.kind] || '선물';
  // 글씨와 테두리는 이름에 이미 종류가 들어 있어요(감자꽃 글씨, 구름 테두리)
  const text = entry.kind === 'sticker' || entry.kind === 'cover' ? `${name} ${label}`.trim() : name || label;
  return { label, name, text };
}

export function giftsForDiary(state, diaryId) {
  return state.gifts.log.filter((g) => g.diaryId === diaryId);
}

// 아직 안 본, 일기와 이어지지 않은 선물(옛 문구머니 바꾸기, 쌓여 있던 선물)
export function unseenLoose(state) {
  return state.gifts.log.filter((g) => !g.seen && !g.diaryId);
}
