import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useActionsActionGroupExecuteAction } from "@/openapi/actions/actions";
import { getErrorMessage } from "@/lib/error-handler";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComposeDrawer({ open, onOpenChange }: Props) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const queryClient = useQueryClient();
  const mutation = useActionsActionGroupExecuteAction({
    mutation: {
      onSuccess: () => {
        toast.success("Email queued");
        queryClient.invalidateQueries({ predicate: keyMatches("/email-threads") });
        setTo("");
        setSubject("");
        setBody("");
        onOpenChange(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    },
  });

  const submit = () => {
    const recipients = to
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (recipients.length === 0 || !subject.trim() || !body.trim()) return;
    mutation.mutate({
      actionGroup: "email_thread_actions",
      data: {
        action: "email_thread_actions__compose",
        data: { to: recipients, subject: subject.trim(), body_text: body },
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New email</SheetTitle>
          <SheetDescription>
            Sent through your linked address. Multiple recipients can be separated by commas.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex min-h-0 flex-1 flex-col gap-3 px-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compose-to">To</Label>
            <Input
              id="compose-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compose-subject">Subject</Label>
            <Input
              id="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="compose-body">Message</Label>
            <Textarea
              id="compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
              className="min-h-0 flex-1 resize-none"
            />
          </div>
        </form>
        <SheetFooter className="flex-row justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending || !to.trim() || !subject.trim() || !body.trim()}>
            <Send className="size-4" />
            {mutation.isPending ? "Sending…" : "Send"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function keyMatches(prefix: string) {
  return (query: { queryKey: unknown }) =>
    Array.isArray(query.queryKey) &&
    typeof query.queryKey[0] === "string" &&
    (query.queryKey[0] as string).startsWith(prefix);
}
