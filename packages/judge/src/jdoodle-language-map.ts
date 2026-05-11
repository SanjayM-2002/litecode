/**
 * Maps our vendor-neutral language enum to JDoodle's (language, versionIndex) pair.
 *
 * JDoodle uses string language codes ("cpp17", "java", "python3", "nodejs", ...) plus a
 * stringified numeric versionIndex starting at "0". Index "0" is the lowest/oldest version
 * available for that language and is always valid; higher indexes track newer compilers as
 * JDoodle adds them. Bump these when you want a newer toolchain — they don't affect the
 * grader's contract.
 *
 * Source: https://docs.jdoodle.com/compiler-api/list-of-language-codes
 */
export interface JDoodleLanguageSpec {
  language: string;
  versionIndex: string;
}

export const JDOODLE_LANGUAGE_MAP: Record<string, JDoodleLanguageSpec> = {
  CPP: { language: 'cpp17', versionIndex: '0' },
  JAVA: { language: 'java', versionIndex: '0' },
  PYTHON: { language: 'python3', versionIndex: '0' },
  JAVASCRIPT: { language: 'nodejs', versionIndex: '0' },
  TYPESCRIPT: { language: 'typescript', versionIndex: '0' },
  GO: { language: 'go', versionIndex: '0' },
  RUST: { language: 'rust', versionIndex: '0' },
};

export function getJDoodleLanguageSpec(language: string): JDoodleLanguageSpec {
  const spec = JDOODLE_LANGUAGE_MAP[language];
  if (!spec) {
    throw new Error(
      `No JDoodle language spec configured for "${language}". Supported: ${Object.keys(JDOODLE_LANGUAGE_MAP).join(', ')}`,
    );
  }
  return spec;
}
