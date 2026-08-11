import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FlaskConical, Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import {
  addTestCases,
  deleteTestCase,
  updateTestCase,
  type TestCaseInput,
} from '@/lib/api/admin'
import type { AdminProblem, AdminTestCase } from '@/lib/admin-types'
import { toast } from '@/lib/stores/toast-store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function TestCasesTab({ problem }: { problem: AdminProblem }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<AdminTestCase | null>(null)
  const [adding, setAdding] = useState(false)
  const [bulk, setBulk] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminTestCase | null>(null)

  const argCount = problem.signature.args.length
  const samples = problem.testCases.filter((tc) => tc.isSample)
  const hidden = problem.testCases.filter((tc) => !tc.isSample)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problem.id] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'problems'] })
  }

  const toggleSample = useMutation({
    mutationFn: ({ id, isSample }: { id: string; isSample: boolean }) =>
      updateTestCase(id, { isSample }),
    onSuccess: refresh,
    onError: (err) => toast.error('Failed to update test case', (err as Error).message),
  })

  const remove = useMutation({
    mutationFn: deleteTestCase,
    onSuccess: () => {
      toast.info('Test case deleted')
      setDeleteTarget(null)
      refresh()
    },
    onError: (err) => toast.error('Failed to delete', (err as Error).message),
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FlaskConical className="h-4 w-4" />
          {samples.length} sample · {hidden.length} hidden · inputs must be a JSON array of{' '}
          {argCount} {argCount === 1 ? 'value' : 'values'}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setBulk(true)}>
            <Upload className="h-3.5 w-3.5" />
            Bulk add
          </Button>
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add test case
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Input</TableHead>
              <TableHead>Expected output</TableHead>
              <TableHead className="w-[90px]">Sample</TableHead>
              <TableHead>Explanation</TableHead>
              <TableHead className="w-[90px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {problem.testCases.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                  No test cases yet. Publishing needs at least one sample and one hidden case.
                </TableCell>
              </TableRow>
            )}
            {problem.testCases.map((tc) => (
              <TableRow key={tc.id}>
                <TableCell className="text-xs text-muted-foreground">{tc.order}</TableCell>
                <TableCell className="max-w-[260px]">
                  <code className="block truncate text-xs">{stringify(tc.inlineInput)}</code>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <code className="block truncate text-xs">{stringify(tc.inlineOutput)}</code>
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={tc.isSample}
                    disabled={toggleSample.isPending}
                    onCheckedChange={(checked) =>
                      toggleSample.mutate({ id: tc.id, isSample: checked === true })
                    }
                    aria-label="Toggle sample"
                  />
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <span className="block truncate text-xs text-muted-foreground">
                    {tc.explanation ?? '—'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(tc)}
                    aria-label="Edit test case"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(tc)}
                    aria-label="Delete test case"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SingleTestCaseDialog
        key={editing?.id ?? 'new'}
        open={adding || editing !== null}
        testCase={editing}
        problemId={problem.id}
        argCount={argCount}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
        onSaved={refresh}
      />

      <BulkTestCasesDialog
        open={bulk}
        problemId={problem.id}
        argCount={argCount}
        onClose={() => setBulk(false)}
        onSaved={refresh}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this test case?</AlertDialogTitle>
            <AlertDialogDescription>
              Submissions already judged against it keep their verdicts. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (deleteTarget) remove.mutate(deleteTarget.id)
              }}
            >
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---- single add / edit ----

function SingleTestCaseDialog({
  open,
  testCase,
  problemId,
  argCount,
  onClose,
  onSaved,
}: {
  open: boolean
  testCase: AdminTestCase | null
  problemId: string
  argCount: number
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = testCase !== null
  const [inputText, setInputText] = useState(
    testCase ? stringify(testCase.inlineInput) : '[]'
  )
  const [outputText, setOutputText] = useState(
    testCase ? stringify(testCase.inlineOutput) : ''
  )
  const [isSample, setIsSample] = useState(testCase?.isSample ?? false)
  const [explanation, setExplanation] = useState(testCase?.explanation ?? '')
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async () => {
      const parsed = parseTestCase(inputText, outputText, argCount)
      if ('error' in parsed) throw new Error(parsed.error)
      if (isEdit) {
        return updateTestCase(testCase.id, {
          inlineInput: parsed.input,
          inlineOutput: parsed.output,
          isSample,
          explanation: explanation.trim() || null,
        })
      }
      return addTestCases(problemId, [
        {
          inlineInput: parsed.input,
          inlineOutput: parsed.output,
          isSample,
          explanation: explanation.trim() || null,
        },
      ])
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Test case updated' : 'Test case added')
      setError(null)
      onSaved()
      onClose()
    },
    onError: (err) => setError((err as Error).message),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit test case' : 'Add test case'}</DialogTitle>
          <DialogDescription>
            Input is a positional JSON array with {argCount}{' '}
            {argCount === 1 ? 'entry' : 'entries'}, matching the signature arguments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tc-input">Input (JSON array)</Label>
            <Textarea
              id="tc-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={3}
              className="font-mono text-xs"
              placeholder="[[2,7,11,15], 9]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tc-output">Expected output (JSON)</Label>
            <Textarea
              id="tc-output"
              value={outputText}
              onChange={(e) => setOutputText(e.target.value)}
              rows={2}
              className="font-mono text-xs"
              placeholder="[0,1]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="tc-sample"
              checked={isSample}
              onCheckedChange={(c) => setIsSample(c === true)}
            />
            <Label htmlFor="tc-sample" className="cursor-pointer">
              Visible to participants as a sample
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tc-explanation">Explanation (optional)</Label>
            <Input
              id="tc-explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Because nums[0] + nums[1] == 9"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Add test case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- bulk add ----

const BULK_EXAMPLE = `[
  { "input": [[2,7,11,15], 9], "output": [0,1], "isSample": true },
  { "input": [[3,2,4], 6], "output": [1,2] }
]`

function BulkTestCasesDialog({
  open,
  problemId,
  argCount,
  onClose,
  onSaved,
}: {
  open: boolean
  problemId: string
  argCount: number
  onClose: () => void
  onSaved: () => void
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async () => {
      const inputs = parseBulk(text, argCount)
      if ('error' in inputs) throw new Error(inputs.error)
      return addTestCases(problemId, inputs.rows)
    },
    onSuccess: (rows) => {
      toast.success(`Added ${rows.length} test ${rows.length === 1 ? 'case' : 'cases'}`)
      setText('')
      setError(null)
      onSaved()
      onClose()
    },
    onError: (err) => setError((err as Error).message),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk add test cases</DialogTitle>
          <DialogDescription>
            Paste an array of objects. `isSample` defaults to false, `explanation` is optional.
            Order follows the array.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="font-mono text-xs"
            placeholder={BULK_EXAMPLE}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={save.isPending || text.trim().length === 0}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add cases
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- parsing helpers ----

function stringify(value: unknown): string {
  return JSON.stringify(value ?? null)
}

type ParsedCase = { input: unknown[]; output: unknown } | { error: string }

/**
 * The judge feeds `inlineInput` to the driver as a positional array, so an
 * arity mismatch here produces a runtime error at grading time rather than an
 * authoring error — check it before the row is ever stored.
 */
function parseTestCase(inputText: string, outputText: string, argCount: number): ParsedCase {
  let input: unknown
  try {
    input = JSON.parse(inputText)
  } catch {
    return { error: 'Input is not valid JSON.' }
  }
  if (!Array.isArray(input)) {
    return { error: 'Input must be a JSON array, one entry per argument.' }
  }
  if (input.length !== argCount) {
    return {
      error: `Input has ${input.length} ${input.length === 1 ? 'entry' : 'entries'} but the signature takes ${argCount}.`,
    }
  }
  if (outputText.trim().length === 0) {
    return { error: 'Expected output is required.' }
  }
  let output: unknown
  try {
    output = JSON.parse(outputText)
  } catch {
    return { error: 'Expected output is not valid JSON.' }
  }
  return { input, output }
}

function parseBulk(
  text: string,
  argCount: number
): { rows: TestCaseInput[] } | { error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: 'Not valid JSON.' }
  }
  if (!Array.isArray(parsed)) {
    return { error: 'Expected a JSON array of test case objects.' }
  }
  const rows: TestCaseInput[] = []
  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i] as Record<string, unknown>
    if (typeof row !== 'object' || row === null) {
      return { error: `Entry ${i + 1} is not an object.` }
    }
    if (!Array.isArray(row.input)) {
      return { error: `Entry ${i + 1}: "input" must be an array.` }
    }
    if (row.input.length !== argCount) {
      return {
        error: `Entry ${i + 1}: "input" has ${row.input.length} values but the signature takes ${argCount}.`,
      }
    }
    if (!('output' in row)) {
      return { error: `Entry ${i + 1}: "output" is required.` }
    }
    rows.push({
      inlineInput: row.input,
      inlineOutput: row.output,
      isSample: row.isSample === true,
      explanation: typeof row.explanation === 'string' ? row.explanation : null,
    })
  }
  if (rows.length === 0) return { error: 'No test cases to add.' }
  return { rows }
}
