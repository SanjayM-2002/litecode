/**
 * Maps our vendor-neutral language enum to Piston's (language, version, filename) triple.
 *
 * Piston identifies runtimes by name + version. "*" is accepted as a wildcard meaning
 * "latest installed" on most Piston deployments (including the public emkc.org instance),
 * which keeps us decoupled from any specific image's installed versions.
 *
 * Filename matters because some compilers/runtimes infer behavior from the extension
 * (e.g., the JVM expects the public class file to be named after the class).
 *
 * Source: https://piston.readthedocs.io/ and https://emkc.org/api/v2/piston/runtimes
 */
export interface PistonLanguageSpec {
  language: string;
  version: string;
  filename: string;
}

export const PISTON_LANGUAGE_MAP: Record<string, PistonLanguageSpec> = {
  CPP: { language: 'c++', version: '*', filename: 'main.cpp' },
  JAVA: { language: 'java', version: '*', filename: 'Main.java' },
  PYTHON: { language: 'python', version: '*', filename: 'main.py' },
  JAVASCRIPT: { language: 'javascript', version: '*', filename: 'main.js' },
  TYPESCRIPT: { language: 'typescript', version: '*', filename: 'main.ts' },
  GO: { language: 'go', version: '*', filename: 'main.go' },
  RUST: { language: 'rust', version: '*', filename: 'main.rs' },
};

export function getPistonLanguageSpec(language: string): PistonLanguageSpec {
  const spec = PISTON_LANGUAGE_MAP[language];
  if (!spec) {
    throw new Error(
      `No Piston language spec configured for "${language}". Supported: ${Object.keys(PISTON_LANGUAGE_MAP).join(', ')}`,
    );
  }
  return spec;
}
