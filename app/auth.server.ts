import { createCookieSessionStorage } from '@remix-run/node'
import { Authenticator, AuthorizationError } from 'remix-auth'
import { SupabaseStrategy } from 'remix-auth-supabase'
import type { Session } from './supabase.server'
import { supabaseClient } from './supabase.server'

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'sb',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: ['s3cr3t'], // This should be an env variable
    secure: process.env.NODE_ENV === 'production'
  }
})

export const supabaseStrategy = new SupabaseStrategy(
  {
    supabaseClient,
    sessionStorage,
    sessionKey: 'sb:session',
    sessionErrorKey: 'sb:error'
  },
  async ({ req, supabaseClient }) => {
    const form = await req.formData()
    const email = form?.get('email')
    const password = form?.get('password')

    if (!email) throw new AuthorizationError('Email is required')
    if (typeof email !== 'string')
      throw new AuthorizationError('Email must be a string')

    if (!password) throw new AuthorizationError('Password is required')
    if (typeof password !== 'string')
      throw new AuthorizationError('Password must be a string')

    return supabaseClient.auth
      .signIn({ email, password })
      .then(({ error, session }) => {
        if (error || !session) {
          throw new AuthorizationError(
            error?.message ?? 'No user session found'
          )
        }
        return session
      })
  }
)

export const authenticator = new Authenticator<Session>(sessionStorage, {
  sessionKey: supabaseStrategy.sessionKey,
  sessionErrorKey: supabaseStrategy.sessionErrorKey
})

authenticator.use(supabaseStrategy)
