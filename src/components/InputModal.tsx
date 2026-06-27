import { useState } from 'react';
import type { Category, LinkItem } from '../types';

interface InputModalProps {
  title: string;
  placeholder: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
  initialValue?: string;
  submitLabel?: string;
}

export function InputModal({
  title,
  placeholder,
  onSubmit,
  onClose,
  initialValue = '',
  submitLabel = '확인',
}: InputModalProps) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className="modal__title">{title}</h3>
        <input
          className="modal__input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
        <div className="modal__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn-primary">{submitLabel}</button>
        </div>
      </form>
    </div>
  );
}

export interface AddLinkOptions {
  titleOverride?: string;
  forceManual?: boolean;
}

interface AddLinkModalProps {
  onSubmit: (url: string, options?: AddLinkOptions) => void;
  onClose: () => void;
}

export function AddLinkModal({ onSubmit, onClose }: AddLinkModalProps) {
  const [url, setUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [useManual, setUseManual] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    if (useManual) {
      onSubmit(trimmedUrl, { forceManual: true, titleOverride: manualTitle.trim() });
    } else {
      onSubmit(trimmedUrl);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className="modal__title">링크 추가</h3>
        <input
          className="modal__input"
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="naver.com 또는 https://..."
          autoFocus
          required
        />
        <label className="modal__checkbox">
          <input
            type="checkbox"
            checked={useManual}
            onChange={(e) => setUseManual(e.target.checked)}
          />
          제목 수동 입력
        </label>
        {useManual && (
          <input
            className="modal__input"
            type="text"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="제목"
          />
        )}
        <div className="modal__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn-primary">추가</button>
        </div>
      </form>
    </div>
  );
}

interface EditLinkModalProps {
  link: LinkItem;
  onSubmit: (url: string, title: string) => void;
  onClose: () => void;
}

export function EditLinkModal({ link, onSubmit, onClose }: EditLinkModalProps) {
  const [url, setUrl] = useState(link.url);
  const [title, setTitle] = useState(link.title);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    const trimmedTitle = title.trim();
    if (!trimmedUrl || !trimmedTitle) return;
    onSubmit(trimmedUrl, trimmedTitle);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className="modal__title">링크 편집</h3>
        <input
          className="modal__input"
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="naver.com 또는 https://..."
          required
        />
        <input
          className="modal__input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          required
        />
        <div className="modal__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn-primary">저장</button>
        </div>
      </form>
    </div>
  );
}

interface MoveLinkModalProps {
  link: LinkItem;
  categories: Category[];
  onSubmit: (categoryId: string) => void;
  onClose: () => void;
}

export function MoveLinkModal({ link, categories, onSubmit, onClose }: MoveLinkModalProps) {
  const targets = categories.filter((c) => c.id !== link.categoryId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">링크 이동</h3>
        <p className="modal__hint">"{link.title}"을 옮길 카테고리를 선택하세요.</p>
        {targets.length === 0 ? (
          <p className="modal__hint">다른 카테고리가 없습니다. 카테고리를 먼저 추가하세요.</p>
        ) : (
          <ul className="move-list">
            {targets.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="move-list__btn"
                  onClick={() => {
                    onSubmit(c.id);
                    onClose();
                  }}
                >
                  {c.title}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="modal__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

interface MoveCategoryModalProps {
  category: Category;
  categories: Category[];
  onSubmit: (newParentId: string | null) => void;
  onClose: () => void;
}

export function MoveCategoryModal({
  category,
  categories,
  onSubmit,
  onClose,
}: MoveCategoryModalProps) {
  const blocked = new Set<string>();
  const markBlocked = (id: string) => {
    blocked.add(id);
    categories.filter((c) => c.parentId === id).forEach((c) => markBlocked(c.id));
  };
  markBlocked(category.id);

  const validTargets = categories.filter((c) => !blocked.has(c.id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">{category.title} 이동</h3>
        <p className="modal__hint">새 상위 카테고리를 선택하세요.</p>
        <ul className="move-list">
          <li>
            <button type="button" className="move-list__btn" onClick={() => onSubmit(null)}>
              루트 (최상위)
            </button>
          </li>
          {validTargets.map((c) => (
            <li key={c.id}>
              <button type="button" className="move-list__btn" onClick={() => onSubmit(c.id)}>
                {c.title}
              </button>
            </li>
          ))}
        </ul>
        <div className="modal__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({ title, message, onConfirm, onClose }: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">{title}</h3>
        <p className="modal__hint">{message}</p>
        <div className="modal__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="btn-primary btn-danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
