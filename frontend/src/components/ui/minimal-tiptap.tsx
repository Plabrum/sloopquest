import * as React from "react";
import { Extension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type TiptapContent, hasContentText } from "@/lib/tiptap";

interface MinimalTiptapProps {
  content?: TiptapContent | null;
  onChange?: (content: TiptapContent) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  editorClassName?: string;
  showToolbar?: boolean;
  toolbar?: "full" | "minimal";
  showToolbarToggle?: boolean;
  onSend?: () => void | Promise<void>;
  isSending?: boolean;
  mode?: "new" | "edit";
  onCancel?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

interface EnterKeySubmitOptions {
  onSubmit: (() => void | Promise<void>) | null;
}

const EnterKeySubmit = Extension.create<EnterKeySubmitOptions>({
  name: "enterKeySubmit",

  addOptions() {
    return { onSubmit: null };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (!this.options.onSubmit) return false;

        const { state } = this.editor;
        const { $from } = state.selection;
        const isInList = $from.node(-1)?.type.name === "listItem";

        if (isInList) return false;

        this.options.onSubmit();
        return true;
      },
      "Shift-Enter": () => false,
    };
  },
});

function MinimalTiptap({
  content = null,
  onChange,
  placeholder = "Start typing...",
  editable = true,
  className,
  editorClassName,
  showToolbar: initialShowToolbar = false,
  toolbar = "full",
  showToolbarToggle = true,
  onSend,
  isSending = false,
  mode = "new",
  onCancel,
  onFocus,
  onBlur,
}: MinimalTiptapProps) {
  const [showToolbar, setShowToolbar] = React.useState(initialShowToolbar);

  const onSendRef = React.useRef(onSend);
  React.useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);

  const isEditMode = mode === "edit";
  const hasText = hasContentText(content);
  const showSendButton = onSend !== undefined;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      EnterKeySubmit.configure({
        onSubmit: onSend ? () => { onSendRef.current?.(); } : null,
      }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    onFocus: () => { onFocus?.(); },
    onBlur: () => { onBlur?.(); },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none",
          "p-0 border-0",
        ),
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "b") {
          event.stopPropagation();
        }
        return false;
      },
    },
  });

  React.useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content || "");
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  const renderToolbar = () => {
    if (toolbar === "minimal") {
      return (
        <div className="flex flex-wrap items-center gap-1 border-b p-2">
          <Toggle
            size="sm"
            pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Separator orientation="vertical" className="h-6" />
          <Toggle
            size="sm"
            pressed={editor.isActive("bulletList")}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("orderedList")}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("strike")}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("code")}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </Toggle>
        <Separator orientation="vertical" className="h-6" />
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>
        <Separator orientation="vertical" className="h-6" />
        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("blockquote")}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      {editable && showToolbar && renderToolbar()}

      <div className={cn("p-3", editorClassName)}>
        <EditorContent editor={editor} placeholder={placeholder} />
      </div>

      {editable && (showToolbarToggle || showSendButton) && (
        <div className="flex items-stretch border-t">
          {showToolbarToggle && (
            <div className="flex items-center gap-2 px-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showToolbar}
                      onCheckedChange={setShowToolbar}
                      aria-label="Toggle formatting toolbar"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{showToolbar ? "Hide formatting toolbar" : "Show formatting toolbar"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {showSendButton && (
            <>
              {isEditMode ? (
                <div className="flex flex-1">
                  <Button
                    onClick={onCancel}
                    disabled={isSending}
                    variant="outline"
                    className="ml-auto rounded-none border-0 border-l px-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={onSend}
                    disabled={!hasText || isSending}
                    className="rounded-none rounded-br-lg border-0 border-l px-8"
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={onSend}
                  disabled={!hasText || isSending}
                  className="ml-auto rounded-none rounded-br-lg border-0 border-l px-8"
                >
                  Send
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export { MinimalTiptap, type MinimalTiptapProps };
export type { TiptapContent } from "@/lib/tiptap";
