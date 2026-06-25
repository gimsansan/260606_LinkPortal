import { useState, useMemo } from 'react';
import type { LinkItem } from '../types';
import { LinkCard } from './LinkCard';
import { LinkDropZone } from './LinkDropZone';
import './link-list-panel.css';

interface DropLinkItem {
  url: string;
  title?: string;
}

type SortKey = 'title' | 'newest' | 'oldest';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: '최신순' },
  { key: 'oldest', label: '오래된순' },
  { key: 'title', label: '이름순' },
];

const PAGE_SIZE = 12;

interface LinkCardListProps {
  links: LinkItem[];
  categoryTitle: string;
  onAddLink: () => void;
  onDeleteLink: (id: string) => void;
  onEditLink?: (link: LinkItem) => void;
  onMoveLink?: (link: LinkItem) => void;
  onPlayVideo?: (link: LinkItem) => void;
  onDragStart?: (link: LinkItem) => void;
  onDragEnd?: () => void;
  onDropImport?: (items: DropLinkItem[]) => void | Promise<void>;
  onBack?: () => void;
}

function sortLinks(links: LinkItem[], sortKey: SortKey): LinkItem[] {
  const sorted = [...links];
  switch (sortKey) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    case 'newest':
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    case 'oldest':
      return sorted.sort((a, b) => a.createdAt - b.createdAt);
    default:
      return sorted;
  }
}

export function LinkCardList({
  links,
  categoryTitle,
  onBack,
  onAddLink,
  onDeleteLink,
  onEditLink,
  onMoveLink,
  onPlayVideo,
  onDragStart,
  onDragEnd,
  onDropImport,
}: LinkCardListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => sortLinks(links, sortKey), [links, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const handleSortChange = (key: SortKey) => {
    setSortKey(key);
    setPage(0);
  };

  const content = (
    <div className="link-list">
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
            <span className="link-list__count">{links.length}개 항목</span>
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

          <div className="link-list__grid">
            {paged.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                onDelete={onDeleteLink}
                onEdit={onEditLink}
                onMove={onMoveLink}
                onPlay={onPlayVideo}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
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

  if (!onDropImport) return content;

  return (
    <LinkDropZone enabled onDropLinks={onDropImport}>
      {content}
    </LinkDropZone>
  );
}
