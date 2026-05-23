import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDropTarget } from "@/hooks/use-drop-target";
import { jumpToHash } from "@/lib/scroll";
import type { SectionCompletion } from "@/openapi/litestarAPI.schemas";
import { AddAdHocFieldButton } from "./ad-hoc-buttons";
import { FieldOrRepeater } from "./field-or-repeater";
import { AddFindingButton } from "./finding-popover";
import { DRAG_MEDIA_TYPE, pad2, type Tree } from "./node-helpers";
import { useWorkspace } from "./workspace-context";

export function SectionBlock({
  section,
  sectionIndex,
  totalSections,
  nextSection,
  nextSectionCompletion,
  completion,
}: {
  section: Tree;
  sectionIndex: number;
  totalSections: number;
  nextSection: Tree | null;
  nextSectionCompletion: SectionCompletion | undefined;
  completion: SectionCompletion | undefined;
}) {
  const { actions } = useWorkspace();
  const hidden = section.condition_visible === false;
  const [overridden, setOverridden] = useState(false);
  const show = !hidden || overridden;
  const drop = useDropTarget(DRAG_MEDIA_TYPE, (mediaId) => actions.assignMedia(mediaId, section.id));

  return (
    <section
      id={`section-${section.id}`}
      className={`scroll-mt-20 space-y-3 ${drop.isOver ? "ring-2 ring-primary rounded-xl" : ""}`}
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
    >
      <div className="sticky top-14 z-10 rounded-xl border bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Section {pad2(sectionIndex + 1)} of {pad2(totalSections)}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-semibold">{section.label}</h2>
            {completion && (
              <Badge variant="outline" className="font-normal">
                {completion.filled}/{completion.total}
              </Badge>
            )}
          </div>
          {show && <AddFindingButton parentNodeId={section.id} onAdded={actions.invalidate} />}
        </div>
      </div>

      {!show ? (
        <div className="rounded-2xl border border-dashed bg-white p-4 text-sm text-muted-foreground">
          Skipped — condition not met.
          <Button
            size="sm"
            variant="link"
            className="ml-2"
            onClick={() => setOverridden(true)}
          >
            Mark as performed
          </Button>
        </div>
      ) : (
        <SectionBody section={section} />
      )}

      {nextSection && (
        <button
          type="button"
          onClick={() => jumpToHash(`section-${nextSection.id}`)}
          className="block w-full rounded-xl border border-dashed bg-white/60 px-4 py-3 text-left opacity-60 transition hover:opacity-100"
        >
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Next · Section {pad2(sectionIndex + 2)} of {pad2(totalSections)}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">{nextSection.label}</span>
            {nextSectionCompletion && (
              <Badge variant="outline" className="font-normal">
                {nextSectionCompletion.filled}/{nextSectionCompletion.total}
              </Badge>
            )}
          </div>
        </button>
      )}
    </section>
  );
}

function SectionBody({ section }: { section: Tree }) {
  const { actions } = useWorkspace();
  const fieldChildren = section.children.filter((c) => c.kind === "field");
  return (
    <div className="space-y-4">
      {section.children.map((child) => {
        if (child.kind === "subsection") {
          return <SubsectionBlock key={child.id} subsection={child} />;
        }
        if (child.kind === "field") {
          const idx = fieldChildren.indexOf(child);
          return (
            <FieldOrRepeater
              key={child.id}
              node={child}
              fieldIndex={idx}
              fieldTotal={fieldChildren.length}
            />
          );
        }
        return null;
      })}
      <AddAdHocFieldButton parentNodeId={section.id} onAdded={actions.invalidate} />
    </div>
  );
}

function SubsectionBlock({ subsection }: { subsection: Tree }) {
  const { actions } = useWorkspace();
  const fields = subsection.children.filter((n) => n.kind === "field");
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{subsection.label}</h3>
      {fields.map((node, idx) => (
        <FieldOrRepeater key={node.id} node={node} fieldIndex={idx} fieldTotal={fields.length} />
      ))}
      <AddAdHocFieldButton parentNodeId={subsection.id} onAdded={actions.invalidate} />
    </div>
  );
}
