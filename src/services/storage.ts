let requested = false;

/** origin 저장소 persistent 요청 — 앱 부팅 시 1회. UI 변경 없음. */
export async function requestPersistentStorageOnce(): Promise<void> {
  if (requested) return;
  requested = true;

  const storage = navigator.storage;
  if (!storage?.persisted || !storage.persist) return;

  try {
    if (await storage.persisted()) return;
    const granted = await storage.persist();
    console.log('[LinkPortal] storage.persist:', granted);
  } catch {
    // 비보안 컨텍스트·구형 브라우저 등 — 조용히 무시
  }
}
