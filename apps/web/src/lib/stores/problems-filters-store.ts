import { create } from 'zustand'
import type { Difficulty, SolvedStatus } from '../types'

export const ALL_FILTER = '__all__'

interface ProblemsFiltersState {
  search: string
  difficulty: Difficulty | typeof ALL_FILTER
  solvedStatus: SolvedStatus | typeof ALL_FILTER
  page: number
  setSearch: (search: string) => void
  setDifficulty: (d: Difficulty | typeof ALL_FILTER) => void
  setSolvedStatus: (s: SolvedStatus | typeof ALL_FILTER) => void
  setPage: (page: number) => void
  reset: () => void
}

const INITIAL = {
  search: '',
  difficulty: ALL_FILTER as Difficulty | typeof ALL_FILTER,
  solvedStatus: ALL_FILTER as SolvedStatus | typeof ALL_FILTER,
  page: 1,
}

export const useProblemsFiltersStore = create<ProblemsFiltersState>((set) => ({
  ...INITIAL,
  setSearch: (search) => set({ search, page: 1 }),
  setDifficulty: (difficulty) => set({ difficulty, page: 1 }),
  setSolvedStatus: (solvedStatus) => set({ solvedStatus, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(INITIAL),
}))
