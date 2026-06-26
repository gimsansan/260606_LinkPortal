import { useState, useEffect, useCallback, useMemo } from 'react';
import type { LinkItem } from './types';
import {
  seedIfEmpty,
  createCategory,
  createLink,
  deleteLink,
  deleteLinks,
  deleteCategory,
  updateCategoryTitle,
  moveCategory,
  moveLink,
  moveLinks,
  updateLink,
  getAllCategories,
  getCategory,
  getInboxCategory,
  getLinksByCategory,
  getOrCreateInboxCategory,
  DEFAULT_NEW_FOLDER_TITLE,
  resolveNextDefaultFolderTitle,
  ensureUniqueDefaultFolderTitle,
} from './db';
import { useCategories } from './hooks/useCategories';
import { useLinks } from './hooks/useLinks';
import { useTheme } from './hooks/useTheme';
import { useInstantDelete } from './hooks/useInstantDelete';
import { useToast } from './hooks/useToast';
import { parseLinkDragPayload } from './services/linkDrag';
import { recordInboxOrganize } from './services/missions';
import { fetchLinkMetadata } from './services/metadata';
import { isValidUrl, getFaviconUrl, extractYouTubeVideoId } from './services/url';
import { TreeView } from './components/TreeView';
import { LinkCardList } from './components/LinkCardList';
import { EmptyDropPanel } from './components/EmptyDropPanel';
import { LinkDropZone } from './components/LinkDropZone';
import { YouTubePlayer } from './components/YouTubePlayer';
import { ThemeToggle } from './components/ThemeToggle';
import { Toast } from './components/Toast';
import './components/drag-interactions.css';
import {
  InputModal,
  AddLinkModal,
  EditLinkModal,
  MoveCategoryModal,
  MoveLinkModal,
  ConfirmModal,
  type AddLinkOptions,
} from './components/InputModal';

type ModalState =
  | { type: 'add-category' }
  | { type: 'add-link' }
  | { type: 'edit-category'; id: string; title: string }
  | { type: 'move-category'; id: string }
  | { type: 'move-link'; link: LinkItem }
  | { type: 'edit-link'; link: LinkItem }
  | { type: 'confirm-delete-category'; id: string; title: string }
  | { type: 'confirm-delete-link'; id: string; title: string }
  | { type: 'confirm-delete-page-links'; ids: string[]; count: number }
  | null;

export function App() {
  const { theme, cycleTheme } = useTheme();
  const { instantDelete, setInstantDelete } = useInstantDelete();
  const { toast, showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [navStack, setNavStack] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<Awaited<ReturnType<typeof getAllCategories>>>([]);

  const currentParentId = navStack.at(-1) ?? null;
  const { current, refresh: refreshCategories } = useCategories(currentParentId);
  const activeCategoryId = current?.id ?? currentParentId;
  const { links, refresh: refreshLinks } = useLinks(activeCategoryId);

  const [modal, setModal] = useState<ModalState>(null);
  const [addCategoryParentId, setAddCategoryParentId] = useState<string | null | undefined>(
    undefined,
  );

  const [playingLink, setPlayingLink] = useState<LinkItem | null>(null);

  const youtubePlaylist = useMemo(
    () => links.filter((l) => !!extractYouTubeVideoId(l.url)),
    [links],
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

  const showOrganizeFeedback = useCallback(
    async (movedCount: number, inboxId: string) => {
      const inboxLinks = await getLinksByCategory(inboxId);
      const inboxEmpty = inboxLinks.length === 0;
      recordInboxOrganize(movedCount);

      showToast('정리 완료!', 1000);
      if (inboxEmpty) {
        showToast('🧺 바구니 클리어', 2200, 'mission');
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (ready) refreshAll();
  }, [ready, currentParentId, refreshAll]);

  const centerTitle = current?.title ?? (navStack.length === 0 ? '폴더' : 'Topic');

  const selectCategoryById = useCallback(async (id: string) => {
    const path: string[] = [];
    let cat = await getCategory(id);
    while (cat) {
      path.unshift(cat.id);
      cat = cat.parentId ? await getCategory(cat.parentId) : undefined;
    }
    setNavStack(path);
  }, []);

  useEffect(() => {
    if (!ready || navStack.length > 0 || allCategories.length === 0) return;

    let cancelled = false;
    (async () => {
      const inbox = await getInboxCategory();
      const roots = allCategories
        .filter((c) => c.parentId === null)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const targetId = inbox?.id ?? roots[0]?.id;
      if (!targetId || cancelled) return;
      await selectCategoryById(targetId);
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, navStack.length, allCategories, selectCategoryById]);

  const resolveImportCategoryId = async (): Promise<string> => {
    if (activeCategoryId) return activeCategoryId;
    const inbox = await getOrCreateInboxCategory();
    return inbox.id;
  };

  const handleAddCategory = async (title: string) => {
    const parentId = addCategoryParentId === undefined ? currentParentId : addCategoryParentId;
    const siblings = allCategories.filter((c) => c.parentId === parentId);
    const resolvedTitle = ensureUniqueDefaultFolderTitle(siblings, title.trim());
    const cat = await createCategory(parentId, resolvedTitle);
    await refreshAll();

    const path: string[] = [];
    let c: Awaited<ReturnType<typeof getCategory>> = cat;
    while (c) {
      path.unshift(c.id);
      c = c.parentId ? await getCategory(c.parentId) : undefined;
    }
    setNavStack(path);
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
        authorName: meta.authorName,
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
      authorName: meta.authorName,
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

  const executeDeleteLinks = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      if (ids.length === 1) {
        await deleteLink(ids[0]);
      } else {
        await deleteLinks(ids);
      }
      await refreshAll();
    },
    [refreshAll],
  );

  const handleRequestDeleteLink = (id: string) => {
    if (instantDelete) {
      void executeDeleteLinks([id]);
      return;
    }
    const link = links.find((l) => l.id === id);
    if (link) setModal({ type: 'confirm-delete-link', id, title: link.title });
  };

  const handleConfirmDeleteLink = async () => {
    if (modal?.type !== 'confirm-delete-link') return;
    await executeDeleteLinks([modal.id]);
    setModal(null);
  };

  const handleRequestDeletePageLinks = (ids: string[]) => {
    if (ids.length === 0) return;
    if (instantDelete) {
      void executeDeleteLinks(ids);
      return;
    }
    setModal({ type: 'confirm-delete-page-links', ids, count: ids.length });
  };

  const handleConfirmDeletePageLinks = async () => {
    if (modal?.type !== 'confirm-delete-page-links') return;
    await executeDeleteLinks(modal.ids);
    setModal(null);
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
    const link = modal.link;
    const inbox = await getInboxCategory();
    const isOrganize = inbox
      ? link.categoryId === inbox.id && categoryId !== inbox.id
      : false;

    await moveLink(link.id, categoryId);
    setModal(null);
    await selectCategoryById(categoryId);
    await refreshAll();

    if (isOrganize && inbox) {
      await showOrganizeFeedback(1, inbox.id);
    }
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

  const handlePlayVideo = useCallback((link: LinkItem) => {
    setPlayingLink(link);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayingLink(null);
  }, []);

  const handleTreeLinkDrop = useCallback(async (categoryId: string, data: string) => {
    const payload = parseLinkDragPayload(data);
    if (!payload) return;

    const inbox = await getInboxCategory();
    const isOrganize = inbox
      ? payload.categoryId === inbox.id && categoryId !== inbox.id
      : false;

    await moveLinks(payload.ids, categoryId);
    await refreshAll();

    if (isOrganize && inbox) {
      await showOrganizeFeedback(payload.ids.length, inbox.id);
    }
  }, [refreshAll, showOrganizeFeedback]);

  const nextDefaultFolderTitle = useMemo(() => {
    if (modal?.type === 'add-category') {
      const parentId = addCategoryParentId === undefined ? currentParentId : addCategoryParentId;
      const siblings = allCategories.filter((c) => c.parentId === parentId);
      return resolveNextDefaultFolderTitle(siblings);
    }
    return DEFAULT_NEW_FOLDER_TITLE;
  }, [modal, addCategoryParentId, currentParentId, allCategories]);

  if (!ready) {
    return <div className="app-loading">로딩 중…</div>;
  }

  const moveCategoryData =
    modal?.type === 'move-category'
      ? allCategories.find((c) => c.id === modal.id)
      : undefined;

  const emptyMainMessage =
    '왼쪽에서 폴더를 선택하거나, + 버튼으로 새로 만들어 보세요.';

  return (
    <div className="app app--tree-layout">
      <header className="app-header">
        <h1 className="app-header__logo">LinkPortal</h1>
        <ThemeToggle theme={theme} onToggle={cycleTheme} />
      </header>

      <LinkDropZone enabled onDropLinks={handleDropImport} className="link-drop-zone--app">
        <div className="app-body">
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
            onLinkDrop={handleTreeLinkDrop}
          />

          <main className="app-main">
            {activeCategoryId ? (
              <LinkCardList
                links={links}
                categoryTitle={centerTitle}
                onAddLink={() => setModal({ type: 'add-link' })}
                onDeleteLink={handleRequestDeleteLink}
                onDeletePageLinks={handleRequestDeletePageLinks}
                onEditLink={(link) => setModal({ type: 'edit-link', link })}
                onMoveLink={(link) => setModal({ type: 'move-link', link })}
                onPlayVideo={handlePlayVideo}
                instantDelete={instantDelete}
                onInstantDeleteChange={setInstantDelete}
              />
            ) : (
              <EmptyDropPanel message={emptyMainMessage} />
            )}
          </main>
        </div>
      </LinkDropZone>

      {playingLink && (
        <YouTubePlayer
          link={playingLink}
          playlist={youtubePlaylist}
          onClose={handleClosePlayer}
          onPlayLink={handlePlayVideo}
        />
      )}

      {modal?.type === 'add-category' && (
        <InputModal
          title="폴더 추가"
          placeholder="폴더 이름"
          submitLabel="추가"
          initialValue={nextDefaultFolderTitle}
          onSubmit={handleAddCategory}
          onClose={closeAddCategoryModal}
        />
      )}
      {modal?.type === 'edit-category' && (
        <InputModal
          title="폴더 이름 변경"
          placeholder="폴더 이름"
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
          title="폴더 삭제"
          message={`"${modal.title}"와 하위 항목·링크가 모두 삭제됩니다.`}
          onConfirm={handleConfirmDeleteCategory}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'confirm-delete-link' && (
        <ConfirmModal
          title="링크 삭제"
          message={`"${modal.title}" 링크를 삭제할까요?`}
          onConfirm={handleConfirmDeleteLink}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'confirm-delete-page-links' && (
        <ConfirmModal
          title="현재 페이지 삭제"
          message={`현재 페이지의 ${modal.count}개 링크를 모두 삭제할까요? 되돌릴 수 없습니다.`}
          onConfirm={handleConfirmDeletePageLinks}
          onClose={() => setModal(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
