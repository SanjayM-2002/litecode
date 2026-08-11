import * as ToastPrimitive from '@radix-ui/react-toast'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore, type ToastVariant } from '@/lib/stores/toast-store'

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border bg-popover text-popover-foreground',
  success: 'border-[#2cbb5d]/40 bg-popover text-popover-foreground',
  destructive: 'border-destructive/40 bg-popover text-popover-foreground',
}

const variantIcon: Record<ToastVariant, typeof Info> = {
  default: Info,
  success: CheckCircle2,
  destructive: AlertCircle,
}

const iconColor: Record<ToastVariant, string> = {
  default: 'text-muted-foreground',
  success: 'text-[#2cbb5d]',
  destructive: 'text-destructive',
}

/**
 * Mount once near the app root. Reads queued toasts from the zustand store so
 * mutation callbacks can fire notifications without prop drilling.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
      {toasts.map((t) => {
        const Icon = variantIcon[t.variant]
        return (
          <ToastPrimitive.Root
            key={t.id}
            open
            onOpenChange={(open) => {
              if (!open) dismiss(t.id)
            }}
            className={cn(
              'pointer-events-auto flex w-full items-start gap-3 rounded-md border p-4 shadow-lg',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-right-4',
              variantStyles[t.variant]
            )}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconColor[t.variant])} />
            <div className="flex-1 space-y-1">
              <ToastPrimitive.Title className="text-sm font-medium leading-none">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="text-xs text-muted-foreground">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Dismiss</span>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        )
      })}
      <ToastPrimitive.Viewport className="pointer-events-none fixed bottom-0 right-0 z-[60] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm" />
    </ToastPrimitive.Provider>
  )
}
