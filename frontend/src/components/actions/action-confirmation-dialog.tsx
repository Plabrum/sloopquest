import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionDTO } from "@/lib/actions/types";

interface ActionConfirmationDialogProps {
  open: boolean;
  action: ActionDTO | null;
  isExecuting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ActionConfirmationDialog({
  open,
  action,
  isExecuting,
  onConfirm,
  onCancel,
}: ActionConfirmationDialogProps) {
  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action.label}</DialogTitle>
          <DialogDescription>
            {action.confirmation_message || "Are you sure you want to proceed?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isExecuting}
            className="bg-card"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isExecuting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isExecuting ? "Executing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
