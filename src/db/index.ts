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
  data: Pick<LinkItem, 'url' | 'title' | 'imageUrl' | 'faviconUrl' | 'source'>,
): Promise<LinkItem> {
  const now = Date.now();
  const link: LinkItem = {
    id: crypto.randomUUID(),
    categoryId,
    url: data.url,
    title: data.title,
    imageUrl: data.imageUrl,
    faviconUrl: data.faviconUrl,
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
  data: Partial<Pick<LinkItem, 'url' | 'title' | 'imageUrl' | 'faviconUrl' | 'source'>>,
): Promise<void> {
  await db.links.update(id, { ...data, updatedAt: Date.now() });
}

export async function getAllCategories(): Promise<Category[]> {
  return db.categories.toArray();
}

export const INBOX_TITLE = '미분류';

export async function getInboxCategory(): Promise<Category | undefined> {
  const roots = await getChildCategories(null);
  return roots.find((c) => c.title === INBOX_TITLE);
}

/** 드롭 임포트용 — 없으면 루트에 미분류 카테고리 생성 */
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

/** 최초 실행 — 빈 DB 유지 (더미 데이터 없음) */
export async function seedIfEmpty(): Promise<void> {
  return;
}
