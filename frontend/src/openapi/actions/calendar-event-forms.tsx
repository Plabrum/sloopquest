import { useState } from "react";
import { addMinutes } from "date-fns";
import { AddressFields } from "@/components/calendar/address-fields";
import { createTypedForm } from "@/lib/forms/base";
import type { GeneratedFormProps } from "@/lib/forms/types";
import type {
  AddressInput,
  CreateCalendarEventData,
} from "@/openapi/litestarAPI.schemas";

interface CreateFormValues {
  start: string;
  duration_minutes: string;
  all_day: boolean;
  name: string | null;
  description: string | null;
  attendees: string[];
  survey_id: string | null;
  client_id: string | null;
}

const _create = createTypedForm<CreateFormValues>();

const DURATION_OPTIONS: { value: string; label: string }[] = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
  { value: "240", label: "4 hours" },
  { value: "480", label: "8 hours" },
];

export function CalendarEventActionsCreateForm(
  props: GeneratedFormProps<CreateCalendarEventData>,
) {
  const [address, setAddress] = useState<AddressInput | null>(null);

  const handleSubmit = (values: CreateFormValues) => {
    const start = new Date(values.start);
    const minutes = Number(values.duration_minutes) || 60;
    const end = addMinutes(start, minutes);
    props.onSubmit({
      start: start.toISOString(),
      end: end.toISOString(),
      all_day: values.all_day,
      name: values.name || null,
      address,
      description: values.description || null,
      attendees: values.attendees ?? [],
      survey_id: values.survey_id || null,
      client_id: values.client_id || null,
    });
  };

  return (
    <_create.FormSheet
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.actionLabel}
      onSubmit={handleSubmit}
      isSubmitting={props.isSubmitting}
      defaultValues={{
        duration_minutes: "60",
        all_day: false,
        attendees: [],
      }}
    >
      <_create.FormString name="name" label="Name" />
      <_create.FormDatetime name="start" label="Start" required includeTime />
      <_create.FormSelect
        name="duration_minutes"
        label="Duration"
        required
        options={DURATION_OPTIONS}
      />
      <_create.FormCheckbox name="all_day" label="All Day" />
      <_create.FormText name="description" label="Description" />
      <_create.FormStringList name="attendees" label="Attendees" />
      <_create.FormEntityCombobox name="survey_id" label="Survey" modelName="Survey" />
      <_create.FormEntityCombobox name="client_id" label="Client" modelName="Client" />
      <AddressFields value={address} onChange={setAddress} />
    </_create.FormSheet>
  );
}
