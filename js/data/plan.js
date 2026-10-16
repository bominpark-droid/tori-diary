// 3칸 계획과 쓰기 도움 재료 (docs/DESIGN.md 4.3 ②, ③)

import { withJosa } from '../josa.js';

export const WHO_CHIPS = ['친구', '친구들', '가족', '엄마', '아빠', '형제', '선생님', '나 혼자'];
export const WHERE_CHIPS = ['학교', '교실', '운동장', '집', '학원', '놀이터', '공원', '밖'];
export const WHEN_ICONS = [
  { id: 'morning', label: '아침', word: '아침에' },
  { id: 'day', label: '낮', word: '낮에' },
  { id: 'evening', label: '저녁', word: '저녁에' },
  { id: 'night', label: '밤', word: '밤에' },
];

// da: ~다 말투로 쓴 일기에 붙일 문장, yo: ~요 말투
export const FEELINGS = [
  { id: 'joy', label: '기뻤어', da: '정말 기뻤다', yo: '정말 기뻤어요', face: 'm-happy' },
  { id: 'excited', label: '신났어', da: '정말 신났다', yo: '정말 신났어요', face: 'm-excited' },
  { id: 'fun', label: '재밌었어', da: '정말 재미있었다', yo: '정말 재미있었어요', face: 'm-happy' },
  { id: 'proud', label: '뿌듯했어', da: '마음이 뿌듯했다', yo: '마음이 뿌듯했어요', face: 'm-happy' },
  { id: 'surprised', label: '놀랐어', da: '깜짝 놀랐다', yo: '깜짝 놀랐어요', face: 'm-wow' },
  { id: 'thrilled', label: '설렜어', da: '마음이 두근두근했다', yo: '마음이 두근두근했어요', face: 'm-excited' },
  { id: 'calm', label: '편안했어', da: '마음이 편안했다', yo: '마음이 편안했어요', face: 'm-happy' },
  { id: 'sorry', label: '아쉬웠어', da: '조금 아쉬웠다', yo: '조금 아쉬웠어요', face: 'm-sad' },
  { id: 'upset', label: '속상했어', da: '조금 속상했다', yo: '조금 속상했어요', face: 'm-sad' },
  { id: 'sad', label: '슬펐어', da: '슬펐다', yo: '슬펐어요', face: 'm-sad' },
  { id: 'angry', label: '화났어', da: '화가 났다', yo: '화가 났어요', face: 'm-angry' },
  { id: 'scared', label: '무서웠어', da: '무서웠다', yo: '무서웠어요', face: 'm-wow' },
  { id: 'tired', label: '힘들었어', da: '조금 힘들었다', yo: '조금 힘들었어요', face: 'm-sleepy' },
  { id: 'meh', label: '그냥 그랬어', da: '그냥 그랬다', yo: '그냥 그랬어요', face: 'm-sleepy' },
];

export const READERS = [
  { id: 'me', label: '나만' },
  { id: 'family', label: '가족' },
  { id: 'friend', label: '친구' },
  { id: 'tori', label: '토리' },
];

export const WEATHER = [
  { id: 'sun', label: '맑음' },
  { id: 'cloud', label: '구름' },
  { id: 'rain', label: '비' },
  { id: 'snow', label: '눈' },
  { id: 'wind', label: '바람' },
];

// 3칸의 묻는 말과 힌트
export const PLAN_PARTS = {
  start: {
    title: '처음',
    ask: '누구랑, 어디서?',
    line: '처음',
    hint: '누구랑 있었는지, 어디였는지 낱말 하나씩만 골라 봐.',
  },
  middle: {
    title: '가운데',
    ask: '가장 큰 일 한 가지',
    line: '가운데',
    hint: '오늘 제일 얘기하고 싶은 일 한 가지를 짧게 써 봐. 예: 피구, 지붕에 올라간 공',
  },
  end: {
    title: '끝',
    ask: '어떻게 끝났어? 기분은?',
    line: '끝',
    hint: '마지막에 어떻게 됐는지, 그때 기분을 골라 봐.',
  },
};

// 사람 낱말을 문장에 넣을 모양으로: 친구 → 친구랑, 가족 → 가족이랑, 나 혼자 → 혼자서
export function withWhom(word) {
  const w = String(word || '').trim();
  if (!w) return '';
  if (w === '나 혼자' || w === '혼자') return '혼자서';
  if (/(랑|와|과|하고|이랑)$/.test(w)) return w;
  return withJosa(w, '이랑/랑');
}

// 장소 낱말: 학교 → 학교에서
export function atPlace(word) {
  const w = String(word || '').trim();
  if (!w) return '';
  if (/(에서|에)$/.test(w)) return w;
  return `${w}에서`;
}

// 문장 시작 틀: 계획 낱말을 넣어 2~3개를 만듭니다. <내 말로 쓰기>는 화면에서 따로 둡니다.
export function starters(part, plan = {}) {
  const who = withWhom(plan.who || '');
  const where = atPlace(plan.where || '');
  const when = WHEN_ICONS.find((w) => w.id === plan.when);
  const what = String(plan.what || '').trim();
  if (part === 'start') {
    const out = [];
    if (where || who) out.push(['오늘', where, who].filter(Boolean).join(' ') + ' ');
    if (when) out.push(`${when.word} `);
    out.push('오늘은 ');
    if (out.length < 3) out.push('학교에서 ');
    return out.slice(0, 3);
  }
  if (part === 'middle') {
    const out = ['그런데 갑자기 ', '제일 기억에 남는 건 '];
    if (what) out.unshift('그때 ');
    else out.push('그때 ');
    return out.slice(0, 3);
  }
  return ['결국 ', '마지막에는 ', '그래서 기분이 '];
}
