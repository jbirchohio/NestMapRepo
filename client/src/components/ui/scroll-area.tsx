import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
    className?: string
    children?: React.ReactNode
  }
>(({ className, children, ...props }, ref) => {
  const rootProps = {
    ref,
    className: cn("relative overflow-hidden", className),
    ...props
  };
  return (
    <ScrollAreaPrimitive.Root {...(rootProps as any)}>
      <ScrollAreaPrimitive.Viewport {...({className: "h-full w-full rounded-[inherit]", children} as any)}>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
})
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> & {
    className?: string
    orientation?: "vertical" | "horizontal"
  }
>(({ className, orientation = "vertical", ...props }, ref) => {
  const scrollbarProps = {
    ref,
    orientation,
    className: cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    ),
    ...props
  };
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar {...(scrollbarProps as any)}>
      <ScrollAreaPrimitive.ScrollAreaThumb {...({className: "relative flex-1 rounded-full bg-border"} as any)} />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
})
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
