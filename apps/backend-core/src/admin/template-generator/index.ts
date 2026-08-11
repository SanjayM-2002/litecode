import { Language } from '@litecode/shared-types';
import { generateCppTemplate } from './cpp';
import { generateJavaScriptTemplate } from './javascript';
import { GeneratedTemplate, Signature } from './types';

export * from './types';

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