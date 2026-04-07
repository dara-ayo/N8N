import { useState } from 'react'

function generateRandomState(length = 32) {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

export default function LinkedInConnect({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleConnect = () => {
    setLoading(true)
    const state = generateRandomState()
    sessionStorage.setItem('linkedin_oauth_state', state)
    const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID
    const redirectUri = `${window.location.origin}/settings/callback/linkedin`
    const scope = 'openid profile email w_member_social'
    const params = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope, state })
    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  }

  const perms = [
    { label: 'Read your profile', desc: 'Name and profile photo' },
    { label: 'Read your email', desc: 'For account identification' },
    { label: 'Post on your behalf', desc: 'Publish content to your feed' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-secondary rounded-2xl border border-surface-border shadow-modal max-w-md w-full overflow-hidden animate-scale-in">
        <div className="px-6 pt-6 pb-4 border-b border-surface-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-status-info-bg border border-status-info/25 flex items-center justify-center">
                <svg className="w-4 h-4 text-status-info" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <h2 className="text-base font-semibold text-text-primary">Connect LinkedIn</h2>
            </div>
            <button type="button" onClick={onClose} className="btn-ghost p-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-text-secondary">
            Connect your LinkedIn account to publish content directly to your profile.
          </p>
          <div className="rounded-xl bg-surface-tertiary border border-surface-border p-4">
            <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">Permissions requested</h3>
            <ul className="space-y-2.5">
              {perms.map((perm) => (
                <li key={perm.label} className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-status-success mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>
                    <span className="font-medium text-text-primary">{perm.label}</span>
                    <span className="text-text-tertiary"> — {perm.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-text-tertiary">
            You can revoke access at any time from your LinkedIn privacy settings or from this Settings page.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleConnect} disabled={loading}>
            {loading ? (
              <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Redirecting...</>
            ) : 'Connect LinkedIn Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
