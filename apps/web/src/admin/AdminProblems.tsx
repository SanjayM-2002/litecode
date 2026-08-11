import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, EyeOff, Plus, Search, Send } from 'lucide-react'
import { ALL_DIFFICULTIES, DIFFICULTY_LABELS } from '@litecode/shared-types'
import {
  fetchAdminProblems,
  publishProblem,
  unpublishProblem,
  validationErrorsFrom,
  type AdminProblemsFilter,
} from '@/lib/api/admin'
import type { AdminProblem } from '@/lib/admin-types'
import { toast } from '@/lib/stores/toast-store'
import {
  ALL_FILTER as ALL,
  useAdminProblemsFiltersStore,
} from '@/lib/stores/admin-problems-filters-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PermissionGate } from './components/PermissionGate'
import type { Difficulty } from '@/lib/types'

const LIMIT = 20

export function AdminProblemsPage() {
  const queryClient = useQueryClient()

  const search = useAdminProblemsFiltersStore((s) => s.search)
  const difficulty = useAdminProblemsFiltersStore((s) => s.difficulty)
  const publishState = useAdminProblemsFiltersStore((s) => s.publishState)
  const page = useAdminProblemsFiltersStore((s) => s.page)
  const setSearch = useAdminProblemsFiltersStore((s) => s.setSearch)
  const setDifficulty = useAdminProblemsFiltersStore((s) => s.setDifficulty)
  const setPublishState = useAdminProblemsFiltersStore((s) => s.setPublishState)
  const setPage = useAdminProblemsFiltersStore((s) => s.setPage)

  const filter = useMemo<AdminProblemsFilter>(
    () => ({
      page,
      limit: LIMIT,
      search: search.trim() || null,
      difficulty: difficulty === ALL ? null : difficulty,
      isPublished: publishState === ALL ? null : publishState === 'published',
    }),
    [page, search, difficulty, publishState]
  )

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'problems', filter],
    queryFn: () => fetchAdminProblems(filter),
    staleTime: 15_000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'problems'] })
    queryClient.invalidateQueries({ queryKey: ['problems'] })
  }

  const publish = useMutation({
    mutationFn: publishProblem,
    onSuccess: (p) => {
      toast.success(`Published “${p.title}”`)
      invalidate()
    },
    onError: (err) => {
      const errors = validationErrorsFrom(err)
      toast.error(
        'Cannot publish problem',
        errors.length ? errors.join(' · ') : (err as Error).message
      )
    },
  })

  const unpublish = useMutation({
    mutationFn: unpublishProblem,
    onSuccess: (p) => {
      toast.info(`“${p.title}” is now a draft`)
      invalidate()
    },
    onError: (err) => toast.error('Failed to unpublish', (err as Error).message),
  })

  const meta = data?.meta
  const busyId = publish.isPending
    ? publish.variables
    : unpublish.isPending
      ? unpublish.variables
      : null

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
          <p className="text-sm text-muted-foreground">
            Drafts and published problems. {meta ? `${meta.total} total.` : ''}
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title"
            className="pl-9"
          />
        </div>
        <Select
          value={difficulty}
          onValueChange={(v) => setDifficulty(v as Difficulty | typeof ALL)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All difficulties</SelectItem>
            {ALL_DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={publishState}
          onValueChange={(v) => setPublishState(v as typeof publishState)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-[110px]">Difficulty</TableHead>
              <TableHead className="w-[80px]">Rating</TableHead>
              <TableHead className="w-[150px]">Topics</TableHead>
              <TableHead className="w-[110px]">Tests</TableHead>
              <TableHead className="w-[110px]">Templates</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={8} className="text-sm text-destructive">
                  {(error as Error).message || 'Failed to load problems'}
                </TableCell>
              </TableRow>
            )}

            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-sm text-muted-foreground">
                  No problems match these filters.
                </TableCell>
              </TableRow>
            )}

            {data?.items.map((p) => (
              <ProblemRow
                key={p.id}
                problem={p}
                busy={busyId === p.id}
                onPublish={() => publish.mutate(p.id)}
                onUnpublish={() => unpublish.mutate(p.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setPage(meta.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage(meta.page + 1)}
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

function ProblemRow({
  problem,
  busy,
  onPublish,
  onUnpublish,
}: {
  problem: AdminProblem
  busy: boolean
  onPublish: () => void
  onUnpublish: () => void
}) {
  const samples = problem.testCases.filter((tc) => tc.isSample).length
  const hidden = problem.testCases.length - samples

  return (
    <TableRow>
      <TableCell>
        <Link
          to={`/admin/problems/${problem.id}`}
          className="font-medium hover:text-[#ffa116]"
        >
          {problem.title}
        </Link>
        <p className="text-xs text-muted-foreground">{problem.slug}</p>
      </TableCell>
      <TableCell>
        <DifficultyBadge difficulty={problem.difficulty} full />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{problem.rating}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {problem.topics.slice(0, 2).map((t) => (
            <Badge key={t.id} variant="secondary" className="text-[10px]">
              {t.name}
            </Badge>
          ))}
          {problem.topics.length > 2 && (
            <Badge variant="outline" className="text-[10px]">
              +{problem.topics.length - 2}
            </Badge>
          )}
          {problem.topics.length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {samples} sample · {hidden} hidden
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {problem.templates.length === 0
          ? '—'
          : problem.templates.map((t) => t.language.slice(0, 2)).join(', ')}
      </TableCell>
      <TableCell>
        <Badge variant={problem.isPublished ? 'success' : 'warning'} className="text-[10px]">
          {problem.isPublished ? 'Published' : 'Draft'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <PermissionGate permission="EDIT_PROBLEM">
          {problem.isPublished ? (
            <Button variant="ghost" size="sm" disabled={busy} onClick={onUnpublish}>
              <EyeOff className="h-3.5 w-3.5" />
              Unpublish
            </Button>
          ) : (
            <Button variant="ghost" size="sm" disabled={busy} onClick={onPublish}>
              <Send className="h-3.5 w-3.5" />
              Publish
            </Button>
          )}
        </PermissionGate>
      </TableCell>
    </TableRow>
  )
}
