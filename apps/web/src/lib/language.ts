// Frontend-only language metadata: how to map our shared `Language` enum to
// Monaco editor language IDs. Display labels and file extensions live in
// @litecode/shared-types so the backend can use them too — re-export here for
// callers that already import from this module.
export { LANGUAGE_LABELS, LANGUAGE_EXTENSIONS, ALL_LANGUAGES } from '@litecode/shared-types'

import type { Language } from '@litecode/shared-types'

export const MONACO_LANG: Record<Language, string> = {
  CPP: 'cpp',
  GO: 'go',
  JAVA: 'java',
  JAVASCRIPT: 'javascript',
  PYTHON: 'python',
  RUST: 'rust',
  TYPESCRIPT: 'typescript',
}
