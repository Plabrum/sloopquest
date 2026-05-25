import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { useAttachSurveyMedia } from "@/hooks/use-attach-survey-media";

type Props = {
  surveyId: string;
  nodeId?: string | null;
  /** Camera mode: capture="environment" for rear camera, undefined for library. */
  mode?: "camera" | "library";
  label?: string;
  size?: "sm" | "xs";
};

export function CapturePhotoButton({
  surveyId,
  nodeId = null,
  mode = "library",
  label,
  size = "sm",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { attachFiles, status } = useAttachSurveyMedia(surveyId);
  const pending = status === "uploading";

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      await attachFiles(Array.from(files), { nodeId });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const displayLabel = label ?? (mode === "camera" ? "📷 Camera" : "🖼️ Upload");

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={mode === "camera" ? "environment" : undefined}
        multiple={mode === "library"}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        className={size === "xs" ? "h-6 px-2 text-xs text-muted-foreground" : "text-xs"}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? "Uploading…" : displayLabel}
      </Button>
    </>
  );
}
