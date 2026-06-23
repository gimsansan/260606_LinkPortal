import type { LinkItem } from '../types';
import { launchUrl } from '../services/url';

interface LinkCardProps {
  link: LinkItem;
  onDelete?: (id: string) => void;
  onEdit?: (link: LinkItem) => void;
  onMove?: (link: LinkItem) => void;
}

export function LinkCard({ link, onDelete, onEdit, onMove }: LinkCardProps) {
  const isAuto = link.source === 'auto';

  return (
    <article
      className={`link-card ${isAuto ? 'link-card--auto' : 'link-card--manual'}`}
      onClick={() => launchUrl(link.url)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && launchUrl(link.url)}
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
        {!isAuto && <span className="link-card__badge">수제</span>}
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
          aria-label="카테고리로 이동"
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
