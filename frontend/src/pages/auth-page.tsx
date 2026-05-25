import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { MagicLinkSuccess } from "@/components/auth/magic-link-success";
import { PublicAuthShell } from "@/components/auth/public-auth-shell";
import { getErrorMessage } from "@/lib/error-handler";
import { customInstance } from "@/openapi/custom-instance";

type MagicLinkResponse = Record<string, string>;

function requestMagicLink(email: string) {
  return customInstance<MagicLinkResponse>({
    url: "/auth/magic-link/request",
    method: "POST",
    data: { email },
  });
}

function SessionExpiredNotice() {
  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-[2px] border border-[var(--color-brass-deep)]/40 bg-[var(--color-brass)]/10 px-4 py-3 text-sm"
      role="status"
    >
      <Clock
        className="mt-0.5 size-4 shrink-0 text-[var(--color-brass-deep)]"
        aria-hidden="true"
      />
      <div>
        <p className="font-medium text-foreground">Your session expired</p>
        <p className="text-muted-foreground">
          For your security, please sign in again to continue.
        </p>
      </div>
    </div>
  );
}

export function AuthPage() {
  const { reason } = useSearch({ from: "/_public/auth" });
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: { email: string }) => requestMagicLink(data.email),
    onSuccess: (data) => {
      const redirect = data["redirect"];
      if (redirect) {
        window.location.href = redirect;
        return;
      }
      setMagicLinkSent(true);
    },
    onError: (err) =>
      toast.error(
        getErrorMessage(err, "Failed to send magic link. Please try again."),
      ),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ email });
  }

  function handleTryAgain() {
    setMagicLinkSent(false);
    setEmail("");
  }

  const showSessionExpired = reason === "session-expired" && !magicLinkSent;

  return (
    <PublicAuthShell>
      <div className="w-full max-w-sm rounded-[2px] border border-border bg-card p-10">
        {magicLinkSent ? (
          <MagicLinkSuccess email={email} onTryAgain={handleTryAgain} />
        ) : (
          <>
            {showSessionExpired && <SessionExpiredNotice />}
            <p className="t-kicker mb-3">Sign in</p>
            <h1 className="font-display mb-3 text-[26px] leading-tight font-normal text-foreground">
              {showSessionExpired
                ? "Sign back in"
                : "Welcome back, surveyor"}
            </h1>
            <p className="mb-7 font-serif text-[15px] leading-relaxed text-muted-foreground">
              Enter your email and we&rsquo;ll send a secure magic link.
            </p>
            <MagicLinkForm
              email={email}
              isSubmitting={mutation.isPending}
              onEmailChange={setEmail}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </div>
    </PublicAuthShell>
  );
}
