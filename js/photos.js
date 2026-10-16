// 손글씨 일기 사진 저장 (IndexedDB). 사진은 다시 그려서 저장하므로 촬영 위치 같은 정보가 지워집니다.

const DB = 'tori-diary-photos';
const STORE = 'photos';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
    t.onerror = () => reject(t.error);
  });
}

export async function savePhoto(id, blob) {
  await tx('readwrite', (s) => s.put(blob, id));
  return id;
}

export async function getPhoto(id) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(id) {
  await tx('readwrite', (s) => s.delete(id));
}

export async function photoURL(id) {
  const blob = await getPhoto(id);
  return blob ? URL.createObjectURL(blob) : null;
}

// 긴 쪽 1600px, JPEG 0.82로 줄이기
export function compressImage(file, maxSide = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const hgt = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = hgt;
      const c2 = canvas.getContext('2d');
      c2.fillStyle = '#fff';
      c2.fillRect(0, 0, w, hgt);
      c2.drawImage(img, 0, 0, w, hgt);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('사진을 줄이지 못했어요'))), 'image/jpeg', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('사진을 열지 못했어요'));
    };
    img.src = url;
  });
}

// 백업용: 모든 사진을 data URL로
export async function exportPhotos(ids) {
  const out = {};
  for (const id of ids) {
    const blob = await getPhoto(id);
    if (!blob) continue;
    out[id] = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  }
  return out;
}

export async function importPhotos(map) {
  for (const [id, dataURL] of Object.entries(map || {})) {
    const blob = await (await fetch(dataURL)).blob();
    await savePhoto(id, blob);
  }
}
