"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    className?: string;
  }
>(({ className, ...props }, ref) => {
  const avatarProps = {
    ref,
    className: cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    ),
    ...props
  };
  return <AvatarPrimitive.Root {...(avatarProps as any)} />;
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & {
    className?: string;
  }
>(({ className, ...props }, ref) => {
  const imageProps = {
    ref,
    className: cn("aspect-square h-full w-full", className),
    ...props
  };
  return <AvatarPrimitive.Image {...(imageProps as any)} />;
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    className?: string;
  }
>(({ className, ...props }, ref) => {
  const fallbackProps = {
    ref,
    className: cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    ),
    ...props
  };
  return <AvatarPrimitive.Fallback {...(fallbackProps as any)} />;
})
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
