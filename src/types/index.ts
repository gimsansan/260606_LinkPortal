/** 카테고리 노드 — 무제한 깊이 트리 */
export interface Category {
  id: string;
  parentId: string | null;
  title: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/** 링크 카드 — auto(메타 자동 수집) vs manual(수제 fallback) */
export interface LinkItem {
  id: string;
  categoryId: string;
  url: string;
  title: string;
  imageUrl?: string;
  faviconUrl?: string;
  source: 'auto' | 'manual';
  authorName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LinkMetadata {
  title: string;
  imageUrl?: string;
  faviconUrl?: string;
  authorName?: string;
}
