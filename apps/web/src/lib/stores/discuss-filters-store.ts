import { create } from 'zustand'
import type { DiscussTag } from '../types'

export const ALL_FILTER = '__all__'

interface DiscussFiltersState {
  tag: DiscussTag | typeof ALL_FILTER
  search: string
  page: number
  setTag: (tag: DiscussTag | typeof ALL_FILTER) => void
  setSearch: (search: string) => void
  setPage: (page: number) => void
  reset: () => void
}

const INITIAL = {
  tag: ALL_FILTER as DiscussTag | typeof ALL_FILTER,
  search: '',
  page: 1,
}

export const useDiscussFiltersStore = create<DiscussFiltersState>((set) => ({
  ...INITIAL,
  setTag: (tag) => set({ tag, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(INITIAL),
}))
