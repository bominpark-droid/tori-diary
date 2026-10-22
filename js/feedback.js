// 다듬기 도우미 (docs/DESIGN.md 5절). 규칙 기반이고, 아이 글은 기기 밖으로 나가지 않습니다.
// 화면과 상관없는 순수한 계산만 둡니다. 테스트: tests/feedback.test.js
//
// 큰 흐름
// 1) splitSentences: 글을 문장으로 나눔 (따옴표 안은 끊지 않음, 점이 없어도 ~다/~요 뒤 띄어쓰기에서 나눔)
// 2) analyze: 누구, 어디서, 언제, 기분, 이유, 대화, 소리, 순서, 표기 후보를 찾음
// 3) candidates: 제안 후보를 순서대로 만듦. 더하기형(add), 디테일(detail: 말, 소리와 모습), 두 번째 종류(second)
// 3-1) planRound: 1회차에 보여 줄 제안 3가지를 고름. 맥락(누가, 어디서, 언제) 하나, 마음(기분, 이유) 하나,
//      디테일(말, 소리와 모습, 한 문장 더) 하나. 부족하면 같은 묶음에서 더 고르고, 그래도 모자라면 두 번째 종류로 채움
// 4) applyOption / applyOwn: 아이가 고른 대로 글을 바꿈
// 5) isChanged, bonusReady: 제안 자리에서 글이 바뀌었는지, 제안을 모두 고쳤는지 (다듬기 보너스 판정)
// 찾기가 틀려도 아이 글이 틀리게 되지는 않습니다. 잘못 찾으면 제안이 하나 더 나오거나 덜 나올 뿐입니다.

import {
  PEOPLE, SELF, PLACES, PLACE_PARTICLE, TIMES, FEELING_STEMS, REASONS,
  ORDER_WORDS, SENSE_WORDS, CONNECTORS, REACTION_TOPICS, IMPLIED_PLACE, SCHOOL_WORDS, HOME_WORDS,
} from './data/words.js';
import { SPELLING } from './data/spelling.js';
import { LINES, fill } from './data/tori-lines.js';
import { FEELINGS, WHEN_ICONS, withWhom, atPlace } from './data/plan.js';

const HANGUL = /[가-힣]/;
const OPEN_QUOTES = { '"': '"', '“': '”', '‘': '’', "'": "'", '「': '」', '『': '』' };
const HARD_END = '.!?…~。';

// ---------------------------------------------------------------
// 1. 문장 나누기
// ---------------------------------------------------------------

// 받침 번호 (0 없음, 4 ㄴ, 8 ㄹ, 20 ㅆ)
function batchim(ch) {
  const c = ch ? ch.charCodeAt(0) : 0;
  if (c < 0xac00 || c > 0xd7a3) return -1;
  return (c - 0xac00) % 28;
}

// 받침 없이 ~다로 끝나는 그림씨(좋다, 크다, 기쁘다 …)의 앞 글자. '하다'는 넣지 않습니다
// (공부하다 잠들었다처럼 문장 가운데에도 자주 와서 잘못 끊을 수 있음).
const ADJ_STEMS = new Set(['좋', '싫', '많', '없', '같', '크', '작', '쁘', '프', '롭', '답', '럽', '겹', '르', '렵', '겁', '깝', '쉽', '춥', '덥', '맵', '엽', '볍', '짧', '길', '높', '낮', '넓', '좁', '굵', '얇', '밝', '리']);
const YO_NOT_END = new Set(['필요', '중요', '주요', '요요', '동요', '가요']);

// 낱말이 문장을 끝내는 모양인지 (점을 안 찍었어도 문장이 끝난 자리)
export function endsSentence(word, nextWord = '') {
  const w = String(word || '').replace(/[,"'”’)\]]+$/, '');
  // 갔다 왔다, 갔다 와서처럼 이어지는 말은 끊지 않음
  if (/갔다$/.test(w) && /^(왔|와|오|올|나왔)/.test(nextWord)) return false;
  if (w.length < 2) return false;
  const last = w[w.length - 1];
  const prev = w[w.length - 2];
  if (last === '다') {
    const b = batchim(prev);
    if (b === 20) return true; // 갔다, 했다, 있었다
    if (b === 4) return true; // 간다, 먹는다
    if (w.endsWith('니다')) return true; // 했습니다, 갑니다
    if (ADJ_STEMS.has(prev)) return true;
    return false;
  }
  if (last === '요') {
    if (YO_NOT_END.has(w.slice(-2))) return false;
    return HANGUL.test(prev);
  }
  return false;
}

// 글을 문장으로 나눕니다. 각 문장은 { text, start, end, soft }.
// start/end는 원래 글에서의 위치(end는 끝 문장부호까지 포함). soft는 문장부호 없이 끝난 문장.
export function splitSentences(input) {
  const s = String(input || '');
  const out = [];
  let start = 0;
  let quote = null;

  const push = (from, to, soft) => {
    let a = from;
    let b = to;
    while (a < b && /\s/.test(s[a])) a++;
    while (b > a && /\s/.test(s[b - 1])) b--;
    if (b > a) out.push({ text: s.slice(a, b), start: a, end: b, soft });
  };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\n') {
      quote = null;
      const line = s.slice(start, i).trim();
      const lastWord = line.split(/\s+/).pop() || '';
      push(start, i, endsSentence(lastWord));
      start = i + 1;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (OPEN_QUOTES[ch]) {
      // 작은따옴표는 낱말 가운데(예: 그건's)면 따옴표로 보지 않음
      if (ch === "'" && i > 0 && /[A-Za-z]/.test(s[i - 1])) continue;
      quote = OPEN_QUOTES[ch];
      continue;
    }
    if (HARD_END.includes(ch)) {
      if (ch === '.' && /\d/.test(s[i - 1] || '') && /\d/.test(s[i + 1] || '')) continue; // 3.5
      if (ch === '~' && i + 1 < s.length && !/\s/.test(s[i + 1]) && !HARD_END.includes(s[i + 1])) continue;
      let j = i;
      while (j + 1 < s.length && (HARD_END.includes(s[j + 1]) || /[)"”’']/.test(s[j + 1]))) j++;
      push(start, j + 1, false);
      start = j + 1;
      i = j;
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      const wordStart = Math.max(s.lastIndexOf(' ', i - 1), s.lastIndexOf('\n', i - 1), s.lastIndexOf('\t', i - 1)) + 1;
      const word = s.slice(Math.max(wordStart, start), i);
      const rest = s.slice(i + 1);
      const nextWord = (rest.match(/^\s*(\S+)/) || [])[1] || '';
      if (word && endsSentence(word, nextWord) && /^[\s]*[가-힣A-Za-z0-9"“‘']/.test(rest)) {
        push(start, i, true);
        start = i + 1;
      }
    }
  }
  push(start, s.length, false);
  // 글의 마지막 문장은 점이 없어도 점 찍기 후보로 보지 않습니다.
  if (out.length) out[out.length - 1].soft = false;
  return out;
}

export function sentenceCount(text) {
  return splitSentences(text).length;
}

// ---------------------------------------------------------------
// 2. 글에서 찾기
// ---------------------------------------------------------------

// 낱말이 다른 낱말의 가운데가 아니라 낱말 처음에 있는지 보고 찾습니다(조사가 붙어도 됨).
// 한 글자 낱말(집, 강, 방, 밤 …)은 뒤에 조사나 띄어쓰기가 올 때만 찾습니다(강아지, 방학, 집중을 빼려고).
const JOSA_START = /[에이가을를은는도으로랑과와의만까부한께서]/;
function findWordStart(text, words) {
  for (const w of words) {
    let i = text.indexOf(w);
    while (i !== -1) {
      const prev = i === 0 ? ' ' : text[i - 1];
      const next = text[i + w.length] || ' ';
      const okNext = w.length > 1 || !HANGUL.test(next) || JOSA_START.test(next);
      if (!HANGUL.test(prev) && okNext) return { word: w, index: i };
      i = text.indexOf(w, i + 1);
    }
  }
  return null;
}

function findAny(text, words) {
  for (const w of words) {
    const i = text.indexOf(w);
    if (i !== -1) return { word: w, index: i };
  }
  return null;
}

// 이름 + 조사 (민수랑, 서연이가, 지호한테)
const NAME_JOSA = /(^|[\s"“‘'(])([가-힣]{2,3}?)(이랑|랑|한테|이한테|에게|이가|이는|이도|이와|이하고)(?=[\s,.!?~]|$)/;
const NOT_NAMES = new Set(['떡볶', '떡볶이', '김밥', '라면', '과자', '피자', '치킨', '우유', '사과', '공', '책', '숙제', '게임', '레고', '그림', '놀이', '자전거', '아이스크림', '강아지', '고양이', '거기', '여기', '저기', '그것', '이것', '저것', '오늘', '내일', '어제', '하나', '둘이', '셋이']);

function findName(text) {
  const m = text.match(NAME_JOSA);
  if (!m) return null;
  if (NOT_NAMES.has(m[2])) return null;
  return { word: m[2], index: (m.index || 0) + m[1].length };
}

const DIALOGUE = /["“‘'「『][^"”’'」』\n]{1,60}["”’'」』]|(?:이)?라고\s?(?:했|말|하셨|물|외쳤|소리|대답|속삭)|하고\s?(?:말했|소리쳤|외쳤|물었|웃었)/;
const ONOMATO2 = /([가-힣]{2})\1/; // 두근두근, 반짝반짝 (조사가 붙어도)
const ONOMATO1 = /(^|[^가-힣])([가-힣])\2(?=[^가-힣]|$|[이가을를하했])/; // 쿵쿵, 깔깔

// ~서, ~니까로 이어진 말 뒤에 기분이 오면 이유를 쓴 것으로 봅니다(공이 빨라서 무서웠다, 이겨서 기뻤다).
// 에서, 께서, 하고 나서 같은 말은 이유가 아니라서 뺍니다.
const CAUSE_END = /(서|니까|니깐|길래)$/;
const NOT_CAUSE = /(에서|께서|에게서|한테서|나서|고서|부터서)$/;
function causeBeforeFeeling(sentences) {
  for (const s of sentences) {
    const f = findAny(s.text, FEELING_STEMS);
    if (!f) continue;
    const words = s.text.slice(0, f.index).split(/\s+/).filter(Boolean);
    for (const w of words) {
      const core = w.replace(/[,.!?~"”’']+$/, '');
      if (core.length >= 2 && CAUSE_END.test(core) && !NOT_CAUSE.test(core)) {
        return { word: core, index: s.start + s.text.indexOf(w) };
      }
    }
  }
  return null;
}

export function analyze(text) {
  const t = String(text || '');
  const sentences = splitSentences(t);
  const who = findWordStart(t, PEOPLE) || findWordStart(t, ['혼자']) || findName(t);
  const self = SELF.test(t) ? { word: (t.match(SELF) || [])[2] || '나' } : null;
  const where = findWordStart(t, PLACES) || findAny(t, IMPLIED_PLACE) || (t.match(PLACE_PARTICLE) ? { word: t.match(PLACE_PARTICLE)[0], index: t.search(PLACE_PARTICLE) } : null);
  const when = findWordStart(t, TIMES) || (/\d+\s?시/.test(t) ? { word: t.match(/\d+\s?시/)[0] } : null);
  const feeling = findAny(t, FEELING_STEMS);
  const reason = findAny(t, REASONS) || causeBeforeFeeling(sentences);
  const dialogueMatch = t.match(DIALOGUE);
  const dialogue = dialogueMatch ? { word: dialogueMatch[0], index: dialogueMatch.index } : null;
  const senseWord = findAny(t, SENSE_WORDS);
  const ono = t.match(ONOMATO2) || t.match(ONOMATO1);
  const sense = senseWord || (ono ? { word: ono[0].trim(), index: ono.index } : null);
  const orderHits = ORDER_WORDS.filter((w) => t.includes(w));
  const order = orderHits.length >= 2 ? { words: orderHits } : null;
  return { text: t, sentences, who, self, where, when, feeling, reason, dialogue, sense, order };
}

// ~다 말투인지 ~요 말투인지
export function detectStyle(text) {
  let da = 0;
  let yo = 0;
  for (const s of splitSentences(text)) {
    const core = s.text.replace(/[.!?…~。"”’')\s]+$/, '');
    if (/(요|니다)$/.test(core)) yo++;
    else if (/다$/.test(core)) da++;
  }
  return yo > da ? 'yo' : 'da';
}

// 표기 후보: { wrong, right, start, end, rule }  (start/end는 낱말 전체)
export function findSpelling(text) {
  const t = String(text || '');
  const out = [];
  for (const rule of SPELLING) {
    const flags = rule.re.flags.includes('g') ? rule.re.flags : `${rule.re.flags}g`;
    const re = new RegExp(rule.re.source, flags);
    let m;
    while ((m = re.exec(t)) !== null) {
      if (m[0] === '') { re.lastIndex++; continue; }
      // 바꿀 글자는 찾은 부분에만 적용 (뒤를 살피는 규칙도 있어서 전체 글 기준으로 계산)
      const fixed = typeof rule.to === 'function' ? rule.to(m[0], ...m.slice(1)) : rule.to;
      if (fixed === m[0]) continue;
      const ws = wordStartAt(t, m.index);
      const we = wordEndAt(t, m.index + m[0].length - 1);
      const word = t.slice(ws, we);
      const right = word.slice(0, m.index - ws) + fixed + word.slice(m.index + m[0].length - ws);
      out.push({ wrong: trimPunct(word), right: trimPunct(right), start: ws, end: we, matchStart: m.index, matchEnd: m.index + m[0].length, fixed });
    }
  }
  // 같은 자리 중복 없애고 앞에서부터
  out.sort((a, b) => a.matchStart - b.matchStart);
  return out.filter((c, i) => i === 0 || c.matchStart >= out[i - 1].matchEnd);
}

function wordStartAt(t, i) {
  let k = i;
  while (k > 0 && !/\s/.test(t[k - 1])) k--;
  return k;
}
function wordEndAt(t, i) {
  let k = i + 1;
  while (k < t.length && !/\s/.test(t[k])) k++;
  return k;
}
function trimPunct(w) {
  return w.replace(/^["“‘'(]+/, '').replace(/[.,!?…~"”’')]+$/, '');
}

// 긴 문장: ~고, ~서, ~는데 같은 이어지는 끝이 몇 번인지
const LINKING = /(?:[가-힣](?:고|는데|은데|면서|다가|니까)|(?:아|어|해|와|가|봐|돼|라|여|러|워|져|겨|쳐|써|내|려|줘|놔|해|와|켜|떠|꺼)서)(?=\s)/g;
function linkCount(sentence) {
  const m = sentence.match(LINKING);
  if (!m) return 0;
  return m.filter((x) => !/에서$/.test(x)).length;
}

function charLen(s) {
  return s.replace(/\s/g, '').length;
}

function startsWithConnector(s) {
  return CONNECTORS.some((c) => s.startsWith(c)) || /^(그러|그래|그런|그리|하지만|그때|그 때|그다음|그 다음|또|결국|마지막|다행히|드디어|마침내|갑자기)/.test(s);
}

// ---------------------------------------------------------------
// 3. 제안 후보 만들기
// ---------------------------------------------------------------

const LEAD_TIME = /^(?:오늘|어제|그저께|아침|점심|저녁|밤|낮|새벽|오전|오후|주말|방과 후|학교 끝나고|수업 시간|쉬는 시간|점심시간|체육 시간|그때|아까|월요일|화요일|수요일|목요일|금요일|토요일|일요일|[0-9]+\s?시|[0-9]+\s?교시)(?:에는|에도|에|은|는|도)?\s+/;
const LEAD_SELF = /^(?:나는|내가|나도|저는|제가|저도|우리는|우리가|우리)\s+/;
const LEAD_CONN = /^(?:그래서|그런데|그리고|하지만|그러자|그러다가|그러고 나서|그다음에?|그 다음에?|다행히|드디어|마침내|결국|또|그래도|그때)\s+/;
const LEAD_WHO = /^[가-힣]{1,6}(?:이랑|랑|하고|이와|와|과|한테)\s+/;
const LEAD_PERSON = new RegExp(`^(?:${PEOPLE.filter((w) => !w.includes(' ')).join('|')})(?:들)?(?:이|가|은|는|도|께서)\\s+`);

// 이어지는 말로 끝나는 낱말 (~서, ~고, ~는데). '에서'는 곳을 나타내므로 뺍니다.
function linkEnd(w) {
  return /(다가|고|는데|은데|면서|니까|지만)$/.test(w) || (/서$/.test(w) && !/에서$/.test(w));
}

// 문장 앞쪽의 때, 나, 이어 주는 말(그리고 어디서 제안이면 사람)을 건너뛰고,
// 첫 덩어리가 ~서, ~고로 끝나면(비가 와서, 밥을 먹고) 그 뒤에 phrase를 끼웁니다.
function insertInto(sentence, phrase, kind) {
  if (kind === 'add-when') return `${phrase} ${sentence}`;
  const skip = kind === 'add-where' ? [LEAD_TIME, LEAD_SELF, LEAD_CONN, LEAD_WHO, LEAD_PERSON] : [LEAD_TIME, LEAD_SELF, LEAD_CONN];
  let i = 0;
  let rest = sentence;
  const eatAll = () => {
    let moved = true;
    while (moved) {
      moved = false;
      for (const re of skip) {
        const m = rest.match(re);
        if (m) {
          i += m[0].length;
          rest = rest.slice(m[0].length);
          moved = true;
        }
      }
    }
  };
  eatAll();
  const words = rest.split(' ');
  const k = words.slice(0, 3).findIndex((w, idx) => idx < words.length - 1 && linkEnd(w));
  if (k >= 0) {
    const len = words.slice(0, k + 1).join(' ').length + 1;
    i += len;
    rest = rest.slice(len);
    eatAll();
  }
  return `${sentence.slice(0, i)}${phrase} ${sentence.slice(i)}`;
}

// 누구랑, 어디서를 끼울 만한 문장: 아이가 한 일(했다, 갔다, 놀았다 …)로 끝나는 문장.
// 잤다, 일어났다, 비가 왔다, 급식이 나왔다 같은 문장에는 끼우지 않습니다.
const ACTION_END = /(했|갔|왔|놀았|먹었|봤|탔|만들었|그렸|읽었|샀|찼|던졌|받았|불렀|배웠|썼|쳤|뛰었|달렸|걸었|만났|찍었|키웠|심었|씻었|닦았|치웠|도왔|췄|불었|날렸|잡았|찾았|넘었|건넜|쌓았|접었|오렸|붙였|칠했|풀었|싸웠|이겼|졌|들었|구경했|했었|갔었|부셨|부쉈|망가뜨렸|깨뜨렸|쏟았|흘렸)(?:다|어요|어|지)[.!?~…"”’')]*$/;
const NOT_ACTION_END = /(잤|일어났|늦었|아팠|나왔|생겼|열렸|내렸)(?:다|어요)[.!?~…"”’')]*$/;
function isActionSentence(text) {
  if (!ACTION_END.test(text) || NOT_ACTION_END.test(text)) return false;
  const words = text.split(/\s+/);
  // 서술어에 기분 낱말이 있으면(억울했다, 행복했다) 아이가 한 일이 아님
  if (FEELING_STEMS.some((f) => words[words.length - 1].includes(f))) return false;
  // 마지막 덩어리(이어지는 말 뒤)가 날씨나 급식이 주인공이면 아님 (비가 왔다, 급식에 닭강정이 나왔다)
  let k = -1;
  words.forEach((w, i) => { if (i < words.length - 1 && linkEnd(w)) k = i; });
  const tail = words.slice(k + 1).join(' ');
  return !/(비가|눈이|바람이|급식이|급식에)\s/.test(tail);
}
function actionSentence(ss) {
  return ss.find((s) => isActionSentence(s.text)) || null;
}

function sentenceKey(s) {
  return s ? s.text.slice(0, 24) : '';
}

// 가장 큰 일이 들어 있는 문장 (계획의 가운데 칸 낱말, 없으면 가장 긴 문장)
function mainSentence(ss, plan) {
  if (!ss.length) return null;
  const words = String((plan && plan.what) || '').split(/\s+/).filter((w) => w.length >= 2).map((w) => w.slice(0, Math.max(2, w.length - 1)));
  for (const w of words) {
    const hit = ss.find((s) => s.text.includes(w));
    if (hit) return hit;
  }
  const pool = ss.length >= 3 ? ss.slice(1) : ss;
  return pool.reduce((best, s) => (charLen(s.text) > charLen(best.text) ? s : best), pool[0]);
}

function feelingSentence(ss) {
  return ss.find((s) => FEELING_STEMS.some((f) => s.text.includes(f))) || null;
}

// 기분 보기 두 문장. 계획에서 고른 기분이 먼저, 힘든 이야기에는 신났다 대신 힘들었다/뿌듯했다.
const HARD_CUES = ['아팠', '아파', '힘들', '넘어졌', '다쳤', '싸웠', '혼났', '울었', '늦었', '잃어버렸', '망쳤', '부셨', '부쉈', '젖었', '졌다', '속상', '화가', '억울'];
function feelingOptions(text, plan) {
  const style = detectStyle(text);
  const say = (f, lead = '그때') => `${lead} ${style === 'yo' ? f.yo : f.da}.`;
  const F = (id) => FEELINGS.find((f) => f.id === id);
  const positive = ['joy', 'excited', 'fun', 'proud', 'thrilled', 'calm'];
  const chosen = plan && plan.feeling ? F(plan.feeling) : null;
  if (chosen) return [say(chosen), positive.includes(chosen.id) ? say(F('surprised')) : say(F('calm'), '지금은')];
  if (HARD_CUES.some((w) => text.includes(w))) return [say(F('tired')), say(F('proud'), '그래도')];
  return [say(F('excited')), say(F('surprised'))];
}

function scene(text) {
  if (SCHOOL_WORDS.some((w) => text.includes(w))) return 'school';
  if (HOME_WORDS.some((w) => text.includes(w))) return 'home';
  return 'any';
}

function uniqTwo(first, rest) {
  const out = [];
  for (const w of [first, ...rest]) if (w && !out.includes(w) && out.length < 2) out.push(w);
  return out;
}

function whoOptions(plan, text) {
  const sc = scene(text);
  const rest = sc === 'school' ? ['친구들이랑', '짝꿍이랑'] : sc === 'home' ? ['가족이랑', '혼자서'] : ['친구랑', '가족이랑'];
  return uniqTwo(plan && plan.who ? withWhom(plan.who) : null, rest);
}

function whereOptions(plan, text) {
  const sc = scene(text);
  const rest = sc === 'school' ? ['학교에서', '운동장에서'] : sc === 'home' ? ['집에서', '거실에서'] : ['학교에서', '집에서'];
  return uniqTwo(plan && plan.where ? atPlace(plan.where) : null, rest);
}

function whenOptions(plan) {
  const icon = plan && plan.when ? WHEN_ICONS.find((w) => w.id === plan.when) : null;
  return uniqTwo(icon ? `오늘 ${icon.word}` : null, ['오늘', '오늘 아침에', '오늘 저녁에']);
}

function base(kind, family, target, extra = {}) {
  const l = LINES.suggest[kind] || {};
  return {
    id: `${kind}:${sentenceKey(target)}:${extra.key || ''}`,
    kind,
    family,
    why: l.why || '',
    say: l.say || '',
    example: l.example || null,
    target: target ? { index: target.index, start: target.start, end: target.end, text: target.text, soft: target.soft } : null,
    options: [],
    own: null,
    ...extra,
  };
}

function withIndex(ss) {
  return ss.map((s, index) => ({ ...s, index }));
}

// 누구랑, 어디서: 끼울 문장이 있으면 보기 둘, 없으면 한 문장 붙이기
function whoWhere(kind, ss, values) {
  const act = actionSentence(ss);
  if (act) {
    const s = base(kind, 'add', act);
    s.options = values.map((v) => ({ label: v, type: 'insert', value: v }));
    s.own = { mode: 'edit', prefill: act.text, placeholder: '' };
    return s;
  }
  const last = ss[ss.length - 1];
  const s = base(kind, 'add', last);
  s.options = [];
  s.own = { mode: 'append', prefill: '', placeholder: kind === 'add-who' ? '누구랑 같이 있었는지 한 문장' : '어디였는지 한 문장' };
  return s;
}

// 제안 후보 전체. opts: { plan, spellAllowed, isPhoto, seed }
export function candidates(text, opts = {}) {
  const plan = opts.plan || {};
  const a = analyze(text);
  const ss = withIndex(a.sentences);
  const add = [];
  const second = [];
  const detail = []; // 말, 소리와 모습 (1회차 세 가지 제안의 디테일 칸에서만 씀)

  if (opts.isPhoto) {
    const s = base('add-photo-line', 'add', ss[ss.length - 1] || null);
    s.options = [
      { label: '같이 있었던 사람은 …', type: 'prefill', value: '같이 있었던 사람은 ' },
      { label: '그때 기분은 …', type: 'prefill', value: '그때 기분은 ' },
    ];
    s.own = { mode: 'append', prefill: '', placeholder: '사진 아래에 붙일 한 줄' };
    add.push(s);
    return { add, second, detail, analysis: a };
  }

  if (!ss.length) return { add, second, detail, analysis: a };
  const first = ss[0];
  const last = ss[ss.length - 1];
  const mainS = mainSentence(ss, plan) || first;

  if (!a.who) add.push(whoWhere('add-who', ss, whoOptions(plan, text)));
  if (!a.where) add.push(whoWhere('add-where', ss, whereOptions(plan, text)));
  if (!a.when) {
    const s = base('add-when', 'add', first);
    s.options = whenOptions(plan).map((v) => ({ label: v, type: 'insert', value: v }));
    s.own = { mode: 'edit', prefill: first.text, placeholder: '' };
    add.push(s);
  }
  if (!a.feeling) {
    const s = base('add-feeling', 'add', last);
    s.options = feelingOptions(text, plan).map((v) => ({ label: v, type: 'append', value: v }));
    s.own = { mode: 'append', prefill: '', placeholder: '그때 내 기분은…' };
    add.push(s);
  }
  if (!a.reason) {
    const target = feelingSentence(ss) || mainS;
    const s = base('add-reason', 'add', target);
    s.options = [{ label: '왜냐하면 …', type: 'prefill', value: '왜냐하면 ' }];
    s.own = { mode: 'append', prefill: '', placeholder: '왜 그랬는지 한 마디' };
    add.push(s);
  }
  {
    const s = base('add-detail', 'add', mainS);
    s.options = [];
    s.own = { mode: 'append', prefill: '', placeholder: '그때 들린 소리, 누가 한 말, 보인 것' };
    add.push(s);
  }
  // 디테일: 아무도 말하지 않았으면 누가 한 말, 소리나 모습이 없으면 그것
  if (!a.dialogue) {
    const s = base('add-talk', 'add', mainS);
    s.own = { mode: 'append', prefill: '', placeholder: '그때 누가 뭐라고 했는지' };
    detail.push(s);
  }
  if (!a.sense) {
    const s = base('add-sense', 'add', mainS);
    s.own = { mode: 'append', prefill: '', placeholder: '그때 들린 소리나 보인 모습' };
    detail.push(s);
  }

  // 두 번째 종류: 표기 > 점 찍기 > 나누기 > 잇기
  if (opts.spellAllowed !== false) {
    for (const c of findSpelling(text)) {
      const sent = ss.find((x) => c.matchStart >= x.start && c.matchStart < x.end) || null;
      const s = base('spell', 'second', sent, { key: c.wrong, spell: c });
      const both = [
        { label: c.right, type: 'replace', value: c.right },
        { label: c.wrong, type: 'keep', value: c.wrong },
      ];
      s.options = (opts.seed || 0) % 2 === 0 ? both : both.reverse();
      second.push(s);
    }
  }
  for (const x of ss.slice(0, -1)) {
    if (!x.soft) continue;
    const s = base('punct', 'second', x, { key: 'p', next: { text: ss[x.index + 1].text } });
    s.options = [{ label: '여기에 점 찍기', type: 'punct', value: '.' }];
    s.own = { mode: 'edit', prefill: x.text, placeholder: '' };
    second.push(s);
  }
  for (const x of ss) {
    const n = linkCount(x.text);
    if (n >= 3 || (n >= 2 && charLen(x.text) >= 40)) {
      const s = base('split', 'second', x);
      s.options = [{ label: '내가 나눠 볼래', type: 'prefill-edit', value: x.text }];
      s.own = { mode: 'edit', prefill: x.text, placeholder: '' };
      second.push(s);
    }
  }
  const pairs = [];
  for (let i = 0; i + 1 < ss.length; i++) {
    const x = ss[i];
    const y = ss[i + 1];
    if (x.soft) continue; // 점 찍기 후보가 먼저
    if (charLen(x.text) > 12 || charLen(y.text) > 12 || charLen(x.text) + charLen(y.text) > 20) continue;
    if (startsWithConnector(y.text) || LEAD_TIME.test(`${y.text} `)) continue;
    if (/["“‘']/.test(x.text + y.text)) continue;
    pairs.push({ x, y, score: charLen(x.text) + charLen(y.text) });
  }
  pairs.sort((p, q) => p.score - q.score);
  for (const { x, y } of pairs) {
    const s = base('connect', 'second', y, { key: 'c', prev: { index: x.index, text: x.text } });
    const used = CONNECTORS.filter((c) => x.text.startsWith(c));
    s.options = ['그래서', '그런데', '그리고', '그러자'].filter((v) => !used.includes(v)).slice(0, 3).map((v) => ({ label: v, type: 'prefix', value: v }));
    s.own = { mode: 'edit', prefill: y.text, placeholder: '' };
    second.push(s);
  }
  return { add, second, detail, analysis: a };
}

// 1회차 세 가지 제안의 묶음. 한 묶음에서 하나씩 고르므로 맥락, 마음, 디테일이 골고루 나옵니다.
export const PLAN_GROUPS = [
  ['add-who', 'add-where', 'add-when'], // 맥락: 읽는 사람이 상황을 알 수 있게
  ['add-feeling', 'add-reason'], // 마음: 기분과 이유
  ['add-talk', 'add-sense', 'add-detail'], // 디테일: 말, 소리와 모습, 한 문장 더
];
export const PLAN_SIZE = 3;

// 1회차에 보여 줄 제안(최대 size개)을 현재 글에서 새로 계산해 돌려줍니다.
// exclude: 이미 쓴 종류나 아이가 넘긴 제안(종류 이름 또는 id). 사진 일기는 한 줄 붙이기 하나뿐.
export function planRound(text, opts = {}, { size = PLAN_SIZE, exclude = new Set() } = {}) {
  const c = candidates(text, opts);
  const usable = (s) => !exclude.has(s.kind) && !exclude.has(s.id);
  if (opts.isPhoto) return c.add.filter(usable).slice(0, size);
  const byKind = new Map();
  for (const s of [...c.add, ...c.detail, ...c.second]) if (!byKind.has(s.kind)) byKind.set(s.kind, s);
  const out = [];
  const take = (kind) => {
    const s = byKind.get(kind);
    if (!s || !usable(s) || out.includes(s)) return false;
    out.push(s);
    return true;
  };
  // 묶음마다 하나씩, 모자라면 한 바퀴 더 (묶음에 남은 다음 후보)
  for (let pass = 0; pass < PLAN_GROUPS.length && out.length < size; pass++) {
    for (const group of PLAN_GROUPS) {
      if (out.length >= size) break;
      for (const kind of group) if (take(kind)) break;
    }
  }
  // 그래도 모자라면 두 번째 종류(표기, 점 찍기, 나누기, 잇기)에서 종류마다 하나씩
  for (const s of c.second) {
    if (out.length >= size) break;
    if (usable(s) && !out.some((x) => x.kind === s.kind)) out.push(s);
  }
  return out;
}

// 지금 글에서 어떤 종류의 제안을 다시 찾습니다. 앞 제안을 고쳐서 글이 바뀐 뒤에 위치를 새로 잡을 때 씁니다.
export function findSuggestion(text, kind, opts = {}, exclude = new Set()) {
  const c = candidates(text, opts);
  return [...c.add, ...c.detail, ...c.second].find((s) => s.kind === kind && !exclude.has(s.id) && !exclude.has(s.kind)) || null;
}

// 1회차 제안 칸들: [{ kind, status: 'todo' | 'changed' | 'kept' | 'dropped' }]
// 다듬기 보너스: 칸이 모두 끝났고(todo 없음), 그대로 둔 칸(kept)이 없고, 고친 칸이 하나 이상일 때.
// dropped는 아이가 <이건 아닌 것 같아>로 넘겼는데 바꿀 다른 제안이 없거나, 앞에서 고치다가 이미 해결된 칸이라 보너스에 영향이 없습니다.
export function bonusReady(plan) {
  return plan.length > 0
    && !plan.some((x) => x.status === 'todo' || x.status === 'kept')
    && plan.some((x) => x.status === 'changed');
}

// 제안 하나 고르기. family: 'add' | 'second' | 'any'. exclude: 이미 말했거나 아이가 넘긴 제안 id 또는 종류
export function pickSuggestion(text, family, opts = {}, exclude = new Set()) {
  const c = candidates(text, opts);
  const list = family === 'add' ? c.add : family === 'second' ? c.second : c.add.concat(c.second);
  return list.find((s) => !exclude.has(s.id) && !exclude.has(s.kind)) || null;
}

// 다시 보기(한 번 더): 이미 말한 종류를 빼고 하나만. 1회차가 내용 제안이었으니 표기, 점 찍기, 나누기, 잇기를 먼저 봅니다.
// <자세히 한 문장 더>는 다시 보기에서 쓰지 않습니다.
export function pickRoundTwo(text, opts = {}, shownKinds = []) {
  const ex = new Set([...shownKinds, 'add-detail']);
  if (opts.spellAllowed === false) ex.add('spell');
  return pickSuggestion(text, 'second', opts, ex) || pickSuggestion(text, 'add', opts, ex);
}

// ---------------------------------------------------------------
// 4. 글 바꾸기
// ---------------------------------------------------------------

function replaceRange(text, start, end, value) {
  return text.slice(0, start) + value + text.slice(end);
}

// 문장 뒤에 새 문장을 붙입니다.
function appendAfter(text, target, sentence) {
  const add = String(sentence || '').trim();
  if (!add) return text;
  if (!target) return text.trim() ? `${text.trimEnd()} ${add}` : add;
  const before = text.slice(0, target.end);
  const after = text.slice(target.end);
  // 문장 끝 따옴표나 부호 바로 뒤에 붙임
  return `${before} ${add}${after.startsWith(' ') || after.startsWith('\n') || after === '' ? '' : ' '}${after}`;
}

// 보기를 골랐을 때. option.type: insert | append | prefix | punct | replace | keep
export function applyOption(text, sug, option) {
  const t = String(text || '');
  const tg = sug.target;
  if (!option) return t;
  switch (option.type) {
    case 'insert': {
      if (!tg) return t;
      const sentence = t.slice(tg.start, tg.end);
      return replaceRange(t, tg.start, tg.end, insertInto(sentence, option.value, sug.kind));
    }
    case 'append':
      return appendAfter(t, tg, option.value);
    case 'prefix': {
      if (!tg) return t;
      return replaceRange(t, tg.start, tg.start, `${option.value} `);
    }
    case 'punct': {
      if (!tg) return t;
      return replaceRange(t, tg.end, tg.end, '.');
    }
    case 'replace': {
      const c = sug.spell;
      if (!c) return t;
      return replaceRange(t, c.matchStart, c.matchEnd, c.fixed);
    }
    case 'keep':
    default:
      return t;
  }
}

// <내 말로 쓸래>: edit는 그 문장만 바꾸고, append는 그 문장 뒤에 붙입니다.
export function applyOwn(text, sug, own) {
  const t = String(text || '');
  const v = String(own || '').trim();
  if (!v || !sug.own) return t;
  if (sug.own.mode === 'append') return appendAfter(t, sug.target, v);
  const tg = sug.target;
  if (!tg) return t;
  return replaceRange(t, tg.start, tg.end, v);
}

// 보기 단추에 보여 줄 바뀐 모습: { text: 바뀐 문장, mark: 새로 들어간 말 }
export function previewOption(text, sug, option) {
  const tg = sug.target;
  const sentence = tg ? String(text || '').slice(tg.start, tg.end) : '';
  switch (option.type) {
    case 'insert': return { text: insertInto(sentence, option.value, sug.kind), mark: option.value };
    case 'append': return { text: option.value, mark: option.value };
    case 'prefix': return { text: `${option.value} ${sentence}`, mark: option.value };
    case 'punct': return { text: `${sentence}.`, mark: '.' };
    case 'replace':
    case 'keep': return { text: option.value, mark: '' };
    default: return { text: option.label, mark: '' };
  }
}

function norm(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

// 다듬기 보너스 판정: 제안 자리에서 글자가 바뀌었는지 (띄어쓰기만 바뀐 것은 아님)
export function isChanged(before, after) {
  return norm(before).replace(/\s/g, '') !== norm(after).replace(/\s/g, '');
}

// <내 말로 쓸래> 칸에 쓴 글이 받아들일 만한지.
// 고치기 칸은 처음 문장과 달라야 하고, 붙이기 칸은 미리 채운 말(왜냐하면 …) 말고 글자가 2자 이상이어야 합니다.
export function ownReady(sug, own, prefill) {
  const v = String(own || '').trim();
  if (!v || !sug.own) return false;
  if (sug.own.mode === 'edit') return isChanged(sug.own.prefill || '', v) && HANGUL.test(v);
  const pre = String(prefill ?? sug.own.prefill ?? '').trim();
  const rest = pre && v.startsWith(pre) ? v.slice(pre.length) : v;
  return (rest.match(/[가-힣]/g) || []).length >= 2;
}

// ---------------------------------------------------------------
// 5. 칭찬과 반응
// ---------------------------------------------------------------

function pickBy(list, seed) {
  if (!list || !list.length) return '';
  return list[Math.abs(seed || 0) % list.length];
}

// 아이 글에서 짧게 인용할 부분 (낱말 focus가 들어가게, 문장 끝 쪽을 살려서)
export function quoteOf(sentence, focus, max = 20) {
  const core = String(sentence || '').replace(/[.!?…~。]+$/, '').trim();
  if (core.length <= max) return core;
  const words = core.split(/\s+/);
  const at = focus ? core.indexOf(focus) : -1;
  const fi = at >= 0 ? (core.slice(0, at).match(/\s+/g) || []).length : words.length - 1;
  let a = fi;
  let b = fi;
  const len = () => words.slice(a, b + 1).join(' ').length;
  // 앞쪽은 이어지는 말(~하다가, ~고, ~서) 앞에서 멈춰서 한 덩어리만 인용
  const linkEnd = (w) => /(다가|고|는데|은데|면서|니까|지만)$/.test(w) || (/서$/.test(w) && !/에서$/.test(w));
  while (b + 1 < words.length && len() + words[b + 1].length + 1 <= max) b++;
  while (a > 0 && !linkEnd(words[a - 1]) && len() + words[a - 1].length + 1 <= max) a--;
  return words.slice(a, b + 1).join(' ');
}

function sentenceWith(a, index) {
  if (index === undefined || index === null) return null;
  return a.sentences.find((s) => index >= s.start && index < s.end) || null;
}

function dialogueQuote(a) {
  const m = a.text.match(/["“‘'「『]([^"”’'」』\n]{1,40})["”’'」』]/);
  if (m) return m[1].trim().replace(/[.!?~]+$/, (p) => p.slice(0, 1));
  return null;
}

// 칭찬 고르기: 대화 > 이유 > 소리·모습 > 순서 > 기분 > 누가·언제·어디서 > 책갈피
// 돌려주는 것: { kind, line, quote, sentence }
export function praiseFor(text, opts = {}) {
  const a = analyze(text);
  const seed = opts.seed || 0;
  const P = LINES.praise;
  const out = (kind, quote, sentence) => {
    const list = P[kind];
    let line = pickBy(list, seed);
    if (line.includes('{quote}') && !quote) line = list.find((l) => !l.includes('{quote}')) || line;
    return { kind, line: fill(line, { quote }), quote: quote || null, sentence: sentence ? sentence.text : null };
  };
  if (!a.sentences.length) return { kind: 'none', line: '', quote: null, sentence: null };

  if (a.dialogue) {
    const s = sentenceWith(a, a.dialogue.index);
    const q = dialogueQuote(a);
    return out('dialogue', q && q.length <= 22 ? q : null, s);
  }
  if (a.reason) {
    const s = sentenceWith(a, a.reason.index);
    return out('reason', s ? quoteOf(s.text, a.reason.word) : null, s);
  }
  if (a.sense) {
    const s = sentenceWith(a, a.sense.index);
    return out('sense', s ? quoteOf(s.text, a.sense.word) : null, s);
  }
  if (a.order) return out('order', null, null);
  if (a.feeling) {
    const s = sentenceWith(a, a.feeling.index);
    return out('feeling', s ? quoteOf(s.text, a.feeling.word, 16) : null, s);
  }
  if ((a.who || a.self) && a.when && a.where) return out('wh', null, null);
  const ss = a.sentences;
  const s = ss.length >= 3 ? ss[Math.floor(ss.length / 2)] : ss[ss.length - 1];
  return out('quote', quoteOf(s.text), s);
}

// 다듬기를 시작할 때 토리의 첫 마디 (평가가 아니라 내용에 대한 반응)
export function reactionFor(text, opts = {}) {
  const t = String(text || '');
  const seed = opts.seed || 0;
  if (opts.isPhoto && !t.trim()) return pickBy(LINES.reaction.photo, seed);
  for (const topic of REACTION_TOPICS) {
    if (topic.words.some((w) => t.includes(w))) return pickBy(LINES.reaction[topic.key], seed);
  }
  const ss = splitSentences(t);
  const s = ss.length ? ss[Math.min(1, ss.length - 1)] : null;
  const quote = s ? quoteOf(s.text) : '';
  const list = LINES.reaction.default;
  const line = quote ? pickBy(list, seed) : list.find((l) => !l.includes('{quote}'));
  return fill(line, { quote });
}

// 고친 뒤 토리 반응
export function afterChangeLine(sug) {
  const A = LINES.afterChange;
  if (sug.kind === 'spell' && sug.spell) return fill(A.spell, { right: sug.spell.right });
  return A[sug.kind] || A.default;
}

// ---------------------------------------------------------------
// 6. 나란히 보기 (바뀐 낱말 찾기)
// ---------------------------------------------------------------

// 두 목록을 맞춰 봄(LCS). [['same', i, j] | ['del', i] | ['add', j]]
function align(A, B, eq) {
  const n = A.length;
  const m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = eq(A[i], B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (eq(A[i], B[j])) ops.push(['same', i++, j++]);
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push(['del', i++]);
    else ops.push(['add', j++]);
  }
  while (i < n) ops.push(['del', i++]);
  while (j < m) ops.push(['add', j++]);
  return ops;
}

// 글을 문장 조각으로 나눔 (조각을 이어 붙이면 원래 글 그대로)
function sentencePieces(s) {
  const ss = splitSentences(s);
  if (!ss.length) return s ? [s] : [];
  return ss.map((x, k) => s.slice(k === 0 ? 0 : x.start, k + 1 < ss.length ? ss[k + 1].start : s.length));
}

// 바뀐 곳 찾기. 먼저 문장끼리 맞춰 보고(통째로 더한 문장은 통째로 표시), 남은 곳만 낱말끼리 비교합니다.
// [{ t: '글자', type: 'same' | 'add' | 'del', ws?: true }]  ws: 띄어쓰기만 있는 조각(표시 없이 보여 줌)
export function diffWords(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  const out = [];
  const push = (t, type) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.t += t;
    else out.push({ t, type });
  };
  const words = (x, y) => {
    const A = x.split(/(\s+)/).filter((w) => w !== '');
    const B = y.split(/(\s+)/).filter((w) => w !== '');
    if (A.length * B.length > 250000) { push(x, 'del'); push(y, 'add'); return; }
    for (const [op, p, q] of align(A, B, (u, v) => u === v)) {
      if (op === 'same') push(A[p], 'same');
      else if (op === 'del') push(A[p], 'del');
      else push(B[p], 'add');
    }
  };
  const PA = sentencePieces(sa);
  const PB = sentencePieces(sb);
  if (PA.length * PB.length > 250000) words(sa, sb);
  else {
    let runA = '';
    let runB = '';
    const flush = () => { if (runA || runB) words(runA, runB); runA = ''; runB = ''; };
    for (const [op, p, q] of align(PA, PB, (u, v) => u.trim() === v.trim())) {
      if (op === 'same') { flush(); words(PA[p], PB[q]); }
      else if (op === 'del') runA += PA[p];
      else runB += PB[p];
    }
    flush();
  }
  // 더하거나 뺀 조각 앞뒤의 띄어쓰기는 따로 떼어 표시하지 않음
  const res = [];
  for (const tok of out) {
    if (tok.type === 'same') { res.push(tok); continue; }
    const m = tok.t.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (m[1]) res.push({ t: m[1], type: tok.type, ws: true });
    if (m[2]) res.push({ t: m[2], type: tok.type });
    if (m[3]) res.push({ t: m[3], type: tok.type, ws: true });
  }
  return res;
}
