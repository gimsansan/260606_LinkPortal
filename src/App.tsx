import { useState, useEffect, useCallback } from 'react';
import type { LinkItem } from './types';
import {
  seedIfEmpty,
  createCategory,
  createLink,
  deleteLink,
  deleteCategory,
  updateCategoryTitle,
  moveCategory,
  moveLink,
  updateLink,
  getAllCategories,
  getCategory,
  getOrCreateInboxCategory,
} from './db';
import { useCategories } from './hooks/useCategories';
import { useLinks } from './hooks/useLinks';
import { useIsDesktop } from './hooks/useMediaQuery';
import { fetchLinkMetadata } from './services/metadata';
import { isValidUrl, getFaviconUrl } from './services/url';
import { RadialBubbleView } from './components/RadialBubbleView';
import { TreeView } from './components/TreeView';
import { LinkCardList } from './components/LinkCardList';
import { EmptyDropPanel } from './components/EmptyDropPanel';
import {
  InputModal,
  AddLinkModal,
  EditLinkModal,
  MoveCategoryModal,
  MoveLinkModal,
  ConfirmModal,
  type AddLinkOptions,
} from './components/InputModal';

type Screen = 'categories' | 'links';

type ModalState =
  | { type: 'add-category' }
  | { type: 'add-link' }
  | { type: 'edit-category'; id: string; title: string }
  | { type: 'move-category'; id: string }
  | { type: 'move-link'; link: LinkItem }
  | { type: 'edit-link'; link: LinkItem }
  | { type: 'confirm-delete-category'; id: string; title: string }
  | null;

export function App() {
  const isDesktop = useIsDesktop();
  const [ready, setReady] = useState(false);
  const [navStack, setNavStack] = useState<string[]>([]);
  const [screen, setScreen] = useState<Screen>('categories');
  const [allCategories, setAllCategories] = useState<Awaited<ReturnType<typeof getAllCategories>>>([]);

  const currentParentId = navStack.length > 0 ? navStack[navStack.length - 1] : null;
  const { categories, current, refresh: refreshCategories } = useCategories(currentParentId);
  const activeCategoryId = current?.id ?? currentParentId;
  const { links, refresh: refreshLinks } = useLinks(activeCategoryId);

  const [modal, setModal] = useState<ModalState>(null);
  const [addCategoryParentId, setAddCategoryParentId] = useState<string | null | undefined>(
    undefined,
  );

  useEffect(() => {
    seedIfEmpty().then(() => setReady(true));
  }, []);

  const refreshAll = useCallback(async () => {
    await refreshCategories();
    await refreshLinks();
    const all = await getAllCategories();
    setAllCategories(all);
    const validIds = new Set(all.map((c) => c.id));
    setNavStack((s) => s.filter((id) => validIds.has(id)));
  }, [refreshCategories, refreshLinks]);

  useEffect(() => {
    if (ready) refreshAll();
  }, [ready, currentParentId, refreshAll]);

  const centerTitle = current?.title ?? (navStack.length === 0 ? '카테고리' : 'Topic');

  const selectCategoryById = async (id: string) => {
    const path: string[] = [];
    let cat = await getCategory(id);
    while (cat) {
      path.unshift(cat.id);
      cat = cat.parentId ? await getCategory(cat.parentId) : undefined;
    }
    setNavStack(path);
  };

  const resolveImportCategoryId = async (): Promise<string> => {
    if (activeCategoryId) return activeCategoryId;
    const inbox = await getOrCreateInboxCategory();
    return inbox.id;
  };

  const drillDown = (categoryId: string) => {
    setNavStack((s) => [...s, categoryId]);
    setScreen('categories');
  };

  const goBack = () => {
    if (screen === 'links') {
      setScreen('categories');
      return;
    }
    if (navStack.length > 0) {
      setNavStack((s) => s.slice(0, -1));
    }
  };

  const handleAddCategory = async (title: string) => {
    const parentId = addCategoryParentId !== undefined ? addCategoryParentId : currentParentId;
    const cat = await createCategory(parentId, title);
    await refreshAll();

    const path: string[] = [];
    let c: Awaited<ReturnType<typeof getCategory>> = cat;
    while (c) {
      path.unshift(c.id);
      c = c.parentId ? await getCategory(c.parentId) : undefined;
    }
    if (isDesktop) {
      setNavStack(path);
    } else if (parentId === currentParentId) {
      setNavStack((s) => [...s, cat.id]);
    }
    setAddCategoryParentId(undefined);
  };

  const openAddCategory = (parentId?: string | null) => {
    setAddCategoryParentId(parentId);
    setModal({ type: 'add-category' });
  };

  const closeAddCategoryModal = () => {
    setModal(null);
    setAddCategoryParentId(undefined);
  };

  const addLinkToCategory = async (
    categoryId: string,
    url: string,
    options?: AddLinkOptions,
  ) => {
    if (!isValidUrl(url)) return;

    const titleOverride = options?.titleOverride?.trim();
    const forceManual = options?.forceManual;

    if (forceManual) {
      await createLink(categoryId, {
        url,
        title: titleOverride || url,
        source: 'manual',
        faviconUrl: getFaviconUrl(url),
      });
      return;
    }

    if (titleOverride) {
      const meta = await fetchLinkMetadata(url);
      const hasRichMeta = meta.imageUrl != null;
      await createLink(categoryId, {
        url,
        title: titleOverride,
        imageUrl: meta.imageUrl,
        faviconUrl: meta.faviconUrl ?? getFaviconUrl(url),
        source: hasRichMeta ? 'auto' : 'manual',
      });
      return;
    }

    const meta = await fetchLinkMetadata(url);
    const hasRichMeta = meta.imageUrl != null;
    await createLink(categoryId, {
      url,
      title: meta.title,
      imageUrl: meta.imageUrl,
      faviconUrl: meta.faviconUrl,
      source: hasRichMeta ? 'auto' : 'manual',
    });
  };

  const handleAddLink = async (url: string, options?: AddLinkOptions) => {
    const categoryId = await resolveImportCategoryId();
    await addLinkToCategory(categoryId, url, options);
    await selectCategoryById(categoryId);
    await refreshAll();
  };

  const handleDropImport = async (items: { url: string; title?: string }[]) => {
    if (items.length === 0) return;
    const categoryId = await resolveImportCategoryId();
    for (const item of items) {
      await addLinkToCategory(categoryId, item.url, {
        titleOverride: item.title,
      });
    }
    await selectCategoryById(categoryId);
    await refreshAll();
  };

  const handleDeleteLink = async (id: string) => {
    await deleteLink(id);
    await refreshAll();
  };

  const handleEditLink = async (url: string, title: string) => {
    if (modal?.type !== 'edit-link' || !isValidUrl(url)) return;
    await updateLink(modal.link.id, {
      url,
      title,
      faviconUrl: getFaviconUrl(url),
    });
    setModal(null);
    await refreshAll();
  };

  const handleMoveLink = async (categoryId: string) => {
    if (modal?.type !== 'move-link') return;
    await moveLink(modal.link.id, categoryId);
    setModal(null);
    await selectCategoryById(categoryId);
    await refreshAll();
  };

  const handleRenameCategory = async (title: string) => {
    if (modal?.type !== 'edit-category') return;
    await updateCategoryTitle(modal.id, title);
    setModal(null);
    await refreshAll();
  };

  const handleMoveCategory = async (newParentId: string | null) => {
    if (modal?.type !== 'move-category') return;
    await moveCategory(modal.id, newParentId);
    setModal(null);
    await refreshAll();
  };

  const handleConfirmDeleteCategory = async () => {
    if (modal?.type !== 'confirm-delete-category') return;
    await deleteCategory(modal.id);
    setModal(null);
    await refreshAll();
  };

  const handleTreeSelect = async (id: string) => {
    await selectCategoryById(id);
  };

  if (!ready) {
    return <div className="app-loading">로딩 중…</div>;
  }

  const moveCategoryData =
    modal?.type === 'move-category'
      ? allCategories.find((c) => c.id === modal.id)
      : undefined;

  const emptyMainMessage =
    '카테고리를 선택하거나 + 로 추가하세요. .url 파일을 여기에 놓으면 미분류에 등록됩니다.';

  // 웹(≥768px): TreeView + LinkCardList. 모바일: RadialBubbleView drill-down.
  return (
    <div className={`app ${isDesktop ? 'app--tree-layout' : ''}`}>
      {isDesktop && (
        <header className="app-header">
          <h1 className="app-header__logo">LinkPortal</h1>
        </header>
      )}

      <div className="app-body">
        {isDesktop && (
          <TreeView
            categories={allCategories}
            selectedId={activeCategoryId ?? null}
            onSelect={handleTreeSelect}
            onAddRoot={() => openAddCategory(null)}
            onAddChild={(parentId) => openAddCategory(parentId)}
            onRename={(id, title) => setModal({ type: 'edit-category', id, title })}
            onMove={(id) => setModal({ type: 'move-category', id })}
            onDelete={(id) => {
              const cat = allCategories.find((c) => c.id === id);
              if (cat) setModal({ type: 'confirm-delete-category', id, title: cat.title });
            }}
            onDropImport={handleDropImport}
          />
        )}

        <main className="app-main">
          {isDesktop ? (
            activeCategoryId ? (
              <LinkCardList
                links={links}
                categoryTitle={centerTitle}
                onAddLink={() => setModal({ type: 'add-link' })}
                onDeleteLink={handleDeleteLink}
                onEditLink={(link) => setModal({ type: 'edit-link', link })}
                onMoveLink={(link) => setModal({ type: 'move-link', link })}
                onDropImport={handleDropImport}
              />
            ) : (
              <EmptyDropPanel message={emptyMainMessage} onDropImport={handleDropImport} />
            )
          ) : screen === 'links' && activeCategoryId ? (
            <LinkCardList
              links={links}
              categoryTitle={centerTitle}
              onBack={goBack}
              onAddLink={() => setModal({ type: 'add-link' })}
              onDeleteLink={handleDeleteLink}
              onEditLink={(link) => setModal({ type: 'edit-link', link })}
              onMoveLink={(link) => setModal({ type: 'move-link', link })}
              onDropImport={handleDropImport}
            />
          ) : (
            <RadialBubbleView
              centerTitle={centerTitle}
              categories={categories}
              linkCount={links.length}
              canGoBack={navStack.length > 0}
              onSelectCategory={drillDown}
              onViewLinks={() => setScreen('links')}
              onBack={goBack}
              onAddCategory={() => openAddCategory()}
              onDropImport={handleDropImport}
            />
          )}
        </main>
      </div>

      {modal?.type === 'add-category' && (
        <InputModal
          title="카테고리 추가"
          placeholder="카테고리 이름"
          submitLabel="추가"
          onSubmit={handleAddCategory}
          onClose={closeAddCategoryModal}
        />
      )}
      {modal?.type === 'edit-category' && (
        <InputModal
          title="카테고리 이름 변경"
          placeholder="카테고리 이름"
          submitLabel="저장"
          initialValue={modal.title}
          onSubmit={handleRenameCategory}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'add-link' && (
        <AddLinkModal onSubmit={handleAddLink} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit-link' && (
        <EditLinkModal
          link={modal.link}
          onSubmit={handleEditLink}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'move-link' && (
        <MoveLinkModal
          link={modal.link}
          categories={allCategories}
          onSubmit={handleMoveLink}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'move-category' && moveCategoryData && (
        <MoveCategoryModal
          category={moveCategoryData}
          categories={allCategories}
          onSubmit={handleMoveCategory}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'confirm-delete-category' && (
        <ConfirmModal
          title="카테고리 삭제"
          message={`"${modal.title}"와 하위 항목·링크가 모두 삭제됩니다.`}
          onConfirm={handleConfirmDeleteCategory}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
