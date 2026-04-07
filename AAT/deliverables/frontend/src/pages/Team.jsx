import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { hasMinRole } from '../lib/auth'
import { fetchTeamMembers, updateMemberRole, toggleMemberStatus } from '../lib/team'
import { useToast } from '../components/Toast'
import RoleGate from '../components/RoleGate'
import InviteModal from '../components/InviteModal'
import TeamMemberRow from '../components/TeamMemberRow'

export default function Team() {
  const { profile } = useAuth()
  const toast = useToast()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const isAdmin = profile?.role ? hasMinRole(profile.role, 'admin') : false

  const loadMembers = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchTeamMembers()
      setMembers(data)
    } catch (err) {
      setError(err.message || 'Failed to load team members.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMembers() }, [loadMembers])

  async function handleChangeRole(memberId, newRole) {
    try {
      await updateMemberRole(memberId, newRole)
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
      toast.success(`Role updated to ${newRole}.`)
    } catch (err) {
      toast.error(err.message || 'Failed to update role.')
    }
  }

  async function handleToggleStatus(memberId, newStatus) {
    try {
      await toggleMemberStatus(memberId, newStatus)
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, status: newStatus } : m)))
      toast.success(`Member ${newStatus === 'active' ? 'reactivated' : 'deactivated'}.`)
    } catch (err) {
      toast.error(err.message || 'Failed to update status.')
    }
  }

  function handleResendInvite(member) {
    const link = `${window.location.origin}/invite/${member.invite_token}`
    navigator.clipboard.writeText(link).then(
      () => toast.success('Invite link copied to clipboard!'),
      () => toast.info(`Invite link: ${link}`)
    )
  }

  function handleInvited() {
    loadMembers()
  }

  const activeCount = members.filter((m) => m.status === 'active').length
  const invitedCount = members.filter((m) => m.status === 'invited').length

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b border-surface-border">
        <div>
          <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Team</p>
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">
            {activeCount} active member{activeCount !== 1 ? 's' : ''}
            {invitedCount > 0 && (
              <span className="text-text-tertiary"> -- {invitedCount} pending invite{invitedCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <RoleGate minRole="admin">
          <button onClick={() => setShowInviteModal(true)} className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Invite Member
          </button>
        </RoleGate>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-5 alert-error rounded-xl">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card flex items-center justify-center py-16">
          <div className="w-6 h-6 relative mr-3">
            <div className="absolute inset-0 rounded-full border-2 border-surface-border" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
          </div>
          <span className="text-text-secondary text-sm">Loading team members...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && members.length === 0 && (
        <div className="card text-center py-20 border-dashed">
          <div className="w-12 h-12 rounded-2xl bg-accent-muted border border-accent-border flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-text-primary mb-1">No team members yet</h3>
          <p className="text-sm text-text-secondary">Invite your first team member to get started.</p>
        </div>
      )}

      {/* Card-based Member List */}
      {!loading && members.length > 0 && (
        <div className="space-y-2">
          {members.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              currentUser={profile}
              isAdmin={isAdmin}
              onChangeRole={handleChangeRole}
              onToggleStatus={handleToggleStatus}
              onResendInvite={handleResendInvite}
            />
          ))}
        </div>
      )}

      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInvited={handleInvited}
          currentUserId={profile?.id}
        />
      )}
    </div>
  )
}
