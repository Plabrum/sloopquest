import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MagicLinkFormProps {
  email: string;
  isSubmitting: boolean;
  onEmailChange: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function MagicLinkForm({
  email,
  isSubmitting,
  onEmailChange,
  onSubmit,
}: MagicLinkFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send magic link"}
      </Button>
    </form>
  );
}
