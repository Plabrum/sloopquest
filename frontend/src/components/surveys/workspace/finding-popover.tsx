import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useActionExecutor } from "@/hooks/actions/use-action-executor";
import type { ActionDTO } from "@/lib/actions/types";
import type { SurveyMediaListItem } from "@/openapi/litestarAPI.schemas";

const SEVERITIES = ["info", "advisory", "critical"] as const;
type Severity = (typeof SEVERITIES)[number];

const ADD_FINDING: ActionDTO = { action: "survey_finding_actions__add", label: "Add finding" };
const ASSIGN_MEDIA: ActionDTO = { action: "survey_media_actions__assign", label: "Assign media" };

export function AddFindingButton({
  parentNodeId,
  unassignedMedia = [],
}: {
  parentNodeId: string;
  unassignedMedia?: SurveyMediaListItem[];
}) {
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<Severity>("advisory");
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [recommended, setRecommended] = useState("");
  const [pickedMedia, setPickedMedia] = useState<Set<string>>(new Set());
  const findingExecutor = useActionExecutor({ actionGroup: "survey_finding_actions" });
  const mediaExecutor = useActionExecutor({ actionGroup: "survey_media_actions" });

  function togglePick(id: string) {
    setPickedMedia((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setSummary("");
    setDetail("");
    setRecommended("");
    setSeverity("advisory");
    setPickedMedia(new Set());
  }

  async function submit() {
    if (!summary.trim()) return;
    const res = await findingExecutor.executeAction(
      ADD_FINDING,
      {
        action: ADD_FINDING.action,
        data: {
          parent_id: parentNodeId,
          severity,
          summary,
          detail: detail || null,
          recommended_action: recommended || null,
        },
      } as never,
      { silent: true },
    );
    const findingId = res.created_id;
    if (findingId && pickedMedia.size > 0) {
      await Promise.all(
        Array.from(pickedMedia).map((mediaId) =>
          mediaExecutor.executeAction(
            ASSIGN_MEDIA,
            { action: ASSIGN_MEDIA.action, data: { node_id: findingId } } as never,
            { silent: true, objectId: mediaId },
          ),
        ),
      );
    }
    reset();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <span className="text-[14px] leading-none">+</span>
          Add finding
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 space-y-3">
        <div className="flex gap-2">
          {SEVERITIES.map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={severity === s ? "default" : "outline"}
              onClick={() => setSeverity(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Summary</Label>
          <Input value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Detail</Label>
          <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recommended action</Label>
          <Textarea value={recommended} onChange={(e) => setRecommended(e.target.value)} rows={2} />
        </div>
        {unassignedMedia.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">From Unassigned ({unassignedMedia.length})</Label>
            <div className="grid max-h-32 grid-cols-4 gap-1 overflow-y-auto">
              {unassignedMedia.map((m) => {
                const picked = pickedMedia.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => togglePick(m.id)}
                    className={`aspect-square overflow-hidden rounded border-2 ${
                      picked ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img
                      src={m.thumbnail_url ?? m.view_url}
                      alt={m.caption ?? ""}
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <Button
          size="sm"
          onClick={submit}
          disabled={!summary.trim() || findingExecutor.isExecuting || mediaExecutor.isExecuting}
        >
          Save finding{pickedMedia.size > 0 ? ` (+${pickedMedia.size} photo)` : ""}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
