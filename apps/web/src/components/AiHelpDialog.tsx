import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Send, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { aiHelp, type AiHelpInput } from '@/lib/api/queries'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { AiResponse, Language } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  problemId: string
  language: Language | null
  code: string
}

export function AiHelpDialog({ open, onOpenChange, problemId, language, code }: Props) {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<AiResponse | null>(null)

  const mutation = useMutation({
    mutationFn: (input: AiHelpInput) => aiHelp(input),
    onSuccess: (resp) => setResponse(resp),
  })

  const handleAsk = () => {
    if (!language || !question.trim()) return
    setResponse(null)
    mutation.mutate({ problemId, language, code, question: question.trim() })
  }

  const reset = () => {
    setQuestion('')
    setResponse(null)
    mutation.reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#ffa116]" />
            Ask for help
          </DialogTitle>
          <DialogDescription>
            Share what you're stuck on. The AI walks you through the approach without writing the
            solution for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. I'm not sure why my recursion isn't terminating…"
            disabled={mutation.isPending}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAsk}
              disabled={mutation.isPending || !question.trim() || !language}
            >
              {mutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Ask
            </Button>
          </div>
        </div>

        {mutation.isError && !mutation.isPending && (
          <p className="text-sm text-destructive">
            {(mutation.error as Error).message || 'Something went wrong'}
          </p>
        )}

        {response && !mutation.isPending && (
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
