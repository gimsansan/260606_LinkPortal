import { useState, useEffect } from 'react';
import type { Category, LinkItem } from '../types';
import { db } from '../db';

export interface GlobalSearchResult {
  link: LinkItem;
  folderPath: string;
}

function buildFolderPath(categoryId: string, categories: Category[]): string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const parts: string[] = [];
  let current = byId.get(categoryId);
  while (current) {
    parts.unshift(current.title);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return parts.join(' > ');
}

function matchesQuery(link: LinkItem, query: string): boolean {
  const q = query.toLowerCase();
  return (
    link.title.toLowerCase().includes(q) ||
    link.url.toLowerCase().includes(q) ||
    (link.authorName?.toLowerCase().includes(q) ?? false)
  );
}

export function useGlobalSearch(allCategories: Category[]) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    const timer = globalThis.setTimeout(() => {
      void (async () => {
        const allLinks = await db.links.toArray();
        const matched = allLinks
          .filter((link) => matchesQuery(link, trimmed))
          .slice(0, 20)
          .map((link) => ({
            link,
            folderPath: buildFolderPath(link.categoryId, allCategories),
          }));
        setResults(matched);
      })();
    }, 300);

    return () => globalThis.clearTimeout(timer);
  }, [query, allCategories]);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  return { query, setQuery, results, clearSearch };
}
