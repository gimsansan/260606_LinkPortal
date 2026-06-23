import type { Category } from '../types';
import { LinkDropZone } from './LinkDropZone';

interface DropLinkItem {
  url: string;
  title?: string;
}

interface TreeNodeProps {
  category: Category;
  allCategories: Category[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
}

function TreeNode({
  category,
  allCategories,
  depth,
  selectedId,
  onSelect,
  onAddChild,
  onRename,
  onMove,
  onDelete,
}: TreeNodeProps) {
  const children = allCategories
    .filter((c) => c.parentId === category.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const isSelected = selectedId === category.id;

  return (
    <li className="tree-node">
      <div
        className={`tree-node__row ${isSelected ? 'tree-node__row--selected' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button type="button" className="tree-node__btn" onClick={() => onSelect(category.id)}>
          {category.title}
        </button>
        <div className="tree-node__actions">
          <button
            type="button"
            className="tree-node__action"
            onClick={() => onRename(category.id, category.title)}
            aria-label="이름 변경"
          >
            ✎
          </button>
          <button
            type="button"
            className="tree-node__action"
            onClick={() => onMove(category.id)}
            aria-label="이동"
          >
            ↗
          </button>
          <button
            type="button"
            className="tree-node__action"
            onClick={() => onAddChild(category.id)}
            aria-label="하위 카테고리 추가"
          >
            +
          </button>
          <button
            type="button"
            className="tree-node__action tree-node__action--danger"
            onClick={() => onDelete(category.id)}
            aria-label="삭제"
          >
            ×
          </button>
        </div>
      </div>
      {children.length > 0 && (
        <ul className="tree-node__children">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              category={child}
              allCategories={allCategories}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

interface TreeViewProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddRoot: () => void;
  onAddChild: (parentId: string) => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
  onDropImport?: (items: DropLinkItem[]) => void | Promise<void>;
}

export function TreeView({
  categories,
  selectedId,
  onSelect,
  onAddRoot,
  onAddChild,
  onRename,
  onMove,
  onDelete,
  onDropImport,
}: TreeViewProps) {
  const roots = categories
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const aside = (
    <aside className="tree-view">
      <header className="tree-view__header">
        <h2 className="tree-view__title">카테고리</h2>
        <button type="button" className="btn-icon" onClick={onAddRoot} aria-label="루트 추가">
          +
        </button>
      </header>
      <ul className="tree-view__list">
        {roots.map((root) => (
          <TreeNode
            key={root.id}
            category={root}
            allCategories={categories}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onRename={onRename}
            onMove={onMove}
            onDelete={onDelete}
          />
        ))}
      </ul>
      {roots.length === 0 && (
        <p className="empty-state empty-state--droppable">
          + 로 추가하거나 .url 파일을 여기에 놓으세요.
        </p>
      )}
    </aside>
  );

  if (!onDropImport) return aside;

  return (
    <LinkDropZone enabled onDropLinks={onDropImport} className="tree-view-drop">
      {aside}
    </LinkDropZone>
  );
}
