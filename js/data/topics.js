// 주제 찾기 재료 (docs/DESIGN.md 4.3 ①)
// 카드 문구를 바꾸거나 더하고 싶으면 TOPIC_CARDS에 한 줄을 더하면 됩니다.

// 하루 칸: 뭔가 있었던 칸을 누르고, 제일 얘기해 주고 싶은 장면에 별을 붙입니다.
export const DAY_SLOTS = [
  { id: 'morning', label: '아침', icon: 'sunrise', when: '아침', where: '' },
  { id: 'class', label: '학교 수업', icon: 'book', when: '수업 시간', where: '교실' },
  { id: 'break', label: '쉬는 시간', icon: 'ball', when: '쉬는 시간', where: '학교' },
  { id: 'lunch', label: '점심', icon: 'bowl', when: '점심시간', where: '학교' },
  { id: 'after', label: '방과 후', icon: 'bag', when: '학교 끝나고', where: '' },
  { id: 'evening', label: '저녁', icon: 'moon', when: '저녁', where: '집' },
  { id: 'small', label: '오늘의 작은 발견', icon: 'magnifier', when: '', where: '' },
];

export const TOPIC_GROUPS = {
  today: '오늘 있었던 일',
  people: '사람과 말',
  heart: '마음과 몸',
  wonder: '상상과 호기심',
};

// weight가 작을수록 덜 나옵니다 (감사 카드는 근거가 약해 비중을 낮춤, 09 3절)
export const TOPIC_CARDS = [
  { id: 't1', group: 'today', text: '오늘 제일 웃겼던 순간은 언제였어?' },
  { id: 't2', group: 'today', text: '오늘 처음 해 본 일이 있었어?' },
  { id: 't3', group: 'today', text: '오늘 급식이나 간식 중에 기억나는 것 하나는?' },
  { id: 't4', group: 'today', text: '오늘 쉬는 시간에 뭐 하고 놀았어?' },
  { id: 't5', group: 'today', text: '학교 가는 길이나 오는 길에 본 것 하나는?' },
  { id: 't6', group: 'today', text: '오늘 날씨 때문에 생긴 일이 있었어?' },
  { id: 't7', group: 'today', text: '오늘 가장 바빴던 때는 언제였어?' },

  { id: 'p1', group: 'people', text: '오늘 누구랑 뭘 하면서 놀았어?' },
  { id: 'p2', group: 'people', text: '오늘 누가 한 말 중에 기억나는 말은?' },
  { id: 'p3', group: 'people', text: '친구한테 설명해 주고 싶은 것이 있어?' },
  { id: 'p4', group: 'people', text: '오늘 가족이랑 함께한 일 하나는?' },
  { id: 'p5', group: 'people', text: '선생님이 해 주신 이야기 중에 재밌었던 것은?' },
  { id: 'p6', group: 'people', text: '오늘 누군가를 도와준 일이 있어?' },
  { id: 'p7', group: 'people', text: '오늘 고마웠던 사람이 있어?', weight: 0.4 },

  { id: 'h1', group: 'heart', text: '오늘 기분이 제일 좋았던 때는?' },
  { id: 'h2', group: 'heart', text: '오늘 깜짝 놀란 일이 있었어?' },
  { id: 'h3', group: 'heart', text: '오늘 몸을 제일 많이 움직인 때는?' },
  { id: 'h4', group: 'heart', text: '오늘 뿌듯했던 일 하나는?' },
  { id: 'h5', group: 'heart', text: '오늘 맛있게 먹은 것과 그 맛은?' },
  { id: 'h6', group: 'heart', text: '오늘 조금 아쉬웠던 일이 있었어? 쓰기 싫으면 다른 카드!' },
  { id: 'h7', group: 'heart', text: '오늘 고마웠던 일 하나는?', weight: 0.4 },

  { id: 'w1', group: 'wonder', text: '오늘 ‘어? 이상하네’ 싶었던 작은 것은?' },
  { id: 'w2', group: 'wonder', text: '요즘 제일 좋아하는 것을 소개해 줘.' },
  { id: 'w3', group: 'wonder', text: '내일 해 보고 싶은 것 하나는?' },
  { id: 'w4', group: 'wonder', text: '오늘 하루가 동화책이라면 제목은 뭘까?' },
  { id: 'w5', group: 'wonder', text: '오늘 궁금해진 것 하나는?' },
  { id: 'w6', group: 'wonder', text: '하루 동안 동물이 될 수 있다면 뭐가 되고 싶어?' },
  { id: 'w7', group: 'wonder', text: '토리한테 알려 주고 싶은 것이 있어?' },
];

// 막혔을 때의 사다리 (낮은 단계를 눌러도 실패가 아님, 몇 번 썼는지는 아이에게 보이지 않음)
export const LADDER = [
  { id: 'voice', label: '말로 먼저 해 볼래', needsVoice: true },
  { id: 'ask', label: '토리가 하나만 물어볼게' },
  { id: 'photo', label: '그림 한 컷 그려서 찍기' },
  { id: 'mood', label: '기분 낱말 고르기' },
  { id: 'starter', label: '문장 시작 틀 보기' },
  { id: 'favorite', label: '좋아하는 것 소개하기' },
  { id: 'rest', label: '오늘은 쉬기' },
];

// <토리가 하나만 물어볼게>에서 나오는 질문
export const TORI_ASKS = [
  { q: '오늘 누구랑 제일 오래 있었어?', field: 'who' },
  { q: '오늘 제일 많이 웃은 건 언제야?', field: 'what' },
  { q: '오늘 먹은 것 중에 제일 맛있었던 건 뭐야?', field: 'what' },
  { q: '오늘 학교에서 제일 시끄러웠던 때는 언제야?', field: 'what' },
  { q: '오늘 손으로 만든 것이나 그린 것이 있어?', field: 'what' },
  { q: '오늘 처음 본 것이 있어?', field: 'what' },
];

// 3장 고르기: 추천 1장(묶음을 돌려 가며) + 다른 묶음에서 2장.
// 같은 묶음이 3일 연속 추천되지 않게 recent(최근 추천 묶음)를 봅니다.
export function pickCards({ recent = [], custom = [], offset = 0, seed = 0 }) {
  const groups = Object.keys(TOPIC_GROUPS);
  const lastTwo = recent.slice(-2);
  const blocked = lastTwo.length === 2 && lastTwo[0] === lastTwo[1] ? lastTwo[0] : null;
  const order = groups.filter((g) => g !== blocked);
  const mainGroup = order[(seed + offset) % order.length];

  const pool = TOPIC_CARDS.concat(custom.map((c) => ({ ...c, group: 'mine' })));
  const weighted = (g) => pool.filter((c) => c.group === g);
  const choose = (list, n, skip = new Set()) => {
    const cands = list.filter((c) => !skip.has(c.id));
    const out = [];
    let s = seed * 7 + offset * 13;
    while (out.length < n && cands.length) {
      s = (s * 9301 + 49297) % 233280;
      const idx = s % cands.length;
      const c = cands[idx];
      // 비중이 낮은 카드는 가끔만
      if (c.weight && (s % 10) / 10 > c.weight && cands.length > 1) {
        cands.splice(idx, 1);
        continue;
      }
      out.push(c);
      cands.splice(idx, 1);
    }
    return out;
  };

  const used = new Set();
  const main = choose(weighted(mainGroup), 1);
  main.forEach((c) => used.add(c.id));
  const others = groups.filter((g) => g !== mainGroup);
  const alt = [];
  // 아이가 만든 카드가 있으면 한 장은 거기서
  if (custom.length) alt.push(...choose(weighted('mine'), 1, used));
  for (let i = 0; alt.length < 2 && i < others.length; i++) {
    const g = others[(i + offset) % others.length];
    alt.push(...choose(weighted(g), 1, used));
    alt.forEach((c) => used.add(c.id));
  }
  return { group: mainGroup, cards: main.concat(alt).slice(0, 3) };
}
