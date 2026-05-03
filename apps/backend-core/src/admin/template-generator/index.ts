import { Language } from '@litecode/db';
import { generateCppTemplate } from './cpp';
import { generateJavaScriptTemplate } from './javascript';
import { generateTypeScriptTemplate } from './typescript';
import { GeneratedTemplate, Signature } from './types';

export * from './types';

const GENERATORS: Partial<Record<Language, (sig: Signature) => GeneratedTemplate>> = {
  [Language.CPP]: generateCppTemplate,
  [Language.JAVASCRIPT]: generateJavaScriptTemplate,
  [Language.TYPESCRIPT]: generateTypeScriptTemplate,
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