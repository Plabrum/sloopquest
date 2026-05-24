import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FileUpload,
  type ConfirmUploadRequest,
  type UploadUrlRequest,
  type UploadUrlResponse,
} from "@/components/upload/FileUpload";
import type { DocumentCategory } from "@/components/upload/document-categories";

export interface VesselOption {
  id: string;
  label: string;
}

interface DocumentUploadDialogProps<TDoc> {
  parentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  category: DocumentCategory;
  requestUploadUrl: (req: UploadUrlRequest) => Promise<UploadUrlResponse>;
  confirmUpload: (req: ConfirmUploadRequest) => Promise<TDoc>;
  /** When provided, renders a vessel picker above the dropzone. The
   * selected option's id is forwarded as `parentId` to the upload —
   * lets a single dialog serve uploads across multiple vessels (e.g. a
   * fleet-level Documents card). */
  vesselOptions?: VesselOption[];
  onUploaded?: (doc: TDoc) => void;
}

/**
 * Reusable upload dialog wrapping the shared `FileUpload` primitive.
 * Closes on the first successful upload — the right UX for pinned
 * single-file uploads (e.g. attaching a survey report). For bulk uploads
 * drop `FileUpload` in directly.
 */
export function DocumentUploadDialog<TDoc>({
  parentId,
  open,
  onOpenChange,
  title,
  description,
  category,
  requestUploadUrl,
  confirmUpload,
  vesselOptions,
  onUploaded,
}: DocumentUploadDialogProps<TDoc>) {
  const [selectedVesselId, setSelectedVesselId] = useState<string>(
    vesselOptions?.[0]?.id ?? "",
  );

  const resolvedParentId = vesselOptions ? selectedVesselId : parentId;
  const needsVesselPick = vesselOptions != null && !resolvedParentId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-[520px] flex-col gap-6 rounded-2xl bg-background p-8">
        <DialogHeader className="gap-2">
          <DialogTitle className="font-serif text-[22px] font-bold text-[#1C1A18]">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-[#8A847D]">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="h-px bg-[#D4CCC2]" />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-[#D4CCC2] bg-card p-4 shadow-sm">
          {vesselOptions && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vessel-picker" className="text-xs">
                Vessel
              </Label>
              <select
                id="vessel-picker"
                value={selectedVesselId}
                onChange={(e) => setSelectedVesselId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-primary/[0.07] px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {vesselOptions.length === 0 ? (
                  <option value="">No vessels available</option>
                ) : (
                  vesselOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
          <div className={needsVesselPick ? "pointer-events-none opacity-50" : ""}>
            <FileUpload<TDoc>
              parentId={resolvedParentId}
              category={category}
              confirmBeforeUpload
              requestUploadUrl={requestUploadUrl}
              confirmUpload={confirmUpload}
              onUploaded={(doc) => {
                onUploaded?.(doc);
                onOpenChange(false);
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
