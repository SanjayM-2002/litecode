import { GraphQLClient } from 'graphql-request'
import { getAuthToken } from './stores/auth-store'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const gqlEndpoint = `${API_URL}/graphql`

export const gqlClient = new GraphQLClient(gqlEndpoint, {
  headers: {
    'apollo-require-preflight': 'true',
  },
  requestMiddleware: (req) => {
    const token = getAuthToken()
    const headers = new Headers(req.headers as HeadersInit)
    headers.set('content-type', 'application/json')
    if (token) headers.set('authorization', `Bearer ${token}`)
    return { ...req, headers }
  },
})

export async function gql<T = unknown>(query: string, variables?: Record<string, unknown>) {
  return gqlClient.request<T>(query, variables)
}

export const REST_BASE = API_URL
