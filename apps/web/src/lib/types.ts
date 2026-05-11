// Enums + display labels live in @litecode/shared-types so backend & frontend
// can't drift. Re-export the bits the rest of the app uses through this barrel.
export {
  type Difficulty,
  type DiscussTag,
  type Gender,
  type Language,
  type Role,
  type SolvedStatus,
  type SubmissionStatus,
  type UserTier,
  type Verdict,
} from '@litecode/shared-types'

import type {
  Difficulty,
  DiscussTag,
  Gender,
  Language,
  Role,
  SubmissionStatus,
  UserTier,
  Verdict,
} from '@litecode/shared-types'

// PlanInterval / SubscriptionStatus are GraphQL enums sourced from Prisma —
// no Zod schema in shared-types yet, so define string-literal types here.
// Keep in sync with packages/db/prisma/schema/subscription.prisma.
export type PlanInterval = 'MONTHLY' | 'YEARLY'

export type SubscriptionStatus =
  | 'CREATED'
  | 'AUTHENTICATED'
  | 'ACTIVE'
  | 'PENDING'
  | 'HALTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'EXPIRED'

export interface Plan {
  interval: PlanInterval
  amount: number // paise
  currency: string
  label: string
}

export interface Subscription {
  id: string
  planInterval: PlanInterval
  status: SubscriptionStatus
  razorpaySubscriptionId: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StartSubscriptionResult {
  razorpaySubscriptionId: string
  razorpayKeyId: string
  shortUrl: string | null
}

export interface AiResponse {
  text: string
  provider: string
  model: string
  inputTokens: number | null
  outputTokens: number | null
}

export interface PublicUser {
  id: string
  email: string
  name: string | null
  role: Role
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  user: PublicUser
}

export interface Topic {
  id: string
  name: string
  slug: string
  description: string | null
  isActive: boolean
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Argument {
  name: string
  type: string
}

export interface Signature {
  methodName: string
  returnType: string
  args: Argument[]
}

export interface PublicCodeTemplate {
  id: string
  language: Language
  starterCode: string
}

export interface PublicTestCase {
  id: string
  order: number
  inlineInput: unknown
  inlineOutput: unknown
  explanation: string | null
}

export interface PublicProblem {
  id: string
  slug: string
  title: string
  description: string
  difficulty: Difficulty
  rating: number
  timeLimit_ms: number
  memoryLimit_kb: number
  signature: Signature
  topics: Topic[]
  templates: PublicCodeTemplate[]
  sampleTestCases: PublicTestCase[]
  attempted: boolean
  solved: boolean
  totalSubmissions: number
  acceptanceRate: number
  createdAt: string
}

export interface TopicsPage {
  items: Topic[]
  meta: PaginationMeta
}

export interface PublicProblemListItem {
  id: string
  slug: string
  title: string
  difficulty: Difficulty
  rating: number
  topics: Topic[]
  attempted: boolean
  solved: boolean
  totalSubmissions: number
  acceptanceRate: number
}

export interface PublicProblemsPage {
  items: PublicProblemListItem[]
  meta: PaginationMeta
}

export interface ParticipantProfile {
  id: string
  bio: string | null
  birthday: string | null
  city: string | null
  state: string | null
  country: string | null
  gender: Gender | null
  rating: number
  coins: number
  isPremium: boolean
  premiumUntil: string | null
  skills: string[]
  createdAt: string
  updatedAt: string
}

export interface MeUser {
  id: string
  email: string
  name: string | null
  role: Role
  tier: UserTier
  createdAt: string
  participantProfile: ParticipantProfile | null
}

export interface TestResultEntry {
  testCaseId: string
  verdict: Verdict
  runtime_ms?: number | null
  memory_kb?: number | null
  stdout?: string | null
  stderr?: string | null
  isSample: boolean
}

export interface Submission {
  id: string
  problemId: string
  userId: string
  language: Language
  code: string
  status: SubmissionStatus
  verdict: Verdict | null
  runtime_ms: number | null
  memory_kb: number | null
  errorMessage: string | null
  failedTestCaseId: string | null
  testResults: TestResultEntry[] | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface SubmissionsPage {
  items: Submission[]
  meta: PaginationMeta
}

export interface SolutionAuthor {
  id: string
  name: string | null
}

export interface SolutionReply {
  id: string
  solutionId: string
  author: SolutionAuthor
  content: string
  createdAt: string
  updatedAt: string
}

export interface Solution {
  id: string
  problemId: string
  author: SolutionAuthor
  title: string
  language: Language
  code: string
  content: string
  replies: SolutionReply[]
  replyCount: number
  createdAt: string
  updatedAt: string
}

export interface SolutionsPage {
  items: Solution[]
  meta: PaginationMeta
}

// SolutionAuthor and DiscussAuthor are now structurally identical (id + name).
// Export an alias so call sites that read "PublicAuthor" semantically have a name.
export type PublicAuthor = SolutionAuthor

export interface DiscussProblemRef {
  id: string
  slug: string
  title: string
}

export interface DiscussReply {
  id: string
  postId: string
  author: PublicAuthor
  content: string
  createdAt: string
  updatedAt: string
}

export interface DiscussPost {
  id: string
  author: PublicAuthor
  title: string
  content: string
  tag: DiscussTag
  problem: DiscussProblemRef | null
  replies: DiscussReply[]
  replyCount: number
  createdAt: string
  updatedAt: string
}

export interface DiscussPostsPage {
  items: DiscussPost[]
  meta: PaginationMeta
}
