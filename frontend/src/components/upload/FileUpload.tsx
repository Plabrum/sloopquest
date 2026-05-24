import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  X,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_ACCEPT,
  MAX_SIZE_BYTES,
} from "@/components/upload/file-upload-constants";
import {
  DOCUMENT_CATEGORY_META,
  DOCUMENT_CATEGORY_ORDER,
  type DocumentCategory,
} from "@/components/upload/document-categories";

const CONCURRENCY = 3;

type UploadStage =
  | "awaiting_confirm"
  | "queued"
  | "presigning"
  | "uploading"
  | "confirming"
  | "done"
  | "error";

interface UploadSlot<TDoc> {
  id: string;
  file: File;
  progress: number;
  stage: UploadStage;
  error: string | null;
  doc: TDoc | null;
  editedFileName: string;
  editedCategory: DocumentCategory;
  editedDescription: string;
}

interface QueuedFile {
  slotId: string;
  file: File;
  fileName: string;
  category: DocumentCategory;
  description: string | null;
}

export interface UploadUrlRequest {
  parentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: DocumentCategory;
}

export interface UploadUrlResponse {
  url: string;
  fields?: Record<string, string>;
  uploadToken: string;
}

export interface ConfirmUploadRequest {
  uploadToken: string;
  category: DocumentCategory;
  description: string | null;
}

interface FileUploadProps<TDoc> {
  parentId: string;
  /** Issues a presigned URL for the dropped file. The returned `fields`
   * are appended to the multipart POST body before the file. */
  requestUploadUrl: (req: UploadUrlRequest) => Promise<UploadUrlResponse>;
  /** Marks the upload as complete on the backend and returns the
   * persisted document record. */
  confirmUpload: (req: ConfirmUploadRequest) => Promise<TDoc>;
  onUploaded: (doc: TDoc) => void;
  onError?: (err: Error) => void;
  accept?: readonly string[];
  description?: string | null;
  category?: DocumentCategory;
  /** When true, each dropped file appears as a pending row with editable
   * name / category / description and a Save button. The actual upload
   * doesn't start until Save is clicked. */
  confirmBeforeUpload?: boolean;
  maxConcurrent?: number;
  emptyHint?: string;
  className?: string;
}

export function FileUpload<TDoc>({
  parentId,
  requestUploadUrl,
  confirmUpload,
  onUploaded,
  onError,
  accept = DEFAULT_ACCEPT,
  description = null,
  category,
  confirmBeforeUpload = false,
  maxConcurrent = CONCURRENCY,
  emptyHint = "Drop files here or click to browse",
  className,
}: FileUploadProps<TDoc>) {
  const [slots, setSlots] = useState<UploadSlot<TDoc>[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Imperative control-flow state: a concurrency-limited upload queue
  // and its in-flight counter. These are intentionally NOT react state —
  // they don't drive render output, they schedule async work. A
  // setState-on-each-change version would re-render the whole tray per
  // upload tick. Keeping them in refs keeps the render tree stable.
  const inFlightCountRef = useRef(0);
  const queueRef = useRef<QueuedFile[]>([]);
  const seenOnUploadedRef = useRef<Set<string>>(new Set());
  // Outstanding setTimeout handles (auto-dismiss timers). Cleared on
  // unmount so we don't touch state on a torn-down component.
  const dismissTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(
    () => () => {
      for (const h of dismissTimeoutsRef.current) clearTimeout(h);
      dismissTimeoutsRef.current.clear();
    },
    [],
  );

  const patch = useCallback((id: string, patch: Partial<UploadSlot<TDoc>>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const runUpload = useCallback(
    async (qf: QueuedFile) => {
      const { slotId, file, fileName, category: qfCategory, description: qfDescription } = qf;

      try {
        if (file.size > MAX_SIZE_BYTES) {
          throw new Error(`File exceeds the ${MAX_SIZE_BYTES / (1024 * 1024)}MB limit.`);
        }

        patch(slotId, { stage: "presigning", error: null });
        const presigned = await requestUploadUrl({
          parentId,
          fileName,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          category: qfCategory,
        });

        patch(slotId, { stage: "uploading", progress: 0 });

        const formData = new FormData();
        for (const [k, v] of Object.entries(presigned.fields ?? {})) {
          formData.append(k, v);
        }
        formData.append("file", file);

        await uploadWithProgress(presigned.url, formData, (ratio) => {
          patch(slotId, { progress: ratio });
        });

        patch(slotId, { stage: "confirming", progress: 1 });
        const doc = await confirmUpload({
          uploadToken: presigned.uploadToken,
          category: qfCategory,
          description: qfDescription,
        });

        patch(slotId, { stage: "done", doc });

        if (!seenOnUploadedRef.current.has(slotId)) {
          seenOnUploadedRef.current.add(slotId);
          onUploaded(doc);
        }

        // Auto-dismiss the tray row so the real list row (with Download)
        // is what the user sees. 1s gives the "Uploaded" check a moment
        // of visibility before disappearing.
        const handle = setTimeout(() => {
          setSlots((prev) => prev.filter((s) => s.id !== slotId));
          seenOnUploadedRef.current.delete(slotId);
          dismissTimeoutsRef.current.delete(handle);
        }, 1000);
        dismissTimeoutsRef.current.add(handle);
      } catch (err) {
        const message = getErrorMessage(err);
        patch(slotId, { stage: "error", error: message });
        onError?.(err as Error);
      } finally {
        inFlightCountRef.current -= 1;
        drainQueue();
      }
    },
    // drainQueue is referenced inside the finally block but defined below;
    // intentionally a stable callback (depends on runUpload, which would
    // create a cycle if added).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patch, parentId, requestUploadUrl, confirmUpload, onUploaded, onError],
  );

  const drainQueue = useCallback(() => {
    while (inFlightCountRef.current < maxConcurrent && queueRef.current.length > 0) {
      const next = queueRef.current.shift();
      if (!next) break;
      inFlightCountRef.current += 1;
      void runUpload(next);
    }
  }, [maxConcurrent, runUpload]);

  const enqueueSlot = useCallback(
    (slot: UploadSlot<TDoc>) => {
      queueRef.current.push({
        slotId: slot.id,
        file: slot.file,
        fileName: slot.editedFileName || slot.file.name,
        category: slot.editedCategory,
        description: slot.editedDescription ? slot.editedDescription : null,
      });
      drainQueue();
    },
    [drainQueue],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newSlots: UploadSlot<TDoc>[] = [];
      const list = Array.from(files);
      for (const file of list) {
        const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const declared = file.type || "application/octet-stream";

        if (!accept.includes(declared)) {
          toast.error(`${file.name}: file type "${declared}" is not allowed.`);
          continue;
        }
        if (file.size > MAX_SIZE_BYTES) {
          toast.error(
            `${file.name}: exceeds the ${MAX_SIZE_BYTES / (1024 * 1024)}MB limit.`,
          );
          continue;
        }

        newSlots.push({
          id,
          file,
          progress: 0,
          stage: confirmBeforeUpload ? "awaiting_confirm" : "queued",
          error: null,
          doc: null,
          editedFileName: file.name,
          editedCategory: category ?? "other",
          editedDescription: description ?? "",
        });
      }

      if (newSlots.length === 0) return;
      setSlots((prev) => [...prev, ...newSlots]);

      if (!confirmBeforeUpload) {
        for (const s of newSlots) enqueueSlot(s);
      }
    },
    [accept, category, description, confirmBeforeUpload, enqueueSlot],
  );

  const updateSlotField = useCallback(
    <K extends "editedFileName" | "editedCategory" | "editedDescription">(
      slotId: string,
      key: K,
      value: UploadSlot<TDoc>[K],
    ) => {
      patch(slotId, { [key]: value } as Partial<UploadSlot<TDoc>>);
    },
    [patch],
  );

  // Receive the full slot from the child row (it already has it as a
  // prop) rather than reading state here. Avoids the React 18+ pitfalls
  // of side-effects inside setState updaters and reading state right
  // after a setState.
  const confirmSlot = useCallback(
    (slot: UploadSlot<TDoc>) => {
      if (!slot.editedFileName.trim()) return;
      patch(slot.id, { stage: "queued", error: null });
      enqueueSlot({ ...slot, stage: "queued" });
    },
    [patch, enqueueSlot],
  );

  const retrySlot = useCallback(
    (slot: UploadSlot<TDoc>) => {
      patch(slot.id, { stage: "queued", error: null, progress: 0 });
      enqueueSlot({ ...slot, stage: "queued", progress: 0 });
    },
    [patch, enqueueSlot],
  );

  const remove = useCallback((slotId: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    seenOnUploadedRef.current.delete(slotId);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const openPicker = useCallback(() => fileInputRef.current?.click(), []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPicker();
      }
    },
    [openPicker],
  );

  useEffect(() => {
    if (fileInputRef.current && slots.length === 0) {
      fileInputRef.current.value = "";
    }
  }, [slots.length]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files — drop here or press Enter to browse"
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30",
        )}
      >
        <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">{emptyHint}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, images, text, Word, Excel · up to {Math.floor(MAX_SIZE_BYTES / (1024 * 1024))} MB each
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept.join(",")}
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
          }}
        />
      </div>

      {slots.length > 0 && (
        <ul
          className="flex flex-col gap-2"
          aria-live="polite"
          aria-label="Upload progress"
        >
          {slots.map((slot) =>
            slot.stage === "awaiting_confirm" ? (
              <PendingRow
                key={slot.id}
                slot={slot}
                onFieldChange={updateSlotField}
                onSave={confirmSlot}
                onCancel={remove}
              />
            ) : (
              <UploadRow key={slot.id} slot={slot} onRetry={retrySlot} onRemove={remove} />
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function PendingRow<TDoc>({
  slot,
  onFieldChange,
  onSave,
  onCancel,
}: {
  slot: UploadSlot<TDoc>;
  onFieldChange: <K extends "editedFileName" | "editedCategory" | "editedDescription">(
    slotId: string,
    key: K,
    value: UploadSlot<TDoc>[K],
  ) => void;
  onSave: (slot: UploadSlot<TDoc>) => void;
  onCancel: (slotId: string) => void;
}) {
  const trimmedName = slot.editedFileName.trim();

  return (
    <li className="rounded-2xl border bg-card px-5 py-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Pencil className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{slot.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(slot.file.size)} · review details before uploading
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${slot.id}-name`} className="text-xs">
            File name
          </Label>
          <Input
            id={`${slot.id}-name`}
            value={slot.editedFileName}
            onChange={(e) => onFieldChange(slot.id, "editedFileName", e.target.value)}
            placeholder="Display name (extension preserved)"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${slot.id}-category`} className="text-xs">
            Category
          </Label>
          <select
            id={`${slot.id}-category`}
            value={slot.editedCategory}
            onChange={(e) =>
              onFieldChange(slot.id, "editedCategory", e.target.value as DocumentCategory)
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {DOCUMENT_CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {DOCUMENT_CATEGORY_META[cat].label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <Label htmlFor={`${slot.id}-description`} className="text-xs">
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={`${slot.id}-description`}
          value={slot.editedDescription}
          onChange={(e) => onFieldChange(slot.id, "editedDescription", e.target.value)}
          placeholder="Add context — e.g. 'starboard hull, waterline crack'"
          rows={2}
        />
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onCancel(slot.id)}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(slot)}
          disabled={trimmedName.length === 0}
        >
          Save and upload
        </Button>
      </div>
    </li>
  );
}

function UploadRow<TDoc>({
  slot,
  onRetry,
  onRemove,
}: {
  slot: UploadSlot<TDoc>;
  onRetry: (slot: UploadSlot<TDoc>) => void;
  onRemove: (id: string) => void;
}) {
  const icon = slot.file.type.startsWith("image/") ? (
    <ImageIcon className="h-5 w-5 text-muted-foreground" />
  ) : (
    <FileText className="h-5 w-5 text-muted-foreground" />
  );

  const done = slot.stage === "done";
  const errored = slot.stage === "error";

  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5">
      {icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{slot.editedFileName || slot.file.name}</p>
          <p className="shrink-0 text-xs text-muted-foreground">{formatBytes(slot.file.size)}</p>
        </div>
        {!done && !errored && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.round(slot.progress * 100)}%` }}
            />
          </div>
        )}
        {done && (
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3 w-3" />
            Uploaded
          </p>
        )}
        {errored && slot.error && (
          <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" /> {slot.error}
          </p>
        )}
      </div>
      {errored && (
        <button
          type="button"
          onClick={() => onRetry(slot)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Retry upload"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
      {(done || errored) && (
        <button
          type="button"
          onClick={() => onRemove(slot.id)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Remove"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Wraps the browser's XHR so we get upload-progress events. `fetch()` has
 * no progress API; XHR is the only standards-track option short of a
 * streams-backed Request body (not supported in all browsers).
 */
function uploadWithProgress(
  url: string,
  body: FormData,
  onProgress: (ratio: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = false;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.send(body);
  });
}
