import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Loader2, Search, X } from 'lucide-react'
import { fetchAdminTopics } from '@/lib/api/admin'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Topics are seeded, never created here — this only attaches existing ones.
 * Selected ids are resolved against the same list so labels survive a reload.
 */
export function TopicMultiSelect({
  value,
  onChange,
  invalid,
}: {
  value: string[]
  onChange: (ids: string[]) => void
  invalid?: boolean
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

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

  // The seeded topic set is small, so one page covers both the dropdown and the
  // label lookup for already-selected ids. isActive: null keeps inactive topics
  // in the list — a problem may already be attached to one.
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'topics', 'all'],
    queryFn: () => fetchAdminTopics({ page: 1, limit: 100, isActive: null }),
    staleTime: 5 * 60_000,
  })

  const topics = useMemo(() => data?.items ?? [], [data])
  const selected = useMemo(
    () => value.map((id) => topics.find((t) => t.id === id)).filter((t) => t !== undefined),
    [value, topics]
  )

  const trimmed = search.trim().toLowerCase()
  const options = trimmed
    ? topics.filter(
        (t) => t.name.toLowerCase().includes(trimmed) || t.slug.includes(trimmed)
      )
    : topics

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <div ref={wrapperRef} className="relative space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search topics to attach"
          className={cn('pl-9', invalid && 'border-destructive')}
        />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <Badge key={t.id} variant="secondary" className="gap-1 pr-1.5">
              {t.name}
              <button
                type="button"
                onClick={() => toggle(t.id)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={`Remove ${t.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-11 z-30 max-h-64 overflow-y-auto rounded-md border bg-popover shadow-lg">
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading topics…
            </div>
          )}
          {!isLoading && options.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No topics match.</p>
          )}
          {options.map((t) => {
            const isSelected = value.includes(t.id)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent cursor-pointer"
              >
                <span className="truncate">
                  {t.name}
                  {!t.isActive && (
                    <span className="ml-1.5 text-xs text-muted-foreground">(inactive)</span>
                  )}
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#2cbb5d]" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
