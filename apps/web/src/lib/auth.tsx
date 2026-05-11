// Auth state lives in the Zustand store. This file is kept as the public
// import path so existing call sites (`import { useAuth } from '@/lib/auth'`)
// continue to work.
export { useAuth, useAuthStore, getAuthToken } from './stores/auth-store'
