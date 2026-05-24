import {
  Files,
  Camera,
  ClipboardList,
  Wrench,
  FileBadge,
  Shield,
  Folder,
  type LucideIcon,
} from "lucide-react";

/**
 * Frontend metadata for upload document categories.
 *
 * Hand-maintained until the backend documents API exposes a shared enum
 * via codegen — at that point this map should key off the generated
 * `DocumentCategory` and the local union below can be deleted.
 */
export type DocumentCategory =
  | "survey_photo"
  | "inspection_report"
  | "maintenance_record"
  | "ownership_doc"
  | "insurance"
  | "other";

export interface CategoryMeta {
  label: string;
  icon: LucideIcon;
}

export const DOCUMENT_CATEGORY_META: Record<DocumentCategory, CategoryMeta> = {
  survey_photo: { label: "Survey Photo", icon: Camera },
  inspection_report: { label: "Inspection Report", icon: ClipboardList },
  maintenance_record: { label: "Maintenance Record", icon: Wrench },
  ownership_doc: { label: "Registration / Title", icon: FileBadge },
  insurance: { label: "Insurance", icon: Shield },
  other: { label: "Other", icon: Folder },
};

export const DOCUMENT_CATEGORY_ORDER: DocumentCategory[] = [
  "survey_photo",
  "inspection_report",
  "maintenance_record",
  "ownership_doc",
  "insurance",
  "other",
];

export const ALL_CATEGORIES_ID = "all" as const;
export const ALL_CATEGORIES_META: CategoryMeta = { label: "All", icon: Files };
