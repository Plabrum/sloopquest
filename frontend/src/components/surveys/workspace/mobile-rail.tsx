import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FormNodeRef, SurveyDetail, SurveyMediaListItem } from "@/openapi/litestarAPI.schemas";
import { FindingsList } from "./findings-list";
import { PhotosRail } from "./photos-rail";
import { VesselCard } from "./vessel-card";

export function MobileRail({
  mediaItems,
  unassignedMedia,
  data,
  findings,
  sectionAncestor,
}: {
  mediaItems: SurveyMediaListItem[];
  unassignedMedia: SurveyMediaListItem[];
  data: SurveyDetail;
  findings: FormNodeRef[];
  sectionAncestor: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          className="fixed bottom-4 right-4 z-30 rounded-full shadow-lg md:hidden"
        >
          Rail
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] p-0">
        <SheetHeader className="border-b px-4 py-2">
          <SheetTitle className="text-sm">Survey rail</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="photos" className="flex h-full flex-col">
          <TabsList className="mx-2 mt-2 grid grid-cols-3">
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="vessel">Vessel</TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-y-auto p-3">
            <TabsContent value="photos" className="space-y-3">
              <PhotosRail items={mediaItems} unassigned={unassignedMedia} sectionLabel={null} />
            </TabsContent>
            <TabsContent value="findings" className="space-y-3">
              <FindingsList findings={findings} sectionAncestor={sectionAncestor} />
            </TabsContent>
            <TabsContent value="vessel" className="space-y-3">
              <VesselCard data={data} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
