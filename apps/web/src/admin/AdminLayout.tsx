import { Suspense } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  ArrowLeft,
  Code2,
  FileCode2,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { useAdminProfile } from '@/lib/admin'
import { PERMISSION_LABELS } from '@/lib/admin-types'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/problems', label: 'Problems', icon: FileCode2, end: false },
]

export function AdminLayout() {
  const { data } = useAdminProfile()
  const permissions = data?.profile.permissions ?? []

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#ffa116] text-black">
            <Code2 className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">litecode</span>
          <Badge variant="secondary" className="ml-auto text-[10px]">
            Admin
          </Badge>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t p-4">
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Permissions
            </p>
            <div className="flex flex-wrap gap-1">
              {permissions.length === 0 && (
                <span className="text-xs text-muted-foreground">None granted</span>
              )}
              {permissions.map((p) => (
                <Badge key={p} variant="outline" className="text-[10px]">
                  {PERMISSION_LABELS[p] ?? p}
                </Badge>
              ))}
            </div>
          </div>
          <Link
            to="/problems"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to litecode
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b px-6">
          <div className="flex items-center gap-3 md:hidden">
            <span className="text-sm font-semibold">Admin</span>
            {navItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn('text-sm', isActive ? 'text-foreground' : 'text-muted-foreground')
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {data?.user.email}
            </span>
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1">
          {/* Child routes are lazy too — keep the shell mounted while they load. */}
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
