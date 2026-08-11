import { z } from 'zod'
import { problemDetailsSchema, signatureSchema } from '@litecode/shared-types'
import type { AdminProblem } from '@/lib/admin-types'

/**
 * `createProblem` needs metadata and signature together, so the authoring form
 * validates both halves as one object. Both schemas come from shared-types, so
 * the rules match what the resolver will accept.
 */
export const problemFormSchema = problemDetailsSchema.extend({
  signature: signatureSchema,
})

export type ProblemFormValues = z.infer<typeof problemFormSchema>

export const EMPTY_PROBLEM_FORM: ProblemFormValues = {
  title: '',
  slug: '',
  description: '',
  difficulty: 'EASY',
  rating: 1500,
  topicIds: [],
  signature: {
    methodName: '',
    args: [],
    returnType: 'int',
  },
}

export function problemToFormValues(problem: AdminProblem): ProblemFormValues {
  return {
    title: problem.title,
    slug: problem.slug,
    description: problem.description,
    difficulty: problem.difficulty,
    rating: problem.rating,
    topicIds: problem.topics.map((t) => t.id),
    // Loaded as-is rather than parsed: a problem authored through the API may
    // carry a type outside ARG_TYPES, and dropping it silently would be worse
    // than letting the resolver flag it when the admin saves.
    signature: problem.signature as ProblemFormValues['signature'],
  }
}

/** Best-effort slug from a title; admins can still override it. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

/** Renders the signature the way the generated starter code will read. */
export function signaturePreview(signature: ProblemFormValues['signature']): string {
  const args = signature.args.map((a) => `${a.type} ${a.name}`).join(', ')
  return `${signature.returnType} ${signature.methodName || 'methodName'}(${args})`
}
