import { useEffect, useState } from 'react';
import type { LinkItem } from '../types';
import { launchUrl, extractYouTubeVideoId } from '../services/url';
import { buildLinkDragPayload, LINK_DRAG_TYPE } from '../services/linkDrag';

interface LinkCardProps {
  link: LinkItem;
  selected?: boolean;
  selectedIds?: ReadonlySet<string>;
  onDelete?: (id: string) => void;
  onEdit?: (link: LinkItem) => void;
  onMove?: (link: LinkItem) => void;
  onPlay?: (link: LinkItem) => void;
  onDragStart?: (link: LinkItem) => void;
  onDragEnd?: () => void;
  onToggleSelect?: (link: LinkItem) => void;
  shouldSuppressClick?: () => boolean;
  cardRef?: (el: HTMLElement | null) => void;
}

export function LinkCard({
  link,
  selected = false,
  selectedIds,
  onDelete,
  onEdit,
  onMove,
  onPlay,
  onDragStart,
  onDragEnd,
  onToggleSelect,
  shouldSuppressClick,
  cardRef,
}: LinkCardProps) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const isAuto = link.source === 'auto';
  const isYouTube = !!extractYouTubeVideoId(link.url);

  useEffect(() => {
    setFaviconFailed(false);
  }, [link.faviconUrl]);

  const openLink = () => {
    if (shouldSuppressClick?.()) return;
    if (isYouTube && onPlay) {
      onPlay(link);
    } else {
      launchUrl(link.url);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (shouldSuppressClick?.()) return;
    e.preventDefault();
    onToggleSelect?.(link);
  };

  const handleDragStart = (e: React.DragEvent) => {
    const effectiveSelection =
      selectedIds && selectedIds.has(link.id) && selectedIds.size > 1
        ? selectedIds
        : new Set([link.id]);

    e.dataTransfer.setData(
      LINK_DRAG_TYPE,
      buildLinkDragPayload(link, effectiveSelection),
    );
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(link);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <article
      ref={cardRef}
      className={`link-card ${isAuto ? 'link-card--auto' : 'link-card--manual'}${selected ? ' link-card--selected' : ''}`}
      onClick={handleClick}
      onDoubleClick={openLink}
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onKeyDown={(e) => e.key === 'Enter' && openLink()}
    >
      <div className="link-card__visual">
        {isAuto && link.imageUrl ? (
          <img src={link.imageUrl} alt="" className="link-card__thumb" loading="lazy" />
        ) : (
          <div className="link-card__fallback">
            {link.faviconUrl && !faviconFailed ? (
              <img
                src={link.faviconUrl}
                alt=""
                className="link-card__favicon"
                onError={() => setFaviconFailed(true)}
              />
            ) : (
              <span className="link-card__favicon-placeholder">🔗</span>
            )}
          </div>
        )}
        {isYouTube && <span className="link-card__play-icon">▶</span>}
      </div>
      <h3 className="link-card__title">{link.title}</h3>
      {link.authorName && (
        <p className="link-card__author">{link.authorName}</p>
      )}
      {onMove && (
        <button
          type="button"
          className="link-card__move"
          onClick={(e) => {
            e.stopPropagation();
            onMove(link);
          }}
          aria-label="폴더로 이동"
        >
          ↗
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          className="link-card__edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(link);
          }}
          aria-label="편집"
        >
          ✎
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="link-card__delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(link.id);
          }}
          aria-label="삭제"
        >
          ×
        </button>
      )}
    </article>
  );
}
