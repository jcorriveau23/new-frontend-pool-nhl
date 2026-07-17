"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  SliderPrimitive.Root.Props
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    thumbAlignment="edge"
    className={cn("relative w-full", className)}
    {...props}
  >
    <SliderPrimitive.Control className="flex w-full touch-none select-none items-center">
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Indicator className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Control>
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";

export { Slider };
