import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDropTarget } from "@/hooks/use-drop-target";
import type { FormNodeRef } from "@/openapi/litestarAPI.schemas";
import { FieldCard } from "./field-card";
import { DRAG_MEDIA_TYPE, getFieldType, getFindingValue, type Tree } from "./node-helpers";
import { PhotoActionRow } from "./photo-action-row";
import { SEVERITY_DOT, SEVERITY_TEXT, asSeverity } from "./severity";
import { useWorkspace } from "./workspace-context";

export function FieldOrRepeater({
  node,
  fieldIndex,
  fieldTotal,
}: {
  node: Tree;
  fieldIndex: number;
  fieldTotal: number;
}) {
  const { actions } = useWorkspace();
  const isRepeater = getFieldType(node) === "repeater";

  if (!isRepeater) {
    return <FieldWithExtras node={node} fieldIndex={fieldIndex} fieldTotal={fieldTotal} />;
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{node.label}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => actions.addRepeaterInstance(node.id)}
        >
          + Add another
        </Button>
      </div>
      {node.children
        .filter((c) => c.kind === "repeater_instance")
        .map((instance) => (
          <RepeaterInstance key={instance.id} instance={instance} />
        ))}
    </div>
  );
}

function RepeaterInstance({ instance }: { instance: Tree }) {
  const { actions } = useWorkspace();
  const fields = instance.children.filter((c) => c.kind === "field");

  return (
    <div className="space-y-2 rounded-xl bg-muted/40 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{instance.label}</div>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground"
          onClick={() => actions.deleteNode(instance.id)}
        >
          Remove
        </Button>
      </div>
      {fields.map((child, idx) => (
        <FieldWithExtras
          key={child.id}
          node={child}
          fieldIndex={idx}
          fieldTotal={fields.length}
        />
      ))}
    </div>
  );
}

function FieldWithExtras({
  node,
  fieldIndex,
  fieldTotal,
}: {
  node: FormNodeRef;
  fieldIndex: number;
  fieldTotal: number;
}) {
  const { actions, findingsByParent } = useWorkspace();
  const drop = useDropTarget(DRAG_MEDIA_TYPE, (mediaId) => actions.assignMedia(mediaId, node.id));
  const findings = findingsByParent.get(node.id) ?? [];
  const isPhoto = getFieldType(node) === "photo";

  return (
    <div
      className={`space-y-2 rounded-2xl transition-shadow ${drop.isOver ? "ring-2 ring-primary" : ""}`}
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
    >
      <FieldCard
        node={node}
        fieldIndex={fieldIndex}
        fieldTotal={fieldTotal}
        onSave={(value) => actions.saveField(node, value)}
        photoActionRow={isPhoto ? <PhotoActionRow nodeId={node.id} /> : null}
      />
      {findings.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-1">
          {findings.map((f) => {
            const v = getFindingValue(f);
            const sev = asSeverity(v?.severity);
            return (
              <Badge
                key={f.id}
                variant="outline"
                className={`gap-1 bg-white ${SEVERITY_TEXT[sev]}`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[sev]}`} />
                {v?.summary ?? f.label}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
