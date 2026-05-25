import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useActionExecutor } from "@/hooks/actions/use-action-executor";
import type { ActionDTO } from "@/lib/actions/types";
import type { SurveyMediaListItem } from "@/openapi/litestarAPI.schemas";
import { CapturePhotoButton } from "./capture-photo-button";

const ASSIGN_MEDIA: ActionDTO = { action: "survey_media_actions__assign", label: "Assign media" };

type PhotoActionRowProps = {
  nodeId: string;
  surveyId: string;
  mediaByNode: Map<string, SurveyMediaListItem[]>;
  unassignedMedia: SurveyMediaListItem[];
};

export function PhotoActionRow({
  nodeId,
  surveyId,
  mediaByNode,
  unassignedMedia,
}: PhotoActionRowProps) {
  const attachedCount = mediaByNode.get(nodeId)?.length ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>{attachedCount} attached</span>
      <span aria-hidden>·</span>
      <CapturePhotoButton
        surveyId={surveyId}
        nodeId={nodeId}
        mode="camera"
        size="xs"
        label="+ Camera"
      />
      <AttachPhotoButton nodeId={nodeId} unassignedMedia={unassignedMedia} />
    </div>
  );
}

function AttachPhotoButton({
  nodeId,
  unassignedMedia,
}: {
  nodeId: string;
  unassignedMedia: SurveyMediaListItem[];
}) {
  const [open, setOpen] = useState(false);
  const mediaExecutor = useActionExecutor({ actionGroup: "survey_media_actions" });
  const disabled = unassignedMedia.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          className="h-6 px-2 text-xs text-muted-foreground"
        >
          + From Unassigned ({unassignedMedia.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="mb-2 text-xs font-medium">From Unassigned</div>
        <div className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto">
          {unassignedMedia.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={async () => {
                await mediaExecutor.executeAction(
                  ASSIGN_MEDIA,
                  { action: ASSIGN_MEDIA.action, data: { node_id: nodeId } } as never,
                  { silent: true, objectId: m.id },
                );
                setOpen(false);
              }}
              className="aspect-square overflow-hidden rounded border hover:ring-2 hover:ring-primary"
            >
              <img
                src={m.thumbnail_url ?? m.view_url}
                alt={m.caption ?? ""}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
