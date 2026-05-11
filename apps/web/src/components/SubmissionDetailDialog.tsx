import { useQuery } from '@tanstack/react-query'
import Editor from '@monaco-editor/react'
import { CircleCheck, CircleX, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VerdictBadge } from '@/components/VerdictBadge'
import { fetchSubmission } from '@/lib/api/queries'
import { LANGUAGE_LABELS } from '@/lib/language'
import { MONACO_LANG } from '@/lib/language'
import { useTheme } from '@/lib/theme'
import type { TestResultEntry } from '@/lib/types'

interface Props {
  submissionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SubmissionDetailDialog({ submissionId, open, onOpenChange }: Props) {
  const { theme } = useTheme()
  const { data: submission, isLoading } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => fetchSubmission(submissionId!),
    enabled: open && !!submissionId,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submission detail</DialogTitle>
          <DialogDescription>
            {submission ? new Date(submission.createdAt).toLocaleString() : '—'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !submission ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <VerdictBadge status={submission.status} verdict={submission.verdict} />
              <span className="text-muted-foreground">
                {LANGUAGE_LABELS[submission.language]}
              </span>
              {submission.runtime_ms != null && (
                <span className="text-muted-foreground">
                  Runtime: {submission.runtime_ms} ms
                </span>
              )}
              {submission.memory_kb != null && (
                <span className="text-muted-foreground">
                  Memory: {(submission.memory_kb / 1024).toFixed(1)} MB
                </span>
              )}
            </div>

            {submission.errorMessage && (
              <pre className="rounded-md bg-destructive/10 p-3 text-xs text-destructive whitespace-pre-wrap">
                {submission.errorMessage}
              </pre>
            )}

            {Array.isArray(submission.testResults) && submission.testResults.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Per-test results</p>
                <div className="space-y-1">
                  {(submission.testResults as TestResultEntry[]).map((r, i) => (
                    <div
                      key={r.testCaseId ?? i}
                      className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
                    >
                      {r.verdict === 'ACCEPTED' ? (
                        <CircleCheck className="h-3.5 w-3.5 text-[#00b8a3]" />
                      ) : (
                        <CircleX className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span className="font-medium">Case {i + 1}</span>
                      <span className="text-muted-foreground">{r.verdict}</span>
                      {r.runtime_ms != null && (
                        <span className="ml-auto text-muted-foreground">
                          {r.runtime_ms} ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Code</p>
              <div className="overflow-hidden rounded-md border">
                <Editor
                  height="360px"
                  language={MONACO_LANG[submission.language]}
                  value={submission.code}
                  theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
