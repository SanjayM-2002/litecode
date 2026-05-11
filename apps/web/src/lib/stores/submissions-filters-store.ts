import { create } from 'zustand'
import type { Language, SubmissionStatus, Verdict } from '../types'

export const ALL_FILTER = '__all__'

interface SubmissionsFiltersState {
  language: Language | typeof ALL_FILTER
  status: SubmissionStatus | typeof ALL_FILTER
  verdict: Verdict | typeof ALL_FILTER
  page: number
  setLanguage: (v: Language | typeof ALL_FILTER) => void
  setStatus: (v: SubmissionStatus | typeof ALL_FILTER) => void
  setVerdict: (v: Verdict | typeof ALL_FILTER) => void
  setPage: (page: number) => void
  reset: () => void
}

const INITIAL = {
  language: ALL_FILTER as Language | typeof ALL_FILTER,
  status: ALL_FILTER as SubmissionStatus | typeof ALL_FILTER,
  verdict: ALL_FILTER as Verdict | typeof ALL_FILTER,
  page: 1,
}

export const useSubmissionsFiltersStore = create<SubmissionsFiltersState>((set) => ({
  ...INITIAL,
  setLanguage: (language) => set({ language, page: 1 }),
  setStatus: (status) => set({ status, page: 1 }),
  setVerdict: (verdict) => set({ verdict, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(INITIAL),
}))
