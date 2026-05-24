import { createTypedForm } from "@/lib/forms/base";
import type { GeneratedFormProps } from "@/lib/forms/types";
import type { CreateSurveyTemplateData, UpdateSurveyTemplateData } from "@/openapi/litestarAPI.schemas";
import { DynamicFormBuilder } from "@/components/dynamic-form-builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const _create = createTypedForm<CreateSurveyTemplateData>();
const _update = createTypedForm<UpdateSurveyTemplateData>();

function TagsInput({
  value,
  onChange,
}: {
  value: string[] | undefined;
  onChange: (v: string[]) => void;
}) {
  const tags = value ?? [];
  const raw = tags.join(", ");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const parts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
    onChange(parts);
  }

  return (
    <div className="space-y-1">
      <Label>Tags</Label>
      <Input
        value={raw}
        onChange={handleChange}
        placeholder="e.g. pre_purchase, damage"
        className="mt-1"
      />
    </div>
  );
}

export function SurveyTemplateCreateForm(props: GeneratedFormProps<CreateSurveyTemplateData>) {
  return (
    <_create.FormSheet
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.actionLabel}
      onSubmit={props.onSubmit}
      defaultValues={props.defaultValues}
      isSubmitting={props.isSubmitting}
    >
      <_create.FormString name="name" label="Name" required />
      <_create.FormCustom name="tags">
        {({ value, onChange }) => (
          <TagsInput
            value={value as string[] | undefined}
            onChange={onChange as (v: string[]) => void}
          />
        )}
      </_create.FormCustom>
      <_create.FormCustom name="definition">
        {({ value, onChange }) => (
          <div className="space-y-1">
            <Label>Form Definition</Label>
            <div className="mt-2">
              <DynamicFormBuilder
                value={value ?? { sections: [] }}
                onChange={onChange}
              />
            </div>
          </div>
        )}
      </_create.FormCustom>
    </_create.FormSheet>
  );
}

export function SurveyTemplateUpdateForm(props: GeneratedFormProps<UpdateSurveyTemplateData>) {
  return (
    <_update.FormSheet
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.actionLabel}
      onSubmit={props.onSubmit}
      defaultValues={props.defaultValues}
      isSubmitting={props.isSubmitting}
    >
      <_update.FormString name="name" label="Name" required />
      <_update.FormCustom name="tags">
        {({ value, onChange }) => (
          <TagsInput
            value={value as string[] | undefined}
            onChange={onChange as (v: string[]) => void}
          />
        )}
      </_update.FormCustom>
      <_update.FormCustom name="definition">
        {({ value, onChange }) => (
          <div className="space-y-1">
            <Label>Form Definition</Label>
            <div className="mt-2">
              <DynamicFormBuilder
                value={value ?? { sections: [] }}
                onChange={onChange}
              />
            </div>
          </div>
        )}
      </_update.FormCustom>
    </_update.FormSheet>
  );
}
