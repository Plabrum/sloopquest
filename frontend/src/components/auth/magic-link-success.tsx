import { Button } from "@/components/ui/button";

interface MagicLinkSuccessProps {
  email: string;
  onTryAgain: () => void;
}

export function MagicLinkSuccess({ email, onTryAgain }: MagicLinkSuccessProps) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-[2px] border border-[var(--color-brass)]/40 bg-[var(--color-brass)]/10 text-xl text-[var(--color-brass-deep)]">
        ✉
      </div>
      <p className="t-kicker">Magic link sent</p>
      <div>
        <p className="font-display mb-2 text-[22px] font-normal text-foreground">
          Check your inbox
        </p>
        <p className="font-serif text-[15px] leading-relaxed text-muted-foreground">
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
