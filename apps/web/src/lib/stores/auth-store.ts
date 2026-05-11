import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResponse, PublicUser } from '../types'

interface AuthState {
  user: PublicUser | null
  token: string | null
  isAuthenticated: boolean
  setSession: (resp: AuthResponse) => void
  updateUser: (user: PublicUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setSession: (resp) =>
        set({ user: resp.user, token: resp.accessToken, isAuthenticated: true }),
      updateUser: (user) => set({ user }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'litecode-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isAuthenticated = !!state.token
      },
    },
  ),
)

/** Hook with the same shape as the old context-based useAuth. */
export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setSession = useAuthStore((s) => s.setSession)
  const updateUser = useAuthStore((s) => s.updateUser)
  const logout = useAuthStore((s) => s.logout)
  return { user, token, isAuthenticated, setSession, updateUser, logout }
}

/**
 * Imperative read of the current token, for non-React callers like the GraphQL
 * client middleware. Bypasses React subscription.
 */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token
}
