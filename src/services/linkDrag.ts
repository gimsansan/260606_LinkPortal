import type { LinkItem } from '../types';

export const LINK_DRAG_TYPE = 'application/linkportal-link';

export function isLinkDragType(types: readonly string[]): boolean {
  return types.includes(LINK_DRAG_TYPE);
}

export function parseLinkDragPayload(
  data: string,
): { ids: string[]; categoryId: string } | null {
  try {
    const parsed = JSON.parse(data) as {
      id?: string;
      ids?: string[];
      categoryId?: string;
    };
    if (parsed.categoryId && Array.isArray(parsed.ids) && parsed.ids.length > 0) {
      return { ids: parsed.ids, categoryId: parsed.categoryId };
    }
    if (parsed.id && parsed.categoryId) {
      return { ids: [parsed.id], categoryId: parsed.categoryId };
    }
  } catch {
    // linkportal-link 포맷이 아닌 경우 무시
  }
  return null;
}

export function buildLinkDragPayload(link: LinkItem, selectedIds: ReadonlySet<string>): string {
  const ids =
    selectedIds.has(link.id) && selectedIds.size > 1
      ? Array.from(selectedIds)
      : [link.id];

  if (ids.length > 1) {
    return JSON.stringify({ ids, categoryId: link.categoryId });
  }

  return JSON.stringify({
    id: link.id,
    title: link.title,
    categoryId: link.categoryId,
  });
}
