import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useActionExecutor } from "@/hooks/actions/use-action-executor";
import { useDropTarget } from "@/hooks/use-drop-target";
import type { ActionDTO } from "@/lib/actions/types";
import type {
  SectionCompletion,
  SurveyFormNodeRef,
  SurveyMediaListItem,
} from "@/openapi/litestarAPI.schemas";
import { AddAdHocFieldButton } from "./ad-hoc";
import { DRAG_MEDIA_TYPE, FieldOrRepeater, pad2, type Tree } from "./field";
import { AddFindingButton } from "./finding-popover";

const ASSIGN_MEDIA: ActionDTO = { action: "survey_media_actions__assign", label: "Assign media" };

type SectionDeps = {
  surveyId: string;
  findingsByParent: Map<string, SurveyFormNodeRef[]>;
  mediaByNode: Map<string, SurveyMediaListItem[]>;
  unassignedMedia: SurveyMediaListItem[];
  goToSection: (sectionId: string) => void;
};

export function SectionBlock({
  section,
  sectionIndex,
  totalSections,
  previousSection,
  previousSectionCompletion,
  nextSection,
  nextSectionCompletion,
  completion,
  surveyId,
  findingsByParent,
  mediaByNode,
  unassignedMedia,
  goToSection,
}: {
  section: Tree;
  sectionIndex: number;
  totalSections: number;
  previousSection?: Tree | null;
  previousSectionCompletion?: SectionCompletion | undefined;
  nextSection: Tree | null;
  nextSectionCompletion: SectionCompletion | undefined;
  completion: SectionCompletion | undefined;
} & SectionDeps) {
  const hidden = section.condition_visible === false;
  const [overridden, setOverridden] = useState(false);
  const show = !hidden || overridden;
  const mediaExecutor = useActionExecutor({ actionGroup: "survey_media_actions" });
  const drop = useDropTarget(DRAG_MEDIA_TYPE, (mediaId) =>
    mediaExecutor.executeAction(
      ASSIGN_MEDIA,
      { action: ASSIGN_MEDIA.action, data: { node_id: section.id } } as never,
      { silent: true, objectId: mediaId },
    ),
  );

  const progress = completion ? `${pad2(completion.filled)} / ${pad2(completion.total)}` : null;

  return (
    <section
      id={`section-${section.id}`}
      className={`section-enter flex min-h-[calc(100vh-3.5rem)] flex-col py-8 ${drop.isOver ? "ring-2 ring-ring rounded-sm" : ""}`}
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
    >
      {previousSection && (
        <button
          type="button"
          onClick={() => goToSection(previousSection.id)}
          className="mb-8 flex w-full items-center gap-3 text-left opacity-50 transition hover:opacity-90"
        >
          <span className="t-kicker">
            ← Prev · Section {pad2(sectionIndex)}
          </span>
          <span className="font-display text-[20px] font-light text-foreground">
            {previousSection.label}
          </span>
          {previousSectionCompletion && (
            <span className="ml-auto font-mono text-[11px] text-muted-foreground">
              {pad2(previousSectionCompletion.filled)} / {pad2(previousSectionCompletion.total)}
            </span>
          )}
        </button>
      )}

      <div className="sticky top-0 z-10 mb-5 flex items-center justify-between gap-3 border-b border-border bg-background pt-4 pb-4">
        <div>
          <div className="t-kicker">
            Section {pad2(sectionIndex + 1)} of {pad2(totalSections)}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <h2 className="font-display text-[26px] font-light leading-none text-foreground">
              {section.label}
            </h2>
            {progress && (
              <span className="font-mono text-[12px] text-muted-foreground">{progress}</span>
            )}
          </div>
        </div>
        {show && <AddFindingButton parentNodeId={section.id} />}
      </div>

      {!show ? (
        <div className="rounded-sm border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
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
        <SectionBody
          section={section}
          surveyId={surveyId}
          findingsByParent={findingsByParent}
          mediaByNode={mediaByNode}
          unassignedMedia={unassignedMedia}
        />
      )}

      {nextSection && (
        <button
          type="button"
          onClick={() => goToSection(nextSection.id)}
          className="mt-8 flex w-full items-center gap-3 text-left opacity-50 transition hover:opacity-90"
        >
          <span className="t-kicker">
            Next · Section {pad2(sectionIndex + 2)}
          </span>
          <span className="font-display text-[20px] font-light text-foreground">
            {nextSection.label}
          </span>
          {nextSectionCompletion && (
            <span className="ml-auto font-mono text-[11px] text-muted-foreground">
              {pad2(nextSectionCompletion.filled)} / {pad2(nextSectionCompletion.total)}
            </span>
          )}
        </button>
      )}
    </section>
  );
}

type FieldDeps = {
  surveyId: string;
  findingsByParent: Map<string, SurveyFormNodeRef[]>;
  mediaByNode: Map<string, SurveyMediaListItem[]>;
  unassignedMedia: SurveyMediaListItem[];
};

function SectionBody({
  section,
  ...deps
}: { section: Tree } & FieldDeps) {
  const fieldChildren = section.children.filter((c) => c.kind === "field");
  return (
    <div className="space-y-4">
      {section.children.map((child) => {
        if (child.kind === "subsection") {
          return <SubsectionBlock key={child.id} subsection={child} {...deps} />;
        }
        if (child.kind === "field") {
          const idx = fieldChildren.indexOf(child);
          return (
            <FieldOrRepeater
              key={child.id}
              node={child}
              fieldIndex={idx}
              fieldTotal={fieldChildren.length}
              {...deps}
            />
          );
        }
        return null;
      })}
      <AddAdHocFieldButton parentNodeId={section.id} />
    </div>
  );
}

function SubsectionBlock({
  subsection,
  ...deps
}: { subsection: Tree } & FieldDeps) {
  const fields = subsection.children.filter((n) => n.kind === "field");
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{subsection.label}</h3>
      {fields.map((node, idx) => (
        <FieldOrRepeater
          key={node.id}
          node={node}
          fieldIndex={idx}
          fieldTotal={fields.length}
          {...deps}
        />
      ))}
      <AddAdHocFieldButton parentNodeId={subsection.id} />
    </div>
  );
}
