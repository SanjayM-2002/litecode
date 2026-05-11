import { gql } from '../graphql-client'
import type {
  Difficulty,
  DiscussPost,
  DiscussPostsPage,
  DiscussReply,
  DiscussTag,
  Language,
  MeUser,
  ParticipantProfile,
  PublicProblem,
  PublicProblemsPage,
  Solution,
  SolutionReply,
  SolutionsPage,
  SolvedStatus,
  Submission,
  SubmissionsPage,
  SubmissionStatus,
  TopicsPage,
  Verdict,
} from '../types'

export interface ProblemsFilter {
  page?: number
  limit?: number
  search?: string | null
  difficulty?: Difficulty | null
  topicSlug?: string | null
  solvedStatus?: SolvedStatus | null
  minRating?: number | null
  maxRating?: number | null
}

const PROBLEMS_QUERY = /* GraphQL */ `
  query Problems($filter: ProblemsFilterInput) {
    problems(filter: $filter) {
      items {
        id
        slug
        title
        difficulty
        rating
        attempted
        solved
        totalSubmissions
        acceptanceRate
        topics {
          id
          name
          slug
        }
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

export async function fetchProblems(filter: ProblemsFilter): Promise<PublicProblemsPage> {
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(filter)) {
    if (v !== undefined && v !== null && v !== '') cleaned[k] = v
  }
  const data = await gql<{ problems: PublicProblemsPage }>(PROBLEMS_QUERY, { filter: cleaned })
  return data.problems
}

const PROBLEM_QUERY = /* GraphQL */ `
  query Problem($slug: String!) {
    problem(slug: $slug) {
      id
      slug
      title
      description
      difficulty
      rating
      timeLimit_ms
      memoryLimit_kb
      attempted
      solved
      totalSubmissions
      acceptanceRate
      createdAt
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
      }
      templates {
        id
        language
        starterCode
      }
      sampleTestCases {
        id
        order
        inlineInput
        inlineOutput
        explanation
      }
    }
  }
`

export async function fetchProblem(slug: string): Promise<PublicProblem> {
  const data = await gql<{ problem: PublicProblem }>(PROBLEM_QUERY, { slug })
  return data.problem
}

const ME_QUERY = /* GraphQL */ `
  query Me {
    me {
      id
      email
      name
      role
      createdAt
      participantProfile {
        id
        bio
        birthday
        city
        state
        country
        gender
        rating
        coins
        isPremium
        premiumUntil
        skills
        createdAt
        updatedAt
      }
    }
  }
`

export async function fetchMe(): Promise<MeUser> {
  const data = await gql<{ me: MeUser }>(ME_QUERY)
  return data.me
}

const UPDATE_PROFILE_MUTATION = /* GraphQL */ `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      bio
      birthday
      city
      state
      country
      gender
      rating
      coins
      isPremium
      premiumUntil
      skills
      createdAt
      updatedAt
    }
  }
`

export interface UpdateProfileInput {
  bio?: string | null
  birthday?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  gender?: 'FEMALE' | 'MALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null
  skills?: string[] | null
}

export async function updateProfile(input: UpdateProfileInput): Promise<ParticipantProfile> {
  const data = await gql<{ updateProfile: ParticipantProfile }>(UPDATE_PROFILE_MUTATION, { input })
  return data.updateProfile
}

const SUBMIT_SOLUTION_MUTATION = /* GraphQL */ `
  mutation SubmitSolution($input: SubmitSolutionInput!) {
    submitSolution(input: $input) {
      id
      status
      verdict
    }
  }
`

export interface SubmitSolutionInput {
  problemId: string
  language: Language
  code: string
}

export async function submitSolution(input: SubmitSolutionInput): Promise<Submission> {
  const data = await gql<{ submitSolution: Submission }>(SUBMIT_SOLUTION_MUTATION, { input })
  return data.submitSolution
}

const SUBMISSION_QUERY = /* GraphQL */ `
  query Submission($id: ID!) {
    submission(id: $id) {
      id
      problemId
      userId
      language
      code
      status
      verdict
      runtime_ms
      memory_kb
      errorMessage
      failedTestCaseId
      testResults
      createdAt
      startedAt
      completedAt
    }
  }
`

export async function fetchSubmission(id: string): Promise<Submission> {
  const data = await gql<{ submission: Submission }>(SUBMISSION_QUERY, { id })
  return data.submission
}

export interface MySubmissionsFilter {
  page?: number
  limit?: number
  problemId?: string | null
  language?: Language | null
  status?: SubmissionStatus | null
  verdict?: Verdict | null
}

const MY_SUBMISSIONS_QUERY = /* GraphQL */ `
  query MySubmissions($filter: MySubmissionsFilterInput) {
    mySubmissions(filter: $filter) {
      items {
        id
        problemId
        language
        status
        verdict
        runtime_ms
        memory_kb
        createdAt
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

export async function fetchMySubmissions(filter: MySubmissionsFilter): Promise<SubmissionsPage> {
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(filter)) {
    if (v !== undefined && v !== null && v !== '') cleaned[k] = v
  }
  const data = await gql<{ mySubmissions: SubmissionsPage }>(MY_SUBMISSIONS_QUERY, {
    filter: cleaned,
  })
  return data.mySubmissions
}

const TOPICS_QUERY = /* GraphQL */ `
  query Topics($filter: PublicTopicsFilterInput) {
    topics(filter: $filter) {
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

export interface TopicsFilter {
  search?: string | null
  page?: number
  limit?: number
}

export async function fetchTopics(filter: TopicsFilter = {}): Promise<TopicsPage> {
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(filter)) {
    if (v !== undefined && v !== null && v !== '') cleaned[k] = v
  }
  const data = await gql<{ topics: TopicsPage }>(TOPICS_QUERY, { filter: cleaned })
  return data.topics
}

// ---------- Solutions ----------

const SOLUTION_FRAGMENT = /* GraphQL */ `
  fragment SolutionFields on Solution {
    id
    problemId
    title
    language
    code
    content
    replyCount
    createdAt
    updatedAt
    author {
      id
      name
    }
    replies {
      id
      solutionId
      content
      createdAt
      updatedAt
      author {
        id
        name
      }
    }
  }
`

const SOLUTIONS_QUERY = /* GraphQL */ `
  ${SOLUTION_FRAGMENT}
  query Solutions($filter: SolutionsFilterInput!) {
    solutions(filter: $filter) {
      items {
        ...SolutionFields
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

export interface SolutionsFilter {
  problemId: string
  language?: Language | null
  page?: number
  limit?: number
}

export async function fetchSolutions(filter: SolutionsFilter): Promise<SolutionsPage> {
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(filter)) {
    if (v !== undefined && v !== null && v !== '') cleaned[k] = v
  }
  const data = await gql<{ solutions: SolutionsPage }>(SOLUTIONS_QUERY, { filter: cleaned })
  return data.solutions
}

const CREATE_SOLUTION_MUTATION = /* GraphQL */ `
  ${SOLUTION_FRAGMENT}
  mutation CreateSolution($input: CreateSolutionInput!) {
    createSolution(input: $input) {
      ...SolutionFields
    }
  }
`

export interface CreateSolutionInput {
  problemId: string
  title: string
  language: Language
  code: string
  content: string
}

export async function createSolution(input: CreateSolutionInput): Promise<Solution> {
  const data = await gql<{ createSolution: Solution }>(CREATE_SOLUTION_MUTATION, { input })
  return data.createSolution
}

const UPDATE_SOLUTION_MUTATION = /* GraphQL */ `
  ${SOLUTION_FRAGMENT}
  mutation UpdateSolution($id: ID!, $input: UpdateSolutionInput!) {
    updateSolution(id: $id, input: $input) {
      ...SolutionFields
    }
  }
`

export interface UpdateSolutionInput {
  title?: string
  language?: Language
  code?: string
  content?: string
}

export async function updateSolution(
  id: string,
  input: UpdateSolutionInput,
): Promise<Solution> {
  const data = await gql<{ updateSolution: Solution }>(UPDATE_SOLUTION_MUTATION, { id, input })
  return data.updateSolution
}

const DELETE_SOLUTION_MUTATION = /* GraphQL */ `
  mutation DeleteSolution($id: ID!) {
    deleteSolution(id: $id)
  }
`

export async function deleteSolution(id: string): Promise<boolean> {
  const data = await gql<{ deleteSolution: boolean }>(DELETE_SOLUTION_MUTATION, { id })
  return data.deleteSolution
}

const ADD_REPLY_MUTATION = /* GraphQL */ `
  mutation AddSolutionReply($input: AddSolutionReplyInput!) {
    addSolutionReply(input: $input) {
      id
      solutionId
      content
      createdAt
      updatedAt
      author {
        id
        name
      }
    }
  }
`

export interface AddSolutionReplyInput {
  solutionId: string
  content: string
}

export async function addSolutionReply(
  input: AddSolutionReplyInput,
): Promise<SolutionReply> {
  const data = await gql<{ addSolutionReply: SolutionReply }>(ADD_REPLY_MUTATION, { input })
  return data.addSolutionReply
}

const UPDATE_SOLUTION_REPLY_MUTATION = /* GraphQL */ `
  mutation UpdateSolutionReply($id: ID!, $input: UpdateSolutionReplyInput!) {
    updateSolutionReply(id: $id, input: $input) {
      id
      solutionId
      content
      createdAt
      updatedAt
      author {
        id
        name
      }
    }
  }
`

export async function updateSolutionReply(
  id: string,
  content: string,
): Promise<SolutionReply> {
  const data = await gql<{ updateSolutionReply: SolutionReply }>(
    UPDATE_SOLUTION_REPLY_MUTATION,
    { id, input: { content } },
  )
  return data.updateSolutionReply
}

const DELETE_REPLY_MUTATION = /* GraphQL */ `
  mutation DeleteSolutionReply($id: ID!) {
    deleteSolutionReply(id: $id)
  }
`

export async function deleteSolutionReply(id: string): Promise<boolean> {
  const data = await gql<{ deleteSolutionReply: boolean }>(DELETE_REPLY_MUTATION, { id })
  return data.deleteSolutionReply
}

// ---------- Discuss ----------

const DISCUSS_POST_FRAGMENT = /* GraphQL */ `
  fragment DiscussPostFields on DiscussPost {
    id
    title
    content
    tag
    replyCount
    createdAt
    updatedAt
    author {
      id
      name
    }
    problem {
      id
      slug
      title
    }
    replies {
      id
      postId
      content
      createdAt
      updatedAt
      author {
        id
        name
      }
    }
  }
`

const DISCUSS_POSTS_QUERY = /* GraphQL */ `
  ${DISCUSS_POST_FRAGMENT}
  query DiscussPosts($filter: DiscussPostsFilterInput) {
    discussPosts(filter: $filter) {
      items {
        ...DiscussPostFields
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

export interface DiscussPostsFilter {
  tag?: DiscussTag | null
  problemId?: string | null
  search?: string | null
  page?: number
  limit?: number
}

export async function fetchDiscussPosts(
  filter: DiscussPostsFilter = {},
): Promise<DiscussPostsPage> {
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(filter)) {
    if (v !== undefined && v !== null && v !== '') cleaned[k] = v
  }
  const data = await gql<{ discussPosts: DiscussPostsPage }>(DISCUSS_POSTS_QUERY, {
    filter: cleaned,
  })
  return data.discussPosts
}

const DISCUSS_POST_QUERY = /* GraphQL */ `
  ${DISCUSS_POST_FRAGMENT}
  query DiscussPost($id: ID!) {
    discussPost(id: $id) {
      ...DiscussPostFields
    }
  }
`

export async function fetchDiscussPost(id: string): Promise<DiscussPost> {
  const data = await gql<{ discussPost: DiscussPost }>(DISCUSS_POST_QUERY, { id })
  return data.discussPost
}

const CREATE_DISCUSS_POST_MUTATION = /* GraphQL */ `
  ${DISCUSS_POST_FRAGMENT}
  mutation CreateDiscussPost($input: CreateDiscussPostInput!) {
    createDiscussPost(input: $input) {
      ...DiscussPostFields
    }
  }
`

export interface CreateDiscussPostInput {
  title: string
  content: string
  tag: DiscussTag
  problemId?: string | null
}

export async function createDiscussPost(input: CreateDiscussPostInput): Promise<DiscussPost> {
  const data = await gql<{ createDiscussPost: DiscussPost }>(CREATE_DISCUSS_POST_MUTATION, {
    input,
  })
  return data.createDiscussPost
}

const UPDATE_DISCUSS_POST_MUTATION = /* GraphQL */ `
  ${DISCUSS_POST_FRAGMENT}
  mutation UpdateDiscussPost($id: ID!, $input: UpdateDiscussPostInput!) {
    updateDiscussPost(id: $id, input: $input) {
      ...DiscussPostFields
    }
  }
`

export interface UpdateDiscussPostInput {
  title?: string
  content?: string
  tag?: DiscussTag
  problemId?: string | null
}

export async function updateDiscussPost(
  id: string,
  input: UpdateDiscussPostInput,
): Promise<DiscussPost> {
  const data = await gql<{ updateDiscussPost: DiscussPost }>(UPDATE_DISCUSS_POST_MUTATION, {
    id,
    input,
  })
  return data.updateDiscussPost
}

const DELETE_DISCUSS_POST_MUTATION = /* GraphQL */ `
  mutation DeleteDiscussPost($id: ID!) {
    deleteDiscussPost(id: $id)
  }
`

export async function deleteDiscussPost(id: string): Promise<boolean> {
  const data = await gql<{ deleteDiscussPost: boolean }>(DELETE_DISCUSS_POST_MUTATION, { id })
  return data.deleteDiscussPost
}

const ADD_DISCUSS_REPLY_MUTATION = /* GraphQL */ `
  mutation AddDiscussReply($input: AddDiscussReplyInput!) {
    addDiscussReply(input: $input) {
      id
      postId
      content
      createdAt
      updatedAt
      author {
        id
        name
      }
    }
  }
`

export interface AddDiscussReplyInput {
  postId: string
  content: string
}

export async function addDiscussReply(input: AddDiscussReplyInput): Promise<DiscussReply> {
  const data = await gql<{ addDiscussReply: DiscussReply }>(ADD_DISCUSS_REPLY_MUTATION, { input })
  return data.addDiscussReply
}

const UPDATE_DISCUSS_REPLY_MUTATION = /* GraphQL */ `
  mutation UpdateDiscussReply($id: ID!, $input: UpdateDiscussReplyInput!) {
    updateDiscussReply(id: $id, input: $input) {
      id
      postId
      content
      createdAt
      updatedAt
      author {
        id
        name
      }
    }
  }
`

export async function updateDiscussReply(
  id: string,
  content: string,
): Promise<DiscussReply> {
  const data = await gql<{ updateDiscussReply: DiscussReply }>(UPDATE_DISCUSS_REPLY_MUTATION, {
    id,
    input: { content },
  })
  return data.updateDiscussReply
}

const DELETE_DISCUSS_REPLY_MUTATION = /* GraphQL */ `
  mutation DeleteDiscussReply($id: ID!) {
    deleteDiscussReply(id: $id)
  }
`

export async function deleteDiscussReply(id: string): Promise<boolean> {
  const data = await gql<{ deleteDiscussReply: boolean }>(DELETE_DISCUSS_REPLY_MUTATION, { id })
  return data.deleteDiscussReply
}
