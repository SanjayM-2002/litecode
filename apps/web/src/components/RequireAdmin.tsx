import { Link, Navigate, Outlet } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useAdminProfile } from '@/lib/admin'
import { Button } from '@/components/ui/button'

/**
 * Nests inside RequireAuth. The role check is instant (persisted session), the
 * profile query is the authoritative confirmation.
 */
export function RequireAdmin() {
  const { user } = useAuth()
  const { isLoading, isError, error } = useAdminProfile()

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/problems" replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="h-8 w-8 text-destructive" />
        <h1 className="text-lg font-semibold">Admin access unavailable</h1>
        <p className="text-sm text-muted-foreground">
          {(error as Error).message || 'Your account has no admin profile.'}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/problems">Back to problems</Link>
        </Button>
      </div>
    )
  }

  return <Outlet />
}
