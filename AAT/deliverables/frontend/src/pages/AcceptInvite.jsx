import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { lookupInvite } from '../lib/team'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function AcceptInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, loading: authLoading, user } = useAuth()

  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accepting, setAccepting] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Only redirect if the logged-in user IS the invitee (they already accepted)
  useEffect(() => {
    if (!authLoading && isAuthenticated && invite && user?.email === invite.email) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, authLoading, user, invite, navigate])

  // Load the invite details via SECURITY DEFINER RPC (works for unauthenticated visitors)
  useEffect(() => {
    async function loadInvite() {
      try {
        const data = await lookupInvite(token)
        if (!data) {
          setError('This invitation link is invalid or has expired.')
          return
        }
        if (data.status === 'deactivated') {
          setError('This invitation has been revoked. Please contact your team administrator.')
          return
        }
        // status === 'active' means already accepted — AuthContext will handle the redirect
        // above once isAuthenticated is true, but in case user is not signed in yet just show invite
        setInvite(data)
      } catch (err) {
        setError('This invitation link is invalid or has expired.')
      } finally {
        setLoading(false)
      }
    }
    loadInvite()
  }, [token])

  async function handleAccept(e) {
    e.preventDefault()
    if (!invite || !password) return
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setAccepting(true)
    setError(null)
    try {
      // Sign out any currently logged-in user first
      if (isAuthenticated) {
        await supabase.auth.signOut()
      }

      const resp = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Failed to create account.')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      })
      if (signInError) throw signInError
      // onAuthStateChange fires → AuthContext sets profile → redirects to /
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.')
      setAccepting(false)
    }
  }

  const wrapperClass = 'min-h-screen bg-surface flex items-center justify-center p-4'
  const bgStyle = {
    backgroundImage:
      'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,106,245,0.10) 0%, transparent 100%)',
  }

  // While AuthContext is checking session (e.g. magic link just clicked)
  if (authLoading || loading) {
    return (
      <div className={wrapperClass} style={bgStyle}>
        <div className="card max-w-md w-full text-center py-16 animate-fade-in">
          <div className="w-10 h-10 relative mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-surface-border" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
          </div>
          <p className="text-text-secondary text-sm">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={wrapperClass} style={bgStyle}>
        <div className="card max-w-md w-full text-center animate-scale-in">
          <div className="w-12 h-12 rounded-2xl bg-status-error-bg border border-status-error/25 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-text-primary mb-2">Invalid Invitation</h2>
          <p className="text-sm text-text-secondary mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  if (!invite) return null

  const roleName = invite.role.charAt(0).toUpperCase() + invite.role.slice(1)
  const ROLE_BADGE = {
    admin: 'text-status-info bg-status-info-bg border-status-info/25',
    editor: 'text-status-success bg-status-success-bg border-status-success/25',
    viewer: 'text-text-secondary bg-surface-elevated border-surface-border',
  }

  return (
    <div className={wrapperClass} style={bgStyle}>
      <div className="card max-w-md w-full text-center animate-scale-in">
        {/* Brand */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-accent flex items-center justify-center mx-auto mb-4 shadow-glow-accent">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-text-primary mb-2">You've been invited!</h2>
        <p className="text-sm text-text-secondary mb-6">
          You've been invited to join{' '}
          <span className="font-medium text-text-primary">ContentFlow</span> as{' '}
          <span className={`badge border ${ROLE_BADGE[invite.role] || ROLE_BADGE.viewer}`}>
            {roleName}
          </span>
        </p>

        {/* Details */}
        <div className="bg-surface-tertiary rounded-xl p-4 mb-6 text-left border border-surface-border">
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
            Invitation Details
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Email</span>
              <span className="text-text-primary font-medium">{invite.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Role</span>
              <span className="text-text-primary font-medium">{roleName}</span>
            </div>
            {invite.display_name && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Name</span>
                <span className="text-text-primary font-medium">{invite.display_name}</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 alert-error rounded-xl text-sm py-2.5">{error}</div>
        )}

        <form onSubmit={handleAccept} className="space-y-3 text-left">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Set a password
            </label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              disabled={accepting}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Confirm password
            </label>
            <input
              type="password"
              required
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              disabled={accepting}
            />
          </div>
          <button type="submit" disabled={accepting || !password || !confirmPassword} className="btn-primary w-full mt-1">
            {accepting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account...
              </>
            ) : (
              'Accept & Join Team'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
