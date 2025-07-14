import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> & {
    className?: string;
    children?: React.ReactNode;
  }
>(({ className, children, ...props }, ref) => {
  const rootProps = {
    ref,
    className: cn(className),
    ...props
  };
  return <AccordionPrimitive.Root {...(rootProps as any)}>{children}</AccordionPrimitive.Root>;
})

Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> & {
    className?: string;
    children?: React.ReactNode;
  }
>(({ className, children, ...props }, ref) => {
  const itemProps = {
    ref,
    className: cn("border-b", className),
    ...props
  };
  return <AccordionPrimitive.Item {...(itemProps as any)}>{children}</AccordionPrimitive.Item>;
})
AccordionItem.displayName = "AccordionItem"

const AccordionHeader = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Header>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Header> & {
    className?: string;
    children?: React.ReactNode;
  }
>(({ className, children, ...props }, ref) => {
  const headerProps = {
    ref,
    className: cn("flex", className),
    ...props
  };
  return <AccordionPrimitive.Header {...(headerProps as any)}>{children}</AccordionPrimitive.Header>;
})

AccordionHeader.displayName = "AccordionHeader"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
    className?: string;
    children?: React.ReactNode;
  }
>(({ className, children, ...props }, ref) => {
  const triggerProps = {
    ref,
    className: cn(
      "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
      className
    ),
    ...props
  };
  return (
    <AccordionPrimitive.Trigger {...(triggerProps as any)}>
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  );
})
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> & {
    className?: string;
    children?: React.ReactNode;
  }
>(({ className, children, ...props }, ref) => {
  const contentProps = {
    ref,
    className: "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
    ...props
  };
  return (
    <AccordionPrimitive.Content {...(contentProps as any)}>
      <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
})

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionHeader, AccordionTrigger, AccordionContent }
