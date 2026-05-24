"use client";

import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSearchSearch } from "@/openapi/search/search";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useShortcut } from "@/lib/shortcuts";

const ENTITY_ICONS: Record<string, string> = {
  vessel: "⛵",
  survey: "📋",
  client: "👤",
  report: "📄",
  invoice: "🧾",
  part: "🔧",
  manufacturer: "🏭",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useShortcut({
    id: "global.search",
    keys: "mod+k",
    scope: "global",
    label: "Open global search",
    allowInFields: true,
    handler: useCallback(() => setOpen((prev) => !prev), []),
  });

  const { data } = useSearchSearch(
    { q: query, limit: 10 },
    { query: { enabled: query.trim().length >= 2 } }
  );

  const results = data?.results ?? [];

  const grouped = results.reduce<Record<string, typeof results>>(
    (acc, r) => {
      (acc[r.entity_type] ??= []).push(r);
      return acc;
    },
    {}
  );

  function handleSelect(path: string) {
    setOpen(false);
    setQuery("");
    navigate({ to: path });
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search vessels, surveys, clients..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length >= 2 && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          {query.trim().length < 2 && (
            <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
          )}
          {Object.entries(grouped).map(([entityType, items]) => (
            <CommandGroup
              key={entityType}
              heading={entityType.charAt(0).toUpperCase() + entityType.slice(1) + "s"}
            >
              {items.map((result) => (
                <CommandItem
                  key={result.id}
                  value={`${result.entity_type}:${result.id}`}
                  onSelect={() => handleSelect(result.path)}
                >
                  <span className="mr-2 text-base">
                    {ENTITY_ICONS[result.entity_type] ?? "•"}
                  </span>
                  <span className="flex-1 truncate">{result.label}</span>
                  {result.sublabel && (
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      {result.sublabel}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
      </CommandList>
    </CommandDialog>
  );
}
