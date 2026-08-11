import Editor from '@monaco-editor/react'
import type { Language } from '@litecode/shared-types'
import { MONACO_LANG } from '@/lib/language'
import { useTheme } from '@/lib/theme'

export function CodeEditor({
  language,
  value,
  onChange,
  height = '320px',
  readOnly,
}: {
  language: Language
  value: string
  onChange?: (value: string) => void
  height?: string
  readOnly?: boolean
}) {
  const { theme } = useTheme()
  return (
    <div className="overflow-hidden rounded-md border">
      <Editor
        height={height}
        language={MONACO_LANG[language]}
        value={value}
        onChange={(v) => onChange?.(v ?? '')}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
          tabSize: 2,
        }}
      />
    </div>
  )
}
