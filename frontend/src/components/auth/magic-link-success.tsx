import { Button } from "@/components/ui/button";

interface MagicLinkSuccessProps {
  email: string;
  onTryAgain: () => void;
}

export function MagicLinkSuccess({ email, onTryAgain }: MagicLinkSuccessProps) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--status-active)]/10 ring-1 ring-[var(--status-active)]/30 text-xl">
        ✉
      </div>
      <div>
        <p className="font-display mb-2 text-lg font-normal text-foreground">
          Check your inbox
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We sent a magic link to{" "}
          <strong className="text-foreground">{email}</strong>. Click it to sign
          in securely.
        </p>
      </div>
      <Button variant="outline" className="w-full" onClick={onTryAgain}>
        Use a different email
      </Button>
    </div>
  );
}
