import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";

/**
 * Cross-browser always-visible scroll container. Built on Radix so the scrollbar is
 * rendered as a real DOM node (not native), which means macOS doesn't auto-hide it
 * and the styling works identically in Safari/Chrome/Firefox.
 *
 * `maxHeight` (a CSS length string) is applied as an inline style on the Viewport —
 * Radix's Viewport ignores `height: 100%` from `h-full` because its inner
 * `display: table` wrapper grows to intrinsic content height, blocking percentage
 * resolution from a `max-height`-only Root.
 */
export function ScrollArea({
  className,
  children,
  maxHeight,
  style,
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  maxHeight?: string;
}) {
  const sizing = maxHeight ? { maxHeight } : undefined;
  return (
    <ScrollAreaPrimitive.Root
      type="always"
      className={cn("relative overflow-hidden", className)}
      style={{ ...style, ...sizing }}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        className="w-full rounded-[inherit]"
        style={sizing}
        // When ScrollArea is inside a Radix Dialog/Popover, `react-remove-scroll`
        // installs a capture-phase wheel listener on <body> that preventDefault's
        // all wheel events — which kills native scroll inside the viewport.
        // Workaround: manually apply the wheel delta to scrollTop here, after
        // normalizing for `deltaMode` (Firefox emits LINE/PAGE units, not pixels).
        onWheel={(e) => {
          let delta = e.deltaY;
          if (e.deltaMode === 1) {
            // DOM_DELTA_LINE — multiply by an estimated line height
            delta *= 16;
          } else if (e.deltaMode === 2) {
            // DOM_DELTA_PAGE — multiply by viewport height
            delta *= e.currentTarget.clientHeight;
          }
          e.currentTarget.scrollTop += delta;
          e.preventDefault();
        }}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      orientation={orientation}
      className={cn(
        "flex touch-none select-none transition-colors",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent p-px",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent p-px",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border hover:bg-muted-foreground" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}
