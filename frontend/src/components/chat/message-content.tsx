import { MinimalTiptap } from "@/components/ui/minimal-tiptap";
import type { TiptapContent } from "@/lib/tiptap";
import { cn } from "@/lib/utils";

interface MessageContentProps {
  content: TiptapContent;
  className?: string;
}

export function MessageContent({ content, className }: MessageContentProps) {
  return (
    <div className={cn("text-sm", className)}>
      <MinimalTiptap content={content} editable={false} showToolbar={false} className="border-0" />
    </div>
  );
}
