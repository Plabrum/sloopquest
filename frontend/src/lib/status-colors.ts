/**
 * Per-domain, type-safe status color maps.
 *
 * Each domain enum gets its own map via `createStatusMap`. Values without
 * explicit overrides are auto-distributed across the 6 semantic variants
 * using a stable hash (adding new enum values won't shift existing colors).
 */

export type StatusVariant =
  | "active"
  | "pending"
  | "warning"
  | "danger"
  | "neutral"
  | "info";

export interface StatusConfig {
  label: string;
  variant: StatusVariant;
}

export interface StatusMap<V extends string> {
  get(value: V): StatusConfig;
  getByString(value: string): StatusConfig | undefined;
  entries: Record<V, StatusConfig>;
}

const VARIANTS: StatusVariant[] = [
  "active",
  "pending",
  "warning",
  "danger",
  "neutral",
  "info",
];

function stableVariant(value: string): StatusVariant {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return VARIANTS[hash % VARIANTS.length];
}

function humanize(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type EnumObj = Record<string, string>;
type Override = { label?: string; variant: StatusVariant };

/**
 * Create a typed status map for a domain enum.
 *
 * @param enumObj  The generated OpenAPI enum const
 * @param overrides  Explicit variant (and optional label) per value
 */
export function createStatusMap<E extends EnumObj>(
  enumObj: E,
  overrides: Partial<Record<E[keyof E], Override>> = {},
): StatusMap<E[keyof E]> {
  const entries = {} as Record<E[keyof E], StatusConfig>;

  for (const value of Object.values(enumObj) as E[keyof E][]) {
    const ov = overrides[value];
    entries[value] = {
      label: ov?.label ?? humanize(value),
      variant: ov?.variant ?? stableVariant(value),
    };
  }

  return {
    get(value: E[keyof E]): StatusConfig {
      return entries[value];
    },
    getByString(value: string): StatusConfig | undefined {
      return entries[value as E[keyof E]];
    },
    entries,
  };
}

const ALL_MAPS: StatusMap<string>[] = [];

/** Register a status map so `getStatusConfig` can resolve its values globally. */
export function registerStatusMap(map: StatusMap<string>): void {
  ALL_MAPS.push(map);
}

/**
 * Get the display config for any status value.
 * Checks all registered domain maps, falls back to auto-distribution.
 */
export function getStatusConfig(status: string): StatusConfig {
  for (const map of ALL_MAPS) {
    const config = map.getByString(status);
    if (config) return config;
  }
  return { label: humanize(status), variant: stableVariant(status) };
}

export const statusVariantClasses: Record<StatusVariant, string> = {
  active: "bg-[#7A9E87]/20 text-[#3D6B4A]",
  pending: "bg-[#D4A853]/20 text-[#7A5F1E]",
  warning: "bg-[#E8913A]/20 text-[#874E14]",
  danger: "bg-[#C75450]/20 text-[#7E2E2B]",
  neutral: "bg-[#8B8178]/20 text-[#4A453F]",
  info: "bg-[#5B8DB8]/20 text-[#2E5A7A]",
};

export const statusDotClasses: Record<StatusVariant, string> = {
  active: "bg-[#7A9E87]",
  pending: "bg-[#D4A853]",
  warning: "bg-[#E8913A]",
  danger: "bg-[#C75450]",
  neutral: "bg-[#8B8178]",
  info: "bg-[#5B8DB8]",
};

export const statusSolidClasses: Record<StatusVariant, string> = {
  active: "bg-[#7A9E87] text-[#0F1B14]",
  pending: "bg-[#D4A853] text-[#1F1608]",
  warning: "bg-[#E8913A] text-[#1F0F04]",
  danger: "bg-[#C75450] text-[#1F0A09]",
  neutral: "bg-[#C9C2B8] text-[#1A1814]",
  info: "bg-[#5B8DB8] text-[#0A1620]",
};
