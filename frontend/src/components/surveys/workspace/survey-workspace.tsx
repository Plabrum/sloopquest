import { useMemo, useState } from "react";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import type { SurveyDetail } from "@/openapi/litestarAPI.schemas";
import { AddAdHocSectionButton } from "./ad-hoc-buttons";
import { FindingsList } from "./findings-list";
import { MobileRail } from "./mobile-rail";
import { PhotosRail } from "./photos-rail";
import { SectionBlock } from "./section-block";
import { SectionsRail } from "./sections-rail";
import { useSurveyActions } from "./use-survey-actions";
import { useSurveyMedia } from "./use-survey-media";
import { useSurveyTree } from "./use-survey-tree";
import { VesselCard } from "./vessel-card";
import { WorkspaceProvider } from "./workspace-context";

export function SurveyWorkspace({ data }: { data: SurveyDetail }) {
  const { sections, completion, findings, findingsByParent, sectionAncestor } = useSurveyTree(
    data.form_nodes,
    data.section_completion,
  );
  const actions = useSurveyActions(data.id);
  const media = useSurveyMedia(data.id);

  const [currentSectionId, setCurrentSectionId] = useState<string | null>(
    sections[0]?.id ?? null,
  );
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);
  useScrollSpy(sectionIds, { hashPrefix: "section-", onCurrent: setCurrentSectionId });

  const currentSection = sections.find((s) => s.id === currentSectionId) ?? sections[0];
  const sectionMediaItems = media.forSection(currentSectionId, sectionAncestor);

  const workspaceValue = useMemo(
    () => ({
      surveyId: data.id,
      actions,
      mediaByNode: media.byNode,
      unassignedMedia: media.unassigned,
      findingsByParent,
    }),
    [data.id, actions, media.byNode, media.unassigned, findingsByParent],
  );

  return (
    <WorkspaceProvider value={workspaceValue}>
      <div className="relative bg-muted/30">
        <SectionsRail
          sections={sections}
          completion={completion}
          currentSectionId={currentSectionId}
        />

        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 pl-14 md:grid-cols-[1fr_320px]">
          <main className="space-y-6">
            {sections.map((section, idx) => (
              <SectionBlock
                key={section.id}
                section={section}
                sectionIndex={idx}
                totalSections={sections.length}
                nextSection={sections[idx + 1] ?? null}
                nextSectionCompletion={
                  sections[idx + 1] ? completion.get(sections[idx + 1].id) : undefined
                }
                completion={completion.get(section.id)}
              />
            ))}

            <AddAdHocSectionButton
              ownerType="surveys"
              ownerId={data.id}
              onAdded={actions.invalidate}
            />
          </main>

          <aside className="hidden sticky top-16 self-start space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto md:block">
            <PhotosRail
              items={sectionMediaItems}
              unassigned={media.unassigned}
              sectionLabel={currentSection?.label ?? null}
            />
            <FindingsList findings={findings} sectionAncestor={sectionAncestor} />
            <VesselCard data={data} />
          </aside>
        </div>

        <MobileRail
          mediaItems={media.items}
          unassignedMedia={media.unassigned}
          data={data}
          findings={findings}
          sectionAncestor={sectionAncestor}
        />
      </div>
    </WorkspaceProvider>
  );
}
