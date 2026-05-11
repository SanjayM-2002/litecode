import { SUBMISSION_STATUS_LABELS, VERDICT_LABELS } from '@litecode/shared-types'
import { Badge } from '@/components/ui/badge'
import type { SubmissionStatus, Verdict } from '@/lib/types'

export function VerdictBadge({
  status,
  verdict,
}: {
  status: SubmissionStatus
  verdict: Verdict | null
}) {
  if (status !== 'GRADED') {
    return <Badge variant="warning">{SUBMISSION_STATUS_LABELS[status]}</Badge>
  }
  if (!verdict) return <Badge variant="secondary">Unknown</Badge>
  if (verdict === 'ACCEPTED') return <Badge variant="success">{VERDICT_LABELS[verdict]}</Badge>
  return <Badge variant="destructive">{VERDICT_LABELS[verdict]}</Badge>
}
