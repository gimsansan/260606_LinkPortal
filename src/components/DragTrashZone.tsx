import { useState, useCallback } from 'react';
import './drag-interactions.css';

interface DragTrashZoneProps {
  visible: boolean;
  onDrop: () => void;
}

export function DragTrashZone({ visible, onDrop }: DragTrashZoneProps) {
  const [hovering, setHovering] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHovering(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setHovering(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setHovering(false);
    onDrop();
  }, [onDrop]);

  if (!visible) return null;

  return (
    <div
      className={`drag-trash ${hovering ? 'drag-trash--hover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className="drag-trash__icon">🗑️</span>
      <span className="drag-trash__label">
        {hovering ? '놓으면 삭제됩니다' : '여기에 놓아서 삭제'}
      </span>
    </div>
  );
}
