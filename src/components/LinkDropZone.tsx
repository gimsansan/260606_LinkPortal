import { useState, useRef, type DragEvent, type ReactNode } from 'react';
import { extractLinksFromDataTransfer } from '../services/dropImport';

interface LinkDropZoneProps {
  enabled: boolean;
  onDropLinks: (items: { url: string; title?: string }[]) => void | Promise<void>;
  children: ReactNode;
  className?: string;
}

function isExternalLinkImport(e: DragEvent): boolean {
  const types = e.dataTransfer.types;
  if (types.includes('application/linkportal-link')) return false;
  return types.includes('Files') || types.includes('text/uri-list') || types.includes('text/plain');
}

export function LinkDropZone({ enabled, onDropLinks, children, className }: LinkDropZoneProps) {
  const [active, setActive] = useState(false);
  const depthRef = useRef(0);

  if (!enabled) return <>{children}</>;

  const handleDragEnter = (e: DragEvent) => {
    if (!isExternalLinkImport(e)) return;
    e.preventDefault();
    depthRef.current += 1;
    if (depthRef.current === 1) setActive(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    depthRef.current -= 1;
    if (depthRef.current <= 0) {
      depthRef.current = 0;
      setActive(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    if (!isExternalLinkImport(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: DragEvent) => {
    if (!isExternalLinkImport(e)) return;
    e.preventDefault();
    depthRef.current = 0;
    setActive(false);

    const items = await extractLinksFromDataTransfer(e.dataTransfer);
    if (items.length > 0) await onDropLinks(items);
  };

  return (
    <div
      className={`link-drop-zone ${className ?? ''} ${active ? 'link-drop-zone--active' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {active && (
        <div className="link-drop-zone__overlay" aria-hidden="true">
          <p className="link-drop-zone__hint">.url 파일 또는 링크를 놓으세요</p>
        </div>
      )}
    </div>
  );
}
