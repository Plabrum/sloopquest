import * as React from "react";
import { toast } from "sonner";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { actionsActionGroupExecuteAction } from "@/openapi/actions/actions";
import { ActionGroupType } from "@/openapi/litestarAPI.schemas";
import { listClient } from "@/openapi/client/client";
import { listInvoice } from "@/openapi/invoice/invoice";
import { listReport } from "@/openapi/report/report";
import { listSurveyTemplate } from "@/openapi/survey-templates/survey-templates";
import { listSurvey } from "@/openapi/survey/survey";
import { listUser } from "@/openapi/user/user";
import { listVessel } from "@/openapi/vessel/vessel";

const ENTITY_LOADERS: Record<string, () => Promise<ComboboxOption[]>> = {
  Vessel: () =>
    listVessel({ limit: 200 }).then((r) =>
      r.items.map((v) => ({ value: v.id, label: v.name ?? v.id })),
    ),
  Client: () =>
    listClient({ limit: 200 }).then((r) =>
      r.items.map((c) => ({ value: c.id, label: c.display_name ?? c.id })),
    ),
  User: () =>
    listUser({ limit: 200 }).then((r) =>
      r.items.map((u) => ({ value: u.id, label: u.name })),
    ),
  Survey: () =>
    listSurvey({ limit: 200 }).then((r) =>
      r.items.map((s) => ({
        value: s.id,
        label: `${s.survey_type} — ${s.state}`,
      })),
    ),
  SurveyTemplate: () =>
    listSurveyTemplate({ limit: 200 }).then((r) =>
      r.items.map((t) => ({ value: t.id, label: t.name ?? t.id })),
    ),
  Invoice: () =>
    listInvoice({ limit: 200 }).then((r) =>
      r.items.map((i) => ({
        value: i.id,
        label: i.invoice_number ?? i.id,
      })),
    ),
  Report: () =>
    listReport({ limit: 200 }).then((r) =>
      r.items.map((rep) => ({ value: rep.id, label: rep.title ?? rep.id })),
    ),
};

function parseActionGroup(createAction: string): ActionGroupType | null {
  // "vessel_actions__create" → "vessel_actions"
  const parts = createAction.split("__");
  if (parts.length < 2) return null;
  const group = parts.slice(0, -1).join("__");
  return (ActionGroupType as Record<string, string>)[group] as ActionGroupType ?? null;
}

interface EntityComboboxProps {
  modelName: string;
  value: string;
  onChange: (value: string) => void;
  createAction?: string;
  placeholder?: string;
}

export function EntityCombobox({
  modelName,
  value,
  onChange,
  createAction,
  placeholder,
}: EntityComboboxProps) {
  const [options, setOptions] = React.useState<ComboboxOption[]>([]);
  const [creating, setCreating] = React.useState(false);

  const loadOptions = React.useCallback(async (): Promise<ComboboxOption[]> => {
    const loader = ENTITY_LOADERS[modelName];
    if (!loader) return [];
    const results = await loader();
    setOptions(results);
    return results;
  }, [modelName]);

  React.useEffect(() => {
    let cancelled = false;
    loadOptions().then((results) => {
      if (!cancelled) setOptions(results);
    });
    return () => {
      cancelled = true;
    };
  }, [loadOptions]);

  const handleCreate = React.useCallback(
    async (name: string) => {
      if (!createAction) return;
      const actionGroup = parseActionGroup(createAction);
      if (!actionGroup) return;

      setCreating(true);
      try {
        const res = await actionsActionGroupExecuteAction(actionGroup, {
          action: createAction,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { name } as any,
        });
        const fresh = await loadOptions();
        if (res.created_id) {
          const match = fresh.find((o) => o.value === res.created_id);
          if (match) onChange(match.value);
        }
      } catch {
        toast.error(`Failed to create ${modelName}`);
      } finally {
        setCreating(false);
      }
    },
    [createAction, loadOptions, modelName, onChange],
  );

  return (
    <Combobox
      value={value}
      onChange={onChange}
      suggestions={options}
      placeholder={placeholder ?? `Select ${modelName}…`}
      allowFreeform={false}
      disabled={creating}
      onCreateOption={createAction ? handleCreate : undefined}
      createLabel={`Create new ${modelName}`}
    />
  );
}
