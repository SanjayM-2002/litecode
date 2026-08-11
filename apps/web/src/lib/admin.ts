import { useQuery } from '@tanstack/react-query'
import { fetchAdminMe } from './api/admin'
import { useAuth } from './auth'
import type { Permission } from './admin-types'

/**
 * Server-side truth for admin access. The persisted role in the auth store is
 * only a hint — this query is what catches an ADMIN role with no AdminProfile
 * row, or a token that has since been revoked.
 */
export function useAdminProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['admin', 'me'],
    queryFn: fetchAdminMe,
    enabled: user?.role === 'ADMIN',
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useAdminPermissions(): Permission[] {
  const { data } = useAdminProfile()
  return data?.profile.permissions ?? []
}

/** Hides actions the AdminPermissionsGuard would reject anyway. */
export function useHasPermission(permission: Permission): boolean {
  return useAdminPermissions().includes(permission)
}
