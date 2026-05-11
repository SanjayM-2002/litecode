import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, MessageSquare, Plus, Search } from 'lucide-react'
import { DISCUSS_TAG_LABELS, ALL_DISCUSS_TAGS } from '@litecode/shared-types'
import { fetchDiscussPosts, type DiscussPostsFilter } from '@/lib/api/queries'
import {
  ALL_FILTER as ALL,
  useDiscussFiltersStore,
} from '@/lib/stores/discuss-filters-store'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/format'

export function DiscussPage() {
  const navigate = useNavigate()

  const tag = useDiscussFiltersStore((s) => s.tag)
  const search = useDiscussFiltersStore((s) => s.search)
  const page = useDiscussFiltersStore((s) => s.page)
  const setTag = useDiscussFiltersStore((s) => s.setTag)
  const setSearch = useDiscussFiltersStore((s) => s.setSearch)
  const setPage = useDiscussFiltersStore((s) => s.setPage)
  const limit = 20

  const filter = useMemo<DiscussPostsFilter>(
    () => ({
      page,
      limit,
      tag: tag === ALL ? null : tag,
      search: search.trim() || null,
    }),
    [page, tag, search]
  )

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['discussPosts', filter],
    queryFn: () => fetchDiscussPosts(filter),
    staleTime: 15_000,
  })

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Discuss</h1>
          <p className="text-sm text-muted-foreground">
            Threads on problems, careers, interviews, and compensation.
          </p>
        </div>
        <Button onClick={() => navigate('/discuss/new')}>
          <Plus className="h-4 w-4" />
          New post
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <TagPill active={tag === ALL} onClick={() => setTag(ALL)}>
          All
        </TagPill>
        {ALL_DISCUSS_TAGS.map((t) => (
          <TagPill key={t} active={tag === t} onClick={() => setTag(t)}>
            {DISCUSS_TAG_LABELS[t]}
          </TagPill>
        ))}
      </div>

      <div className="mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts"
            className="pl-9"
          />
        </div>
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          {(error as Error).message || 'Failed to load posts'}
        </p>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {!isLoading && data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">No posts match your filters.</p>
      )}

      <div className="space-y-2">
        {data?.items.map((p) => (
          <Link
            key={p.id}
            to={`/discuss/${p.id}`}
            className="block rounded-md border bg-card p-4 transition-colors hover:border-foreground/30"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-2 text-sm font-medium">{p.title}</h3>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {DISCUSS_TAG_LABELS[p.tag]}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Avatar name={p.author.name ?? 'User'} size="sm" className="h-5 w-5 text-[10px]" />
              <span>{p.author.name ?? 'User'}</span>
              <span>·</span>
              <span>{relativeTime(p.createdAt)}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {p.replyCount}
              </span>
              {p.problem && (
                <>
                  <span>·</span>
                  <span className="text-foreground/70">→ {p.problem.title}</span>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} posts
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.meta.page <= 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.meta.page >= data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function TagPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
        active
          ? 'border-transparent bg-foreground text-background'
          : 'border-border bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}