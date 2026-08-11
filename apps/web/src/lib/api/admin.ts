import type { Difficulty, Language } from '@litecode/shared-types'
import { gql } from '../graphql-client'
import type { Signature, TopicsPage } from '../types'
import type {
  AdminMe,
  AdminProblem,
  AdminProblemsPage,
  AdminTestCase,
  CodeTemplate,
  GeneratedTemplate,
} from '../admin-types'

// ---- shared selections ----

const PROBLEM_FIELDS = /* GraphQL */ `
  fragment ProblemFields on Problem {
    id
    title
    slug
    description
    difficulty
    rating
    isPublished
    signature {
      methodName
      returnType
      args {
        name
        type
      }
    }
    topics {
      id
      name
      slug
      description
      isActive
    }
    templates {
      id
      language
      starterCode
      driverCode
      createdAt
      updatedAt
    }
    testCases {
      id
      inlineInput
      inlineOutput
      inputPath
      outputPath
      isSample
      explanation
      order
      createdAt
      updatedAt
    }
    createdById
    createdAt
    updatedAt
  }
`

const TEST_CASE_FIELDS = /* GraphQL */ `
  fragment TestCaseFields on TestCase {
    id
    inlineInput
    inlineOutput
    inputPath
    outputPath
    isSample
    explanation
    order
    createdAt
    updatedAt
  }
`

/**
 * `publishProblem` fails with `BadRequestException({ message, errors })`, and the
 * publish gate wants that list rather than one flattened string. Nest/Apollo
 * nest the original response differently depending on how the error is wrapped,
 * so probe the known shapes and fall back to an empty list.
 */
export function validationErrorsFrom(err: unknown): string[] {
  const first = (
    err as { response?: { errors?: { extensions?: Record<string, unknown> }[] } }
  ).response?.errors?.[0]
  const extensions = first?.extensions
  if (!extensions) return []

  const candidates = [
    extensions.errors,
    (extensions.originalError as { errors?: unknown } | undefined)?.errors,
    (extensions.exception as { errors?: unknown } | undefined)?.errors,
    (extensions.response as { errors?: unknown } | undefined)?.errors,
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const strings = candidate.filter((e): e is string => typeof e === 'string')
      if (strings.length > 0) return strings
    }
  }
  return []
}

// ---- profile ----

const ADMIN_ME_QUERY = /* GraphQL */ `
  query MyAdminProfile {
    myAdminProfile {
      user {
        id
        email
        name
        role
        tier
        createdAt
      }
      profile {
        id
        permissions
        createdAt
        updatedAt
      }
    }
  }
`

export async function fetchAdminMe(): Promise<AdminMe> {
  const data = await gql<{ myAdminProfile: AdminMe }>(ADMIN_ME_QUERY)
  return data.myAdminProfile
}

// ---- topics ----

export interface AdminTopicsFilter {
  search?: string | null
  isActive?: boolean | null
  page?: number
  limit?: number
}

const ADMIN_TOPICS_QUERY = /* GraphQL */ `
  query AdminTopics($filter: TopicsFilterInput) {
    adminTopics(filter: $filter) {
      items {
        id
        name
        slug
        description
        isActive
      }
      meta {
        page
        limit
        total
        totalPages
      }
    }
  }
`

export async function fetchAdminTopics(filter: AdminTopicsFilter = {}): Promise<TopicsPage> {
  // `isActive: null` has to survive the round trip: the resolver reads an
  // explicit null as "include inactive too", while an omitted field falls back
  // to the input type's default of true.
  const payload: Record<string, unknown> = { page: filter.page, limit: filter.limit }
  if (filter.search) payload.search = filter.search
  if (filter.isActive !== undefined) payload.isActive = filter.isActive

  const data = await gql<{ adminTopics: TopicsPage }>(ADMIN_TOPICS_QUERY, { filter: payload })
  return data.adminTopics
}

// ---- problems ----

export interface AdminProblemsFilter {
  search?: string | null
  difficulty?: Difficulty | null
  isPublished?: boolean | null
  topicSlug?: string | null
  minRating?: number | null
  maxRating?: number | null
  page?: number
  limit?: number
}

const ADMIN_PROBLEMS_QUERY = /* GraphQL */ `
  ${PROBLEM_FIELDS}
  query AdminProblems($filter: AdminProblemsFilterInput) {
    adminProblems(filter: $filter) {
      items {
        ...ProblemFields
      }
      meta {
        page
        limit
        total
        totalPages
      }
    }
  }
`

export async function fetchAdminProblems(
  filter: AdminProblemsFilter
): Promise<AdminProblemsPage> {
  const data = await gql<{ adminProblems: AdminProblemsPage }>(ADMIN_PROBLEMS_QUERY, {
    filter: clean(filter),
  })
  return data.adminProblems
}

const PROBLEM_FOR_ADMIN_QUERY = /* GraphQL */ `
  ${PROBLEM_FIELDS}
  query ProblemForAdmin($id: ID!) {
    problemForAdmin(id: $id) {
      ...ProblemFields
    }
  }
`

export async function fetchProblemForAdmin(id: string): Promise<AdminProblem> {
  const data = await gql<{ problemForAdmin: AdminProblem }>(PROBLEM_FOR_ADMIN_QUERY, { id })
  return data.problemForAdmin
}

export interface CreateProblemInput {
  title: string
  slug: string
  description: string
  difficulty: Difficulty
  rating?: number
  signature: Signature
  topicIds: string[]
}

const CREATE_PROBLEM_MUTATION = /* GraphQL */ `
  ${PROBLEM_FIELDS}
  mutation CreateProblem($input: CreateProblemInput!) {
    createProblem(input: $input) {
      ...ProblemFields
    }
  }
`

export async function createProblem(input: CreateProblemInput): Promise<AdminProblem> {
  const data = await gql<{ createProblem: AdminProblem }>(CREATE_PROBLEM_MUTATION, { input })
  return data.createProblem
}

export interface UpdateProblemInput {
  title?: string
  slug?: string
  description?: string
  difficulty?: Difficulty
  rating?: number
  signature?: Signature
  topicIds?: string[]
}

const UPDATE_PROBLEM_MUTATION = /* GraphQL */ `
  ${PROBLEM_FIELDS}
  mutation UpdateProblem($id: ID!, $input: UpdateProblemInput!) {
    updateProblem(id: $id, input: $input) {
      ...ProblemFields
    }
  }
`

export async function updateProblem(
  id: string,
  input: UpdateProblemInput
): Promise<AdminProblem> {
  const data = await gql<{ updateProblem: AdminProblem }>(UPDATE_PROBLEM_MUTATION, { id, input })
  return data.updateProblem
}

// ---- templates ----

const GENERATE_TEMPLATE_QUERY = /* GraphQL */ `
  query GenerateTemplate($input: GenerateTemplateInput!) {
    generateTemplate(input: $input) {
      language
      starterCode
      driverCode
    }
  }
`

export async function generateTemplate(
  language: Language,
  signature: Signature
): Promise<GeneratedTemplate> {
  const data = await gql<{ generateTemplate: GeneratedTemplate }>(GENERATE_TEMPLATE_QUERY, {
    input: { language, signature },
  })
  return data.generateTemplate
}

export interface TemplateInput {
  language: Language
  starterCode: string
  driverCode: string
}

const SET_CODE_TEMPLATE_MUTATION = /* GraphQL */ `
  mutation SetCodeTemplate($problemId: ID!, $input: TemplateInput!) {
    setCodeTemplate(problemId: $problemId, input: $input) {
      id
      language
      starterCode
      driverCode
      createdAt
      updatedAt
    }
  }
`

export async function setCodeTemplate(
  problemId: string,
  input: TemplateInput
): Promise<CodeTemplate> {
  const data = await gql<{ setCodeTemplate: CodeTemplate }>(SET_CODE_TEMPLATE_MUTATION, {
    problemId,
    input,
  })
  return data.setCodeTemplate
}

// ---- test cases ----

export interface TestCaseInput {
  inlineInput: unknown
  inlineOutput: unknown
  isSample: boolean
  explanation?: string | null
}

const ADD_TEST_CASES_MUTATION = /* GraphQL */ `
  ${TEST_CASE_FIELDS}
  mutation AddTestCases($problemId: ID!, $inputs: [TestCaseInput!]!) {
    addTestCases(problemId: $problemId, inputs: $inputs) {
      ...TestCaseFields
    }
  }
`

export async function addTestCases(
  problemId: string,
  inputs: TestCaseInput[]
): Promise<AdminTestCase[]> {
  const data = await gql<{ addTestCases: AdminTestCase[] }>(ADD_TEST_CASES_MUTATION, {
    problemId,
    inputs,
  })
  return data.addTestCases
}

export interface UpdateTestCaseInput {
  inlineInput?: unknown
  inlineOutput?: unknown
  isSample?: boolean
  explanation?: string | null
  order?: number
}

const UPDATE_TEST_CASE_MUTATION = /* GraphQL */ `
  ${TEST_CASE_FIELDS}
  mutation UpdateTestCase($id: ID!, $input: UpdateTestCaseInput!) {
    updateTestCase(id: $id, input: $input) {
      ...TestCaseFields
    }
  }
`

export async function updateTestCase(
  id: string,
  input: UpdateTestCaseInput
): Promise<AdminTestCase> {
  const data = await gql<{ updateTestCase: AdminTestCase }>(UPDATE_TEST_CASE_MUTATION, {
    id,
    input,
  })
  return data.updateTestCase
}

const DELETE_TEST_CASE_MUTATION = /* GraphQL */ `
  mutation DeleteTestCase($id: ID!) {
    deleteTestCase(id: $id)
  }
`

export async function deleteTestCase(id: string): Promise<boolean> {
  const data = await gql<{ deleteTestCase: boolean }>(DELETE_TEST_CASE_MUTATION, { id })
  return data.deleteTestCase
}

// ---- publish gate ----

const PUBLISH_PROBLEM_MUTATION = /* GraphQL */ `
  ${PROBLEM_FIELDS}
  mutation PublishProblem($id: ID!) {
    publishProblem(id: $id) {
      ...ProblemFields
    }
  }
`

export async function publishProblem(id: string): Promise<AdminProblem> {
  const data = await gql<{ publishProblem: AdminProblem }>(PUBLISH_PROBLEM_MUTATION, { id })
  return data.publishProblem
}

const UNPUBLISH_PROBLEM_MUTATION = /* GraphQL */ `
  ${PROBLEM_FIELDS}
  mutation UnpublishProblem($id: ID!) {
    unpublishProblem(id: $id) {
      ...ProblemFields
    }
  }
`

export async function unpublishProblem(id: string): Promise<AdminProblem> {
  const data = await gql<{ unpublishProblem: AdminProblem }>(UNPUBLISH_PROBLEM_MUTATION, { id })
  return data.unpublishProblem
}

/** Drops undefined/null/'' so optional filter fields don't reach the resolver. */
function clean(obj: object): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out
}
