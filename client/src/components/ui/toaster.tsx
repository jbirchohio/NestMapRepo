import { useToast } from "@/components/ui/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const toastProps = {
          key: id,
          ...props,
          children: [
            <div key="content" className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>,
            action,
            <ToastClose key="close" />
          ]
        };
        return <Toast {...(toastProps as any)} />
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
