const ORGANIZE_COUNT_KEY = 'linkportal-organize-count';

export function getOrganizeCount(): number {
  const raw = localStorage.getItem(ORGANIZE_COUNT_KEY);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 바구니 → 다른 폴더로 옮긴 링크 수를 누적 */
export function recordInboxOrganize(movedCount: number): number {
  if (movedCount <= 0) return getOrganizeCount();

  const next = getOrganizeCount() + movedCount;
  localStorage.setItem(ORGANIZE_COUNT_KEY, String(next));
  return next;
}
