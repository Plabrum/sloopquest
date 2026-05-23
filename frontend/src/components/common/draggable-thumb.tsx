import { cn } from "@/lib/utils";

export function DraggableThumb({
  src,
  alt,
  dragMimeType,
  dragPayload,
  className,
}: {
  src: string;
  alt?: string;
  dragMimeType: string;
  dragPayload: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt ?? ""}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(dragMimeType, dragPayload);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "aspect-square cursor-grab rounded border object-cover active:cursor-grabbing",
        className,
      )}
    />
  );
}
