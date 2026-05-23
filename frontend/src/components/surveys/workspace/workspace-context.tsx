import { createContext, useContext } from "react";
import type { FormNodeRef, SurveyMediaListItem } from "@/openapi/litestarAPI.schemas";
import type { SurveyActions } from "./use-survey-actions";

export type WorkspaceCtx = {
  surveyId: string;
  actions: SurveyActions;
  mediaByNode: Map<string, SurveyMediaListItem[]>;
  unassignedMedia: SurveyMediaListItem[];
  findingsByParent: Map<string, FormNodeRef[]>;
};

const WorkspaceContext = createContext<WorkspaceCtx | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceCtx;
  children: React.ReactNode;
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceCtx {
  const v = useContext(WorkspaceContext);
  if (!v) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return v;
}
