import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageTopBar } from "@/components/layout/page-topbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Suspense } from "react";
import { getErrorMessage } from "@/lib/error-handler";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import {
  describeRequirement,
  useAcceptConnectTos,
  useAttachExternalAccount,
  useConnectRequirements,
  useCreateConnectAccount,
  useUpdateConnectAccount,
  type UpdateConnectAccountPayload,
} from "@/lib/connect";

type BusinessType = "individual" | "company";

interface AddressForm {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface BusinessForm {
  name: string;
  phone: string;
  url: string;
  mcc: string;
  product_description: string;
  address: AddressForm;
}

interface PersonForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  dob_day: string;
  dob_month: string;
  dob_year: string;
  ssn_last_4: string;
  address: AddressForm;
}

interface BankForm {
  account_holder_name: string;
  routing_number: string;
  account_number: string;
}

const EMPTY_ADDRESS: AddressForm = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
};

const EMPTY_BUSINESS: BusinessForm = {
  name: "",
  phone: "",
  url: "",
  mcc: "",
  product_description: "",
  address: { ...EMPTY_ADDRESS },
};

const EMPTY_PERSON: PersonForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  dob_day: "",
  dob_month: "",
  dob_year: "",
  ssn_last_4: "",
  address: { ...EMPTY_ADDRESS },
};

const EMPTY_BANK: BankForm = {
  account_holder_name: "",
  routing_number: "",
  account_number: "",
};

type Step =
  | "business-type"
  | "business-details"
  | "person"
  | "bank"
  | "tos"
  | "confirmation";

const STEP_ORDER: Step[] = [
  "business-type",
  "business-details",
  "person",
  "bank",
  "tos",
  "confirmation",
];

function stepLabel(step: Step): string {
  switch (step) {
    case "business-type":
      return "Business type";
    case "business-details":
      return "Business details";
    case "person":
      return "Personal details";
    case "bank":
      return "Bank account";
    case "tos":
      return "Terms of service";
    case "confirmation":
      return "Confirmation";
  }
}

interface FieldErrors {
  [key: string]: string | undefined;
}

function validateRequired(
  fields: Record<string, string>,
  required: string[],
): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of required) {
    if (!fields[key] || fields[key].trim() === "") {
      errors[key] = "Required";
    }
  }
  return errors;
}

function AddressFields({
  prefix,
  value,
  errors,
  onChange,
}: {
  prefix: string;
  value: AddressForm;
  errors: FieldErrors;
  onChange: (next: AddressForm) => void;
}) {
  const update = (k: keyof AddressForm, v: string) =>
    onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label="Street address"
        name={`${prefix}.line1`}
        value={value.line1}
        error={errors[`${prefix}.line1`]}
        onChange={(v) => update("line1", v)}
        className="sm:col-span-2"
      />
      <Field
        label="Apt / suite"
        name={`${prefix}.line2`}
        value={value.line2}
        error={errors[`${prefix}.line2`]}
        onChange={(v) => update("line2", v)}
        className="sm:col-span-2"
        optional
      />
      <Field
        label="City"
        name={`${prefix}.city`}
        value={value.city}
        error={errors[`${prefix}.city`]}
        onChange={(v) => update("city", v)}
      />
      <Field
        label="State"
        name={`${prefix}.state`}
        value={value.state}
        error={errors[`${prefix}.state`]}
        onChange={(v) => update("state", v)}
      />
      <Field
        label="ZIP"
        name={`${prefix}.postal_code`}
        value={value.postal_code}
        error={errors[`${prefix}.postal_code`]}
        onChange={(v) => update("postal_code", v)}
      />
      <Field
        label="Country"
        name={`${prefix}.country`}
        value={value.country}
        error={errors[`${prefix}.country`]}
        onChange={(v) => update("country", v.toUpperCase())}
        maxLength={2}
        placeholder="US"
      />
    </div>
  );
}

function Field({
  label,
  name,
  value,
  error,
  onChange,
  type = "text",
  className,
  placeholder,
  maxLength,
  optional,
}: {
  label: string;
  name: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  optional?: boolean;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name} className="mb-1.5">
        {label}
        {optional && (
          <span className="text-xs text-muted-foreground">(optional)</span>
        )}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
      />
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

function StepHeader({ current }: { current: Step }) {
  const visible = STEP_ORDER;
  const idx = visible.indexOf(current);
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {visible.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <span
            className={
              i === idx
                ? "font-medium text-foreground"
                : i < idx
                  ? "text-foreground/70"
                  : ""
            }
          >
            {i + 1}. {stepLabel(step)}
          </span>
          {i < visible.length - 1 && <span>›</span>}
        </div>
      ))}
    </div>
  );
}

async function fetchClientIp(): Promise<string> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (!res.ok) throw new Error("ipify failed");
    const data = (await res.json()) as { ip?: string };
    if (!data.ip) throw new Error("no ip");
    return data.ip;
  } catch {
    return "0.0.0.0";
  }
}

function ConnectOnboardingFlow() {
  const navigate = useNavigate();
  const { data: requirements, refetch } = useConnectRequirements();
  const createAccount = useCreateConnectAccount();
  const updateAccount = useUpdateConnectAccount();
  const acceptTos = useAcceptConnectTos();
  const attachBank = useAttachExternalAccount();

  const [step, setStep] = useState<Step>("business-type");
  const [businessType, setBusinessType] = useState<BusinessType>("individual");
  const [business, setBusiness] = useState<BusinessForm>(EMPTY_BUSINESS);
  const [person, setPerson] = useState<PersonForm>(EMPTY_PERSON);
  const [bank, setBank] = useState<BankForm>(EMPTY_BANK);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const createTriggered = useRef(false);
  useEffect(() => {
    if (!requirements && !createTriggered.current) {
      createTriggered.current = true;
      createAccount.mutate(undefined, {
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }, [requirements, createAccount]);

  const stripeReady = useMemo(() => isStripeConfigured(), []);

  const goNext = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  };
  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  const handleBusinessDetailsSubmit = async () => {
    const fieldErrors: FieldErrors = {
      ...validateRequired(
        {
          name: business.name,
          phone: business.phone,
          url: business.url,
          mcc: business.mcc,
          product_description: business.product_description,
        },
        ["name", "phone", "url", "mcc", "product_description"],
      ),
      ...prefixed(
        validateRequired(business.address as unknown as Record<string, string>, [
          "line1",
          "city",
          "state",
          "postal_code",
          "country",
        ]),
        "address",
      ),
    };
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const payload: UpdateConnectAccountPayload = {
        business_type: businessType,
        individual: null,
        company:
          businessType === "company"
            ? {
                name: business.name,
                phone: business.phone,
                address: addressToPayload(business.address),
              }
            : null,
        business_profile: {
          mcc: business.mcc,
          url: business.url,
          product_description: business.product_description,
        },
      };
      await updateAccount.mutateAsync(payload);
      goNext();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePersonSubmit = async () => {
    const fieldErrors: FieldErrors = {
      ...validateRequired(
        {
          first_name: person.first_name,
          last_name: person.last_name,
          email: person.email,
          phone: person.phone,
          dob_day: person.dob_day,
          dob_month: person.dob_month,
          dob_year: person.dob_year,
          ssn_last_4: person.ssn_last_4,
        },
        [
          "first_name",
          "last_name",
          "email",
          "phone",
          "dob_day",
          "dob_month",
          "dob_year",
          "ssn_last_4",
        ],
      ),
      ...prefixed(
        validateRequired(person.address as unknown as Record<string, string>, [
          "line1",
          "city",
          "state",
          "postal_code",
          "country",
        ]),
        "address",
      ),
    };
    if (person.ssn_last_4 && !/^\d{4}$/.test(person.ssn_last_4)) {
      fieldErrors.ssn_last_4 = "Must be 4 digits";
    }
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const individual = {
        first_name: person.first_name,
        last_name: person.last_name,
        email: person.email,
        phone: person.phone,
        address: addressToPayload(person.address),
        dob: {
          day: parseInt(person.dob_day, 10),
          month: parseInt(person.dob_month, 10),
          year: parseInt(person.dob_year, 10),
        },
        ssn_last_4: person.ssn_last_4,
      };
      const payload: UpdateConnectAccountPayload = {
        business_type: businessType,
        individual,
        company: null,
        business_profile: null,
      };
      await updateAccount.mutateAsync(payload);
      goNext();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBankSubmit = async () => {
    const fieldErrors = validateRequired(
      {
        account_holder_name: bank.account_holder_name,
        routing_number: bank.routing_number,
        account_number: bank.account_number,
      },
      ["account_holder_name", "routing_number", "account_number"],
    );
    if (!/^\d{9}$/.test(bank.routing_number)) {
      fieldErrors.routing_number = "Must be 9 digits";
    }
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const stripe = await getStripe();
      if (!stripe) {
        toast.error(
          "Stripe.js is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY.",
        );
        setSubmitting(false);
        return;
      }
      const tokenResult = await stripe.createToken("bank_account", {
        country: business.address.country || person.address.country || "US",
        currency: "usd",
        routing_number: bank.routing_number,
        account_number: bank.account_number,
        account_holder_name: bank.account_holder_name,
        account_holder_type: businessType,
      });
      if (tokenResult.error || !tokenResult.token) {
        toast.error(tokenResult.error?.message ?? "Failed to tokenize bank");
        setSubmitting(false);
        return;
      }
      await attachBank.mutateAsync(tokenResult.token.id);
      goNext();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTosSubmit = async () => {
    if (!tosAccepted) {
      setErrors({ tos: "You must accept the terms" });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const ip = await fetchClientIp();
      await acceptTos.mutateAsync({
        ip,
        user_agent: navigator.userAgent,
      });
      await refetch();
      goNext();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <StepHeader current={step} />
      {!stripeReady && step === "bank" && (
        <Card>
          <CardHeader>
            <CardTitle>Stripe.js not configured</CardTitle>
            <CardDescription>
              Set <code>VITE_STRIPE_PUBLISHABLE_KEY</code> to tokenize bank
              accounts client-side.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {step === "business-type" && (
        <Card>
          <CardHeader>
            <CardTitle>Business type</CardTitle>
            <CardDescription>
              Choose how this account is structured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={businessType}
              onValueChange={(v) => setBusinessType(v as BusinessType)}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="individual" value="individual" />
                <Label htmlFor="individual">Individual / sole proprietor</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="company" value="company" />
                <Label htmlFor="company">Company</Label>
              </div>
            </RadioGroup>
            <div className="flex justify-end">
              <Button onClick={goNext}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "business-details" && (
        <Card>
          <CardHeader>
            <CardTitle>Business details</CardTitle>
            <CardDescription>
              Information Stripe shows on receipts and uses for verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={
                  businessType === "company" ? "Legal company name" : "Business name"
                }
                name="business.name"
                value={business.name}
                error={errors.name}
                onChange={(v) => setBusiness({ ...business, name: v })}
                className="sm:col-span-2"
              />
              <Field
                label="Phone"
                name="business.phone"
                value={business.phone}
                error={errors.phone}
                onChange={(v) => setBusiness({ ...business, phone: v })}
              />
              <Field
                label="Website URL"
                name="business.url"
                value={business.url}
                error={errors.url}
                onChange={(v) => setBusiness({ ...business, url: v })}
                placeholder="https://example.com"
              />
              <Field
                label="MCC code"
                name="business.mcc"
                value={business.mcc}
                error={errors.mcc}
                onChange={(v) => setBusiness({ ...business, mcc: v })}
                placeholder="7999"
                maxLength={4}
              />
              <Field
                label="Product description"
                name="business.product_description"
                value={business.product_description}
                error={errors.product_description}
                onChange={(v) =>
                  setBusiness({ ...business, product_description: v })
                }
                className="sm:col-span-2"
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">Business address</h3>
              <AddressFields
                prefix="address"
                value={business.address}
                errors={errors}
                onChange={(addr) => setBusiness({ ...business, address: addr })}
              />
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={goBack}>
                <ChevronLeft className="size-4" /> Back
              </Button>
              <Button
                onClick={handleBusinessDetailsSubmit}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "person" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {businessType === "individual"
                ? "Personal details"
                : "Account representative"}
            </CardTitle>
            <CardDescription>
              {businessType === "individual"
                ? "Required for identity verification."
                : "Stripe needs a person who controls the account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="First name"
                name="person.first_name"
                value={person.first_name}
                error={errors.first_name}
                onChange={(v) => setPerson({ ...person, first_name: v })}
              />
              <Field
                label="Last name"
                name="person.last_name"
                value={person.last_name}
                error={errors.last_name}
                onChange={(v) => setPerson({ ...person, last_name: v })}
              />
              <Field
                label="Email"
                name="person.email"
                type="email"
                value={person.email}
                error={errors.email}
                onChange={(v) => setPerson({ ...person, email: v })}
              />
              <Field
                label="Phone"
                name="person.phone"
                value={person.phone}
                error={errors.phone}
                onChange={(v) => setPerson({ ...person, phone: v })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field
                label="DOB month"
                name="person.dob_month"
                value={person.dob_month}
                error={errors.dob_month}
                onChange={(v) => setPerson({ ...person, dob_month: v })}
                placeholder="MM"
                maxLength={2}
              />
              <Field
                label="DOB day"
                name="person.dob_day"
                value={person.dob_day}
                error={errors.dob_day}
                onChange={(v) => setPerson({ ...person, dob_day: v })}
                placeholder="DD"
                maxLength={2}
              />
              <Field
                label="DOB year"
                name="person.dob_year"
                value={person.dob_year}
                error={errors.dob_year}
                onChange={(v) => setPerson({ ...person, dob_year: v })}
                placeholder="YYYY"
                maxLength={4}
              />
              <Field
                label="SSN last 4"
                name="person.ssn_last_4"
                value={person.ssn_last_4}
                error={errors.ssn_last_4}
                onChange={(v) => setPerson({ ...person, ssn_last_4: v })}
                maxLength={4}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">Home address</h3>
              <AddressFields
                prefix="address"
                value={person.address}
                errors={errors}
                onChange={(addr) => setPerson({ ...person, address: addr })}
              />
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={goBack}>
                <ChevronLeft className="size-4" /> Back
              </Button>
              <Button onClick={handlePersonSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "bank" && (
        <Card>
          <CardHeader>
            <CardTitle>Bank account</CardTitle>
            <CardDescription>
              Numbers are sent directly to Stripe and tokenized — never stored
              on our servers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Account holder name"
              name="bank.holder"
              value={bank.account_holder_name}
              error={errors.account_holder_name}
              onChange={(v) =>
                setBank({ ...bank, account_holder_name: v })
              }
            />
            <Field
              label="Routing number"
              name="bank.routing"
              value={bank.routing_number}
              error={errors.routing_number}
              onChange={(v) => setBank({ ...bank, routing_number: v })}
              maxLength={9}
              placeholder="9-digit routing"
            />
            <Field
              label="Account number"
              name="bank.account"
              value={bank.account_number}
              error={errors.account_number}
              onChange={(v) => setBank({ ...bank, account_number: v })}
            />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={goBack}>
                <ChevronLeft className="size-4" /> Back
              </Button>
              <Button
                onClick={handleBankSubmit}
                disabled={submitting || !stripeReady}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "tos" && (
        <Card>
          <CardHeader>
            <CardTitle>Terms of service</CardTitle>
            <CardDescription>
              You must accept the Stripe Connected Account Agreement to enable
              payouts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={tosAccepted}
                onCheckedChange={(v) => setTosAccepted(v === true)}
                aria-invalid={Boolean(errors.tos)}
              />
              <span>
                I agree to the{" "}
                <a
                  href="https://stripe.com/connect-account/legal"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Stripe Connected Account Agreement
                </a>{" "}
                on behalf of this organization.
              </span>
            </label>
            {errors.tos && (
              <p className="text-xs text-destructive">{errors.tos}</p>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={goBack}>
                <ChevronLeft className="size-4" /> Back
              </Button>
              <Button onClick={handleTosSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : "Accept & finish"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "confirmation" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-[var(--status-success)]" />
              Onboarding submitted
            </CardTitle>
            <CardDescription>
              Stripe will verify the information you provided.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-muted-foreground">Charges enabled</div>
                <div className="font-medium">
                  {requirements?.charges_enabled ? "Yes" : "Pending"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Payouts enabled</div>
                <div className="font-medium">
                  {requirements?.payouts_enabled ? "Yes" : "Pending"}
                </div>
              </div>
            </div>
            {requirements && requirements.currently_due.length > 0 && (
              <div>
                <div className="mb-1 text-muted-foreground">Still required</div>
                <ul className="space-y-1">
                  {Array.from(
                    new Set(
                      requirements.currently_due.map(describeRequirement),
                    ),
                  ).map((label) => (
                    <li key={label}>• {label}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => navigate({ to: "/settings/billing" })}>
                Back to billing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function addressToPayload(addr: AddressForm) {
  return {
    line1: addr.line1,
    line2: addr.line2 || null,
    city: addr.city,
    state: addr.state,
    postal_code: addr.postal_code,
    country: addr.country,
  };
}

function prefixed(errors: FieldErrors, prefix: string): FieldErrors {
  const out: FieldErrors = {};
  for (const [k, v] of Object.entries(errors)) {
    out[`${prefix}.${k}`] = v;
    out[k] = v;
  }
  return out;
}

export function ConnectOnboardingPage() {
  return (
    <PageTopBar title="Connect onboarding">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <div className="text-sm text-muted-foreground">
          <Link to="/settings/billing" className="underline">
            ← Back to billing
          </Link>
        </div>
        <Suspense fallback={<PageSkeleton />}>
          <ConnectOnboardingFlow />
        </Suspense>
      </div>
    </PageTopBar>
  );
}
