import { useState } from "react";
import { addMinutes } from "date-fns";
import { Plus, X } from "lucide-react";
import { createTypedForm } from "@/lib/forms/base";
import { Button } from "@/components/ui/button";
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
  address_line1: string | null;
  address_line2: string | null;
  address_city: string | null;
  address_region: string | null;
  address_postal_code: string | null;
  address_country: string | null;
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

function buildAddress(values: CreateFormValues): AddressInput | null {
  const line1 = values.address_line1?.trim();
  const city = values.address_city?.trim();
  const region = values.address_region?.trim();
  const postal = values.address_postal_code?.trim();
  if (!line1 && !city && !region && !postal) return null;
  return {
    line1: line1 ?? "",
    line2: values.address_line2?.trim() || null,
    city: city ?? "",
    region: region ?? "",
    postal_code: postal ?? "",
    country: values.address_country?.trim() || "US",
  };
}

export function CalendarEventActionsCreateForm(
  props: GeneratedFormProps<CreateCalendarEventData>,
) {
  const [showAddress, setShowAddress] = useState(false);

  const handleSubmit = (values: CreateFormValues) => {
    const start = new Date(values.start);
    const minutes = Number(values.duration_minutes) || 60;
    const end = addMinutes(start, minutes);
    props.onSubmit({
      start: start.toISOString(),
      end: end.toISOString(),
      all_day: values.all_day,
      name: values.name || null,
      address: showAddress ? buildAddress(values) : null,
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
        address_country: "US",
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

      {showAddress ? (
        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Address</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddress(false)}
            >
              <X className="size-4" />
              Remove
            </Button>
          </div>
          <_create.FormString name="address_line1" label="Street" />
          <_create.FormString name="address_line2" label="Apt, suite, etc." />
          <div className="grid grid-cols-2 gap-2">
            <_create.FormString name="address_city" label="City" />
            <_create.FormString name="address_region" label="State/Region" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <_create.FormString name="address_postal_code" label="Postal code" />
            <_create.FormString name="address_country" label="Country" />
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddress(true)}
        >
          <Plus className="size-4" />
          Add address
        </Button>
      )}
    </_create.FormSheet>
  );
}
