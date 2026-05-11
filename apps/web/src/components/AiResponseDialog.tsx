import { Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AiResponse } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  isLoading: boolean
  error: Error | null
  response: AiResponse | null
}

export function AiResponseDialog({
  open,
  onOpenChange,
  title,
  description,
  isLoading,
  error,
  response,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#ffa116]" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking…
          </div>
        )}

        {error && !isLoading && (
          <p className="text-sm text-destructive">
            {error.message || 'Something went wrong'}
          </p>
        )}

        {response && !isLoading && !error && (
          <>
            <div className="prose-leet text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{response.text}</ReactMarkdown>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                via <span className="font-medium">{response.provider}</span> ({response.model})
              </span>
              {response.inputTokens != null && response.outputTokens != null && (
                <span>
                  {response.inputTokens} in / {response.outputTokens} out tokens
                </span>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
