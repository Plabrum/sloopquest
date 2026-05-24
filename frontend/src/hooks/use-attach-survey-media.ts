import { useCallback, useState } from "react";

import { actionsActionGroupExecuteAction } from "@/openapi/actions/actions";

import { useMediaUpload } from "./use-media-upload";

export type AttachSurveyMediaStatus = "idle" | "uploading" | "complete" | "error";

export type UseAttachSurveyMediaReturn = {
  attachFiles: (
    files: File[],
    options?: { nodeId?: string | null; caption?: string | null },
  ) => Promise<void>;
  status: AttachSurveyMediaStatus;
  pendingCount: number;
  completedCount: number;
  error: string | null;
  reset: () => void;
};

export function useAttachSurveyMedia(
  surveyId: string,
  onAttached?: () => Promise<unknown> | void,
): UseAttachSurveyMediaReturn {
  const { uploadFile, reset: resetUpload } = useMediaUpload();
  const [status, setStatus] = useState<AttachSurveyMediaStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    resetUpload();
    setStatus("idle");
    setPendingCount(0);
    setCompletedCount(0);
    setError(null);
  }, [resetUpload]);

  const attachFiles = useCallback(
    async (
      files: File[],
      options?: { nodeId?: string | null; caption?: string | null },
    ) => {
      if (files.length === 0) return;
      const { nodeId = null, caption = null } = options ?? {};

      setStatus("uploading");
      setPendingCount(files.length);
      setCompletedCount(0);
      setError(null);

      try {
        for (const file of files) {
          const result = await uploadFile(file, { autoRegister: true });
          if (!result) {
            throw new Error(`Failed to upload ${file.name}`);
          }
          await actionsActionGroupExecuteAction("survey_media_actions", {
            action: "survey_media_actions__attach",
            data: {
              survey_id: surveyId,
              media_id: result.mediaId,
              node_id: nodeId,
              caption,
              sort_order: 0,
            },
          } as never);
          setCompletedCount((n) => n + 1);
        }
        setStatus("complete");
        await onAttached?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to attach media";
        setStatus("error");
        setError(message);
      }
    },
    [surveyId, uploadFile, onAttached],
  );

  return { attachFiles, status, pendingCount, completedCount, error, reset };
}
