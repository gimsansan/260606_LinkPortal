interface EmptyDropPanelProps {
  message: string;
}

export function EmptyDropPanel({ message }: EmptyDropPanelProps) {
  return <p className="empty-state empty-state--droppable">{message}</p>;
}
