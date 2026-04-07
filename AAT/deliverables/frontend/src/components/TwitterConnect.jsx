import { useState } from 'react'

function generateRandomString(length = 32) {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

function base64UrlEncode(buffer) {
  const str = String.fromCharCode(...buffer)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export default function TwitterConnect({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleConnect = async () => {
    setLoading(true)
    try {
      const state = generateRandomString()
      sessionStorage.setItem('twitter_oauth_state', state)
      const codeVerifier = generateCodeVerifier()
      sessionStorage.setItem('twitter_code_verifier', codeVerifier)
      const codeChallenge = await generateCodeChallenge(codeVerifier)
      const clientId = import.meta.env.VITE_TWITTER_CLIENT_ID
      const redirectUri = `${window.location.origin}/settings/callback/twitter`
      const scope = 'tweet.read tweet.write users.read offline.access'
      const params = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope, state, code_challenge: codeChallenge, code_challenge_method: 'S256' })
      window.location.href = `https://twitter.com/i/oauth2/authorize?${params.toString()}`
    } catch (err) {
      console.error('Failed to initiate Twitter OAuth:', err)
      setLoading(false)
    }
  }

  const perms = [
    { label: 'Read your tweets', desc: 'View your existing posts' },
    { label: 'Post tweets', desc: 'Publish new tweets on your behalf' },
    { label: 'Read your profile', desc: 'Username and profile info' },
    { label: 'Offline access', desc: 'Stay connected without re-authorizing' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-secondary rounded-2xl border border-surface-border shadow-modal max-w-md w-full overflow-hidden animate-scale-in">
        <div className="px-6 pt-6 pb-4 border-b border-surface-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-surface-border flex items-center justify-center">
                <svg className="w-4 h-4 text-text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <h2 className="text-base font-semibold text-text-primary">Connect X / Twitter</h2>
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
            Connect your X / Twitter account to publish tweets and threads.
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
          <div className="rounded-xl bg-status-warning-bg border border-status-warning/25 px-4 py-3">
            <p className="text-xs text-status-warning">
              Uses OAuth 2.0 with PKCE for enhanced security. No client secret is exposed in the browser.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleConnect} disabled={loading}>
            {loading ? (
              <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Redirecting...</>
            ) : 'Connect X / Twitter Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
