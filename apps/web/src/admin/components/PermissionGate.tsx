import type { ReactNode } from 'react'
import { useHasPermission } from '@/lib/admin'
import type { Permission } from '@/lib/admin-types'

/**
 * Renders children only when the signed-in admin holds `permission`.
 * Purely cosmetic — AdminPermissionsGuard enforces the same rule server-side.
 */
export function PermissionGate({
  permission,
  fallback = null,
  children,
}: {
  permission: Permission
  fallback?: ReactNode
  children: ReactNode
}) {
  return useHasPermission(permission) ? <>{children}</> : <>{fallback}</>
}
