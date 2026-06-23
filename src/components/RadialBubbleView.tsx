import type { Category } from '../types';
import { LinkDropZone } from './LinkDropZone';

interface DropLinkItem {
  url: string;
  title?: string;
}

interface RadialBubbleViewProps {
  centerTitle: string;
  categories: Category[];
  linkCount: number;
  canGoBack: boolean;
  onSelectCategory: (id: string) => void;
  onViewLinks: () => void;
  onBack: () => void;
  onAddCategory: () => void;
  onDropImport?: (items: DropLinkItem[]) => void | Promise<void>;
}

const RADIUS = 120;

function polarToCartesian(angleDeg: number, radius: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: radius * Math.cos(rad),
    y: radius * Math.sin(rad),
  };
}

export function RadialBubbleView({
  centerTitle,
  categories,
  linkCount,
  canGoBack,
  onSelectCategory,
  onViewLinks,
  onBack,
  onAddCategory,
  onDropImport,
}: RadialBubbleViewProps) {
  const count = categories.length;
  const angleStep = count > 0 ? 360 / count : 0;

  const view = (
    <div className="radial-view">
      <header className="radial-view__toolbar">
        {canGoBack ? (
          <button type="button" className="btn-icon" onClick={onBack} aria-label="뒤로">
            ←
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="btn-icon" onClick={onAddCategory} aria-label="카테고리 추가">
          +
        </button>
      </header>

      <div className="radial-view__stage">
        <button
          type="button"
          className="bubble bubble--center"
          onClick={linkCount > 0 ? onViewLinks : undefined}
          disabled={linkCount === 0}
        >
          <span className="bubble__label">{centerTitle}</span>
          {linkCount > 0 && (
            <span className="bubble__count">{linkCount} 링크</span>
          )}
        </button>

        {categories.map((cat, i) => {
          const { x, y } = polarToCartesian(i * angleStep, RADIUS);
          return (
            <button
              key={cat.id}
              type="button"
              className="bubble bubble--orbit"
              style={{ transform: `translate(${x}px, ${y}px)` }}
              onClick={() => onSelectCategory(cat.id)}
            >
              <span className="bubble__label">{cat.title}</span>
            </button>
          );
        })}
      </div>

      {count === 0 && linkCount === 0 && (
        <p className="empty-state empty-state--droppable">
          + 로 추가하거나 .url 파일을 여기에 놓으세요.
        </p>
      )}
    </div>
  );

  if (!onDropImport) return view;

  return (
    <LinkDropZone enabled onDropLinks={onDropImport}>
      {view}
    </LinkDropZone>
  );
}
