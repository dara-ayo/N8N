import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { saveConnection } from '../lib/platforms'
import { useAuth } from '../contexts/AuthContext'

export default function OAuthCallback() {
  const { platform } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [status, setStatus] = useState('processing')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    handleCallback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCallback() {
    try {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (error) {
        throw new Error(errorDescription || `OAuth error: ${error}`)
      }

      if (!code) {
        throw new Error('No authorization code received from the provider.')
      }

      if (!state) {
        throw new Error('No state parameter received. Possible CSRF attack.')
      }

      const storedState = sessionStorage.getItem(`${platform}_oauth_state`)
      if (!storedState || storedState !== state) {
        throw new Error(
          'State mismatch. The request may have been tampered with. Please try connecting again.'
        )
      }

      sessionStorage.removeItem(`${platform}_oauth_state`)

      const redirectUri = `${window.location.origin}/settings/callback/${platform}`
      const payload = { platform, code, redirect_uri: redirectUri }

      if (platform === 'twitter') {
        const codeVerifier = sessionStorage.getItem('twitter_code_verifier')
        if (!codeVerifier) {
          throw new Error('Missing PKCE code verifier. Please try connecting again.')
        }
        payload.code_verifier = codeVerifier
        sessionStorage.removeItem('twitter_code_verifier')
      }

      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_BASE
      const pathPrefix = import.meta.env.VITE_WEBHOOK_PATH_PREFIX || ''
      const response = await fetch(`${webhookUrl}/${pathPrefix}oauth-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(
          body.message || `Token exchange failed (HTTP ${response.status}). Please try again.`
        )
      }

      const tokenData = await response.json()

      await saveConnection({
        platform,
        display_name: tokenData.display_name || tokenData.name || null,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: tokenData.expires_at || null,
        platform_user_id: tokenData.user_id || tokenData.sub || null,
        platform_username: tokenData.username || null,
        config: tokenData.config || null,
        connected_by: user?.id || null,
        status: 'active',
      })

      setStatus('success')
      setTimeout(() => {
        navigate('/settings', { replace: true })
      }, 1500)
    } catch (err) {
      console.error('OAuth callback error:', err)
      setErrorMessage(err.message || 'An unexpected error occurred.')
      setStatus('error')
    }
  }

  const platformName = platform === 'linkedin' ? 'LinkedIn' : platform === 'twitter' ? 'X / Twitter' : platform

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card max-w-md w-full text-center">
        {status === 'processing' && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="w-10 h-10 relative">
                <div className="absolute inset-0 rounded-full border-2 border-surface-border" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              Connecting {platformName}...
            </h2>
            <p className="text-sm text-text-secondary">
              Completing authorization and saving your connection.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-4 animate-scale-in">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-status-success/15 border border-status-success/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              {platformName} Connected
            </h2>
            <p className="text-sm text-text-secondary">
              Redirecting you to settings...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-4 animate-scale-in">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-status-error/15 border border-status-error/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              Connection Failed
            </h2>
            <p className="text-sm text-status-error">{errorMessage}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link to="/settings" className="btn-secondary text-sm">
                Back to Settings
              </Link>
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={() => {
                  setStatus('processing')
                  setErrorMessage('')
                  handleCallback()
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
