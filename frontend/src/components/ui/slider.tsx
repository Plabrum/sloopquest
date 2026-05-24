"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none select-none items-center data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-3 w-full grow overflow-hidden rounded-full border border-border/80 bg-background shadow-inner"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full rounded-full bg-primary"
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        className="block size-5 rounded-full border-2 border-primary bg-background shadow-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 data-[disabled]:pointer-events-none"
      />
    </SliderPrimitive.Root>
  );
}

export { Slider };
