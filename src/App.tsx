import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { LinkItem } from './types';
import {
  db,
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
import { useAutoAdvance } from './hooks/useAutoAdvance';
import { useToast } from './hooks/useToast';
import { useGlobalSearch } from './hooks/useGlobalSearch';
import { parseLinkDragPayload } from './services/linkDrag';
import { recordInboxOrganize } from './services/missions';
import { fetchLinkMetadata } from './services/metadata';
import { downloadBackup, readBackupFile } from './services/backup';
import { isValidUrl, normalizeUrl, getFaviconUrl, extractYouTubeVideoId } from './services/url';
import { shuffleArray } from './utils/shuffle';
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
  | null;

export function App() {
  const { theme, cycleTheme } = useTheme();
  const { autoAdvance, setAutoAdvance } = useAutoAdvance();
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
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledPlaylist, setShuffledPlaylist] = useState<LinkItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const { query, setQuery, results, clearSearch } = useGlobalSearch(allCategories);

  const youtubePlaylist = useMemo(
    () =>
      links
        .filter((l) => !!extractYouTubeVideoId(l.url))
        .sort((a, b) => b.createdAt - a.createdAt),
    [links],
  );

  useEffect(() => {
    seedIfEmpty().then(() => setReady(true));
  }, []);

  useEffect(() => {
    setIsShuffled(false);
    setShuffledPlaylist([]);
  }, [activeCategoryId]);

  const activePlaylist = useMemo(
    () => (isShuffled && shuffledPlaylist.length > 0 ? shuffledPlaylist : youtubePlaylist),
    [isShuffled, shuffledPlaylist, youtubePlaylist],
  );

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      await downloadBackup();
      showToast('백업을 내보냈어요', 1500);
    } catch {
      showToast('내보내기 실패', 1500);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await readBackupFile(file, 'merge');
      await refreshAll();
      showToast('가져오기 완료', 1500);
    } catch {
      showToast('가져오기 실패 — 파일 확인', 1800);
    }
  };

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

  const handleGoHome = useCallback(async () => {
    clearSearch();
    setSearchOpen(false);
    setPlayingLink(null);

    const inbox = await getInboxCategory();
    if (inbox) {
      await selectCategoryById(inbox.id);
      return;
    }
    const roots = allCategories
      .filter((c) => c.parentId === null)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const firstRoot = roots[0];
    if (firstRoot) {
      await selectCategoryById(firstRoot.id);
    } else {
      setNavStack([]);
    }
  }, [allCategories, clearSearch, selectCategoryById]);

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
    const normalizedUrl = normalizeUrl(url);
    if (!isValidUrl(normalizedUrl)) return;

    const titleOverride = options?.titleOverride?.trim();
    const forceManual = options?.forceManual;

    if (forceManual) {
      await createLink(categoryId, {
        url: normalizedUrl,
        title: titleOverride || normalizedUrl,
        source: 'manual',
        faviconUrl: getFaviconUrl(normalizedUrl),
      });
      return;
    }

    if (titleOverride) {
      const meta = await fetchLinkMetadata(normalizedUrl);
      const hasRichMeta = meta.imageUrl != null;
      await createLink(categoryId, {
        url: normalizedUrl,
        title: titleOverride,
        imageUrl: meta.imageUrl,
        faviconUrl: meta.faviconUrl ?? getFaviconUrl(normalizedUrl),
        source: hasRichMeta ? 'auto' : 'manual',
        authorName: meta.authorName,
      });
      return;
    }

    const meta = await fetchLinkMetadata(normalizedUrl);
    const hasRichMeta = meta.imageUrl != null;
    await createLink(categoryId, {
      url: normalizedUrl,
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
      const snapshot = links.filter((l) => ids.includes(l.id));
      if (ids.length === 1) {
        await deleteLink(ids[0]);
      } else {
        await deleteLinks(ids);
      }
      await refreshAll();
      showToast(
        `${ids.length}개 삭제됨`,
        5000,
        'default',
        '되돌리기',
        () => {
          void db.links.bulkPut(snapshot).then(refreshAll);
        },
      );
    },
    [links, refreshAll, showToast],
  );

  const handleRequestDeleteLink = (id: string) => {
    void executeDeleteLinks([id]);
  };

  const handleRequestDeletePageLinks = (ids: string[]) => {
    if (ids.length === 0) return;
    void executeDeleteLinks(ids);
  };

  const handleEditLink = async (url: string, title: string) => {
    const normalizedUrl = normalizeUrl(url);
    if (modal?.type !== 'edit-link' || !isValidUrl(normalizedUrl)) return;
    await updateLink(modal.link.id, {
      url: normalizedUrl,
      title,
      faviconUrl: getFaviconUrl(normalizedUrl),
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

  const handleShuffleChange = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        if (playingLink) {
          const rest = youtubePlaylist.filter((l) => l.id !== playingLink.id);
          setShuffledPlaylist([playingLink, ...shuffleArray(rest)]);
        } else {
          setShuffledPlaylist(shuffleArray(youtubePlaylist));
        }
        setIsShuffled(true);
      } else {
        setIsShuffled(false);
      }
    },
    [playingLink, youtubePlaylist],
  );

  const handlePlayAll = useCallback(() => {
    if (isShuffled) {
      const shuffled = shuffleArray(youtubePlaylist);
      setShuffledPlaylist(shuffled);
      const first = shuffled[0];
      if (first) handlePlayVideo(first);
    } else {
      const first = youtubePlaylist[0];
      if (first) handlePlayVideo(first);
    }
  }, [isShuffled, youtubePlaylist, handlePlayVideo]);

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
        <button
          type="button"
          className="app-header__logo"
          onClick={() => void handleGoHome()}
          aria-label="홈으로 이동"
          title="홈으로 이동"
        >
          <img src="/linking.png" alt="" className="app-header__logo-icon" aria-hidden="true" />
          링크함
        </button>
        {searchOpen && (
          <input
            className="app-header__search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="전체 링크 검색"
            autoFocus
          />
        )}
        <div className="app-header__actions">
          <button
            type="button"
            className="btn-icon"
            onClick={() => {
              setSearchOpen((v) => {
                if (v) clearSearch();
                return !v;
              });
            }}
            aria-label="전체 검색"
            title="전체 검색"
          >
            🔍
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={handleExport}
            aria-label="백업 내보내기"
            title="백업 내보내기"
          >
            ⬇
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => fileInputRef.current?.click()}
            aria-label="백업 가져오기"
            title="백업 가져오기"
          >
            ⬆
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
          <ThemeToggle theme={theme} onToggle={cycleTheme} />
        </div>
        {searchOpen && results.length > 0 && (
          <ul className="global-search-results">
            {results.map((r) => (
              <li key={r.link.id}>
                <button
                  type="button"
                  className="global-search-results__item"
                  onClick={() => {
                    void selectCategoryById(r.link.categoryId);
                    clearSearch();
                    setSearchOpen(false);
                  }}
                >
                  <span className="global-search-results__title">{r.link.title}</span>
                  <span className="global-search-results__path">{r.folderPath}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
                embeddableCount={youtubePlaylist.length}
                onPlayAll={handlePlayAll}
                autoAdvance={autoAdvance}
                onAutoAdvanceChange={setAutoAdvance}
                isShuffled={isShuffled}
                onShuffleChange={handleShuffleChange}
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
          playlist={activePlaylist}
          onClose={handleClosePlayer}
          onPlayLink={handlePlayVideo}
          autoAdvance={autoAdvance}
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
      <Toast toast={toast} />
    </div>
  );
}
