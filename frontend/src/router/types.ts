import type { AnyRouteMatch } from "@tanstack/react-router";

export type CrumbInput = string | ((match: AnyRouteMatch) => string);

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    crumb?: CrumbInput;
  }
}
