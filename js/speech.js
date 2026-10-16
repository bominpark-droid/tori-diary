// 말하기 입력 (브라우저 음성 인식). 보호자가 켜야만 보입니다(기본 끔).
// 주의: 브라우저 회사(구글, 애플 등)의 음성 인식 서버를 거칠 수 있습니다. docs/DESIGN.md 4.7

export function speechSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// 한 번 듣기. onText(글자, 끝났는지) / onEnd() / onError(이유)
export function listen({ onText, onEnd, onError } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    if (onError) onError('unsupported');
    return () => {};
  }
  const rec = new SR();
  rec.lang = 'ko-KR';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (onText) onText((finalText + interim).trim(), false);
  };
  rec.onerror = (e) => {
    if (onError) onError(e.error || 'error');
  };
  rec.onend = () => {
    if (onText && finalText) onText(finalText.trim(), true);
    if (onEnd) onEnd();
  };
  try {
    rec.start();
  } catch (e) {
    if (onError) onError('start');
  }
  return () => {
    try {
      rec.stop();
    } catch (e) {
      /* 이미 멈춤 */
    }
  };
}

// 계획 칸에는 말한 내용 중 낱말 1~3개만 남깁니다(말을 그대로 글로 바꾸지 않음).
export function keepFewWords(text, n = 3) {
  const stop = new Set(['그리고', '그래서', '음', '어', '저', '그', '이', '것', '거', '좀', '막', '진짜', '되게', '너무', '오늘']);
  const words = String(text || '').replace(/[.,!?~]/g, ' ').split(/\s+/).filter((w) => w && !stop.has(w));
  return words.slice(0, n).join(' ');
}

// 정확도 시험용: 두 문장이 글자로 얼마나 같은지 (0~1)
export function similarity(a, b) {
  const x = String(a || '').replace(/[\s.,!?~]/g, '');
  const y = String(b || '').replace(/[\s.,!?~]/g, '');
  if (!x && !y) return 1;
  const dp = Array.from({ length: x.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= y.length; j++) dp[0][j] = j;
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
  }
  return Math.max(0, 1 - dp[x.length][y.length] / Math.max(x.length, y.length));
}

// 보호자 화면의 정확도 시험 문장 10개 (3학년 일기에 나올 만한 문장)
export const VOICE_TEST = [
  '오늘 학교에서 친구랑 피구를 했다.',
  '점심에 닭강정이 나와서 기분이 좋았다.',
  '쉬는 시간에 운동장에서 줄넘기를 했다.',
  '동생이 내 레고를 망가뜨려서 속상했다.',
  '엄마랑 마트에 가서 과자를 샀다.',
  '비가 와서 우산을 쓰고 집에 왔다.',
  '태권도 학원에서 발차기를 배웠다.',
  '선생님이 재미있는 이야기를 해 주셨다.',
  '저녁에 할머니께 전화를 드렸다.',
  '내일은 친구들이랑 공원에 가기로 했다.',
];
