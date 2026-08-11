import { z } from 'zod';
import { difficultySchema } from './difficulty';
import { languageSchema, type Language } from './language';

/**
 * Placeholder the judge swaps for the submitted solution when it merges
 * driverCode + user code.
 *
 * Must stay in sync with userCodePlaceholder in apps/judge/internal/grader.
 */
export const USER_CODE_PLACEHOLDER = '{{USER_CODE}}';

/**
 * Types the template generators can translate. Every generator
 * (apps/backend-core/src/admin/template-generator/*) maps exactly this set, so
 * anything outside it makes `generateTemplate` throw at authoring time.
 */
export const ARG_TYPES = [
  'int',
  'int[]',
  'int[][]',
  'string',
  'string[]',
  'boolean',
  'boolean[]',
] as const;

/** Return types additionally allow `void`, which no argument may use. */
export const RETURN_TYPES = [...ARG_TYPES, 'void'] as const;

export type ArgType = (typeof ARG_TYPES)[number];
export type SignatureReturnType = (typeof RETURN_TYPES)[number];

export const argumentSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
});

/**
 * Shape of `Problem.args` as stored in the JSON column. Used by the publish
 * gate to reject problems whose signature was written by an older client.
 */
export const argsShapeSchema = z.array(argumentSchema);

const identifier = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Must be a valid identifier (letters, digits, underscore)');

export const signatureSchema = z.object({
  methodName: identifier,
  args: z
    .array(
      z.object({
        name: identifier,
        type: z.enum(ARG_TYPES),
      }),
    )
    .max(8, 'At most 8 arguments'),
  returnType: z.enum(RETURN_TYPES),
});

export const problemSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and single hyphens only');

/** Metadata half of the authoring form — everything `createProblem` needs bar the signature. */
export const problemDetailsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: problemSlugSchema,
  description: z.string().trim().min(1),
  difficulty: difficultySchema,
  rating: z.number().int().min(800).max(3500),
  topicIds: z.array(z.string()).min(1, 'Pick at least one topic'),
});

export const codeTemplateSchema = z.object({
  language: languageSchema,
  starterCode: z.string().trim().min(1),
  driverCode: z
    .string()
    .min(1)
    .refine(
      (code) => code.includes(USER_CODE_PLACEHOLDER),
      `driverCode must contain the ${USER_CODE_PLACEHOLDER} placeholder`,
    ),
});

export const testCaseAuthoringSchema = z.object({
  /** Positional, one entry per signature argument. */
  inlineInput: z.array(z.unknown()),
  inlineOutput: z.unknown(),
  isSample: z.boolean(),
  explanation: z.string().trim().max(2000).optional(),
});

export type SignatureArgument = z.infer<typeof argumentSchema>;
export type ProblemSignature = z.infer<typeof signatureSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
export type CodeTemplateAuthoring = z.infer<typeof codeTemplateSchema>;
export type TestCaseAuthoring = z.infer<typeof testCaseAuthoringSchema>;

/** Human labels for the argument/return type pickers. */
export const TYPE_LABELS: Readonly<Record<SignatureReturnType, string>> = {
  int: 'Integer',
  'int[]': 'Integer array',
  'int[][]': 'Integer matrix',
  string: 'String',
  'string[]': 'String array',
  boolean: 'Boolean',
  'boolean[]': 'Boolean array',
  void: 'Void (no return)',
};

/**
 * Languages `generateTemplate` can produce boilerplate for. Others must be
 * authored by hand — keep in sync with GENERATORS in
 * apps/backend-core/src/admin/template-generator/index.ts.
 */
export const GENERATABLE_LANGUAGES = ['CPP', 'JAVASCRIPT'] as const satisfies readonly Language[];

export function isGeneratableLanguage(language: Language): boolean {
  return (GENERATABLE_LANGUAGES as readonly Language[]).includes(language);
}
