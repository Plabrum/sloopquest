/** MIME types accepted by FileUpload — survey photos and inspection documents. */
export const DEFAULT_ACCEPT: readonly string[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/heic",
  "image/webp",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
];

/** Survey photo subset — used by photo-only dropzones (hull, engine, etc.). */
export const PHOTO_ONLY_ACCEPT: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/heic",
  "image/webp",
];

/** 50 MB — survey photo bursts and multi-page inspection PDFs. Mirror the
 * backend `MAX_DOCUMENT_SIZE_BYTES` when the documents API lands. */
export const MAX_SIZE_BYTES = 50 * 1024 * 1024;
