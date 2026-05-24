import { useState } from "react";

export function useDropTarget(
  mimeType: string,
  onDrop: (payload: string) => void | Promise<void>,
) {
  const [isOver, setIsOver] = useState(false);
  return {
    isOver,
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(mimeType)) {
        e.preventDefault();
        setIsOver(true);
      }
    },
    onDragLeave: () => setIsOver(false),
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      const payload = e.dataTransfer.getData(mimeType);
      if (payload) await onDrop(payload);
    },
  };
}
