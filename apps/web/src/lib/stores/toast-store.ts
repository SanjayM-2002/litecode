import { create } from 'zustand'

export type ToastVariant = 'default' | 'success' | 'destructive'

export interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastState {
  toasts: ToastItem[]
  push: (toast: Omit<ToastItem, 'id' | 'variant'> & { variant?: ToastVariant }) => number
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: ({ title, description, variant = 'default' }) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, title, description, variant }] }))
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/**
 * Imperative toast API, usable from React Query callbacks and other non-render
 * code paths. Mirrors the store actions without subscribing.
 */
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'success' }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'destructive' }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description }),
}
