import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, CircleDot, Search, X } from 'lucide-react'
import { fetchProblems, type ProblemsFilter } from '@/lib/api/queries'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ALL_FILTER as ALL,
  useProblemsFiltersStore,
} from '@/lib/stores/problems-filters-store'
import type { Difficulty, SolvedStatus } from '@/lib/types'

export function ProblemsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const topicSlug = searchParams.get('topic')

  const search = useProblemsFiltersStore((s) => s.search)
  const difficulty = useProblemsFiltersStore((s) => s.difficulty)
  const solvedStatus = useProblemsFiltersStore((s) => s.solvedStatus)
  const page = useProblemsFiltersStore((s) => s.page)
  const setSearch = useProblemsFiltersStore((s) => s.setSearch)
  const setDifficulty = useProblemsFiltersStore((s) => s.setDifficulty)
  const setSolvedStatus = useProblemsFiltersStore((s) => s.setSolvedStatus)
  const setPage = useProblemsFiltersStore((s) => s.setPage)
  const limit = 20

  const filter = useMemo<ProblemsFilter>(
    () => ({
      page,
      limit,
      search: search.trim() || null,
      difficulty: difficulty === ALL ? null : difficulty,
      solvedStatus: solvedStatus === ALL ? null : solvedStatus,
      topicSlug: topicSlug || null,
    }),
    [page, search, difficulty, solvedStatus, topicSlug]
  )

  const clearTopic = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('topic')
    setSearchParams(next, { replace: true })
    setPage(1)
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['problems', filter],
    queryFn: () => fetchProblems(filter),
    staleTime: 30_000,
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
        <p className="text-sm text-muted-foreground">
          Browse the problem set, filter by difficulty and status.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems"
            className="pl-9"
          />
        </div>
        <Select
          value={difficulty}
          onValueChange={(v) => setDifficulty(v as Difficulty | typeof ALL)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All difficulties</SelectItem>
            <SelectItem value="EASY">Easy</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HARD">Hard</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={solvedStatus}
          onValueChange={(v) => setSolvedStatus(v as SolvedStatus | typeof ALL)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All status</SelectItem>
            <SelectItem value="SOLVED">Solved</SelectItem>
            <SelectItem value="ATTEMPTED">Attempted</SelectItem>
            <SelectItem value="UNATTEMPTED">Todo</SelectItem>
          </SelectContent>
        </Select>
        {topicSlug && (
          <button
            type="button"
            onClick={clearTopic}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
            title="Clear topic filter"
          >
            Topic: {topicSlug}
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Status</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-32">Topics</TableHead>
              <TableHead className="w-28 text-right">Acceptance</TableHead>
              <TableHead className="w-28">Difficulty</TableHead>
              <TableHead className="w-20 text-right pr-6">Rating</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right pr-6"><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                </TableRow>
              ))}

            {isError && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-destructive py-10">
                  {(error as Error).message || 'Failed to load problems'}
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && data && data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                  No problems match your filters.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError &&
              data?.items.map((p) => (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell>
                    {p.solved ? (
                      <Check className="h-4 w-4 text-[#00b8a3]" />
                    ) : p.attempted ? (
                      <CircleDot className="h-4 w-4 text-[#ffb800]" />
                    ) : (
                      <span className="inline-block h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/problems/${p.slug}`}
                      className="text-sm font-medium hover:text-foreground hover:underline"
                    >
                      {p.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.topics.slice(0, 2).map((t) => (
                        <Badge key={t.id} variant="secondary" className="font-normal">
                          {t.name}
                        </Badge>
                      ))}
                      {p.topics.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{p.topics.length - 2}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                    {p.totalSubmissions > 0
                      ? `${(p.acceptanceRate * 100).toFixed(1)}%`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <DifficultyBadge difficulty={p.difficulty} full />
                  </TableCell>
                  <TableCell className="text-right pr-6 text-sm tabular-nums text-muted-foreground">
                    {p.rating}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} problems
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
