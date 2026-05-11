import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchMySubmissions, type MySubmissionsFilter } from '@/lib/api/queries'
import {
  ALL_FILTER as ALL,
  useSubmissionsFiltersStore,
} from '@/lib/stores/submissions-filters-store'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { VerdictBadge } from '@/components/VerdictBadge'
import { SubmissionDetailDialog } from '@/components/SubmissionDetailDialog'
import { LANGUAGE_LABELS } from '@/lib/language'
import {
  SUBMISSION_STATUS_LABELS,
  VERDICT_LABELS_SHORT,
} from '@litecode/shared-types'
import type { Language, SubmissionStatus, Verdict } from '@/lib/types'

function timeAgo(iso: string) {
  const d = new Date(iso).getTime()
  const diffSec = Math.max(1, Math.round((Date.now() - d) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

export function SubmissionsPage() {
  const language = useSubmissionsFiltersStore((s) => s.language)
  const status = useSubmissionsFiltersStore((s) => s.status)
  const verdict = useSubmissionsFiltersStore((s) => s.verdict)
  const page = useSubmissionsFiltersStore((s) => s.page)
  const setLanguage = useSubmissionsFiltersStore((s) => s.setLanguage)
  const setStatus = useSubmissionsFiltersStore((s) => s.setStatus)
  const setVerdict = useSubmissionsFiltersStore((s) => s.setVerdict)
  const setPage = useSubmissionsFiltersStore((s) => s.setPage)
  const [viewedId, setViewedId] = useState<string | null>(null)

  const filter = useMemo<MySubmissionsFilter>(
    () => ({
      page,
      limit: 20,
      language: language === ALL ? null : language,
      status: status === ALL ? null : status,
      verdict: verdict === ALL ? null : verdict,
    }),
    [page, language, status, verdict]
  )

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['mySubmissions', filter],
    queryFn: () => fetchMySubmissions(filter),
    staleTime: 10_000,
  })

  return (
    <>
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">My Submissions</h1>
        <p className="text-sm text-muted-foreground">All of your past submission attempts.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as SubmissionStatus | typeof ALL)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All status</SelectItem>
            {(Object.keys(SUBMISSION_STATUS_LABELS) as SubmissionStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {SUBMISSION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={verdict}
          onValueChange={(v) => setVerdict(v as Verdict | typeof ALL)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Verdict" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All verdicts</SelectItem>
            {(Object.keys(VERDICT_LABELS_SHORT) as Verdict[]).map((v) => (
              <SelectItem key={v} value={v}>
                {VERDICT_LABELS_SHORT[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={language}
          onValueChange={(v) => setLanguage(v as Language | typeof ALL)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All languages</SelectItem>
            {(Object.keys(LANGUAGE_LABELS) as Language[]).map((l) => (
              <SelectItem key={l} value={l}>
                {LANGUAGE_LABELS[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Runtime</TableHead>
              <TableHead>Memory</TableHead>
              <TableHead className="text-right pr-6">Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell className="text-right pr-6"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                </TableRow>
              ))}

            {isError && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-destructive">
                  {(error as Error).message || 'Failed to load submissions'}
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && data && data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No submissions yet.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError &&
              data?.items.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => setViewedId(s.id)}
                >
                  <TableCell>
                    <VerdictBadge status={s.status} verdict={s.verdict} />
                  </TableCell>
                  <TableCell className="text-sm">{LANGUAGE_LABELS[s.language]}</TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {s.runtime_ms != null ? `${s.runtime_ms} ms` : '—'}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {s.memory_kb != null ? `${(s.memory_kb / 1024).toFixed(1)} MB` : '—'}
                  </TableCell>
                  <TableCell className="text-right pr-6 text-sm text-muted-foreground">
                    {timeAgo(s.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} submissions
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
    <SubmissionDetailDialog
      submissionId={viewedId}
      open={!!viewedId}
      onOpenChange={(open) => {
        if (!open) setViewedId(null)
      }}
    />
    </>
  )
}
