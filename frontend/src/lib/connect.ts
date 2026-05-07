import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { customInstance } from "@/openapi/custom-instance";

export interface ConnectAccountRequirements {
  currently_due: string[];
  eventually_due: string[];
  pending_verification: string[];
  future_requirements: Record<string, unknown>;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

export interface ConnectAccountResponse {
  stripe_account_id: string;
}

export const connectRequirementsQueryKey = [
  "/organizations/me/connect/account/requirements",
] as const;

async function fetchConnectRequirements(
  signal?: AbortSignal,
): Promise<ConnectAccountRequirements | null> {
  try {
    return await customInstance<ConnectAccountRequirements>({
      url: "/organizations/me/connect/account/requirements",
      method: "GET",
      signal,
    });
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

export const CONNECT_REQUIREMENTS_POLL_MS = 30_000;

export function useConnectRequirements() {
  return useSuspenseQuery({
    queryKey: connectRequirementsQueryKey,
    queryFn: ({ signal }) => fetchConnectRequirements(signal),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      if (data.charges_enabled && data.payouts_enabled) return false;
      return CONNECT_REQUIREMENTS_POLL_MS;
    },
  });
}

export function useCreateConnectAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      customInstance<ConnectAccountResponse>({
        url: "/organizations/me/connect/account",
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectRequirementsQueryKey });
    },
  });
}

export interface ConnectAddressInput {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

export interface ConnectDOBInput {
  day: number;
  month: number;
  year: number;
}

export interface ConnectIndividualInput {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: ConnectAddressInput | null;
  dob: ConnectDOBInput | null;
  ssn_last_4: string | null;
}

export interface ConnectCompanyInput {
  name: string | null;
  phone: string | null;
  address: ConnectAddressInput | null;
}

export interface ConnectBusinessProfileInput {
  mcc: string | null;
  url: string | null;
  product_description: string | null;
}

export interface UpdateConnectAccountPayload {
  business_type: "individual" | "company" | null;
  individual: ConnectIndividualInput | null;
  company: ConnectCompanyInput | null;
  business_profile: ConnectBusinessProfileInput | null;
}

export function useUpdateConnectAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateConnectAccountPayload) =>
      customInstance<ConnectAccountResponse>({
        url: "/organizations/me/connect/account",
        method: "PATCH",
        data: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectRequirementsQueryKey });
    },
  });
}

export interface AcceptTosPayload {
  ip: string;
  user_agent: string;
}

export function useAcceptConnectTos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AcceptTosPayload) =>
      customInstance<ConnectAccountResponse>({
        url: "/organizations/me/connect/account/tos-acceptance",
        method: "POST",
        data: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectRequirementsQueryKey });
    },
  });
}

export interface ExternalAccountResponse {
  last4: string;
  bank_name: string | null;
  routing_number: string | null;
}

export function useAttachExternalAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      customInstance<ExternalAccountResponse>({
        url: "/organizations/me/connect/account/external-accounts",
        method: "POST",
        data: { token },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectRequirementsQueryKey });
    },
  });
}

const REQUIREMENT_LABELS: Record<string, string> = {
  external_account: "Bank account",
  business_type: "Business type",
  "business_profile.url": "Business website",
  "business_profile.mcc": "Business category",
  "business_profile.product_description": "Product description",
  "business_profile.name": "Business name",
  "tos_acceptance.date": "Terms of service acceptance",
  "tos_acceptance.ip": "Terms of service acceptance",
  "individual.first_name": "Legal first name",
  "individual.last_name": "Legal last name",
  "individual.email": "Email address",
  "individual.phone": "Phone number",
  "individual.dob.day": "Date of birth",
  "individual.dob.month": "Date of birth",
  "individual.dob.year": "Date of birth",
  "individual.ssn_last_4": "Last 4 of SSN",
  "individual.id_number": "Full SSN or tax ID",
  "individual.address.line1": "Home address",
  "individual.address.line2": "Home address",
  "individual.address.city": "Home address",
  "individual.address.state": "Home address",
  "individual.address.postal_code": "Home address",
  "individual.verification.document": "Government-issued ID document",
  "individual.verification.additional_document":
    "Additional verification document",
  "company.name": "Company legal name",
  "company.tax_id": "Business tax ID",
  "company.phone": "Company phone number",
  "company.address.line1": "Business address",
  "company.address.line2": "Business address",
  "company.address.city": "Business address",
  "company.address.state": "Business address",
  "company.address.postal_code": "Business address",
  "company.verification.document": "Company verification document",
};

export function describeRequirement(key: string): string {
  if (REQUIREMENT_LABELS[key]) return REQUIREMENT_LABELS[key];
  if (key.startsWith("individual.")) return "Identity verification";
  if (key.startsWith("company.")) return "Business details";
  if (key.startsWith("business_profile.")) return "Business profile";
  return key.replace(/[._]/g, " ");
}
