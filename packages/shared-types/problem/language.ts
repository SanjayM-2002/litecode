import { z } from 'zod';

export const languageSchema = z.enum([
  'CPP',
  'JAVA',
  'PYTHON',
  'JAVASCRIPT',
  'TYPESCRIPT',
  'GO',
  'RUST',
]);

export type Language = z.infer<typeof languageSchema>;

/**
 * Runtime enum object — usable as both a TS type (via the matching `Language`
 * type export above) and a value (e.g. for `registerEnumType` in NestJS GraphQL).
 */
export const Language = {
  CPP: 'CPP',
  JAVA: 'JAVA',
  PYTHON: 'PYTHON',
  JAVASCRIPT: 'JAVASCRIPT',
  TYPESCRIPT: 'TYPESCRIPT',
  GO: 'GO',
  RUST: 'RUST',
} as const;

export const ALL_LANGUAGES: readonly Language[] = languageSchema.options;

/**
 * Human-readable display labels (e.g. for language pickers).
 * UI-agnostic — same string works in dropdowns, badges, status pills.
 */
export const LANGUAGE_LABELS: Readonly<Record<Language, string>> = {
  CPP: 'C++',
  JAVA: 'Java',
  PYTHON: 'Python',
  JAVASCRIPT: 'JavaScript',
  TYPESCRIPT: 'TypeScript',
  GO: 'Go',
  RUST: 'Rust',
};

/**
 * Conventional source-file extension per language. Useful for download
 * buttons, filename heuristics, and language detection from filenames.
 */
export const LANGUAGE_EXTENSIONS: Readonly<Record<Language, string>> = {
  CPP: 'cpp',
  JAVA: 'java',
  PYTHON: 'py',
  JAVASCRIPT: 'js',
  TYPESCRIPT: 'ts',
  GO: 'go',
  RUST: 'rs',
};
