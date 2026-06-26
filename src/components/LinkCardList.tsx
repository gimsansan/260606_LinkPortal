import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { LinkItem } from '../types';
import { LinkCard } from './LinkCard';
import './link-list-panel.css';

type SortKey = 'newest' | 'title';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: '최근 추가순' },
  { key: 'title', label: '이름순' },
];

const PAGE_SIZE = 12;

interface LinkCardListProps {
  links: LinkItem[];
  categoryTitle: string;
  onAddLink: () => void;
  onDeleteLink: (id: string) => void;
  onDeletePageLinks?: (ids: string[]) => void;
  onEditLink?: (link: LinkItem) => void;
  onMoveLink?: (link: LinkItem) => void;
  onPlayVideo?: (link: LinkItem) => void;
  onBack?: () => void;
  instantDelete?: boolean;
  onInstantDeleteChange?: (enabled: boolean) => void;
}

interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function sortLinks(links: LinkItem[], sortKey: SortKey): LinkItem[] {
  const sorted = [...links];
  switch (sortKey) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    case 'newest':
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    default:
      return sorted;
  }
}

function rectsIntersect(a: DOMRect, b: MarqueeRect): boolean {
  return !(
    a.right < b.x ||
    a.left > b.x + b.width ||
    a.bottom < b.y ||
    a.top > b.y + b.height
  );
}

export function LinkCardList({
  links,
  categoryTitle,
  onBack,
  onAddLink,
  onDeleteLink,
  onDeletePageLinks,
  onEditLink,
  onMoveLink,
  onPlayVideo,
  instantDelete = false,
  onInstantDeleteChange,
}: LinkCardListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);

  const selectAreaRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeActiveRef = useRef(false);
  const suppressCardClickRef = useRef(false);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    if (selectedIds.size === 0) return;

    const onPointerDown = (e: PointerEvent) => {
      if (marqueeActiveRef.current) return;
      const root = listRef.current;
      if (!root || root.contains(e.target as Node)) return;
      clearSelection();
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [selectedIds.size, clearSelection]);

  const sorted = useMemo(() => sortLinks(links, sortKey), [links, sortKey]);
  const filteredLinks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return sorted;

    return sorted.filter((link) =>
      [link.title, link.authorName, link.url].some((field) =>
        field?.toLowerCase().includes(q),
      ),
    );
  }, [sorted, query]);

  const totalPages = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filteredLinks.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const hasQuery = query.trim().length > 0;
  let countLabel = `${links.length}개 항목`;
  if (hasQuery) {
    countLabel = `${filteredLinks.length} / ${links.length}개 항목`;
  }
  if (selectedIds.size > 0) {
    countLabel = `${selectedIds.size}개 선택 · ${filteredLinks.length}개 항목`;
  }

  useEffect(() => {
    setPage(0);
  }, [query]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [safePage, sortKey, categoryTitle, query]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const linkIds = new Set(filteredLinks.map((l) => l.id));
      const next = new Set([...prev].filter((id) => linkIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredLinks]);

  const registerCardRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  const updateMarqueeSelection = useCallback((rect: MarqueeRect) => {
    const next = new Set<string>();
    for (const link of paged) {
      const el = cardRefs.current.get(link.id);
      if (el && rectsIntersect(el.getBoundingClientRect(), rect)) {
        next.add(link.id);
      }
    }
    setSelectedIds(next);
  }, [paged]);

  const handleSelectPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest('.link-card__move, .link-card__edit, .link-card__delete')) return;
    if (target.closest('.link-card')) return;

    e.preventDefault();
    marqueeActiveRef.current = true;
    marqueeStartRef.current = { x: e.clientX, y: e.clientY };
    setMarqueeRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSelectPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!marqueeActiveRef.current || !marqueeStartRef.current) return;

    const start = marqueeStartRef.current;
    const x = Math.min(start.x, e.clientX);
    const y = Math.min(start.y, e.clientY);
    const width = Math.abs(e.clientX - start.x);
    const height = Math.abs(e.clientY - start.y);
    const rect = { x, y, width, height };

    setMarqueeRect(rect);
    updateMarqueeSelection(rect);
  };

  const finishMarquee = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!marqueeActiveRef.current) return;

    const start = marqueeStartRef.current;
    const hadDrag =
      start != null &&
      (Math.abs(e.clientX - start.x) > 3 || Math.abs(e.clientY - start.y) > 3);

    marqueeActiveRef.current = false;
    marqueeStartRef.current = null;
    setMarqueeRect(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (hadDrag) {
      suppressCardClickRef.current = true;
      globalThis.setTimeout(() => {
        suppressCardClickRef.current = false;
      }, 0);
    } else {
      clearSelection();
    }
  };

  const handleListPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || selectedIds.size === 0 || marqueeActiveRef.current) return;

    const target = e.target as HTMLElement;
    if (target.closest('.link-card')) return;
    if (target.closest('.link-list__select-area')) return;
    if (target.closest('button, a')) return;

    clearSelection();
  };

  const handleCardDragStart = (link: LinkItem) => {
    setSelectedIds((prev) => {
      if (prev.has(link.id)) return prev;
      return new Set([link.id]);
    });
  };

  const handleCardDragEnd = () => {
    setSelectedIds(new Set());
  };

  const handleCardToggleSelect = useCallback((link: LinkItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(link.id)) next.delete(link.id);
      else next.add(link.id);
      return next;
    });
  }, []);

  const handleSortChange = (key: SortKey) => {
    setSortKey(key);
    setPage(0);
  };

  const content = (
    <div
      ref={listRef}
      className="link-list"
      onPointerDown={handleListPointerDown}
    >
      <header className="link-list__header">
        {onBack ? (
          <button type="button" className="btn-icon" onClick={onBack} aria-label="뒤로">
            ←
          </button>
        ) : (
          <span className="link-list__spacer" />
        )}
        <h2 className="link-list__title">{categoryTitle}</h2>
        <button type="button" className="btn-icon" onClick={onAddLink} aria-label="링크 추가">
          +
        </button>
      </header>

      {links.length === 0 ? (
        <p className="empty-state">
          아직 저장된 링크가 없어요. + 버튼으로 추가해 보세요.
        </p>
      ) : (
        <div className="link-list__panel">
          <div className="link-list__toolbar">
            <span className="link-list__count">
              {countLabel}
            </span>
            <input
              type="search"
              className="link-list__search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목 · 채널명 · URL 검색"
              aria-label="링크 검색"
            />
            <div className="link-list__toolbar-actions">
              {onInstantDeleteChange && (
                <label className="link-list__instant-delete" title="켜면 확인 없이 바로 삭제">
                  <span className="link-list__instant-delete-label">바로 삭제</span>
                  <input
                    type="checkbox"
                    className="link-list__instant-delete-input"
                    checked={instantDelete}
                    onChange={(e) => onInstantDeleteChange(e.target.checked)}
                  />
                  <span className="link-list__instant-delete-track" aria-hidden="true">
                    <span className="link-list__instant-delete-thumb" />
                  </span>
                </label>
              )}
              {onDeletePageLinks && paged.length > 0 && (
                <button
                  type="button"
                  className="link-list__delete-page-btn"
                  onClick={() => onDeletePageLinks(paged.map((l) => l.id))}
                >
                  현재 페이지 삭제
                </button>
              )}
              <div className="link-list__sort">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`link-list__sort-btn ${sortKey === opt.key ? 'link-list__sort-btn--active' : ''}`}
                    onClick={() => handleSortChange(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            ref={selectAreaRef}
            className={`link-list__select-area${marqueeRect ? ' link-list__select-area--active' : ''}`}
            onPointerDown={handleSelectPointerDown}
            onPointerMove={handleSelectPointerMove}
            onPointerUp={finishMarquee}
            onPointerCancel={finishMarquee}
          >
            {marqueeRect && (
              <div
                className="link-list__marquee"
                style={{
                  left: marqueeRect.x,
                  top: marqueeRect.y,
                  width: marqueeRect.width,
                  height: marqueeRect.height,
                }}
              />
            )}
            {filteredLinks.length === 0 ? (
              <p className="empty-state">검색 결과가 없습니다.</p>
            ) : (
              <div className="link-list__grid">
                {paged.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    selected={selectedIds.has(link.id)}
                    selectedIds={selectedIds}
                    cardRef={(el) => registerCardRef(link.id, el)}
                    onDelete={onDeleteLink}
                    onEdit={onEditLink}
                    onMove={onMoveLink}
                    onPlay={onPlayVideo}
                    onDragStart={handleCardDragStart}
                    onDragEnd={handleCardDragEnd}
                    onToggleSelect={handleCardToggleSelect}
                    shouldSuppressClick={() => suppressCardClickRef.current}
                  />
                ))}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="link-list__pagination">
              <button
                type="button"
                className="link-list__page-btn"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                ‹ 이전
              </button>
              <div className="link-list__page-numbers">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`link-list__page-num ${i === safePage ? 'link-list__page-num--active' : ''}`}
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="link-list__page-btn"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(safePage + 1)}
              >
                다음 ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return content;
}
