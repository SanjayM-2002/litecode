import { create } from 'zustand'
import type { Difficulty } from '../types'
import { ALL_FILTER } from './problems-filters-store'

export { ALL_FILTER }

export type PublishFilter = typeof ALL_FILTER | 'published' | 'draft'

interface AdminProblemsFiltersState {
  search: string
  difficulty: Difficulty | typeof ALL_FILTER
  publishState: PublishFilter
  page: number
  setSearch: (search: string) => void
  setDifficulty: (d: Difficulty | typeof ALL_FILTER) => void
  setPublishState: (s: PublishFilter) => void
  setPage: (page: number) => void
  reset: () => void
}

const INITIAL = {
  search: '',
  difficulty: ALL_FILTER as Difficulty | typeof ALL_FILTER,
  publishState: ALL_FILTER as PublishFilter,
  page: 1,
}

export const useAdminProblemsFiltersStore = create<AdminProblemsFiltersState>((set) => ({
  ...INITIAL,
  setSearch: (search) => set({ search, page: 1 }),
  setDifficulty: (difficulty) => set({ difficulty, page: 1 }),
  setPublishState: (publishState) => set({ publishState, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(INITIAL),
}))
