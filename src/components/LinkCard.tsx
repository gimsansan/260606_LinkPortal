import type { LinkItem } from '../types';
import { launchUrl, extractYouTubeVideoId } from '../services/url';

interface LinkCardProps {
  link: LinkItem;
  onDelete?: (id: string) => void;
  onEdit?: (link: LinkItem) => void;
  onMove?: (link: LinkItem) => void;
  onPlay?: (link: LinkItem) => void;
  onDragStart?: (link: LinkItem) => void;
  onDragEnd?: () => void;
}

export function LinkCard({
  link,
  onDelete,
  onEdit,
  onMove,
  onPlay,
  onDragStart,
  onDragEnd,
}: LinkCardProps) {
  const isAuto = link.source === 'auto';
  const isYouTube = !!extractYouTubeVideoId(link.url);

  const handleClick = () => {
    if (isYouTube && onPlay) {
      onPlay(link);
    } else {
      launchUrl(link.url);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/linkportal-link', JSON.stringify({
      id: link.id,
      title: link.title,
      categoryId: link.categoryId,
    }));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(link);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <article
      className={`link-card ${isAuto ? 'link-card--auto' : 'link-card--manual'}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="link-card__visual">
        {isAuto && link.imageUrl ? (
          <img src={link.imageUrl} alt="" className="link-card__thumb" loading="lazy" />
        ) : (
          <div className="link-card__fallback">
            {link.faviconUrl ? (
              <img src={link.faviconUrl} alt="" className="link-card__favicon" />
            ) : (
              <span className="link-card__favicon-placeholder">🔗</span>
            )}
          </div>
        )}
        {isYouTube && <span className="link-card__play-icon">▶</span>}
      </div>
      <h3 className="link-card__title">{link.title}</h3>
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
