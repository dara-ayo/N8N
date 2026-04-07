import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { isAuthenticated, loading, signInWithPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setStatus('sending')
    setErrorMsg('')
    const { error } = await signInWithPassword(email.trim(), password)
    if (error) {
      setStatus('error')
      setErrorMsg(error.message || 'Invalid email or password.')
    }
  }

  return (
    <div
      className="min-h-screen bg-surface flex items-center justify-center px-4"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,106,245,0.12) 0%, transparent 100%),
          radial-gradient(circle at 20% 80%, rgba(124,106,245,0.04) 0%, transparent 50%),
          radial-gradient(circle at 80% 60%, rgba(124,106,245,0.03) 0%, transparent 50%)
        `,
        backgroundSize: '100% 100%, 400px 400px, 300px 300px',
      }}
    >
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(124,106,245,0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="w-full max-w-sm animate-slide-up relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-glow-accent mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">ContentFlow</h1>
          <p className="text-sm text-text-tertiary mt-1">Content automation platform</p>
        </div>

        {/* Card */}
        <div className="bg-surface-secondary border border-surface-border rounded-2xl p-6 shadow-surface-lg">
          <h2 className="text-base font-semibold text-text-primary mb-1">Sign in</h2>
          <p className="text-sm text-text-secondary mb-6">Enter your credentials to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'error' && (
              <div className="alert-error rounded-xl text-xs py-2.5">{errorMsg}</div>
            )}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-text-secondary mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                disabled={status === 'sending'}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                disabled={status === 'sending'}
              />
            </div>
            <button
              type="submit"
              disabled={status === 'sending' || !email.trim() || !password}
              className="btn-gradient w-full h-11"
            >
              {status === 'sending' ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-tertiary mt-5">
          Sign in with your team credentials.
        </p>
      </div>
    </div>
  )
}
