import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { saveConnection } from '../lib/platforms'

const ESP_PROVIDERS = [
  { value: 'resend', label: 'Resend' },
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'mailchimp', label: 'Mailchimp' },
]

function validateApiKey(provider, key) {
  if (!key || key.trim().length === 0) return 'API key is required'
  if (key.trim().length < 10) return 'API key seems too short'
  if (provider === 'resend' && !key.startsWith('re_')) return 'Resend API keys typically start with "re_"'
  if (provider === 'sendgrid' && !key.startsWith('SG.')) return 'SendGrid API keys typically start with "SG."'
  return null
}

function validateEmail(email) {
  if (!email || email.trim().length === 0) return 'Sender email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format'
  return null
}

export default function NewsletterConnect({ isOpen, onClose, onConnected }) {
  const { user } = useAuth()

  const [provider, setProvider] = useState('resend')
  const [apiKey, setApiKey] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderName, setSenderName] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saveError, setSaveError] = useState(null)

  if (!isOpen) return null

  const validate = () => {
    const newErrors = {}
    const keyError = validateApiKey(provider, apiKey)
    if (keyError) newErrors.apiKey = keyError
    const emailError = validateEmail(senderEmail)
    if (emailError) newErrors.senderEmail = emailError
    if (!senderName.trim()) newErrors.senderName = 'Sender name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveError(null)
    if (!validate()) return
    setSaving(true)
    try {
      const connection = await saveConnection({
        platform: 'newsletter',
        display_name: `${ESP_PROVIDERS.find((p) => p.value === provider)?.label} - ${senderName}`,
        api_key: apiKey.trim(),
        platform_username: senderEmail.trim(),
        config: { provider, sender_email: senderEmail.trim(), sender_name: senderName.trim() },
        connected_by: user?.id || null,
        status: 'active',
      })
      onConnected?.(connection)
      handleClose()
    } catch (err) {
      console.error('Failed to save newsletter connection:', err)
      setSaveError(err.message || 'Failed to save connection. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!validate()) return
    setTesting(true)
    setTestResult(null)
    try {
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_BASE || ''
      const pathPrefix = import.meta.env.VITE_WEBHOOK_PATH_PREFIX || ''
      const res = await fetch(`${webhookUrl}/${pathPrefix}test-newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: apiKey.trim(), sender_email: senderEmail.trim(), sender_name: senderName.trim(), test_recipient: user?.email }),
      })
      if (res.ok) {
        setTestResult({ success: true, message: `Test email sent to ${user?.email}` })
      } else {
        const body = await res.json().catch(() => ({}))
        setTestResult({ success: false, message: body.message || 'Test failed. Check your API key and sender email.' })
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Could not reach the test endpoint. Please try again later.' })
    } finally {
      setTesting(false)
    }
  }

  const handleClose = () => {
    setProvider('resend')
    setApiKey('')
    setSenderEmail('')
    setSenderName('')
    setErrors({})
    setTestResult(null)
    setSaveError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-surface-secondary rounded-2xl border border-surface-border shadow-modal max-w-md w-full overflow-hidden animate-scale-in">
        <div className="px-6 pt-6 pb-4 border-b border-surface-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-status-success-bg border border-status-success/25 flex items-center justify-center">
                <svg className="w-4 h-4 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-text-primary">Connect Newsletter</h2>
            </div>
            <button type="button" onClick={handleClose} className="btn-ghost p-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-text-secondary">
            Connect your email service provider to send newsletters to your subscribers.
          </p>

          {/* ESP Provider */}
          <div>
            <label htmlFor="esp-provider" className="block text-xs font-medium text-text-secondary mb-1.5">ESP Provider</label>
            <select
              id="esp-provider"
              className="input-field"
              value={provider}
              onChange={(e) => { setProvider(e.target.value); setErrors((prev) => ({ ...prev, apiKey: undefined })) }}
            >
              {ESP_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="api-key" className="block text-xs font-medium text-text-secondary mb-1.5">API Key</label>
            <input
              id="api-key"
              type="password"
              className={`input-field ${errors.apiKey ? 'border-status-error/50 focus:ring-status-error/40' : ''}`}
              placeholder={provider === 'resend' ? 're_...' : provider === 'sendgrid' ? 'SG....' : 'Your API key'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setErrors((prev) => ({ ...prev, apiKey: undefined })) }}
            />
            {errors.apiKey && <p className="mt-1.5 text-xs text-status-error">{errors.apiKey}</p>}
          </div>

          {/* Sender Email */}
          <div>
            <label htmlFor="sender-email" className="block text-xs font-medium text-text-secondary mb-1.5">Sender Email</label>
            <input
              id="sender-email"
              type="email"
              className={`input-field ${errors.senderEmail ? 'border-status-error/50 focus:ring-status-error/40' : ''}`}
              placeholder="newsletter@yourcompany.com"
              value={senderEmail}
              onChange={(e) => { setSenderEmail(e.target.value); setErrors((prev) => ({ ...prev, senderEmail: undefined })) }}
            />
            {errors.senderEmail && <p className="mt-1.5 text-xs text-status-error">{errors.senderEmail}</p>}
          </div>

          {/* Sender Name */}
          <div>
            <label htmlFor="sender-name" className="block text-xs font-medium text-text-secondary mb-1.5">Sender Name</label>
            <input
              id="sender-name"
              type="text"
              className={`input-field ${errors.senderName ? 'border-status-error/50 focus:ring-status-error/40' : ''}`}
              placeholder="Your Company Name"
              value={senderName}
              onChange={(e) => { setSenderName(e.target.value); setErrors((prev) => ({ ...prev, senderName: undefined })) }}
            />
            {errors.senderName && <p className="mt-1.5 text-xs text-status-error">{errors.senderName}</p>}
          </div>

          {testResult && (
            <div className={`rounded-xl px-4 py-3 text-sm ${testResult.success ? 'alert-success' : 'alert-error'}`}>
              {testResult.message}
            </div>
          )}
          {saveError && (
            <div className="alert-error rounded-xl text-sm py-2.5">{saveError}</div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-surface-border mt-4">
            <button type="button" className="btn-secondary" onClick={handleTest} disabled={testing || saving}>
              {testing ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Sending...</>
              ) : 'Send Test Email'}
            </button>
            <div className="flex items-center gap-3">
              <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving || testing}>
                {saving ? (
                  <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Saving...</>
                ) : 'Save Connection'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
