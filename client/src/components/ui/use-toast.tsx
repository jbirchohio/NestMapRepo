import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"

const toastVariants = cva(
  "group pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-md border bg-background/95 text-background-foreground shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border-default",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
    className?: string;
  }
>(({ className, ...props }, ref) => {
  const toastProps = {
    ref,
    className: cn(toastVariants(), className),
    ...props
  };
  return <ToastPrimitives.Root {...(toastProps as any)} />;
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action> & {
    className?: string;
  }
>(({ className, ...props }, ref) => {
  const actionProps = {
    ref,
    className: cn("inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive", className),
    ...props
  };
  return <ToastPrimitives.Action {...(actionProps as any)} />;
})
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close> & {
    className?: string;
  }
>(({ className, ...props }, ref) => {
  const closeProps = {
    ref,
    className: cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    ),
    ...props
  };
  return (
    <ToastPrimitives.Close {...(closeProps as any)}>
      <X className="h-4 w-4" />
    </ToastPrimitives.Close>
  );
})
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title> & {
    className?: string;
  }
>(({ className, ...props }, ref) => {
  const titleProps = {
    ref,
    className: cn("text-sm font-semibold", className),
    ...props
  };
  return <ToastPrimitives.Title {...(titleProps as any)} />;
})
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description> & {
    className?: string;
  }
>(({ className, ...props }, ref) => {
  const descriptionProps = {
    ref,
    className: cn("mt-1 text-sm opacity-90", className),
    ...props
  };
  return <ToastPrimitives.Description {...(descriptionProps as any)} />;
})
ToastDescription.displayName = ToastPrimitives.Description.displayName

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport> & {
    className?: string;
  }
>(({ className, ...props }, ref) => {
  const viewportProps = {
    ref,
    className: cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    ),
    ...props
  };
  return <ToastPrimitives.Viewport {...(viewportProps as any)} />;
})
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

type ToastActionElement = React.ReactElement<typeof ToastAction>

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

interface ToastToast extends Omit<ToastProps, 'title'> {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  timestamp?: number
  open?: boolean
}

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastToast[]>([])

  const showToast = React.useCallback(
    (props: ToastToast) => {
      setToasts((current) => {
        if (current.length >= TOAST_LIMIT) {
          const newToasts = current.filter((toast) => !toast.open)
          if (newToasts.length >= TOAST_LIMIT) return newToasts
          if (newToasts.length > 0) return [...newToasts, props]
        }
        return [...current, props]
      })

      return {
        id: props.id,
      }
    },
    []
  )

  const dismiss = React.useCallback((toastId?: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId))
  }, [])

  const removeAll = React.useCallback(() => {
    setToasts([])
  }, [])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setToasts((toasts) =>
        toasts.filter((toast) => toast.open || (toast.timestamp && Date.now() - toast.timestamp < TOAST_REMOVE_DELAY))
      )
    }, TOAST_REMOVE_DELAY)

    return () => clearTimeout(timer)
  }, [])

  return (
    <ToastPrimitives.Provider>
      {children}
      <ToastViewport>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...(toast as any)} />
        ))}
      </ToastViewport>
    </ToastPrimitives.Provider>
  )
}

export const useToast = () => {
  // Create a custom hook to manage toast state
  const [toasts, setToasts] = React.useState<ToastToast[]>([])
  
  const toast = React.useMemo(
    () => ({
      toasts,
      showToast: (props: Omit<ToastToast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts((current) => [...current, { id, ...props }])
        return { id }
      },
      dismiss: (toastId?: string) => {
        setToasts((current) => current.filter((toast) => toast.id !== toastId))
      },
      removeAll: () => setToasts([])
    }),
    [toasts]
  )
  
  return toast
}

export { Toast, ToastTitle, ToastDescription, ToastClose, ToastAction }

