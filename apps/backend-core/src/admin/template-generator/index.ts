import { Language } from '@litecode/shared-types';
import { generateCppTemplate } from './cpp';
import { generateJavaScriptTemplate } from './javascript';
import { GeneratedTemplate, Signature } from './types';

export * from './types';

/**
 * Only languages the judge can actually execute belong here.
 *
 * TYPESCRIPT is deliberately absent. Its generator (./typescript.ts) still
 * emits a single-case driver — one JSON.parse of the whole stream, no loop —
 * which the chunked judge would misgrade rather than reject: one output line
 * for a ten-case chunk reads as "the process died on case 2". And there is no
 * TYPESCRIPT entry in the Go runtime registry, so even a correct driver has
 * nothing to run it. Re-add only after both are fixed.
 */
const GENERATORS: Partial<Record<Language, (sig: Signature) => GeneratedTemplate>> = {
  [Language.CPP]: generateCppTemplate,
  [Language.JAVASCRIPT]: generateJavaScriptTemplate,
};

export function generateTemplate(language: Language, signature: Signature): GeneratedTemplate {
  const fn = GENERATORS[language];
  if (!fn) {
    const supported = Object.keys(GENERATORS).join(', ');
    throw new Error(
      `Template generation not supported for language "${language}". Supported: ${supported}`,
    );
  }
  return fn(signature);
}