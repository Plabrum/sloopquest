import { useCallback, useState } from "react";
import { useSetPageSubcrumb } from "@/stores/page-subcrumb";
import type { SurveyDetail } from "@/openapi/litestarAPI.schemas";
import { AddAdHocSectionButton } from "./ad-hoc";
import { AiSurveyorEntry } from "./ai-surveyor";
import { FindingsList } from "./findings-list";
import { MobileRail } from "./mobile-rail";
import { PhotosRail } from "./photos-rail";
import { SectionBlock } from "./section-block";
import { SectionsRail } from "./sections-rail";
import { useSurveyActions } from "./use-survey-actions";
import { useSurveyMedia } from "./use-survey-media";
import { useSurveyTree } from "./use-survey-tree";
import { VesselCard } from "./vessel-card";

export function SurveyWorkspace({ data }: { data: SurveyDetail }) {
  const { sections, completion, findings, findingsByParent, sectionAncestor } = useSurveyTree(
    data.form_nodes,
    data.section_completion,
  );
  const actions = useSurveyActions(data.id);
  const media = useSurveyMedia(data);

  const [currentSectionId, setCurrentSectionId] = useState<string | null>(
    sections[0]?.id ?? null,
  );

  const currentIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === currentSectionId),
  );
  const currentSection = sections[currentIndex] ?? sections[0];
  const previousSection = currentIndex > 0 ? sections[currentIndex - 1] : null;
  const nextSection = sections[currentIndex + 1] ?? null;
  useSetPageSubcrumb(currentSection?.label ?? null);

  const goToSection = useCallback((sectionId: string) => {
    setCurrentSectionId(sectionId);
    const main = document.querySelector<HTMLElement>('main[data-slot="survey-main"]');
    main?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const sectionMediaItems = media.forSection(currentSectionId, sectionAncestor);

  return (
    <div className="relative h-[calc(100vh-3.5rem)] bg-background">
      <SectionsRail
        sections={sections}
        completion={completion}
        currentSectionId={currentSectionId}
        goToSection={goToSection}
      />
      <div className="grid h-full grid-cols-1 gap-0 md:grid-cols-[minmax(0,1fr)_32rem]">
        <main
          data-slot="survey-main"
          className="h-full min-w-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="mx-auto w-full max-w-5xl px-4 md:px-8">
            {currentSection && (
              <SectionBlock
                key={currentSection.id}
                section={currentSection}
                sectionIndex={currentIndex}
                totalSections={sections.length}
                previousSection={previousSection}
                previousSectionCompletion={
                  previousSection ? completion.get(previousSection.id) : undefined
                }
                nextSection={nextSection}
                nextSectionCompletion={
                  nextSection ? completion.get(nextSection.id) : undefined
                }
                completion={completion.get(currentSection.id)}
                surveyId={data.id}
                actions={actions}
                findingsByParent={findingsByParent}
                mediaByNode={media.byNode}
                unassignedMedia={media.unassigned}
                goToSection={goToSection}
              />
            )}

            {!nextSection && (
              <AddAdHocSectionButton
                ownerType="surveys"
                ownerId={data.id}
                onAdded={actions.invalidate}
              />
            )}
          </div>
        </main>

        <aside className="hidden h-full overflow-y-auto bg-sidebar/60 px-4 py-6 md:block md:border-l md:border-sidebar-border md:px-6 md:py-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <PhotosRail
            surveyId={data.id}
            onUploaded={actions.invalidate}
            items={sectionMediaItems}
            unassigned={media.unassigned}
            sectionLabel={currentSection?.label ?? null}
          />
          <FindingsList
            findings={findings}
            sectionAncestor={sectionAncestor}
            goToSection={goToSection}
          />
          <VesselCard data={data} />
          <AiSurveyorEntry />
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
  );
}
