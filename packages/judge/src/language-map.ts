/**
 * Maps our vendor-neutral language enum to Judge0's numeric language IDs.
 *
 * Judge0 IDs are stable but versioned (e.g., the cpp ID is for a specific GCC version).
 * If you ever upgrade Judge0 or self-host with different language images, update here only.
 *
 * Source: https://judge0.com/ (CE language list)
 */
export const JUDGE0_LANGUAGE_ID: Record<string, number> = {
  CPP: 54,        // C++ (GCC 9.2.0)
  JAVA: 62,       // Java (OpenJDK 13.0.1)
  PYTHON: 71,     // Python (3.8.1)
  JAVASCRIPT: 63, // JavaScript (Node.js 12.14.0)
  TYPESCRIPT: 74, // TypeScript (3.7.4)
  GO: 60,         // Go (1.13.5)
  RUST: 73,       // Rust (1.40.0)
};

export function getJudge0LanguageId(language: string): number {
  const id = JUDGE0_LANGUAGE_ID[language];
  if (id === undefined) {
    throw new Error(
      `No Judge0 language ID configured for "${language}". Supported: ${Object.keys(JUDGE0_LANGUAGE_ID).join(', ')}`,
    );
  }
  return id;
}
