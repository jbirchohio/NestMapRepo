import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the FAQ item type
export interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

// Define props for our custom FAQ Accordion
export interface FAQAccordionProps {
  items: FAQItem[];
  type: "single" | "multiple";
  collapsible?: boolean;
  className?: string;
  defaultValue?: string;
}

/**
 * FAQAccordion component - extremely simplified to avoid TypeScript errors
 * with Radix UI components that don't properly declare their children props
 */
export function FAQAccordion({
  items,
  type,
  collapsible = true,
  className,
  defaultValue,
}: FAQAccordionProps) {
  // Create accordion items
  const renderItems = () => {
    return items.map((item, index) => {
      const itemValue = `item-${index}`;
      return (
        // @ts-ignore - ignoring children prop type issues
        <AccordionPrimitive.Item 
          key={`faq-item-${index}`} 
          value={itemValue}
          className="border-b"
        >
          {/* @ts-ignore - ignoring children prop type issues */}
          <AccordionPrimitive.Header className="flex">
            {/* @ts-ignore - ignoring children prop type issues */}
            <AccordionPrimitive.Trigger
              className="flex w-full items-center justify-between py-4 font-medium transition-all hover:underline-none text-left"
            >
              <span>{item.question}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          {/* @ts-ignore - ignoring children prop type issues */}
          <AccordionPrimitive.Content className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="pb-4 pt-0 text-slate-600 dark:text-slate-400">
              {item.answer}
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      );
    });
  };

  // Important: for the Root component, we need to handle different props based on type
  const accordionProps: any = {
    type,
    className: cn("w-full", className),
  };
  
  // Add conditional props
  if (type === "single") {
    accordionProps.collapsible = collapsible;
    if (defaultValue) accordionProps.defaultValue = defaultValue;
  } else if (type === "multiple" && defaultValue) {
    // For multiple type, defaultValue should be an array
    accordionProps.defaultValue = [defaultValue];
  }

  return (
    // @ts-ignore - ignoring children prop type issues
    <AccordionPrimitive.Root {...accordionProps}>
      {renderItems()}
    </AccordionPrimitive.Root>
  );
}
