import Dexie, { type Table } from 'dexie';
import type { Category, LinkItem } from '../types';

export class LinkPortalDB extends Dexie {
  categories!: Table<Category, string>;
  links!: Table<LinkItem, string>;

  constructor() {
    super('LinkPortal-launcher');
    this.version(1).stores({
      categories: 'id, parentId, sortOrder',
      links: 'id, categoryId',
    });
  }
}

export const db = new LinkPortalDB();

export async function getChildCategories(parentId: string | null): Promise<Category[]> {
  if (parentId === null) {
    return db.categories.filter((c) => c.parentId === null).sortBy('sortOrder');
  }
  return db.categories.where('parentId').equals(parentId).sortBy('sortOrder');
}

export async function getLinksByCategory(categoryId: string): Promise<LinkItem[]> {
  return db.links.where('categoryId').equals(categoryId).sortBy('createdAt');
}

export async function getCategory(id: string): Promise<Category | undefined> {
  return db.categories.get(id);
}

async function nextSortOrder(parentId: string | null): Promise<number> {
  const siblings = await getChildCategories(parentId);
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((c) => c.sortOrder)) + 1;
}

async function renormalizeSiblingSortOrder(parentId: string | null): Promise<void> {
  const siblings = await getChildCategories(parentId);
  const now = Date.now();
  for (let i = 0; i < siblings.length; i++) {
    if (siblings[i].sortOrder !== i) {
      await db.categories.update(siblings[i].id, { sortOrder: i, updatedAt: now });
    }
  }
}

export async function getDescendantIds(id: string): Promise<string[]> {
  const children = await getChildCategories(id);
  const ids: string[] = [id];
  for (const child of children) {
    ids.push(...(await getDescendantIds(child.id)));
  }
  return ids;
}

export async function createCategory(
  parentId: string | null,
  title: string,
): Promise<Category> {
  const now = Date.now();
  const category: Category = {
    id: crypto.randomUUID(),
    parentId,
    title,
    sortOrder: await nextSortOrder(parentId),
    createdAt: now,
    updatedAt: now,
  };
  await db.categories.add(category);
  return category;
}

export async function createLink(
  categoryId: string,
  data: Pick<LinkItem, 'url' | 'title' | 'imageUrl' | 'faviconUrl' | 'source' | 'authorName'>,
): Promise<LinkItem> {
  const now = Date.now();
  const link: LinkItem = {
    id: crypto.randomUUID(),
    categoryId,
    url: data.url,
    title: data.title,
    imageUrl: data.imageUrl,
    faviconUrl: data.faviconUrl,
    authorName: data.authorName,
    source: data.source,
    createdAt: now,
    updatedAt: now,
  };
  await db.links.add(link);
  return link;
}

export async function deleteCategory(id: string): Promise<void> {
  const cat = await getCategory(id);
  if (!cat) return;
  const parentId = cat.parentId;

  async function deleteRecursive(categoryId: string) {
    const children = await getChildCategories(categoryId);
    for (const child of children) await deleteRecursive(child.id);
    const categoryLinks = await getLinksByCategory(categoryId);
    await db.links.bulkDelete(categoryLinks.map((l) => l.id));
    await db.categories.delete(categoryId);
  }
  await deleteRecursive(id);
  await renormalizeSiblingSortOrder(parentId);
}

export async function deleteLink(id: string): Promise<void> {
  await db.links.delete(id);
}

export async function deleteLinks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.links.bulkDelete(ids);
}

export async function updateCategoryTitle(id: string, title: string): Promise<void> {
  await db.categories.update(id, { title, updatedAt: Date.now() });
}

export async function moveCategory(id: string, newParentId: string | null): Promise<boolean> {
  if (newParentId === id) return false;
  if (newParentId !== null) {
    const blocked = await getDescendantIds(id);
    if (blocked.includes(newParentId)) return false;
  }
  const cat = await getCategory(id);
  if (!cat) return false;
  const oldParentId = cat.parentId;
  await db.categories.update(id, {
    parentId: newParentId,
    sortOrder: await nextSortOrder(newParentId),
    updatedAt: Date.now(),
  });
  await renormalizeSiblingSortOrder(oldParentId);
  return true;
}

export async function updateLink(
  id: string,
  data: Partial<Pick<LinkItem, 'url' | 'title' | 'imageUrl' | 'faviconUrl' | 'source' | 'authorName'>>,
): Promise<void> {
  await db.links.update(id, { ...data, updatedAt: Date.now() });
}

export async function getAllCategories(): Promise<Category[]> {
  return db.categories.toArray();
}

export const INBOX_TITLE = '🧺 링크 바구니';
export const DEFAULT_NEW_FOLDER_TITLE = '🧺 새 폴더';
const DEFAULT_FOLDER_NUMBERED_PATTERN = /^🧺 새 폴더 (\d+)$/;
const LEGACY_INBOX_TITLES = ['미분류', '📌 나중에 정리'];

export function isDefaultFolderTitle(title: string): boolean {
  return title === DEFAULT_NEW_FOLDER_TITLE || DEFAULT_FOLDER_NUMBERED_PATTERN.test(title);
}

/** 같은 부모 아래 형제 폴더 이름을 보고 다음 기본 폴더명을 반환 */
export function resolveNextDefaultFolderTitle(
  siblings: Pick<Category, 'title'>[],
): string {
  const titles = new Set(siblings.map((c) => c.title));

  if (!titles.has(DEFAULT_NEW_FOLDER_TITLE)) {
    return DEFAULT_NEW_FOLDER_TITLE;
  }

  let n = 1;
  while (titles.has(`${DEFAULT_NEW_FOLDER_TITLE} ${n}`)) {
    n += 1;
  }
  return `${DEFAULT_NEW_FOLDER_TITLE} ${n}`;
}

/** 기본 폴더명 패턴이 형제와 겹치면 사용 가능한 번호로 바꿈 */
export function ensureUniqueDefaultFolderTitle(
  siblings: Pick<Category, 'title'>[],
  title: string,
): string {
  const titles = new Set(siblings.map((c) => c.title));
  if (!titles.has(title)) return title;
  if (!isDefaultFolderTitle(title)) return title;
  return resolveNextDefaultFolderTitle(siblings);
}

export async function getInboxCategory(): Promise<Category | undefined> {
  const roots = await getChildCategories(null);
  const inbox = roots.find((c) => c.title === INBOX_TITLE);
  if (inbox) return inbox;

  const legacy = roots.find((c) => LEGACY_INBOX_TITLES.includes(c.title));
  if (legacy) {
    await updateCategoryTitle(legacy.id, INBOX_TITLE);
    return { ...legacy, title: INBOX_TITLE, updatedAt: Date.now() };
  }

  return undefined;
}

/** 드롭 임포트용 — 없으면 루트에 인박스 폴더 생성 */
export async function getOrCreateInboxCategory(): Promise<Category> {
  const existing = await getInboxCategory();
  if (existing) return existing;
  return createCategory(null, INBOX_TITLE);
}

export async function moveLink(linkId: string, newCategoryId: string): Promise<void> {
  await db.links.update(linkId, {
    categoryId: newCategoryId,
    updatedAt: Date.now(),
  });
}

export async function moveLinks(linkIds: string[], newCategoryId: string): Promise<void> {
  if (linkIds.length === 0) return;
  const now = Date.now();
  await Promise.all(
    linkIds.map((id) =>
      db.links.update(id, {
        categoryId: newCategoryId,
        updatedAt: now,
      }),
    ),
  );
}

/** 최초 실행 — 빈 DB 유지 (폴더·링크 없음) */
export async function seedIfEmpty(): Promise<void> {
  return;
}

// ── 백업/복원 ─────────────────────────────────────────
// 백업 파일 포맷 버전. 나중에 스키마가 바뀌면 올려서 마이그레이션 분기 가능.
const BACKUP_VERSION = 1;

// 내보내기/가져오기로 주고받는 JSON 한 덩어리의 형태.
// app 필드로 "이게 LinkPortal 백업인지" 검증한다.
export interface BackupPayload {
  app: 'LinkPortal';
  version: number;
  exportedAt: number;
  categories: Category[];
  links: LinkItem[];
}

// 현재 DB의 폴더·링크를 통째로 읽어 백업 객체로 반환.
// categories와 links를 Promise.all로 동시에 읽어 약간 더 빠르게.
export async function exportData(): Promise<BackupPayload> {
  const [categories, links] = await Promise.all([
    db.categories.toArray(),
    db.links.toArray(),
  ]);
  return { app: 'LinkPortal', version: BACKUP_VERSION, exportedAt: Date.now(), categories, links };
}

// replace = 기존 전부 지우고 백업으로 교체 / merge = 기존 유지하고 얹기(같은 id는 갱신)
export type ImportMode = 'replace' | 'merge';

export async function importData(
  payload: BackupPayload,
  mode: ImportMode = 'merge',
): Promise<void> {
  // 잘못된/남의 JSON을 그대로 밀어넣어 DB가 깨지는 걸 막는 최소 검증.
  if (
    payload?.app !== 'LinkPortal' ||
    !Array.isArray(payload.categories) ||
    !Array.isArray(payload.links)
  ) {
    throw new Error('유효하지 않은 백업 파일입니다.');
  }
  // 트랜잭션으로 묶어 도중 실패 시 전체 롤백 → 반쯤 적용된 깨진 상태 방지.
  await db.transaction('rw', db.categories, db.links, async () => {
    if (mode === 'replace') {
      await db.categories.clear();
      await db.links.clear();
    }
    // bulkPut: id가 같으면 덮어쓰고, 없으면 새로 추가.
    await db.categories.bulkPut(payload.categories);
    await db.links.bulkPut(payload.links);
  });
}
