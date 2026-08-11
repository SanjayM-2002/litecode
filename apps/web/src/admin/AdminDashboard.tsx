import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileCode2, Plus, Send, Tags } from 'lucide-react'
import { fetchAdminProblems, fetchAdminTopics } from '@/lib/api/admin'
import { useAdminProfile } from '@/lib/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { relativeTime } from '@/lib/format'
import { PermissionGate } from './components/PermissionGate'

export function AdminDashboardPage() {
  const { data: me } = useAdminProfile()

  // Counts come from pagination meta — limit 1 keeps the payload tiny.
  const published = useQuery({
    queryKey: ['admin', 'problems', { count: 'published' }],
    queryFn: () => fetchAdminProblems({ isPublished: true, page: 1, limit: 1 }),
    staleTime: 30_000,
  })
  const drafts = useQuery({
    queryKey: ['admin', 'problems', { count: 'draft' }],
    queryFn: () => fetchAdminProblems({ isPublished: false, page: 1, limit: 1 }),
    staleTime: 30_000,
  })
  const topics = useQuery({
    queryKey: ['admin', 'topics', { count: true }],
    queryFn: () => fetchAdminTopics({ page: 1, limit: 1 }),
    staleTime: 5 * 60_000,
  })
  const recent = useQuery({
    queryKey: ['admin', 'problems', { recent: true }],
    queryFn: () => fetchAdminProblems({ page: 1, limit: 6 }),
    staleTime: 30_000,
  })

  const publishedCount = published.data?.meta.total
  const draftCount = drafts.data?.meta.total
  const total =
    publishedCount !== undefined && draftCount !== undefined
      ? publishedCount + draftCount
      : undefined

  const firstName = me?.user.name?.split(' ')[0]

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {firstName ? `Welcome back, ${firstName}` : 'Admin dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Author problems, wire up templates, and publish when the gate is green.
          </p>
        </div>
        <PermissionGate permission="CREATE_PROBLEM">
          <Button asChild>
            <Link to="/admin/problems/new">
              <Plus className="h-4 w-4" />
              New problem
            </Link>
          </Button>
        </PermissionGate>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total problems" value={total} icon={FileCode2} />
        <StatCard label="Published" value={publishedCount} icon={Send} />
        <StatCard label="Drafts" value={draftCount} icon={FileCode2} />
        <StatCard label="Topics" value={topics.data?.meta.total} icon={Tags} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recently updated</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/problems">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {recent.isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}

          {recent.data?.items.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              No problems yet. Create your first one to get started.
            </p>
          )}

          {recent.data?.items.map((p) => (
            <Link
              key={p.id}
              to={`/admin/problems/${p.id}`}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.slug} · updated {relativeTime(p.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <DifficultyBadge difficulty={p.difficulty} full />
                <Badge
                  variant={p.isPublished ? 'success' : 'warning'}
                  className="text-[10px]"
                >
                  {p.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number | undefined
  icon: typeof FileCode2
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {value === undefined ? (
            <Skeleton className="h-7 w-10" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          )}
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  )
}
