import { useCallback, useState } from "react";

import {
  mediaPresignedUploadRequestPresignedUpload,
  mediaRegisterRegisterMedia,
} from "@/openapi/media/media";

export type MediaUploadStatus =
  | "idle"
  | "uploading"
  | "registering"
  | "complete"
  | "error";

export type MediaUploadResult = {
  mediaId: string;
  fileKey: string;
};

export type UseMediaUploadReturn = {
  uploadFile: (
    file: File,
    options?: {
      autoRegister?: boolean;
      onSuccess?: (result: MediaUploadResult) => void | Promise<void>;
    },
  ) => Promise<MediaUploadResult | null>;
  status: MediaUploadStatus;
  progress: number;
  error: string | null;
  reset: () => void;
};

export function useMediaUpload(): UseMediaUploadReturn {
  const [status, setStatus] = useState<MediaUploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setError(null);
  }, []);

  const uploadFile = useCallback(
    async (
      file: File,
      options?: {
        autoRegister?: boolean;
        onSuccess?: (result: MediaUploadResult) => void | Promise<void>;
      },
    ): Promise<MediaUploadResult | null> => {
      const { autoRegister = true, onSuccess } = options ?? {};
      const contentType = file.type || "application/octet-stream";

      try {
        setStatus("uploading");
        setProgress(10);
        setError(null);

        const presigned = await mediaPresignedUploadRequestPresignedUpload({
          file_name: file.name,
          content_type: contentType,
          file_size: file.size,
        });

        setProgress(30);

        const uploadResponse = await fetch(presigned.upload_url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": contentType },
        });
        if (!uploadResponse.ok) {
          throw new Error(`Upload to S3 failed: ${uploadResponse.status}`);
        }

        setProgress(60);

        let result: MediaUploadResult;
        if (autoRegister) {
          setStatus("registering");
          const registered = await mediaRegisterRegisterMedia({
            file_key: presigned.file_key,
            file_name: file.name,
            file_size: file.size,
            mime_type: contentType,
          });
          result = { mediaId: registered.id, fileKey: presigned.file_key };
        } else {
          result = { mediaId: "", fileKey: presigned.file_key };
        }

        setProgress(100);
        setStatus("complete");
        await onSuccess?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to upload media";
        setStatus("error");
        setError(message);
        return null;
      }
    },
    [],
  );

  return { uploadFile, status, progress, error, reset };
}
