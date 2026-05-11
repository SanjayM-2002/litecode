import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
} from 'lucide-react'
import {
  addSolutionReply,
  createSolution,
  deleteSolution,
  deleteSolutionReply,
  fetchSolutions,
  updateSolution,
  updateSolutionReply,
} from '@/lib/api/queries'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/lib/auth'
import { relativeTime } from '@/lib/format'
import { LANGUAGE_LABELS, MONACO_LANG } from '@/lib/language'
import { useTheme } from '@/lib/theme'
import type { Language, Solution, SolutionReply } from '@/lib/types'

type View =
  | { kind: 'list' }
  | { kind: 'post' }
  | { kind: 'detail'; solutionId: string }

interface Props {
  problemId: string
  availableLangs: Language[]
}

export function SolutionsPane({ problemId, availableLangs }: Props) {
  const [view, setView] = useState<View>({ kind: 'list' })

  if (view.kind === 'list') {
    return (
      <SolutionsList
        problemId={problemId}
        onPost={() => setView({ kind: 'post' })}
        onOpen={(id) => setView({ kind: 'detail', solutionId: id })}
      />
    )
  }

  if (view.kind === 'post') {
    return (
      <PostSolutionForm
        problemId={problemId}
        availableLangs={availableLangs}
        onCancel={() => setView({ kind: 'list' })}
        onCreated={(s) => setView({ kind: 'detail', solutionId: s.id })}
      />
    )
  }

  return (
    <SolutionDetail
      problemId={problemId}
      solutionId={view.solutionId}
      onBack={() => setView({ kind: 'list' })}
    />
  )
}

// ---------- list ----------

function SolutionsList({
  problemId,
  onPost,
  onOpen,
}: {
  problemId: string
  onPost: () => void
  onOpen: (id: string) => void
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['solutions', problemId],
    queryFn: () => fetchSolutions({ problemId, page: 1, limit: 50 }),
    staleTime: 15_000,
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {data ? `${data.meta.total} solution${data.meta.total === 1 ? '' : 's'}` : ' '}
        </p>
        <Button size="sm" onClick={onPost}>
          <Plus className="h-3.5 w-3.5" />
          Post solution
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          {(error as Error).message || 'Failed to load solutions'}
        </p>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No solutions yet. Be the first to share your approach.
        </p>
      )}

      <div className="space-y-2">
        {data?.items.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onOpen(s.id)}
            className="block w-full rounded-md border bg-card p-3 text-left transition-colors hover:border-foreground/30 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="line-clamp-2 text-sm font-medium">{s.title}</p>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {LANGUAGE_LABELS[s.language]}
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar name={s.author.name ?? 'User'} size="sm" className="h-5 w-5 text-[10px]" />
              <span>{s.author.name ?? 'User'}</span>
              <span>·</span>
              <span>{relativeTime(s.createdAt)}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {s.replyCount}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------- post form ----------

function PostSolutionForm({
  problemId,
  availableLangs,
  onCancel,
  onCreated,
}: {
  problemId: string
  availableLangs: Language[]
  onCancel: () => void
  onCreated: (s: Solution) => void
}) {
  const queryClient = useQueryClient()
  const { theme } = useTheme()

  const initialLang = availableLangs[0] ?? 'PYTHON'
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState<Language>(initialLang)
  const [content, setContent] = useState('')
  const [code, setCode] = useState('')

  const mutation = useMutation({
    mutationFn: createSolution,
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: ['solutions', problemId] })
      onCreated(s)
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      problemId,
      title: title.trim(),
      language,
      content,
      code,
    })
  }

  const canSubmit =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    code.trim().length > 0 &&
    !mutation.isPending

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="solution-title">Title</Label>
        <Input
          id="solution-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Two-pointer O(n)"
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Language</Label>
        <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableLangs.map((l) => (
              <SelectItem key={l} value={l}>
                {LANGUAGE_LABELS[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="solution-content">Explanation (markdown)</Label>
        <Textarea
          id="solution-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="Walk through the approach, complexity, and intuition. Markdown supported."
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Code</Label>
        <div className="overflow-hidden rounded-md border">
          <Editor
            height="260px"
            language={MONACO_LANG[language]}
            value={code}
            onChange={(v) => setCode(v ?? '')}
            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {mutation.isError && (
        <p className="text-sm text-destructive">
          {(mutation.error as Error).message || 'Failed to post solution'}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Post
        </Button>
      </div>
    </form>
  )
}

// ---------- detail ----------

function SolutionDetail({
  problemId,
  solutionId,
  onBack,
}: {
  problemId: string
  solutionId: string
  onBack: () => void
}) {
  const queryClient = useQueryClient()
  const { theme } = useTheme()
  const { user } = useAuth()
  const [replyDraft, setReplyDraft] = useState('')

  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftLang, setDraftLang] = useState<Language>('PYTHON')
  const [draftContent, setDraftContent] = useState('')
  const [draftCode, setDraftCode] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['solution', solutionId],
    queryFn: async () => {
      // The backend exposes both `solution(id)` and `solutions(filter)` — we fetched the
      // list with full fields; just re-use the same shape via the filter query, taking the
      // matching item. This avoids adding another GraphQL doc when the data is identical.
      const page = await fetchSolutions({ problemId, page: 1, limit: 100 })
      return page.items.find((s) => s.id === solutionId) ?? null
    },
    staleTime: 5_000,
  })

  // Seed edit drafts when entering edit mode
  const enterEdit = () => {
    if (!data) return
    setDraftTitle(data.title)
    setDraftLang(data.language)
    setDraftContent(data.content)
    setDraftCode(data.code)
    setEditing(true)
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      updateSolution(solutionId, {
        title: draftTitle.trim(),
        language: draftLang,
        content: draftContent,
        code: draftCode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solution', solutionId] })
      queryClient.invalidateQueries({ queryKey: ['solutions', problemId] })
      setEditing(false)
    },
  })

  const replyMutation = useMutation({
    mutationFn: addSolutionReply,
    onSuccess: () => {
      setReplyDraft('')
      queryClient.invalidateQueries({ queryKey: ['solution', solutionId] })
      queryClient.invalidateQueries({ queryKey: ['solutions', problemId] })
    },
  })

  const deleteSolutionMutation = useMutation({
    mutationFn: deleteSolution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solutions', problemId] })
      onBack()
    },
  })

  const deleteReplyMutation = useMutation({
    mutationFn: deleteSolutionReply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solution', solutionId] })
      queryClient.invalidateQueries({ queryKey: ['solutions', problemId] })
    },
  })

  const isOwner = useMemo(
    () => !!user && !!data && data.author.id === user.id,
    [user, data],
  )

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
        {(error as Error).message || 'Failed to load solution'}
      </p>
    )
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Solution not found.</p>
  }

  const onReplySubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!replyDraft.trim()) return
    replyMutation.mutate({ solutionId, content: replyDraft })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        {isOwner && !editing && (
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={enterEdit} title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('Delete this solution? This cannot be undone.')) {
                  deleteSolutionMutation.mutate(solutionId)
                }
              }}
              disabled={deleteSolutionMutation.isPending}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-3 rounded-md border bg-card p-3">
          <div className="space-y-1.5">
            <Label htmlFor="solution-edit-title">Title</Label>
            <Input
              id="solution-edit-title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Language</Label>
            <Select value={draftLang} onValueChange={(v) => setDraftLang(v as Language)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.code &&
                  (Object.keys(LANGUAGE_LABELS) as Language[]).map((l) => (
                    <SelectItem key={l} value={l}>
                      {LANGUAGE_LABELS[l]}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="solution-edit-content">Explanation (markdown)</Label>
            <Textarea
              id="solution-edit-content"
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Code</Label>
            <div className="overflow-hidden rounded-md border">
              <Editor
                height="240px"
                language={MONACO_LANG[draftLang]}
                value={draftCode}
                onChange={(v) => setDraftCode(v ?? '')}
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
          {updateMutation.isError && (
            <p className="text-sm text-destructive">
              {(updateMutation.error as Error).message || 'Failed to save'}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => updateMutation.mutate()}
              disabled={
                updateMutation.isPending ||
                draftTitle.trim().length === 0 ||
                draftContent.trim().length === 0 ||
                draftCode.trim().length === 0
              }
            >
              {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{data.title}</h2>
              <Badge variant="secondary" className="font-normal">
                {LANGUAGE_LABELS[data.language]}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar name={data.author.name ?? 'User'} size="sm" className="h-5 w-5 text-[10px]" />
              <span>{data.author.name ?? 'User'}</span>
              <span>·</span>
              <span>{relativeTime(data.createdAt)}</span>
              {data.createdAt !== data.updatedAt && (
                <>
                  <span>·</span>
                  <span className="italic">edited</span>
                </>
              )}
            </div>
          </div>

          <div className="prose-leet text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Code</p>
            <div className="overflow-hidden rounded-md border">
              <Editor
                height="280px"
                language={MONACO_LANG[data.language]}
                value={data.code}
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
        </>
      )}

      <div className="space-y-3 border-t pt-3">
        <p className="text-xs font-medium text-muted-foreground">
          {data.replies.length} {data.replies.length === 1 ? 'reply' : 'replies'}
        </p>

        <div className="space-y-2">
          {data.replies.map((r) => (
            <ReplyRow
              key={r.id}
              reply={r}
              solutionId={solutionId}
              problemId={problemId}
              ownUserId={user?.id ?? null}
              onDelete={() => {
                if (confirm('Delete this reply?')) {
                  deleteReplyMutation.mutate(r.id)
                }
              }}
            />
          ))}
        </div>

        <form onSubmit={onReplySubmit} className="space-y-2">
          <Textarea
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            placeholder="Write a reply…"
            rows={3}
          />
          {replyMutation.isError && (
            <p className="text-sm text-destructive">
              {(replyMutation.error as Error).message || 'Failed to reply'}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!replyDraft.trim() || replyMutation.isPending}
            >
              {replyMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Reply
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ReplyRow({
  reply,
  solutionId,
  problemId,
  ownUserId,
  onDelete,
}: {
  reply: SolutionReply
  solutionId: string
  problemId: string
  ownUserId: string | null
  onDelete: () => void
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(reply.content)
  const isOwner = ownUserId === reply.author.id

  const updateMutation = useMutation({
    mutationFn: () => updateSolutionReply(reply.id, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solution', solutionId] })
      queryClient.invalidateQueries({ queryKey: ['solutions', problemId] })
      setEditing(false)
    },
  })

  return (
    <div className="rounded-md border bg-card p-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar
            name={reply.author.name ?? 'User'}
            size="sm"
            className="h-5 w-5 text-[10px]"
          />
          <span className="font-medium text-foreground">{reply.author.name ?? 'User'}</span>
          <span>·</span>
          <span>{relativeTime(reply.createdAt)}</span>
          {reply.createdAt !== reply.updatedAt && (
            <>
              <span>·</span>
              <span className="italic">edited</span>
            </>
          )}
        </div>
        {isOwner && !editing && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setDraft(reply.content)
                setEditing(true)
              }}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              title="Edit reply"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
              title="Delete reply"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            autoFocus
          />
          {updateMutation.isError && (
            <p className="text-xs text-destructive">
              {(updateMutation.error as Error).message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => updateMutation.mutate()}
              disabled={!draft.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm">{reply.content}</p>
      )}
    </div>
  )
}

