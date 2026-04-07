import { useState } from 'react'
import { inviteTeamMember } from '../lib/team'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVITABLE_ROLES = ['admin', 'editor', 'viewer']

const ROLE_DESCRIPTIONS = {
  admin: 'Can manage team, create and publish content.',
  editor: 'Can submit ideas, review and select drafts.',
  viewer: 'Read-only access to content and analytics.',
}

export default function InviteModal({ onClose, onInvited, currentUserId }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [inviteLink, setInviteLink] = useState(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) { setError('Email is required.'); return }
    if (!EMAIL_REGEX.test(email.trim())) { setError('Please enter a valid email address.'); return }

    setLoading(true)
    try {
      const member = await inviteTeamMember({
        email: email.trim().toLowerCase(),
        role,
        displayName: displayName.trim() || null,
        invitedBy: currentUserId,
      })
      const link = `${window.location.origin}/invite/${member.invite_token}`
      setInviteLink(link)
      if (onInvited) onInvited(member)
    } catch (err) {
      if (err.message?.includes('duplicate') || err.message?.includes('unique') || err.code === '23505') {
        setError('A team member with this email already exists.')
      } else {
        setError(err.message || 'Failed to create invitation. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // silently fail — user can still manually copy the input
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface-secondary rounded-2xl border border-surface-border shadow-modal w-full max-w-md p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent-muted border border-accent-border flex items-center justify-center">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-text-primary">Invite Team Member</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success State */}
        {inviteLink ? (
          <div className="animate-slide-up">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-status-success-bg border border-status-success/25 mb-5">
              <div className="w-8 h-8 rounded-full bg-status-success/15 border border-status-success/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-status-success">
                Invitation created for {email}
              </p>
            </div>

            <p className="text-sm text-text-secondary mb-3">
              Share this link with the invitee:
            </p>

            <div className="flex items-center gap-2 mb-5">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="input-field text-xs font-mono bg-surface-tertiary"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={handleCopy}
                className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  copied
                    ? 'bg-status-success-bg text-status-success border border-status-success/25'
                    : 'bg-surface-elevated text-text-primary border border-surface-border hover:border-accent-border hover:text-accent'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button onClick={onClose} className="btn-primary w-full">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="alert-error rounded-xl text-sm py-2.5">{error}</div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="invite-email" className="block text-xs font-medium text-text-secondary mb-1.5">
                Email <span className="text-status-error">*</span>
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="input-field"
                required
                autoFocus
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="invite-role" className="block text-xs font-medium text-text-secondary mb-1.5">
                Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-field"
              >
                {INVITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-text-tertiary">{ROLE_DESCRIPTIONS[role]}</p>
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="invite-name" className="block text-xs font-medium text-text-secondary mb-1.5">
                Display Name <span className="text-text-tertiary font-normal">(optional)</span>
              </label>
              <input
                id="invite-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Doe"
                className="input-field"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Invitation'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
