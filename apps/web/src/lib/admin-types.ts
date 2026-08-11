// Admin-portal shapes. Kept out of lib/types.ts so the participant bundle
// doesn't pull them in — the admin routes are lazy-loaded.
import type { Difficulty, Language, Role, UserTier } from '@litecode/shared-types'
import type { PaginationMeta, Signature, Topic } from './types'

// Mirrors enum Permission in packages/db/prisma/schema/user.prisma.
export type Permission =
  | 'CREATE_PROBLEM'
  | 'EDIT_PROBLEM'
  | 'MANAGE_USERS'
  | 'CREATE_CONTEST'
  | 'MANAGE_TEMPLATES'

export const PERMISSION_LABELS: Record<Permission, string> = {
  CREATE_PROBLEM: 'Create problems',
  EDIT_PROBLEM: 'Edit problems',
  MANAGE_TEMPLATES: 'Manage templates',
  MANAGE_USERS: 'Manage users',
  CREATE_CONTEST: 'Create contests',
}

export interface AdminUser {
  id: string
  email: string
  name: string | null
  role: Role
  tier: UserTier
  createdAt: string
}

export interface AdminProfile {
  id: string
  permissions: Permission[]
  createdAt: string
  updatedAt: string
}

export interface AdminMe {
  user: AdminUser
  profile: AdminProfile
}

export interface CodeTemplate {
  id: string
  language: Language
  starterCode: string
  driverCode: string
  createdAt: string
  updatedAt: string
}

export interface GeneratedTemplate {
  language: Language
  starterCode: string
  driverCode: string
}

export interface AdminTestCase {
  id: string
  inlineInput: unknown
  inlineOutput: unknown
  inputPath: string | null
  outputPath: string | null
  isSample: boolean
  explanation: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface AdminProblem {
  id: string
  title: string
  slug: string
  description: string
  difficulty: Difficulty
  rating: number
  isPublished: boolean
  signature: Signature
  topics: Topic[]
  templates: CodeTemplate[]
  testCases: AdminTestCase[]
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface AdminProblemsPage {
  items: AdminProblem[]
  meta: PaginationMeta
}
