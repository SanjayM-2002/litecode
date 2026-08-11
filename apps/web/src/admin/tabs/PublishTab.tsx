import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, EyeOff, Loader2, Send, XCircle } from 'lucide-react'
import { LANGUAGE_LABELS, argsShapeSchema } from '@litecode/shared-types'
import { publishProblem, unpublishProblem, validationErrorsFrom } from '@/lib/api/admin'
import type { AdminProblem } from '@/lib/admin-types'
import { toast } from '@/lib/stores/toast-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Requirement {
  label: string
  ok: boolean
  hint: string
}

/** Mirrors AdminService.validateForPublish so the gate is visible before the call. */
function requirementsFor(problem: AdminProblem): Requirement[] {
  const samples = problem.testCases.filter((tc) => tc.isSample).length
  const hidden = problem.testCases.length - samples
  const argsOk = argsShapeSchema.safeParse(problem.signature.args).success

  return [
    {
      label: 'At least one code template',
      ok: problem.templates.length > 0,
      hint:
        problem.templates.length > 0
          ? problem.templates.map((t) => LANGUAGE_LABELS[t.language]).join(', ')
          : 'Add one on the Templates tab',
    },
    {
      label: 'At least one sample test case',
      ok: samples > 0,
      hint: `${samples} sample ${samples === 1 ? 'case' : 'cases'}`,
    },
    {
      label: 'At least one hidden test case',
      ok: hidden > 0,
      hint: `${hidden} hidden ${hidden === 1 ? 'case' : 'cases'}`,
    },
    {
      label: 'Signature has a method name',
      ok: problem.signature.methodName.length > 0,
      hint: problem.signature.methodName || 'Set it on the Signature tab',
    },
    {
      label: 'Signature has a return type',
      ok: problem.signature.returnType.length > 0,
      hint: problem.signature.returnType || 'Set it on the Signature tab',
    },
    {
      label: 'Arguments are well-formed',
      ok: argsOk,
      hint: argsOk
        ? `${problem.signature.args.length} ${problem.signature.args.length === 1 ? 'argument' : 'arguments'}`
        : 'Each argument needs a name and a type',
    },
  ]
}

export function PublishTab({ problem }: { problem: AdminProblem }) {
  const queryClient = useQueryClient()
  const [serverErrors, setServerErrors] = useState<string[]>([])

  const requirements = requirementsFor(problem)
  const ready = requirements.every((r) => r.ok)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problem.id] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'problems'] })
    queryClient.invalidateQueries({ queryKey: ['problems'] })
  }

  const publish = useMutation({
    mutationFn: () => publishProblem(problem.id),
    onSuccess: () => {
      setServerErrors([])
      toast.success('Problem published', 'It is now visible to participants.')
      refresh()
    },
    onError: (err) => {
      const errors = validationErrorsFrom(err)
      setServerErrors(errors.length ? errors : [(err as Error).message])
      toast.error('Cannot publish problem')
    },
  })

  const unpublish = useMutation({
    mutationFn: () => unpublishProblem(problem.id),
    onSuccess: () => {
      toast.info('Problem unpublished', 'Participants can no longer see it.')
      refresh()
    },
    onError: (err) => toast.error('Failed to unpublish', (err as Error).message),
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Badge variant={problem.isPublished ? 'success' : 'warning'}>
          {problem.isPublished ? 'Published' : 'Draft'}
        </Badge>
        {problem.isPublished && (
          <Link
            to={`/problems/${problem.slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            View as participant
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Publish checklist</h2>
          <p className="text-xs text-muted-foreground">
            The server re-runs these checks; publishing is blocked until they all pass.
          </p>
        </div>
        <ul className="divide-y">
          {requirements.map((r) => (
            <li key={r.label} className="flex items-center gap-3 px-4 py-3">
              {r.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2cbb5d]" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <span className={cn('text-sm', !r.ok && 'text-muted-foreground')}>{r.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{r.hint}</span>
            </li>
          ))}
        </ul>
      </div>

      {serverErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="mb-2 text-sm font-medium text-destructive">
            The server rejected the publish:
          </p>
          <ul className="list-inside list-disc space-y-1 text-xs text-destructive">
            {serverErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        {problem.isPublished ? (
          <Button
            type="button"
            variant="outline"
            disabled={unpublish.isPending}
            onClick={() => unpublish.mutate()}
          >
            {unpublish.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            Unpublish
          </Button>
        ) : (
          <Button
            type="button"
            variant="success"
            disabled={!ready || publish.isPending}
            onClick={() => publish.mutate()}
          >
            {publish.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publish problem
          </Button>
        )}
      </div>

      {!problem.isPublished && !ready && (
        <p className="text-xs text-muted-foreground">
          Finish the unchecked items above to enable publishing.
        </p>
      )}
    </div>
  )
}
