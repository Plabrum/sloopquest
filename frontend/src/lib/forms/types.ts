import type { DefaultValues } from "react-hook-form";

/**
 * Standard props for all generated action form components.
 * Matches the signature expected by the action registry's render function.
 */
export interface GeneratedFormProps<T extends object> {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: T) => void;
  isSubmitting: boolean;
  actionLabel: string;
  defaultValues?: DefaultValues<T>;
}
