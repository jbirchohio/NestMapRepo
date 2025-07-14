import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants> & {
      children?: React.ReactNode;
      className?: string;
      htmlFor?: string;
    }
>(({ className, children, htmlFor, ...props }, ref) => {
  // Create a props object with all necessary properties
  const labelProps = {
    ref,
    className: cn(labelVariants(), className),
    htmlFor,
    ...props
  };

  // Use type assertion to bypass the type checking
  return <LabelPrimitive.Root {...(labelProps as any)}>{children}</LabelPrimitive.Root>;
})
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
