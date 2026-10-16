// 파일 점검: 고친 뒤에 화면이 하얗게 멈추는 흔한 실수를 미리 찾습니다.
// 1) 불러오는(import) 파일이 진짜 있는지, 불러오는 이름을 그 파일이 내보내는지(export)
// 2) 오프라인 준비 목록(sw.js의 FILES)에 앱 파일이 모두 들어 있는지
// 3) 화면 주소표(js/router.js)의 화면 파일이 모두 있는지
// 4) 문법 실수(괄호 빠짐 같은 것)가 없는지, 화면에 'null' 글자가 찍힐 만한 코드가 없는지

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'tests' || name === 'docs') continue;
    const rel = dir ? `${dir}/${name}` : name;
    const st = fs.statSync(path.join(ROOT, rel));
    if (st.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

const files = walk('');
const jsFiles = files.filter((f) => f.startsWith('js/') && f.endsWith('.js'));

function exportsOf(src) {
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const p = part.trim();
      if (!p) continue;
      const as = p.split(/\s+as\s+/);
      names.add((as[1] || as[0]).trim());
    }
  }
  return names;
}

test('불러오는 파일과 이름이 모두 있다', () => {
  const problems = [];
  for (const f of jsFiles) {
    const src = read(f);
    for (const m of src.matchAll(/import\s+(?:\{([^}]*)\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g)) {
      const spec = m[2];
      if (!spec.startsWith('.')) continue;
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(f), spec));
      if (!fs.existsSync(path.join(ROOT, target))) {
        problems.push(`${f}: '${spec}' 파일이 없어요`);
        continue;
      }
      if (!m[1]) continue;
      const have = exportsOf(read(target));
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (name && !have.has(name)) problems.push(`${f}: '${target}'에 '${name}'이(가) 없어요`);
      }
    }
    for (const m of src.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]));
      if (!fs.existsSync(path.join(ROOT, target))) problems.push(`${f}: '${m[1]}' 파일이 없어요`);
    }
  }
  assert.deepEqual(problems, []);
});

test('오프라인 준비 목록(sw.js)에 앱 파일이 모두 있다', () => {
  const sw = read('sw.js');
  const list = new Set([...sw.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
  const need = files.filter((f) => /\.(js|css|html|png|jpg|webmanifest)$/.test(f) && f !== 'sw.js');
  const missing = need.filter((f) => !list.has(f));
  const extra = [...list].filter((f) => f !== './' && !files.includes(f));
  assert.deepEqual(missing, [], `sw.js FILES에 더해 주세요: ${missing.join(', ')}`);
  assert.deepEqual(extra, [], `sw.js FILES에 없는 파일이 있어요: ${extra.join(', ')}`);
});

test('화면 주소표의 화면 파일이 모두 있다', () => {
  const router = read('js/router.js');
  const screens = [...router.matchAll(/import\('\.\/(screens\/[^']+)'\)/g)].map((m) => `js/${m[1]}`);
  assert.ok(screens.length >= 10);
  for (const s of screens) {
    assert.ok(fs.existsSync(path.join(ROOT, s)), `${s} 파일이 없어요`);
    const src = read(s);
    assert.match(src, /export function render\(/, `${s}에 render 함수가 없어요`);
    assert.match(src, /export const meta = /, `${s}에 meta가 없어요`);
  }
});

test('JS 파일에 문법 실수가 없다', () => {
  const problems = [];
  for (const f of [...jsFiles, 'sw.js']) {
    try {
      execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' });
    } catch (e) {
      problems.push(`${f}: ${String(e.stderr || e.message).split('\n').slice(0, 5).join(' / ')}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('화면에 붙일 때 el.append 대신 put을 쓴다', () => {
  // el.append(a, null)은 화면에 'null' 글자를 찍습니다. util.js의 put(el, ...)은 null을 건너뜁니다.
  const problems = jsFiles.filter((f) => f.startsWith('js/screens/') && /\.append\(/.test(read(f)));
  assert.deepEqual(problems, [], `put(el, ...)으로 바꿔 주세요: ${problems.join(', ')}`);
});

test('앱 화면 글에 쓰지 않는 말이 없다', () => {
  const banned = ['틀렸', '고쳐야', '해야 해', '점수를 줄', '천재', '서운해', '잘못 썼', '빨리 써', '기다렸잖아'];
  const problems = [];
  for (const f of jsFiles.filter((x) => x.startsWith('js/screens/') || x === 'js/data/tori-lines.js')) {
    // 주석은 빼고 글자(따옴표 안)만 봅니다
    const strings = (read(f).match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) || []).join('\n');
    for (const w of banned) if (strings.includes(w)) problems.push(`${f}: '${w}'`);
  }
  assert.deepEqual(problems, []);
});
