import { REST_BASE } from '../graphql-client'
import type { AuthResponse } from '../types'

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${REST_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    let message = res.statusText
    try {
      const data = JSON.parse(text) as { message?: string | string[] }
      if (Array.isArray(data.message)) message = data.message.join(', ')
      else if (data.message) message = data.message
    } catch {
      if (text) message = text
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export interface LoginInput {
  email: string
  password: string
}

export interface SignupInput {
  email: string
  password: string
  name: string
}

export function login(input: LoginInput) {
  return postJson<AuthResponse>('/auth/login', input)
}

export function signup(input: SignupInput) {
  return postJson<AuthResponse>('/auth/signup', input)
}
