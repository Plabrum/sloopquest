import { DraggableThumb } from "@/components/common/draggable-thumb";
import { Dropzone, DropzoneEmptyState } from "@/components/ui/dropzone";
import { useAttachSurveyMedia } from "@/hooks/use-attach-survey-media";
import type { SurveyMediaListItem } from "@/openapi/litestarAPI.schemas";
import { DRAG_MEDIA_TYPE } from "./field";
import { RailSection } from "./rail-section";

const IMAGE_ACCEPT = {
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".heif"],
};

export function PhotosRail({
  surveyId,
  onUploaded,
  items,
  unassigned,
  sectionLabel,
}: {
  surveyId: string;
  onUploaded: () => Promise<unknown> | void;
  items: SurveyMediaListItem[];
  unassigned: SurveyMediaListItem[];
  sectionLabel: string | null;
}) {
  const { attachFiles, status, pendingCount, completedCount, error } =
    useAttachSurveyMedia(surveyId, onUploaded);

  const uploading = status === "uploading";

  return (
    <RailSection
      label={sectionLabel ? `Photos · ${sectionLabel}` : "Photos"}
      meta={`(${items.length})`}
    >
      {items.length === 0 ? (
        <p className="font-serif text-[12px] italic text-muted-foreground">
          No photos in this section yet.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {items.slice(0, 12).map((m) => (
            <DraggableThumb
              key={m.id}
              src={m.thumbnail_url ?? m.view_url}
              alt={m.caption ?? ""}
              dragMimeType={DRAG_MEDIA_TYPE}
              dragPayload={m.id}
              className="aspect-square rounded-sm border border-border"
            />
          ))}
        </div>
      )}

      <div className="mt-3 rounded-sm border border-dashed border-amber-500/60 bg-amber-500/5 px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
          Unassigned ({unassigned.length})
        </div>

        {unassigned.length > 0 && (
          <div className="mt-1 grid grid-cols-6 gap-1.5">
            {unassigned.slice(0, 12).map((m) => (
              <DraggableThumb
                key={m.id}
                src={m.thumbnail_url ?? m.view_url}
                alt={m.caption ?? ""}
                dragMimeType={DRAG_MEDIA_TYPE}
                dragPayload={m.id}
                className="aspect-square rounded-sm border border-dashed border-amber-500/40"
              />
            ))}
          </div>
        )}

        <Dropzone
          accept={IMAGE_ACCEPT}
          maxFiles={20}
          multiple
          disabled={uploading}
          className="mt-2 min-h-0 border-amber-500/40 bg-transparent p-3 hover:bg-amber-500/5"
          onDrop={(files) => {
            void attachFiles(files, { nodeId: null });
          }}
        >
          <DropzoneEmptyState>
            <p className="font-serif text-[11px] italic text-muted-foreground">
              {uploading
                ? `Uploading ${completedCount + 1} of ${pendingCount}…`
                : "Drop photos here or click to upload"}
            </p>
          </DropzoneEmptyState>
        </Dropzone>

        {error && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
            {error}
          </p>
        )}
      </div>
    </RailSection>
  );
}
