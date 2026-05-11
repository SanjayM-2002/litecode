import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '../types'

function key(slug: string, language: Language) {
  return `${slug}::${language}`
}

interface CodeDraftsState {
  drafts: Record<string, string>
  getDraft: (slug: string, language: Language) => string | undefined
  setDraft: (slug: string, language: Language, code: string) => void
  clearDraft: (slug: string, language: Language) => void
}

export const useCodeDraftsStore = create<CodeDraftsState>()(
  persist(
    (set, get) => ({
      drafts: {},
      getDraft: (slug, language) => get().drafts[key(slug, language)],
      setDraft: (slug, language, code) =>
        set((state) => ({ drafts: { ...state.drafts, [key(slug, language)]: code } })),
      clearDraft: (slug, language) =>
        set((state) => {
          const next = { ...state.drafts }
          delete next[key(slug, language)]
          return { drafts: next }
        }),
    }),
    { name: 'litecode-code-drafts' },
  ),
)
