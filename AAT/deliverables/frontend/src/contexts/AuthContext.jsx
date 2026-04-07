import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

/**
 * AuthProvider
 *
 * Wraps the application and provides authentication state via context.
 * Uses Supabase Auth (magic-link only) and fetches the user's role from
 * the `team_members` table.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  /**
   * Fetch team_members row by matching user_id = authUser.id.
   * Returns the row or null.
   */
  const fetchProfileByUserId = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) return null
    return data
  }, [])

  /**
   * Handle a session change: set user, fetch profile, determine access.
   *
   * Flow for invited (first-login) users:
   *   1. fetchProfileByUserId returns null (user_id IS NULL, RLS blocks it)
   *   2. Call link_user_to_member RPC (SECURITY DEFINER, matches by auth.email())
   *      — this sets user_id = auth.uid() and status = 'active' on the row
   *   3. Retry fetchProfileByUserId — now user_id matches, row is returned
   *   4. If still null → no team_members row → access denied
   */
  const handleSession = useCallback(
    async (session) => {
      const authUser = session?.user ?? null
      setUser(authUser)

      if (authUser) {
        // First attempt: fetch by user_id (works for returning users)
        let teamMember = await fetchProfileByUserId(authUser.id)

        if (!teamMember) {
          // Second attempt: try to auto-link (handles first login after invite).
          // link_user_to_member is SECURITY DEFINER and matches by auth.email(),
          // so it works even when user_id IS NULL (which blocks the direct SELECT).
          try {
            await supabase.rpc('link_user_to_member')
          } catch {
            // RPC throws if no matching invited row exists — that's fine,
            // it just means there's no invite for this user.
          }

          // Retry the profile fetch now that user_id should be set
          teamMember = await fetchProfileByUserId(authUser.id)
        }

        if (teamMember) {
          setProfile(teamMember)
          setAccessDenied(false)
        } else {
          setProfile(null)
          setAccessDenied(true)
        }
      } else {
        setProfile(null)
        setAccessDenied(false)
      }

      setLoading(false)
    },
    [fetchProfileByUserId],
  )

  // Bootstrap: get current session + subscribe to changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [handleSession])

  const signIn = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { error }
  }

  const signInWithPassword = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setAccessDenied(false)
    setLoading(false)
  }

  const isAuthenticated = !!user && !!profile && !accessDenied

  // Access-denied screen
  if (!loading && user && accessDenied) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4"
        style={{ backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,106,245,0.10) 0%, transparent 100%)' }}
      >
        <div className="card max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-status-error-bg border border-status-error/25 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Access Denied</h2>
          <p className="text-sm text-text-secondary mb-6">
            Your account is not associated with a team. Please contact an administrator to be added.
          </p>
          <button onClick={signOut} className="btn-primary w-full">Sign Out</button>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signInWithPassword, signOut, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
