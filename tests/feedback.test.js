// 다듬기 도우미 테스트: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitSentences, analyze, candidates, pickSuggestion, pickRoundTwo, applyOption, applyOwn,
  isChanged, ownReady, praiseFor, reactionFor, diffWords, findSpelling, detectStyle, quoteOf, endsSentence,
} from '../js/feedback.js';
import { LINES } from '../js/data/tori-lines.js';

const texts = (ss) => ss.map((s) => s.text);

test('문장 나누기: 점, 느낌표, 따옴표', () => {
  assert.deepEqual(texts(splitSentences('오늘 학교에서 피구를 했다. 정말 재밌었다!')), ['오늘 학교에서 피구를 했다.', '정말 재밌었다!']);
  assert.deepEqual(texts(splitSentences('친구가 "같이 하자! 빨리 와."라고 했다. 나는 좋다고 했다.')), ['친구가 "같이 하자! 빨리 와."라고 했다.', '나는 좋다고 했다.']);
  assert.equal(splitSentences('3.5점을 받았다.').length, 1);
  assert.equal(splitSentences('3~4개를 먹었다.').length, 1);
});

test('문장 나누기: 점이 없어도 ~다 뒤에서 나누고, 이어지는 말은 안 나눔', () => {
  const ss = splitSentences('학교에 갔다 친구랑 놀았다');
  assert.deepEqual(texts(ss), ['학교에 갔다', '친구랑 놀았다']);
  assert.equal(ss[0].soft, true);
  assert.equal(ss[1].soft, false, '글의 마지막 문장은 점 찍기 후보가 아님');
  assert.equal(splitSentences('학교에 갔다 왔다.').length, 1);
  assert.equal(splitSentences('공부하다 잠들었다.').length, 1);
  assert.equal(splitSentences('밥을 먹었다는 것이 신기했다.').length, 1);
  assert.equal(endsSentence('필요'), false);
  assert.equal(endsSentence('갔어요'), true);
});

test('문장 나누기: 줄바꿈', () => {
  const ss = splitSentences('오늘은\n바다에 갔다\n재밌었다');
  assert.deepEqual(texts(ss), ['오늘은', '바다에 갔다', '재밌었다']);
  assert.equal(ss[0].soft, false, '문장 끝 모양이 아니면 점 찍기 후보가 아님');
  assert.equal(ss[1].soft, true);
});

test('찾기: 누구, 어디서, 언제, 기분', () => {
  const a = analyze('오늘 학교에서 친구랑 피구를 했다. 정말 신났다.');
  assert.ok(a.who && a.where && a.when && a.feeling);
  assert.equal(a.reason, null);
  assert.equal(analyze('강아지랑 놀았다.').where, null, '강아지의 강은 장소가 아님');
  assert.equal(analyze('방학이라 집중이 안 됐다.').where, null, '방학, 집중은 장소가 아님');
  assert.ok(analyze('민수랑 놀았다.').who, '이름 + 랑');
  assert.ok(analyze('혼자 레고를 만들었다.').who, '혼자도 누구로 봄');
});

test('제안: 더하기형은 누구 > 어디서 > 언제 > 기분 > 이유 > 자세히, 항상 하나 이상', () => {
  const c = candidates('피구를 했다. 재밌었다.');
  assert.deepEqual(c.add.map((s) => s.kind), ['add-who', 'add-where', 'add-when', 'add-reason', 'add-detail']);
  const full = candidates('오늘 학교에서 친구랑 피구를 했다. 공이 빨라서 깜짝 놀랐다. 왜냐하면 처음 해 봤기 때문이다.');
  assert.deepEqual(full.add.map((s) => s.kind), ['add-detail'], '모두 있으면 자세히 한 문장 더');
});

test('제안: 두 번째 종류 (표기, 점 찍기, 나누기, 잇기)', () => {
  const c1 = candidates('어제 할머니 댁에 갔는데 너무 재밋었다. 내일 또 갈께.', { spellAllowed: true });
  const spells = c1.second.filter((s) => s.kind === 'spell').map((s) => [s.spell.wrong, s.spell.right]);
  assert.deepEqual(spells, [['재밋었다', '재밌었다'], ['갈께', '갈게']]);
  const noSpell = candidates('내일 또 갈께.', { spellAllowed: false });
  assert.equal(noSpell.second.filter((s) => s.kind === 'spell').length, 0, '표기 제안은 하루 한 번');

  const c2 = candidates('학교에 갔다 친구랑 놀았다');
  assert.equal(c2.second[0].kind, 'punct');

  const c3 = candidates('밥을 먹고 놀이터에 가고 그네를 타고 미끄럼틀도 탔다.');
  assert.ok(c3.second.some((s) => s.kind === 'split'));

  const c4 = candidates('피구를 했다. 재밌었다.');
  const conn = c4.second.find((s) => s.kind === 'connect');
  assert.ok(conn);
  assert.deepEqual(conn.options.map((o) => o.label), ['그래서', '그런데', '그리고']);
  assert.equal(candidates('피구를 했다. 그래서 재밌었다.').second.filter((s) => s.kind === 'connect').length, 0, '이미 이어 주는 말이 있으면 없음');
});

test('보기 고르기: 낱말을 알맞은 자리에 끼움', () => {
  const t1 = '오늘 학교에서 피구를 했다.';
  const who = pickSuggestion(t1, 'add');
  assert.equal(who.kind, 'add-who');
  assert.equal(applyOption(t1, who, { type: 'insert', value: '친구랑' }), '오늘 친구랑 학교에서 피구를 했다.');
  assert.deepEqual(who.options.map((o) => o.label), ['친구들이랑', '짝꿍이랑'], '학교 이야기면 학교 보기');

  const t2 = '오늘 친구랑 피구를 했다.';
  const where = pickSuggestion(t2, 'add');
  assert.equal(where.kind, 'add-where');
  assert.equal(applyOption(t2, where, { type: 'insert', value: '운동장에서' }), '오늘 친구랑 운동장에서 피구를 했다.');

  const t3 = '학교에서 친구랑 피구를 했다. 신났다.';
  const when = pickSuggestion(t3, 'add');
  assert.equal(when.kind, 'add-when');
  assert.equal(applyOption(t3, when, when.options[0]), '오늘 학교에서 친구랑 피구를 했다. 신났다.');
});

test('보기 고르기: 아이가 한 일 문장에만 끼우고, 앞 덩어리 뒤에 끼움', () => {
  const t = '오늘은 급식에 닭강정이 나왔다. 너무 맛있어서 두 번 먹었다.';
  const s = pickSuggestion(t, 'add');
  assert.equal(s.kind, 'add-who');
  assert.equal(applyOption(t, s, s.options[0]), '오늘은 급식에 닭강정이 나왔다. 너무 맛있어서 친구들이랑 두 번 먹었다.');
  const t2 = '아침에 늦잠을 잤다. 그래서 학교에 뛰어갔다.';
  const s2 = pickSuggestion(t2, 'add');
  assert.equal(applyOption(t2, s2, { type: 'insert', value: '형이랑' }), '아침에 늦잠을 잤다. 그래서 형이랑 학교에 뛰어갔다.', '잤다에는 끼우지 않음');
  const t3 = '비가 와서 우산을 쓰고 학교에 갔다.';
  const s3 = pickSuggestion(t3, 'add');
  assert.equal(applyOption(t3, s3, { type: 'insert', value: '엄마랑' }), '비가 와서 엄마랑 우산을 쓰고 학교에 갔다.');
  const t4 = '동생이 내 레고를 부셨다. 억울했다.';
  const s4 = pickSuggestion(t4, 'add');
  assert.equal(s4.kind, 'add-where');
  assert.equal(applyOption(t4, s4, s4.options[0]), '동생이 집에서 내 레고를 부셨다. 억울했다.');
  const t5 = '그냥 그랬다. 졸렸다.';
  const s5 = pickSuggestion(t5, 'add');
  assert.equal(s5.options.length, 0, '끼울 문장이 없으면 한 문장 붙이기');
  assert.equal(s5.own.mode, 'append');
});

test('기분 보기: 힘든 이야기에는 힘들었다/뿌듯했다', () => {
  const f = candidates('학교 끝나고 태권도에 갔다. 다리가 아팠다.').add.find((x) => x.kind === 'add-feeling');
  assert.deepEqual(f.options.map((o) => o.value), ['그때 조금 힘들었다.', '그래도 마음이 뿌듯했다.']);
});

test('보기 고르기: 계획 낱말이 보기로 먼저 나옴', () => {
  const s = pickSuggestion('피구를 했다.', 'add', { plan: { who: '짝꿍' } });
  assert.equal(s.options[0].label, '짝꿍이랑');
  const f = candidates('오늘 학교에서 친구랑 피구를 했다.', { plan: { feeling: 'proud' } }).add.find((x) => x.kind === 'add-feeling');
  assert.equal(f.options[0].value, '그때 마음이 뿌듯했다.');
  const yo = candidates('오늘 학교에서 친구랑 피구를 했어요.', { plan: { feeling: 'proud' } }).add.find((x) => x.kind === 'add-feeling');
  assert.equal(yo.options[0].value, '그때 마음이 뿌듯했어요.', '~요 말투에 맞춤');
});

test('글 바꾸기: 붙이기, 이어 주는 말, 점, 표기', () => {
  const t = '피구를 했다. 재밌었다.';
  const feel = { kind: 'add-feeling', target: splitSentences(t).map((s, index) => ({ ...s, index }))[1], own: { mode: 'append' } };
  assert.equal(applyOption(t, feel, { type: 'append', value: '그때 정말 신났다.' }), '피구를 했다. 재밌었다. 그때 정말 신났다.');

  const conn = candidates(t).second.find((s) => s.kind === 'connect');
  assert.equal(applyOption(t, conn, conn.options[0]), '피구를 했다. 그래서 재밌었다.');

  const p = candidates('학교에 갔다 친구랑 놀았다').second[0];
  assert.equal(applyOption('학교에 갔다 친구랑 놀았다', p, p.options[0]), '학교에 갔다. 친구랑 놀았다');

  const st = '내일 또 갈께.';
  const sp = candidates(st).second.find((s) => s.kind === 'spell');
  const right = sp.options.find((o) => o.type === 'replace');
  const wrong = sp.options.find((o) => o.type === 'keep');
  assert.equal(applyOption(st, sp, right), '내일 또 갈게.');
  assert.equal(applyOption(st, sp, wrong), st, '원래 모양을 고르면 글이 그대로');
});

test('내 말로 쓸래: 그 문장만 바꾸거나 뒤에 붙임', () => {
  const t = '피구를 했다. 재밌었다.';
  const who = pickSuggestion(t, 'add');
  assert.equal(applyOwn(t, who, '짝꿍이랑 피구를 했다.'), '짝꿍이랑 피구를 했다. 재밌었다.');
  const reason = candidates(t).add.find((s) => s.kind === 'add-reason');
  assert.equal(applyOwn(t, reason, '왜냐하면 공이 빨랐기 때문이다.'), '피구를 했다. 재밌었다. 왜냐하면 공이 빨랐기 때문이다.');
  assert.equal(ownReady(reason, '왜냐하면', '왜냐하면 '), false, '미리 채운 말만으로는 안 됨');
  assert.equal(ownReady(reason, '왜냐하면 공이 빨랐다', '왜냐하면 '), true);
  assert.equal(ownReady(who, '피구를 했다.'), false, '고치기 칸은 처음과 달라야 함');
});

test('보너스 판정: 글자가 바뀌어야 고친 것', () => {
  assert.equal(isChanged('피구를 했다.', '피구를  했다.'), false, '띄어쓰기만 바뀐 것은 아님');
  assert.equal(isChanged('피구를 했다.', '친구랑 피구를 했다.'), true);
  // 제안을 따라 자기 말로 써도 고친 것으로 봄 (사용자 결정)
  const t = '피구를 했다.';
  const s = pickSuggestion(t, 'add');
  assert.equal(isChanged(t, applyOwn(t, s, '우리 반 애들이랑 피구를 했다.')), true);
});

test('다시 보기: 이미 말한 종류와 <자세히>는 빼고 하나만', () => {
  const t = '오늘 학교에서 친구랑 피구를 했다. 정말 신났다.';
  const r2 = pickRoundTwo(t, {}, ['add-reason']);
  assert.equal(r2, null, '남은 게 없으면 없음(자세히는 다시 보기에서 안 씀)');
  const r3 = pickRoundTwo('피구를 했다. 재밌었다.', {}, ['add-who', 'connect']);
  assert.equal(r3.kind, 'add-where');
});

test('이건 아닌 것 같아: 같은 종류의 다음 후보', () => {
  const t = '피구를 했다. 재밌었다.';
  const first = pickSuggestion(t, 'add');
  const next = pickSuggestion(t, 'add', {}, new Set([first.id]));
  assert.equal(first.kind, 'add-who');
  assert.equal(next.kind, 'add-where');
});

test('칭찬: 이유가 붙고, 아이 글을 인용함', () => {
  assert.equal(praiseFor('친구가 "공 받아!"라고 소리쳤다.').kind, 'dialogue');
  const r = praiseFor('늦잠을 자서 학교에 뛰어갔다. 왜냐하면 늦었기 때문이다.', { seed: 0 });
  assert.equal(r.kind, 'reason');
  assert.ok(r.line.includes('‘') && r.line.includes('이유'));
  assert.equal(praiseFor('공이 쿵 하고 떨어졌다.').kind, 'sense');
  const f = praiseFor('피구를 했다. 정말 신났다.', { seed: 0 });
  assert.equal(f.kind, 'feeling');
  assert.equal(f.quote, '정말 신났다');
  assert.equal(praiseFor('오늘 학교에서 친구랑 피구를 했다.').kind, 'wh');
  const q = praiseFor('피구를 했다.');
  assert.equal(q.kind, 'quote');
  assert.equal(q.quote, '피구를 했다');
});

test('반응: 내용에 맞는 첫 마디, 책상은 책이 아님', () => {
  assert.ok(LINES.reaction.food.includes(reactionFor('오늘 급식에 치킨이 나왔다.')));
  assert.ok(!LINES.reaction.book.includes(reactionFor('책상을 정리했다.')));
  assert.ok(LINES.reaction.book.includes(reactionFor('도서관에서 책을 빌렸다.')));
});

test('인용: 짧게, 문장 끝을 살려서', () => {
  assert.equal(quoteOf('오늘 운동장에서 친구들이랑 피구를 하다가 공이 지붕 위로 올라갔다.', '지붕'), '공이 지붕 위로 올라갔다');
  assert.equal(quoteOf('짧은 문장이다.'), '짧은 문장이다');
});

test('말투: ~다와 ~요', () => {
  assert.equal(detectStyle('피구를 했어요. 재밌었어요.'), 'yo');
  assert.equal(detectStyle('피구를 했다. 재밌었다.'), 'da');
});

test('표기 사전: 낱말 전체를 보여 줌', () => {
  assert.deepEqual(findSpelling('숙제를 않했다.').map((c) => [c.wrong, c.right]), [['않했다', '안 했다']]);
  assert.deepEqual(findSpelling('친구랑 가치 놀았다.').map((c) => [c.wrong, c.right]), [['가치', '같이']]);
  assert.deepEqual(findSpelling('이건 내 거 아니예요.').map((c) => c.right), ['아니에요']);
  assert.equal(findSpelling('가치가 있는 일이다.').length, 0, '가치(값어치)는 그대로');
});

test('나란히 보기: 바뀐 낱말만 표시', () => {
  assert.deepEqual(diffWords('피구를 했다.', '친구랑 피구를 했다.'), [
    { t: '친구랑', type: 'add' },
    { t: ' ', type: 'add', ws: true },
    { t: '피구를 했다.', type: 'same' },
  ]);
  // 문장을 통째로 더하면 그 문장이 통째로 표시되고, 처음 글에는 빈칸이 생기지 않음
  const toks = diffWords('공이 너무 빨라서 무서웠다.', '공이 쌩 하고 날아왔다. 공이 너무 빨라서 무서웠다.');
  assert.deepEqual(toks.filter((t) => t.type === 'add' && !t.ws).map((t) => t.t), ['공이 쌩 하고 날아왔다.']);
  assert.equal(toks.filter((t) => t.type !== 'add').map((t) => t.t).join(''), '공이 너무 빨라서 무서웠다.');
  // 점 하나 찍기
  const dot = diffWords('끝까지 피했다 우리 팀이 이겼다', '끝까지 피했다. 우리 팀이 이겼다');
  assert.equal(dot.filter((t) => t.type !== 'del').map((t) => t.t).join(''), '끝까지 피했다. 우리 팀이 이겼다');
  assert.equal(dot.filter((t) => t.type !== 'add').map((t) => t.t).join(''), '끝까지 피했다 우리 팀이 이겼다');
});

test('토리 대사: 쓰지 않는 말이 없음 (DESIGN.md 2.4)', () => {
  const all = JSON.stringify(LINES);
  for (const bad of ['틀렸', '고쳐', '해야 해', '점수', '천재', '서운해', '잘못 썼', '빨리', '기다렸잖아']) {
    assert.ok(!all.includes(bad), `토리 대사에 '${bad}'가 있음`);
  }
});

test('찾기: ~서, ~니까 뒤에 기분이 오면 이유를 쓴 것', () => {
  assert.equal(analyze('공이 너무 빨라서 무서웠다.').reason.word, '빨라서');
  assert.equal(analyze('친구랑 놀아서 신났다.').reason.word, '놀아서');
  assert.equal(analyze('학교에서 신났다.').reason, null);
  assert.equal(analyze('숙제를 하고 나서 기뻤다.').reason, null);
  const p = praiseFor('쉬는 시간에 피구를 했다. 공이 너무 빨라서 무서웠다.');
  assert.equal(p.kind, 'reason');
  assert.ok(p.line.includes('‘공이 너무 빨라서 무서웠다’'));
});
