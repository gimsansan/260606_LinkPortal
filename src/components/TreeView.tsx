import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { Category } from '../types';
import { isLinkDragType, LINK_DRAG_TYPE } from '../services/linkDrag';

function isLinkDrag(e: DragEvent): boolean {
  return isLinkDragType(e.dataTransfer.types);
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <span className="tree-node__folder" aria-hidden="true">
      {open ? (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6l1.5 1.5H13.5A1 1 0 0 1 14.5 5v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-8z" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M2 3.5A1 1 0 0 1 3 2.5h3.172a1 1 0 0 1 .707.293L7.5 4H13a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8z" />
        </svg>
      )}
    </span>
  );
}

interface TreeNodeMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: () => void;
  onAddChild: () => void;
  onDelete: () => void;
}

function TreeNodeMenu({ isOpen, onOpenChange, onMove, onAddChild, onDelete }: TreeNodeMenuProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };

    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [isOpen, onOpenChange]);

  const run = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <div
      ref={wrapRef}
      className={`tree-node__menu-wrap${isOpen ? ' tree-node__menu-wrap--open' : ''}`}
    >
      <button
        type="button"
        className="tree-node__more"
        onClick={() => onOpenChange(!isOpen)}
        aria-label="더보기"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        ⋯
      </button>
      {isOpen && (
        <div className="tree-node__menu" role="menu">
          <button
            type="button"
            className="tree-node__menu-item tree-node__menu-item--move"
            role="menuitem"
            onClick={() => run(onMove)}
          >
            <span className="tree-node__menu-emoji" aria-hidden="true">↗</span>
            <span className="tree-node__menu-label">이동</span>
          </button>
          <button
            type="button"
            className="tree-node__menu-item"
            role="menuitem"
            onClick={() => run(onAddChild)}
          >
            <span className="tree-node__menu-emoji" aria-hidden="true">📁</span>
            <span className="tree-node__menu-label">하위 폴더 추가</span>
          </button>
          <div className="tree-node__menu-divider" role="separator" />
          <button
            type="button"
            className="tree-node__menu-item tree-node__menu-item--danger"
            role="menuitem"
            onClick={() => run(onDelete)}
          >
            <span className="tree-node__menu-emoji" aria-hidden="true">❌</span>
            <span className="tree-node__menu-label">삭제</span>
          </button>
        </div>
      )}
    </div>
  );
}

interface TreeNodeProps {
  category: Category;
  allCategories: Category[];
  selectedId: string | null;
  openMenuId: string | null;
  onMenuOpenChange: (id: string | null) => void;
  isNested?: boolean;
  isLastChild?: boolean;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
  onLinkDrop?: (categoryId: string, data: string) => void;
}

function TreeNode({
  category,
  allCategories,
  selectedId,
  openMenuId,
  onMenuOpenChange,
  isNested = false,
  isLastChild = false,
  onSelect,
  onAddChild,
  onRename,
  onMove,
  onDelete,
  onLinkDrop,
}: TreeNodeProps) {
  const children = allCategories
    .filter((c) => c.parentId === category.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === category.id;
  const isMenuOpen = openMenuId === category.id;
  const [expanded, setExpanded] = useState(true);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const handleDragOver = (e: DragEvent) => {
    if (!onLinkDrop || !isLinkDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDropTarget(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    if (!onLinkDrop) return;
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDropTarget(false);
  };

  const handleDrop = (e: DragEvent) => {
    if (!onLinkDrop || !isLinkDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDropTarget(false);
    const data = e.dataTransfer.getData(LINK_DRAG_TYPE);
    if (data) onLinkDrop(category.id, data);
  };

  return (
    <li
      className={`tree-node${isNested ? ' tree-node--nested' : ''}${isLastChild ? ' tree-node--last' : ''}`}
    >
      <div
        className={`tree-node__row ${isSelected ? 'tree-node__row--selected' : ''}${isMenuOpen ? ' tree-node__row--menu-open' : ''}${isDropTarget ? ' tree-node--drop-target' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <button
          type="button"
          className={`tree-node__toggle ${hasChildren ? '' : 'tree-node__toggle--leaf'}`}
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? '접기' : '펼치기'}
          aria-expanded={hasChildren ? expanded : undefined}
          disabled={!hasChildren}
        >
          {hasChildren && (
            <span
              className={`tree-node__chevron ${expanded ? 'tree-node__chevron--open' : ''}`}
            />
          )}
        </button>
        <FolderIcon open={hasChildren && expanded} />
        <button
          type="button"
          className="tree-node__btn"
          onClick={() => onSelect(category.id)}
          onDoubleClick={() => onRename(category.id, category.title)}
          title="더블클릭하여 이름 변경"
        >
          {category.title}
        </button>
        <div className={`tree-node__actions${isMenuOpen ? ' tree-node__actions--open' : ''}`}>
          <TreeNodeMenu
            isOpen={isMenuOpen}
            onOpenChange={(open) => onMenuOpenChange(open ? category.id : null)}
            onMove={() => onMove(category.id)}
            onAddChild={() => onAddChild(category.id)}
            onDelete={() => onDelete(category.id)}
          />
        </div>
      </div>
      {hasChildren && expanded && (
        <ul className="tree-node__children">
          {children.map((child, index) => (
            <TreeNode
              key={child.id}
              category={child}
              allCategories={allCategories}
              selectedId={selectedId}
              openMenuId={openMenuId}
              onMenuOpenChange={onMenuOpenChange}
              isNested
              isLastChild={index === children.length - 1}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
              onLinkDrop={onLinkDrop}
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
  onLinkDrop?: (categoryId: string, data: string) => void;
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
  onLinkDrop,
}: TreeViewProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const roots = categories
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const aside = (
    <aside className="tree-view">
      <header className="tree-view__header">
        <h2 className="tree-view__title">폴더</h2>
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
            selectedId={selectedId}
            openMenuId={openMenuId}
            onMenuOpenChange={setOpenMenuId}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onRename={onRename}
            onMove={onMove}
            onDelete={onDelete}
            onLinkDrop={onLinkDrop}
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

  return aside;
}
