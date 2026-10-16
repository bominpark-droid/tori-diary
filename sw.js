// 오프라인 준비 (서비스 워커)
// - 인터넷이 되면 항상 새 파일을 먼저 받고(network-first), 안 되면 저장해 둔 파일을 씁니다.
//   그래서 코드를 고쳐서 올리면 다음에 앱을 열 때 바로 바뀝니다. 버전 숫자를 올릴 필요가 없습니다.
// - 새 파일을 만들면 아래 FILES에 한 줄 더해 주세요. 빠뜨리면 npm test가 알려 줍니다.
// - 일기 기록은 여기에 저장되지 않습니다(기록은 localStorage, 사진은 IndexedDB).

const CACHE = 'tori-diary-v1';

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/favicon-64.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/tori-photo.jpg',
  'css/art.css',
  'css/base.css',
  'css/screens.css',
  'css/tokens.css',
  'js/art/covers.js',
  'js/art/stickers.js',
  'js/data/fonts.js',
  'js/data/plan.js',
  'js/data/shop-items.js',
  'js/data/spelling.js',
  'js/data/topics.js',
  'js/data/tori-diaries.js',
  'js/data/tori-lines.js',
  'js/data/words.js',
  'js/dates.js',
  'js/feedback.js',
  'js/flow.js',
  'js/hints.js',
  'js/josa.js',
  'js/main.js',
  'js/music.js',
  'js/photos.js',
  'js/rewards.js',
  'js/router.js',
  'js/screens/common.js',
  'js/screens/diary-view.js',
  'js/screens/home.js',
  'js/screens/parent.js',
  'js/screens/settings.js',
  'js/screens/shelf.js',
  'js/screens/shop.js',
  'js/screens/welcome.js',
  'js/screens/write-decorate.js',
  'js/screens/write-done.js',
  'js/screens/write-finish.js',
  'js/screens/write-plan.js',
  'js/screens/write-polish.js',
  'js/screens/write-scene.js',
  'js/screens/write-text.js',
  'js/speech.js',
  'js/store.js',
  'js/tori.js',
  'js/ui.js',
  'js/util.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(FILES.map((f) => cache.add(new Request(f, { cache: 'no-cache' })).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  const sameOrigin = url.origin === self.location.origin;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // 같은 주소의 파일은 브라우저 임시 저장을 건너뛰고 서버에 바뀌었는지 물어봄
      let res;
      if (sameOrigin && req.mode === 'navigate') res = await fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' });
      else if (sameOrigin) res = await fetch(req, { cache: 'no-cache' });
      else res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) {
        const key = req.mode === 'navigate' ? new Request(url.origin + url.pathname) : req;
        cache.put(key, res.clone()).catch(() => {});
      }
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const index = (await cache.match('index.html')) || (await cache.match('./'));
        if (index) return index;
      }
      throw err;
    }
  })());
});
