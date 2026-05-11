import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Loader2, Pencil, Send, Trash2 } from 'lucide-react'
import {
  ALL_DISCUSS_TAGS,
  DISCUSS_TAG_LABELS,
} from '@litecode/shared-types'
import {
  addDiscussReply,
  deleteDiscussPost,
  deleteDiscussReply,
  fetchDiscussPost,
  updateDiscussPost,
  updateDiscussReply,
} from '@/lib/api/queries'
import { useAuth } from '@/lib/auth'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { relativeTime } from '@/lib/format'
import type { DiscussReply as DiscussReplyT, DiscussTag } from '@/lib/types'

export function DiscussPostPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ['discussPost', id],
    queryFn: () => fetchDiscussPost(id),
    enabled: !!id,
  })

  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftTag, setDraftTag] = useState<DiscussTag>('GENERAL')
  const [draftContent, setDraftContent] = useState('')
  const [replyDraft, setReplyDraft] = useState('')

  useEffect(() => {
    if (post && !editing) {
      setDraftTitle(post.title)
      setDraftTag(post.tag)
      setDraftContent(post.content)
    }
  }, [post, editing])

  const isOwner = !!user && !!post && post.author.id === user.id

  const updateMutation = useMutation({
    mutationFn: (input: { title: string; content: string; tag: DiscussTag }) =>
      updateDiscussPost(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussPost', id] })
      queryClient.invalidateQueries({ queryKey: ['discussPosts'] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteDiscussPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussPosts'] })
      navigate('/discuss', { replace: true })
    },
  })

  const replyMutation = useMutation({
    mutationFn: addDiscussReply,
    onSuccess: () => {
      setReplyDraft('')
      queryClient.invalidateQueries({ queryKey: ['discussPost', id] })
      queryClient.invalidateQueries({ queryKey: ['discussPosts'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (isError || !post) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <p className="text-sm text-destructive">
          {(error as Error)?.message ?? 'Post not found.'}
        </p>
        <Link to="/discuss" className="mt-3 inline-block text-sm text-muted-foreground hover:text-foreground">
          ← Back to Discuss
        </Link>
      </div>
    )
  }

  const onReplySubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!replyDraft.trim()) return
    replyMutation.mutate({ postId: id, content: replyDraft })
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link
        to="/discuss"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Discuss
      </Link>

      {editing ? (
        <PostEditor
          title={draftTitle}
          tag={draftTag}
          content={draftContent}
          onTitleChange={setDraftTitle}
          onTagChange={setDraftTag}
          onContentChange={setDraftContent}
          onSave={() =>
            updateMutation.mutate({
              title: draftTitle.trim(),
              tag: draftTag,
              content: draftContent,
            })
          }
          onCancel={() => setEditing(false)}
          isSaving={updateMutation.isPending}
          error={updateMutation.error as Error | null}
        />
      ) : (
        <article>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{post.title}</h1>
              <Badge variant="secondary" className="font-normal">
                {DISCUSS_TAG_LABELS[post.tag]}
              </Badge>
            </div>
            {isOwner && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(true)}
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Delete this post? This cannot be undone.')) {
                      deleteMutation.mutate()
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar name={post.author.name ?? 'User'} size="sm" className="h-5 w-5 text-[10px]" />
            <span>{post.author.name ?? 'User'}</span>
            <span>·</span>
            <span>{relativeTime(post.createdAt)}</span>
            {post.problem && (
              <>
                <span>·</span>
                <Link
                  to={`/problems/${post.problem.slug}`}
                  className="text-foreground/80 hover:underline"
                >
                  → {post.problem.title}
                </Link>
              </>
            )}
          </div>

          <div className="prose-leet text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
          </div>
        </article>
      )}

      <hr className="my-6" />

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
        </p>

        <div className="space-y-2">
          {post.replies.map((r) => (
            <ReplyRow key={r.id} reply={r} postId={id} ownUserId={user?.id ?? null} />
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

// ---- post editor (edit-in-place) ----

function PostEditor({
  title,
  tag,
  content,
  onTitleChange,
  onTagChange,
  onContentChange,
  onSave,
  onCancel,
  isSaving,
  error,
}: {
  title: string
  tag: DiscussTag
  content: string
  onTitleChange: (v: string) => void
  onTagChange: (v: DiscussTag) => void
  onContentChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  error: Error | null
}) {
  return (
    <div className="space-y-4 rounded-md border bg-card p-4">
      <div className="space-y-2">
        <label className="text-xs font-medium">Title</label>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={200}
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium">Tag</label>
        <Select value={tag} onValueChange={(v) => onTagChange(v as DiscussTag)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_DISCUSS_TAGS.map((t) => (
              <SelectItem key={t} value={t}>
                {DISCUSS_TAG_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium">Body (markdown)</label>
        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          rows={8}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={isSaving || title.trim().length === 0 || content.trim().length === 0}
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </div>
  )
}

// ---- replies (with edit-in-place) ----

function ReplyRow({
  reply,
  postId,
  ownUserId,
}: {
  reply: DiscussReplyT
  postId: string
  ownUserId: string | null
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(reply.content)

  const updateMutation = useMutation({
    mutationFn: () => updateDiscussReply(reply.id, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussPost', postId] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteDiscussReply(reply.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussPost', postId] })
      queryClient.invalidateQueries({ queryKey: ['discussPosts'] })
    },
  })

  const isOwner = ownUserId === reply.author.id

  return (
    <div className="rounded-md border bg-card p-3">
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
              onClick={() => {
                if (confirm('Delete this reply?')) deleteMutation.mutate()
              }}
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
