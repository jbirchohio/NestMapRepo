import React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Button } from '@/components/ui/button';

interface CustomPopoverTriggerProps {
  children: React.ReactNode;
  className?: string;
  variant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined;
}

export function CustomPopoverTrigger({ children, className, variant = "outline" }: CustomPopoverTriggerProps) {
  return (
    <PopoverPrimitive.Trigger>
      <Button variant={variant} className={className}>
        {children}
      </Button>
    </PopoverPrimitive.Trigger>
  );
}
