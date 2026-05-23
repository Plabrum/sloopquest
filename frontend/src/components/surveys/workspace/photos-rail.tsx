import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DraggableThumb } from "@/components/common/draggable-thumb";
import type { SurveyMediaListItem } from "@/openapi/litestarAPI.schemas";
import { DRAG_MEDIA_TYPE } from "./node-helpers";

export function PhotosRail({
  items,
  unassigned,
  sectionLabel,
}: {
  items: SurveyMediaListItem[];
  unassigned: SurveyMediaListItem[];
  sectionLabel: string | null;
}) {
  return (
    <Card className="gap-3 py-3">
      <CardHeader className="px-3">
        <CardTitle className="text-sm">
          Photos{sectionLabel ? ` · ${sectionLabel}` : ""} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-3">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No photos in this section yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {items.slice(0, 12).map((m) => (
              <DraggableThumb
                key={m.id}
                src={m.thumbnail_url ?? m.view_url}
                alt={m.caption ?? ""}
                dragMimeType={DRAG_MEDIA_TYPE}
                dragPayload={m.id}
              />
            ))}
          </div>
        )}
        <div className="space-y-1 rounded-xl border border-dashed p-2">
          <div className="text-xs text-orange-600">Unassigned ({unassigned.length})</div>
          {unassigned.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Drop or attach photos here.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {unassigned.slice(0, 12).map((m) => (
                <DraggableThumb
                  key={m.id}
                  src={m.thumbnail_url ?? m.view_url}
                  alt={m.caption ?? ""}
                  dragMimeType={DRAG_MEDIA_TYPE}
                  dragPayload={m.id}
                  className="border-dashed border-orange-400"
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
