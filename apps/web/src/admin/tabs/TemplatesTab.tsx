import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Loader2, RotateCcw, Save, Sparkles } from 'lucide-react'
import {
  ALL_LANGUAGES,
  LANGUAGE_LABELS,
  USER_CODE_PLACEHOLDER,
  isGeneratableLanguage,
  type Language,
} from '@litecode/shared-types'
import { generateTemplate, setCodeTemplate } from '@/lib/api/admin'
import type { AdminProblem } from '@/lib/admin-types'
import { toast } from '@/lib/stores/toast-store'
import { useHasPermission } from '@/lib/admin'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CodeEditor } from '../components/CodeEditor'

export function TemplatesTab({ problem }: { problem: AdminProblem }) {
  const [language, setLanguage] = useState<Language>(
    problem.templates[0]?.language ?? 'CPP'
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {ALL_LANGUAGES.map((lang) => {
          const exists = problem.templates.some((t) => t.language === lang)
          return (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors cursor-pointer',
                language === lang
                  ? 'border-[#ffa116] bg-[#ffa116]/10 text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {LANGUAGE_LABELS[lang]}
              {exists && <Check className="h-3.5 w-3.5 text-[#2cbb5d]" />}
            </button>
          )
        })}
      </div>

      <TemplateEditor key={language} problem={problem} language={language} />
    </div>
  )
}

function TemplateEditor({
  problem,
  language,
}: {
  problem: AdminProblem
  language: Language
}) {
  const queryClient = useQueryClient()
  const canManage = useHasPermission('MANAGE_TEMPLATES')
  const stored = problem.templates.find((t) => t.language === language)

  const [starterCode, setStarterCode] = useState(stored?.starterCode ?? '')
  const [driverCode, setDriverCode] = useState(stored?.driverCode ?? '')

  const generatable = isGeneratableLanguage(language)
  const missingPlaceholder = driverCode.length > 0 && !driverCode.includes(USER_CODE_PLACEHOLDER)
  const dirty = starterCode !== (stored?.starterCode ?? '') || driverCode !== (stored?.driverCode ?? '')

  const generate = useMutation({
    mutationFn: () => generateTemplate(language, problem.signature),
    onSuccess: (t) => {
      setStarterCode(t.starterCode)
      setDriverCode(t.driverCode)
      toast.success(`Generated ${LANGUAGE_LABELS[language]} boilerplate`, 'Review it, then save.')
    },
    onError: (err) => toast.error('Generation failed', (err as Error).message),
  })

  const save = useMutation({
    mutationFn: () => setCodeTemplate(problem.id, { language, starterCode, driverCode }),
    onSuccess: () => {
      toast.success(`Saved ${LANGUAGE_LABELS[language]} template`)
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problem.id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'problems'] })
    },
    onError: (err) => toast.error('Failed to save template', (err as Error).message),
  })

  const canSave =
    canManage &&
    starterCode.trim().length > 0 &&
    driverCode.trim().length > 0 &&
    !missingPlaceholder &&
    !save.isPending

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{LANGUAGE_LABELS[language]}</h2>
          {stored ? (
            <Badge variant="success" className="text-[10px]">
              Saved
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Not configured
            </Badge>
          )}
          {dirty && (
            <Badge variant="warning" className="text-[10px]">
              Unsaved
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          {generatable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generate.isPending}
              onClick={() => generate.mutate()}
            >
              {generate.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate from signature
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!dirty}
            onClick={() => {
              setStarterCode(stored?.starterCode ?? '')
              setDriverCode(stored?.driverCode ?? '')
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Revert
          </Button>
          <Button type="button" size="sm" disabled={!canSave} onClick={() => save.mutate()}>
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save template
          </Button>
        </div>
      </div>

      {!generatable && (
        <p className="rounded-md border border-dashed px-4 py-2.5 text-xs text-muted-foreground">
          No generator exists for {LANGUAGE_LABELS[language]} yet — write the starter and driver
          code by hand.
        </p>
      )}

      {!canManage && (
        <p className="rounded-md border border-dashed px-4 py-2.5 text-xs text-muted-foreground">
          You need the “Manage templates” permission to save changes here.
        </p>
      )}

      <div className="space-y-2">
        <Label>Starter code</Label>
        <p className="text-xs text-muted-foreground">
          Editor-visible skeleton the participant starts from.
        </p>
        <CodeEditor
          language={language}
          value={starterCode}
          onChange={setStarterCode}
          height="260px"
        />
      </div>

      <div className="space-y-2">
        <Label>Driver code</Label>
        <p className="text-xs text-muted-foreground">
          Hidden wrapper. Must contain{' '}
          <code className="rounded bg-muted px-1 py-0.5">{USER_CODE_PLACEHOLDER}</code>, which the
          judge replaces with the submission.
        </p>
        <CodeEditor
          language={language}
          value={driverCode}
          onChange={setDriverCode}
          height="320px"
        />
        {missingPlaceholder && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            Driver code is missing the {USER_CODE_PLACEHOLDER} placeholder.
          </p>
        )}
      </div>
    </div>
  )
}
