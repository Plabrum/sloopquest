import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { ArrowUpRight } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCitationSourceType } from "@/lib/citations";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  children: string;
  /**
   * "assistant" applies citation styling to all `<a>` elements: a
   * subtle ↗ indicator + a tooltip showing the source type derived
   * from the URL. Citation labels are PHI-clean by NEA-233 design
   * (`Thread #id`-style, never names) so styling them universally is
   * safe.
   *
   * Defaults to "plain" — existing call sites that render arbitrary
   * markdown (release notes, etc.) keep their previous look.
   */
  variant?: "plain" | "assistant";
}

/**
 * Insert a space when sentence-ending punctuation is followed
 * immediately by an uppercase letter (e.g., "Hello.How" → "Hello. How").
 * The streaming model occasionally emits adjacent tokens without the
 * intervening space; this defensive normalizer catches it without
 * breaking common abbreviations like "U.S.A." (which match
 * uppercase-then-period, not lowercase-then-period).
 */
function normalizeSentenceSpacing(text: string): string {
  return text.replace(/([a-z0-9][.!?])([A-Z])/g, "$1 $2");
}

export function Markdown({ children, variant = "plain" }: MarkdownProps) {
  const normalized =
    variant === "assistant" ? normalizeSentenceSpacing(children) : children;
  return (
    <ReactMarkdown
      // NEA-235: `remark-breaks` converts single `\n` line breaks into
      // `<br>` so streamed assistant text that uses single-line-per-
      // sentence formatting reads with visible line breaks instead of
      // CommonMark collapsing them into single spaces (which makes
      // adjacent sentences blur together visually).
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/60 text-left">{children}</thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-b border-border last:border-0">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-2 py-1.5 font-semibold align-top">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-2 py-1.5 align-top">{children}</td>
        ),
        code: ({ children }) => (
          <code className="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto rounded-md bg-muted p-2 text-[0.85em]">
            {children}
          </pre>
        ),
        a: ({ children, href }) => {
          if (variant !== "assistant" || !href) {
            return (
              <a href={href} className="underline">
                {children}
              </a>
            );
          }
          const isExternal = /^https?:\/\//.test(href);
          const sourceType = getCitationSourceType(href);
          return (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className={cn(
                      "inline-flex items-baseline gap-0.5 text-amber-700 dark:text-amber-300 underline decoration-amber-400/60 underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100",
                    )}
                  >
                    {children}
                    <ArrowUpRight
                      className="w-3 h-3 self-center shrink-0"
                      aria-hidden
                    />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {sourceType}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      }}
    >
      {normalized}
    </ReactMarkdown>
  );
}
