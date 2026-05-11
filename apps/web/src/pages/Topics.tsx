import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Tags } from 'lucide-react'
import { fetchTopics, type TopicsFilter } from '@/lib/api/queries'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export function TopicsPage() {
  const [search, setSearch] = useState('')

  const filter = useMemo<TopicsFilter>(
    () => ({
      search: search.trim() || null,
      page: 1,
      limit: 200,
    }),
    [search]
  )

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['topics', filter],
    queryFn: () => fetchTopics(filter),
    staleTime: 60_000,
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
        <p className="text-sm text-muted-foreground">
          Browse problems by topic. Click a topic to see all problems tagged with it.
        </p>
      </div>

      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics"
            className="pl-9"
          />
        </div>
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          {(error as Error).message || 'Failed to load topics'}
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No topics match your search.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data?.items.map((t) => (
            <Link key={t.id} to={`/problems?topic=${encodeURIComponent(t.slug)}`}>
              <Card className="group h-full cursor-pointer transition-colors hover:border-foreground/30">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Tags className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    {t.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
