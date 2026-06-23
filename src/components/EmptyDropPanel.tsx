import { LinkDropZone } from './LinkDropZone';

interface DropLinkItem {
  url: string;
  title?: string;
}

interface EmptyDropPanelProps {
  message: string;
  onDropImport: (items: DropLinkItem[]) => void | Promise<void>;
}

export function EmptyDropPanel({ message, onDropImport }: EmptyDropPanelProps) {
  return (
    <LinkDropZone enabled onDropLinks={onDropImport}>
      <p className="empty-state empty-state--droppable">{message}</p>
    </LinkDropZone>
  );
}
