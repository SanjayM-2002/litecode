// Theme state lives in the Zustand store. This file is kept as the public
// import path so existing call sites (`import { useTheme } from '@/lib/theme'`)
// continue to work.
export { useTheme, useThemeStore } from './stores/theme-store'
