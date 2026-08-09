import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import Editor from '@monaco-editor/react'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  Check,
  CircleCheck,
  CircleX,
  Flame,
  HelpCircle,
  Lightbulb,
  Loader2,
  Lock,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react'
import {
  aiHint,
  aiRoast,
  fetchMe,
  fetchMySubmissions,
  fetchProblem,
  fetchSubmission,
  submitSolution,
  type SubmitSolutionInput,
} from '@/lib/api/queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { VerdictBadge } from '@/components/VerdictBadge'
import { SubmissionDetailDialog } from '@/components/SubmissionDetailDialog'
import { SolutionsPane } from '@/components/SolutionsPane'
import { AiResponseDialog } from '@/components/AiResponseDialog'
import { AiHelpDialog } from '@/components/AiHelpDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LANGUAGE_LABELS, MONACO_LANG } from '@/lib/language'
import { useTheme } from '@/lib/theme'
import { useCodeDraftsStore } from '@/lib/stores/code-drafts-store'
import type {
  Language,
  PublicProblem,
  PublicTestCase,
  Submission,
  TestResultEntry,
} from '@/lib/types'

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

// Single-line rendering, LeetCode-style: `nums = [2,7,11,15]` rather than a
// pretty-printed block.
function formatInline(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function ProblemDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { theme } = useTheme()

  const { data: problem, isLoading, isError, error } = useQuery({
    queryKey: ['problem', slug],
    queryFn: () => fetchProblem(slug),
    enabled: !!slug,
  })

  // Reuses the cached `me` from Navbar / other pages.
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  const isPremium = me?.tier === 'PREMIUM'

  const [hintOpen, setHintOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [roastOpen, setRoastOpen] = useState(false)

  const hintMutation = useMutation({ mutationFn: aiHint })
  const roastMutation = useMutation({ mutationFn: aiRoast })

  // Page-level fetch of this user's submissions for this problem. Drives the
  // Roast toolbar button (needs the latest submissionId) and is reused by the
  // Submissions tab pane via the same queryKey — tanstack-query dedupes.
  const myProblemSubsQuery = useQuery({
    queryKey: ['mySubmissions', { problemId: problem?.id }],
    queryFn: () => fetchMySubmissions({ problemId: problem!.id, page: 1, limit: 50 }),
    enabled: !!problem?.id && !!problem?.solved,
    staleTime: 10_000,
  })
  const latestSubmissionId = myProblemSubsQuery.data?.items[0]?.id ?? null

  const availableLangs = useMemo<Language[]>(
    () => problem?.templates.map((t) => t.language) ?? [],
    [problem]
  )

  const [language, setLanguage] = useState<Language | null>(null)
  const [code, setCode] = useState<string>('')
  const [activeTestIdx, setActiveTestIdx] = useState(0)
  const [bottomTab, setBottomTab] = useState<'testcases' | 'result'>('testcases')
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [leftTab, setLeftTab] = useState<'description' | 'solutions' | 'submissions'>('description')
  const [viewedSubmissionId, setViewedSubmissionId] = useState<string | null>(null)

  const getDraft = useCodeDraftsStore((s) => s.getDraft)
  const setDraft = useCodeDraftsStore((s) => s.setDraft)

  // Pick default language once problem loads
  useEffect(() => {
    if (!problem || language) return
    const preferred: Language[] = ['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA', 'TYPESCRIPT', 'GO', 'RUST']
    const next = preferred.find((l) => availableLangs.includes(l)) ?? availableLangs[0]
    if (next) setLanguage(next)
  }, [problem, language, availableLangs])

  // Load draft (or starter) when language changes
  useEffect(() => {
    if (!problem || !language) return
    const stored = getDraft(problem.slug, language)
    if (stored !== undefined) {
      setCode(stored)
      return
    }
    const tpl = problem.templates.find((t) => t.language === language)
    setCode(tpl?.starterCode ?? '')
  }, [problem, language, getDraft])

  // Persist code as the user edits
  useEffect(() => {
    if (!problem || !language) return
    setDraft(problem.slug, language, code)
  }, [problem, language, code, setDraft])

  const submitMutation = useMutation({
    mutationFn: (input: SubmitSolutionInput) => submitSolution(input),
    onSuccess: (sub) => {
      setSubmissionId(sub.id)
      setBottomTab('result')
    },
  })

  const submissionQuery = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => fetchSubmission(submissionId!),
    enabled: !!submissionId,
    refetchInterval: (q) => {
      const s = q.state.data as Submission | undefined
      if (!s) return 1000
      return s.status === 'GRADED' ? false : 1000
    },
  })

  const handleSubmit = () => {
    if (!problem || !language) return
    submitMutation.mutate({ problemId: problem.id, language, code })
  }

  const handleHint = () => {
    if (!problem) return
    setHintOpen(true)
    hintMutation.reset()
    hintMutation.mutate({
      problemId: problem.id,
      language: language ?? undefined,
      code: code || undefined,
    })
  }

  const handleRoast = () => {
    if (!latestSubmissionId) return
    setRoastOpen(true)
    roastMutation.reset()
    roastMutation.mutate(latestSubmissionId)
  }

  const handleResetCode = () => {
    if (!problem || !language) return
    const tpl = problem.templates.find((t) => t.language === language)
    setCode(tpl?.starterCode ?? '')
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !problem) {
    const message = (error as Error)?.message ?? ''
    const isPremiumLocked = message.includes('PROBLEM_REQUIRES_PREMIUM')

    if (isPremiumLocked) {
      return (
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center p-6">
          <Card className="w-full max-w-md border-[#ffa116]/40 bg-[#ffa116]/5">
            <CardContent className="space-y-4 p-6 text-center">
              <Lock className="mx-auto h-8 w-8 text-[#ffa116]" />
              <div>
                <h2 className="text-lg font-semibold">Premium problem</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This problem is part of the Premium catalog. Upgrade to unlock it along with AI
                  features and unlimited submissions.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Button asChild>
                  <Link to="/plans">
                    <Sparkles className="h-4 w-4" />
                    See plans
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/problems">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">{message || 'Failed to load problem.'}</p>
        <Link to="/problems">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to problems
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <>
    <div className="h-[calc(100vh-3.5rem)] bg-background p-2">
      <PanelGroup orientation="horizontal" className="h-full">
        {/* Left pane: description / submissions */}
        <Panel defaultSize={45} minSize={25}>
          <div className="flex h-full flex-col rounded-lg border bg-card">
            <Tabs
              value={leftTab}
              onValueChange={(v) => setLeftTab(v as 'description' | 'solutions' | 'submissions')}
              className="flex h-full flex-col"
            >
              <div className="border-b px-2">
                <TabsList className="bg-transparent">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="solutions">Solutions</TabsTrigger>
                  <TabsTrigger value="submissions">Submissions</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="description" className="m-0 flex-1 overflow-y-auto px-6 py-4">
                <DescriptionPane problem={problem} />
              </TabsContent>
              <TabsContent value="solutions" className="m-0 flex-1 overflow-y-auto px-4 py-3">
                <SolutionsPane
                  problemId={problem.id}
                  availableLangs={availableLangs}
                />
              </TabsContent>
              <TabsContent value="submissions" className="m-0 flex-1 overflow-y-auto px-4 py-3">
                <ProblemSubmissionsPane
                  problemId={problem.id}
                  onView={(id) => setViewedSubmissionId(id)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1.5 transition-colors hover:bg-accent" />

        {/* Right pane: editor + console */}
        <Panel defaultSize={55} minSize={30}>
          <PanelGroup orientation="vertical">
            <Panel defaultSize={60} minSize={20}>
              <div className="flex h-full flex-col rounded-lg border bg-card">
                <div className="flex items-center justify-between border-b px-3 py-1.5">
                  <Select
                    value={language ?? undefined}
                    onValueChange={(v) => setLanguage(v as Language)}
                  >
                    <SelectTrigger className="h-7 w-36 border-none px-2 text-xs">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLangs.map((l) => (
                        <SelectItem key={l} value={l}>
                          {LANGUAGE_LABELS[l]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetCode}
                    title="Reset to template"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  {language && (
                    <Editor
                      height="100%"
                      language={MONACO_LANG[language]}
                      value={code}
                      onChange={(v) => setCode(v ?? '')}
                      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        tabSize: 4,
                        automaticLayout: true,
                      }}
                    />
                  )}
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="h-1.5 transition-colors hover:bg-accent" />

            <Panel defaultSize={40} minSize={15}>
              <div className="flex h-full flex-col rounded-lg border bg-card">
                <Tabs
                  value={bottomTab}
                  onValueChange={(v) => setBottomTab(v as 'testcases' | 'result')}
                  className="flex h-full flex-col"
                >
                  <div className="flex items-center justify-between border-b px-2">
                    <TabsList className="bg-transparent">
                      <TabsTrigger value="testcases">Testcase</TabsTrigger>
                      <TabsTrigger value="result">Test Result</TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-1.5 pr-2">
                      <AiToolbarButton
                        icon={<Lightbulb className="h-3.5 w-3.5" />}
                        label="Hint"
                        isPremium={isPremium}
                        onClick={handleHint}
                        disabled={hintMutation.isPending}
                      />
                      <AiToolbarButton
                        icon={<HelpCircle className="h-3.5 w-3.5" />}
                        label="Help"
                        isPremium={isPremium}
                        onClick={() => setHelpOpen(true)}
                      />
                      {problem.solved && (
                        <AiToolbarButton
                          icon={<Flame className="h-3.5 w-3.5" />}
                          label="Roast"
                          isPremium={isPremium}
                          onClick={handleRoast}
                          disabled={roastMutation.isPending || !latestSubmissionId}
                        />
                      )}
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handleSubmit}
                        disabled={submitMutation.isPending || !language}
                      >
                        {submitMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Submit
                      </Button>
                    </div>
                  </div>
                  <TabsContent value="testcases" className="m-0 flex-1 overflow-y-auto p-3">
                    <TestCasesPane
                      cases={problem.sampleTestCases}
                      activeIdx={activeTestIdx}
                      onSelect={setActiveTestIdx}
                      argNames={problem.signature.args.map((a) => a.name)}
                    />
                  </TabsContent>
                  <TabsContent value="result" className="m-0 flex-1 overflow-y-auto p-3">
                    <ResultPane
                      submission={submissionQuery.data}
                      isPolling={!!submissionId && submissionQuery.data?.status !== 'GRADED'}
                      submitError={submitMutation.error as Error | null}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
    <SubmissionDetailDialog
      submissionId={viewedSubmissionId}
      open={!!viewedSubmissionId}
      onOpenChange={(open) => {
        if (!open) setViewedSubmissionId(null)
      }}
    />
    <AiResponseDialog
      open={hintOpen}
      onOpenChange={setHintOpen}
      title="Hint"
      description="A small nudge — never the full solution."
      isLoading={hintMutation.isPending}
      error={hintMutation.error as Error | null}
      response={hintMutation.data ?? null}
    />
    <AiHelpDialog
      open={helpOpen}
      onOpenChange={setHelpOpen}
      problemId={problem.id}
      language={language}
      code={code}
    />
    <AiResponseDialog
      open={roastOpen}
      onOpenChange={setRoastOpen}
      title="Code roast"
      description="Senior-engineer-style takedown of your latest submission."
      isLoading={roastMutation.isPending}
      error={roastMutation.error as Error | null}
      response={roastMutation.data ?? null}
    />
    </>
  )
}

// AI toolbar buttons. PREMIUM-only — FREE users get a lock icon and clicking
// routes them to /plans instead of firing the mutation.
function AiToolbarButton({
  icon,
  label,
  isPremium,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  isPremium: boolean
  onClick: () => void
  disabled?: boolean
}) {
  // Premium-locked variant: Lock + AI sparkle alongside, so users still get
  // the "AI feature" cue without it firing.
  if (!isPremium) {
    return (
      <Button variant="ghost" size="sm" asChild title="Premium AI feature">
        <Link to="/plans">
          <Sparkles className="h-3 w-3 text-[#ffa116]" />
          <Lock className="h-3.5 w-3.5" />
          {label}
        </Link>
      </Button>
    )
  }
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={disabled}>
      <Sparkles className="h-3 w-3 text-[#ffa116]" />
      {icon}
      {label}
    </Button>
  )
}

function ProblemSubmissionsPane({
  problemId,
  onView,
}: {
  problemId: string
  onView: (id: string) => void
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['mySubmissions', { problemId }],
    queryFn: () => fetchMySubmissions({ problemId, page: 1, limit: 50 }),
    staleTime: 10_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {(error as Error).message || 'Failed to load submissions'}
      </p>
    )
  }
  if (!data || data.items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No submissions for this problem yet. Submit a solution to see it here.
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {data.items.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onView(s.id)}
          className="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-accent cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <VerdictBadge status={s.status} verdict={s.verdict} />
            <span className="text-muted-foreground">{LANGUAGE_LABELS[s.language]}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            {s.runtime_ms != null && <span>{s.runtime_ms} ms</span>}
            {s.memory_kb != null && <span>{(s.memory_kb / 1024).toFixed(1)} MB</span>}
            <span>{new Date(s.createdAt).toLocaleDateString()}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

function DescriptionPane({ problem }: { problem: PublicProblem }) {
  const argNames = problem.signature.args.map((a) => a.name)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{problem.title}</h1>
        {problem.solved && (
          <Badge variant="success">
            <Check className="mr-1 h-3 w-3" />
            Solved
          </Badge>
        )}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <DifficultyBadge difficulty={problem.difficulty} full />
        <span>•</span>
        <span>Rating: {problem.rating}</span>
        {problem.topics.length > 0 && (
          <>
            <span>•</span>
            <div className="flex flex-wrap gap-1">
              {problem.topics.map((t) => (
                <Badge key={t.id} variant="secondary" className="font-normal">
                  {t.name}
                </Badge>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="prose-leet text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.description}</ReactMarkdown>
      </div>

      {problem.sampleTestCases.length > 0 && (
        <div className="mt-6 space-y-5">
          {problem.sampleTestCases.map((tc, i) => {
            const inputArr = Array.isArray(tc.inlineInput) ? tc.inlineInput : [tc.inlineInput]
            return (
              <div key={tc.id}>
                <p className="mb-2 text-sm font-semibold">Example {i + 1}:</p>
                <div className="space-y-1 border-l-2 border-border py-1 pl-4 font-mono text-xs">
                  <p>
                    <span className="font-semibold">Input: </span>
                    {argNames
                      .map((name, j) => `${name} = ${formatInline(inputArr[j])}`)
                      .join(', ')}
                  </p>
                  <p>
                    <span className="font-semibold">Output: </span>
                    {formatInline(tc.inlineOutput)}
                  </p>
                  {tc.explanation && (
                    <p>
                      <span className="font-semibold">Explanation: </span>
                      {tc.explanation}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 space-y-1 text-xs text-muted-foreground">
        <p className="text-sm font-semibold text-foreground">Constraints:</p>
        <p>Time limit: {problem.timeLimit_ms} ms</p>
        <p>Memory limit: {(problem.memoryLimit_kb / 1024).toFixed(0)} MB</p>
      </div>
    </div>
  )
}

function TestCasesPane({
  cases,
  activeIdx,
  onSelect,
  argNames,
}: {
  cases: PublicTestCase[]
  activeIdx: number
  onSelect: (idx: number) => void
  argNames: string[]
}) {
  if (cases.length === 0) {
    return <p className="text-sm text-muted-foreground">No sample test cases available.</p>
  }
  const current = cases[activeIdx] ?? cases[0]
  const inputArr = Array.isArray(current.inlineInput) ? current.inlineInput : []

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {cases.map((tc, i) => (
          <button
            key={tc.id}
            type="button"
            onClick={() => onSelect(i)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              i === activeIdx
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/60'
            }`}
          >
            Case {i + 1}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {argNames.map((name, i) => (
          <div key={name}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{name} =</p>
            <pre className="rounded-md bg-muted px-3 py-2 text-xs font-mono">
              {formatJson(inputArr[i])}
            </pre>
          </div>
        ))}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Expected =</p>
          <pre className="rounded-md bg-muted px-3 py-2 text-xs font-mono">
            {formatJson(current.inlineOutput)}
          </pre>
        </div>
        {current.explanation && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Explanation</p>
            <p className="text-xs">{current.explanation}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ResultPane({
  submission,
  isPolling,
  submitError,
}: {
  submission: Submission | undefined
  isPolling: boolean
  submitError: Error | null
}) {
  if (submitError) {
    const msg = submitError.message ?? ''
    if (msg.includes('FREE_SUBMISSION_LIMIT_REACHED')) {
      return (
        <div className="rounded-md border border-[#ffa116]/40 bg-[#ffa116]/5 p-3 text-sm">
          <p className="font-medium">Free submission limit reached</p>
          <p className="mt-1 text-muted-foreground">
            Free accounts can submit up to 5 times per problem. Upgrade to Premium for unlimited
            submissions.
          </p>
          <div className="mt-2">
            <Button size="sm" asChild>
              <Link to="/plans">
                <Sparkles className="h-3.5 w-3.5" />
                See plans
              </Link>
            </Button>
          </div>
        </div>
      )
    }
    if (msg.includes('PROBLEM_REQUIRES_PREMIUM')) {
      return (
        <div className="rounded-md border border-[#ffa116]/40 bg-[#ffa116]/5 p-3 text-sm">
          <p className="font-medium">Premium problem</p>
          <p className="mt-1 text-muted-foreground">
            This problem is part of the Premium catalog. Upgrade to submit.
          </p>
          <div className="mt-2">
            <Button size="sm" asChild>
              <Link to="/plans">
                <Sparkles className="h-3.5 w-3.5" />
                See plans
              </Link>
            </Button>
          </div>
        </div>
      )
    }
    return <p className="text-sm text-destructive">{msg}</p>
  }
  if (!submission) {
    return (
      <p className="text-sm text-muted-foreground">
        Click <span className="font-medium text-foreground">Submit</span> to grade your solution.
      </p>
    )
  }

  if (isPolling) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {submission.status === 'PENDING' ? 'Queued…' : 'Running tests…'}
      </div>
    )
  }

  const verdict = submission.verdict
  const accepted = verdict === 'ACCEPTED'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <VerdictBadge status={submission.status} verdict={verdict} />
        {submission.runtime_ms != null && (
          <span className="text-xs text-muted-foreground">
            Runtime: {submission.runtime_ms} ms
          </span>
        )}
        {submission.memory_kb != null && (
          <span className="text-xs text-muted-foreground">
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

      {accepted && (
        <div className="flex items-center gap-2 rounded-md bg-[#00b8a3]/10 px-3 py-2 text-sm text-[#00b8a3]">
          <CircleCheck className="h-4 w-4" />
          All test cases passed.
        </div>
      )}
    </div>
  )
}

