import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Search, X } from 'lucide-react'
import {
  ALL_DISCUSS_TAGS,
  DISCUSS_TAG_LABELS,
  DiscussTag,
} from '@litecode/shared-types'
import { createDiscussPost, fetchProblems } from '@/lib/api/queries'
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

interface SelectedProblem {
  id: string
  title: string
  slug: string
}

export function DiscussNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [tag, setTag] = useState<DiscussTag>(DiscussTag.GENERAL)
  const [content, setContent] = useState('')
  const [selectedProblem, setSelectedProblem] = useState<SelectedProblem | null>(null)

  const mutation = useMutation({
    mutationFn: createDiscussPost,
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['discussPosts'] })
      navigate(`/discuss/${post.id}`, { replace: true })
    },
  })

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !mutation.isPending

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      title: title.trim(),
      content,
      tag,
      problemId: selectedProblem?.id ?? null,
    })
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

      <h1 className="mb-1 text-2xl font-semibold tracking-tight">New post</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Markdown supported in the body. Images and videos are not supported.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="post-title">Title</Label>
          <Input
            id="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What is your post about?"
            maxLength={200}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tag</Label>
            <Select value={tag} onValueChange={(v) => setTag(v as DiscussTag)}>
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
            <Label>Related problem (optional)</Label>
            <ProblemPicker
              selected={selectedProblem}
              onSelect={setSelectedProblem}
              onClear={() => setSelectedProblem(null)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="post-content">Body (markdown)</Label>
          <Textarea
            id="post-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="Share your thoughts…"
            required
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {(mutation.error as Error).message || 'Failed to post'}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/discuss')}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Publish
          </Button>
        </div>
      </form>
    </div>
  )
}

// ---- problem picker ----

function ProblemPicker({
  selected,
  onSelect,
  onClear,
}: {
  selected: SelectedProblem | null
  onSelect: (p: SelectedProblem) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const trimmed = query.trim()
  const enabled = open && trimmed.length >= 2 && !selected

  const { data, isFetching } = useQuery({
    queryKey: ['problemPickerSearch', trimmed],
    queryFn: () => fetchProblems({ search: trimmed, page: 1, limit: 8 }),
    enabled,
    staleTime: 30_000,
  })

  const items = useMemo(() => data?.items ?? [], [data])

  if (selected) {
    return (
      <div className="flex h-9 items-center justify-between rounded-md border bg-secondary/50 px-3 text-sm">
        <span className="truncate">{selected.title}</span>
        <button
          type="button"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground cursor-pointer"
          title="Detach"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search problems"
        className="pl-9"
      />
      {open && trimmed.length >= 2 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          {isFetching && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching…
            </div>
          )}
          {!isFetching && items.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No matches.</p>
          )}
          {!isFetching &&
            items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect({ id: p.id, title: p.title, slug: p.slug })
                  setQuery('')
                  setOpen(false)
                }}
                className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-accent cursor-pointer"
              >
                {p.title}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
