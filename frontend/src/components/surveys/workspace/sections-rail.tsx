import { Button } from "@/components/ui/button";
import { jumpToHash } from "@/lib/scroll";
import type { SectionCompletion } from "@/openapi/litestarAPI.schemas";
import type { Tree } from "./node-helpers";

function statusDot(c?: SectionCompletion): string {
  if (!c || c.total === 0 || c.filled === 0) return "bg-gray-300";
  if (c.filled < c.total) return "bg-amber-500";
  return "bg-emerald-500";
}

export function SectionsRail({
  sections,
  completion,
  currentSectionId,
}: {
  sections: Tree[];
  completion: Map<string, SectionCompletion>;
  currentSectionId: string | null;
}) {
  return (
    <nav
      aria-label="Sections"
      className="group fixed left-[calc(var(--sidebar-width,16rem)+0.25rem)] top-20 z-10 hidden md:block"
    >
      <ul className="flex flex-col gap-1 rounded-r-xl py-2 pl-1 pr-2 transition-colors group-hover:bg-white/95 group-hover:shadow-md group-hover:ring-1 group-hover:ring-border">
        {sections.map((s) => {
          const c = completion.get(s.id);
          const active = currentSectionId === s.id;
          return (
            <li key={s.id}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => jumpToHash(`section-${s.id}`)}
                className={`h-7 w-full justify-start gap-2 px-1 text-xs ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusDot(c)} ${
                    active ? "ring-2 ring-primary ring-offset-1" : ""
                  }`}
                />
                <span className="hidden whitespace-nowrap group-hover:inline">
                  {s.label}
                  {c && (
                    <span className="ml-1 text-[10px] opacity-60">
                      {c.filled}/{c.total}
                    </span>
                  )}
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
