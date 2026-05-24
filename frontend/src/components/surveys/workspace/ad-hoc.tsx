import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionsActionGroupExecuteAction } from "@/openapi/actions/actions";

const TYPES = ["text", "longtext", "number", "boolean", "select", "date"] as const;

export function AddAdHocFieldButton({
  parentNodeId,
  onAdded,
}: {
  parentNodeId: string;
  onAdded?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("text");
  const [options, setOptions] = useState("");
  const execute = useActionsActionGroupExecuteAction();

  async function submit() {
    if (!label.trim()) return;
    await execute.mutateAsync({
      actionGroup: "form_node_actions",
      data: {
        action: "form_node_actions__add_ad_hoc_field",
        data: {
          parent_id: parentNodeId,
          label,
          type,
          options: type === "select" ? options.split(",").map((s) => s.trim()).filter(Boolean) : [],
          required: false,
        },
      } as never,
    });
    setLabel("");
    setOptions("");
    setOpen(false);
    onAdded?.();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">+ Add field</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as never)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {type === "select" && (
          <div className="space-y-1">
            <Label className="text-xs">Options (comma-separated)</Label>
            <Input value={options} onChange={(e) => setOptions(e.target.value)} />
          </div>
        )}
        <Button size="sm" onClick={submit} disabled={!label.trim() || execute.isPending}>
          Add field
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function AddAdHocSectionButton({
  ownerType,
  ownerId,
  onAdded,
}: {
  ownerType: string;
  ownerId: string;
  onAdded?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const execute = useActionsActionGroupExecuteAction();

  async function submit() {
    if (!title.trim()) return;
    await execute.mutateAsync({
      actionGroup: "form_node_actions",
      data: {
        action: "form_node_actions__add_ad_hoc_section",
        data: {
          owner_type: ownerType,
          owner_id: ownerId,
          title,
        },
      } as never,
    });
    setTitle("");
    setOpen(false);
    onAdded?.();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">+ Add section</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Section title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Button size="sm" onClick={submit} disabled={!title.trim() || execute.isPending}>
          Add section
        </Button>
      </PopoverContent>
    </Popover>
  );
}
