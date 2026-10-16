// 한국어 조사 붙이기 도우미.
// josa('민준', '아/야') → '아'  /  withJosa('지호', '이/가') → '지호가'

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

function lastHangul(word) {
  const chars = Array.from(String(word || '').trim());
  for (let i = chars.length - 1; i >= 0; i--) {
    const code = chars[i].codePointAt(0);
    if (code >= HANGUL_START && code <= HANGUL_END) return code;
    if (/[0-9]/.test(chars[i])) return digitCode(chars[i]);
    if (/[a-zA-Z]/.test(chars[i])) return null;
  }
  return null;
}

// 숫자로 끝날 때 읽는 소리로 받침을 정합니다 (1 일, 2 이, 3 삼 …).
function digitCode(d) {
  const reading = { 0: '영', 1: '일', 2: '이', 3: '삼', 4: '사', 5: '오', 6: '육', 7: '칠', 8: '팔', 9: '구' }[d];
  return reading.codePointAt(0);
}

export function batchimOf(word) {
  const code = lastHangul(word);
  if (code === null) return 0;
  return (code - HANGUL_START) % 28; // 0이면 받침 없음, 8이면 ㄹ
}

export function hasBatchim(word) {
  return batchimOf(word) !== 0;
}

export function josa(word, pair) {
  const [withB, withoutB] = pair.split('/');
  const b = batchimOf(word);
  if (pair === '으로/로') return b === 0 || b === 8 ? '로' : '으로';
  return b !== 0 ? withB : withoutB;
}

export function withJosa(word, pair) {
  return `${word}${josa(word, pair)}`;
}

// 이름 부르기: 민준아, 지호야. 이름이 없으면 빈 글자.
export function callName(name) {
  const n = String(name || '').trim();
  if (!n) return '';
  return `${n}${josa(n, '아/야')}`;
}

// 문장 안에서 쓰는 이름: 민준이, 지호 (받침 있으면 '이'를 붙이는 한국식 애칭)
export function softName(name) {
  const n = String(name || '').trim();
  if (!n) return '';
  return hasBatchim(n) ? `${n}이` : n;
}
