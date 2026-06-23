import type { LinkItem } from '../types';
import { LinkCard } from './LinkCard';
import { LinkDropZone } from './LinkDropZone';

interface DropLinkItem {
  url: string;
  title?: string;
}

interface LinkCardListProps {
  links: LinkItem[];
  categoryTitle: string;
  onAddLink: () => void;
  onDeleteLink: (id: string) => void;
  onEditLink?: (link: LinkItem) => void;
  onMoveLink?: (link: LinkItem) => void;
  onDropImport?: (items: DropLinkItem[]) => void | Promise<void>;
  onBack?: () => void;
}

export function LinkCardList({
  links,
  categoryTitle,
  onBack,
  onAddLink,
  onDeleteLink,
  onEditLink,
  onMoveLink,
  onDropImport,
}: LinkCardListProps) {
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
          링크가 없습니다. + 버튼으로 추가하거나 .url 파일을 여기에 놓으세요.
        </p>
      ) : (
        <div className="link-list__grid">
          {links.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              onDelete={onDeleteLink}
              onEdit={onEditLink}
              onMove={onMoveLink}
            />
          ))}
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
