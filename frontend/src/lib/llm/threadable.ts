import { useMatches } from "@tanstack/react-router";

export type ThreadableRef = {
  threadable_type: string;
  threadable_id: string;
};

export type ThreadableStaticData = {
  type: string;
  paramKey: string;
};

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    threadable?: ThreadableStaticData;
  }
}

export function useThreadableFromRoute(): ThreadableRef | null {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const td = m.staticData?.threadable;
    if (!td) continue;
    const id = (m.params as Record<string, string | undefined>)[td.paramKey];
    if (!id) return null;
    return { threadable_type: td.type, threadable_id: id };
  }
  return null;
}
