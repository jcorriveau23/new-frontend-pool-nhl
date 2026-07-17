import * as React from "react";
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const NavigationMenu = React.forwardRef<
  React.ComponentRef<typeof NavigationMenuPrimitive.Root>,
  NavigationMenuPrimitive.Root.Props &
    Pick<NavigationMenuPrimitive.Positioner.Props, "align">
>(({ className, children, align = "start", ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn(
      "relative z-10 flex max-w-max flex-1 items-center justify-center",
      className
    )}
    {...props}
  >
    {children}
    <NavigationMenuViewport align={align} />
  </NavigationMenuPrimitive.Root>
));
NavigationMenu.displayName = "NavigationMenu";

const NavigationMenuList = React.forwardRef<
  React.ComponentRef<typeof NavigationMenuPrimitive.List>,
  NavigationMenuPrimitive.List.Props
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center space-x-1",
      className
    )}
    {...props}
  />
));
NavigationMenuList.displayName = "NavigationMenuList";

const NavigationMenuItem = NavigationMenuPrimitive.Item;

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-popup-open:text-accent-foreground data-popup-open:bg-accent/50 data-popup-open:hover:bg-accent data-popup-open:focus:bg-accent"
);

const NavigationMenuTrigger = React.forwardRef<
  React.ComponentRef<typeof NavigationMenuPrimitive.Trigger>,
  NavigationMenuPrimitive.Trigger.Props
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}
  >
    {children}{" "}
    <ChevronDown
      className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-popup-open:rotate-180"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
));
NavigationMenuTrigger.displayName = "NavigationMenuTrigger";

const NavigationMenuContent = React.forwardRef<
  React.ComponentRef<typeof NavigationMenuPrimitive.Content>,
  NavigationMenuPrimitive.Content.Props
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      "left-0 top-0 w-full p-0 transition-[opacity,transform,translate] duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 data-starting-style:data-[activation-direction=right]:translate-x-[50%] data-starting-style:data-[activation-direction=left]:translate-x-[-50%] data-ending-style:data-[activation-direction=right]:translate-x-[-50%] data-ending-style:data-[activation-direction=left]:translate-x-[50%] md:w-auto",
      className
    )}
    {...props}
  />
));
NavigationMenuContent.displayName = "NavigationMenuContent";

const NavigationMenuLink = NavigationMenuPrimitive.Link;

const NavigationMenuViewport = React.forwardRef<
  React.ComponentRef<typeof NavigationMenuPrimitive.Viewport>,
  NavigationMenuPrimitive.Viewport.Props &
    Pick<
      NavigationMenuPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset"
    >
>(
  (
    { className, align = "start", alignOffset = 0, side = "bottom", sideOffset = 6, ...props },
    ref
  ) => (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-200 data-instant:transition-none"
      >
        <NavigationMenuPrimitive.Popup
          className={cn(
            "origin-(--transform-origin) relative h-(--popup-height) w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg outline-none transition-[opacity,transform,width,height,scale] duration-200 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 md:w-(--popup-width)",
            className
          )}
        >
          <NavigationMenuPrimitive.Viewport
            ref={ref}
            className="relative size-full overflow-hidden"
            {...props}
          />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  )
);
NavigationMenuViewport.displayName = "NavigationMenuViewport";

const NavigationMenuIndicator = React.forwardRef<
  React.ComponentRef<typeof NavigationMenuPrimitive.Icon>,
  React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Icon>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Icon
    ref={ref}
    className={cn(
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
      className
    )}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </NavigationMenuPrimitive.Icon>
));
NavigationMenuIndicator.displayName = "NavigationMenuIndicator";

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
};
