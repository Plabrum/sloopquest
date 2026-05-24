/**
 * Trash-icon button + confirmation dialog for deleting a conversation.
 * Used by both the fullscreen surface and the dock's thread-history
 * dropdown — same UX in both places.
 *
 * On confirm: calls `DELETE /llm/threads/{id}` (soft-delete on the
 * server), invalidates the threads list query so every visible row
 * updates, and calls `onDeleted` so the parent can navigate away if the
 * deleted conversation was the active one.
 */
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error-handler";
import {
  getLlmThreadsListThreadsHandlerQueryKey,
  useLlmThreadsThreadIdDeleteThreadHandler,
} from "@/openapi/llm/llm";

interface DeleteThreadButtonProps {
  threadId: string;
  /**
   * Called after a successful delete. The parent owns navigation —
   * if the deleted thread is the active one, route away from it.
   */
  onDeleted?: (deletedThreadId: string) => void;
  /**
   * Tailwind className for the icon button. Lets each call site control
   * hover-visibility (`opacity-0 group-hover:opacity-100`) without the
   * component dictating layout.
   */
  className?: string;
}

export function DeleteThreadButton({
  threadId,
  onDeleted,
  className,
}: DeleteThreadButtonProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const deleteMutation = useLlmThreadsThreadIdDeleteThreadHandler({
    mutation: {
      onSuccess: () => {
        // Query key includes the params object; matching only on the
        // base path drops every variant of the list query so dock + page
        // refetch in lockstep.
        queryClient.invalidateQueries({
          queryKey: getLlmThreadsListThreadsHandlerQueryKey().slice(0, 1),
        });
        toast.success("Conversation deleted");
        setOpen(false);
        onDeleted?.(threadId);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Delete conversation"
        title="Delete conversation"
        className={cn(
          "shrink-0 p-1 rounded text-muted-foreground hover:text-destructive transition-colors",
          className,
        )}
      >
        <Trash2 className="w-3 h-3" />
      </button>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => !deleteMutation.isPending && setOpen(isOpen)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this conversation?</DialogTitle>
            <DialogDescription>
              This conversation will be removed from your history. You
              can&rsquo;t undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleteMutation.isPending}
              className="bg-card"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteMutation.mutate({ threadId })}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
