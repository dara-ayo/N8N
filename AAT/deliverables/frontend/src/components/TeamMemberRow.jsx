import { useState, useRef, useEffect } from 'react'

const ROLE_BADGE = {
  owner: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  admin: 'text-accent bg-accent-muted border-accent-border',
  editor: 'text-status-info bg-status-info-bg border-status-info/20',
  viewer: 'text-text-tertiary bg-surface-elevated border-surface-border',
}

const ASSIGNABLE_ROLES = ['admin', 'editor', 'viewer']

export default function TeamMemberRow({ member, currentUser, onChangeRole, onToggleStatus, onResendInvite, isAdmin }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const menuRef = useRef(null)

  const isCurrentUser = currentUser?.id === member.id
  const isOwner = member.role === 'owner'
  const displayName = member.display_name || member.email
  const initial = (displayName || '?')[0].toUpperCase()

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
        setRoleDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formattedDate = member.created_at
    ? new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '--'

  const isActive = member.status === 'active'
  const isInvited = member.status === 'invited'

  return (
    <div className={`flex items-center gap-4 px-5 py-4 rounded-xl bg-surface-secondary border transition-all duration-150 ${
      isCurrentUser ? 'border-accent/15 bg-accent-muted/10' : 'border-surface-border hover:border-surface-border'
    }`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold ${
        isOwner
          ? 'bg-purple-500/15 border border-purple-500/30 text-purple-400'
          : isActive
          ? 'bg-accent-muted border border-accent-border text-accent'
          : 'bg-surface-elevated border border-surface-border text-text-tertiary'
      }`}>
        {isOwner ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ) : initial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text-primary truncate">{displayName}</span>
          {isCurrentUser && <span className="text-xs text-accent font-normal">(you)</span>}
        </div>
        {member.display_name && (
          <p className="text-xs text-text-tertiary truncate mt-0.5">{member.email}</p>
        )}
      </div>

      {/* Role Badge */}
      <span className={`badge border text-[11px] capitalize hidden sm:inline-flex ${ROLE_BADGE[member.role] || ROLE_BADGE.viewer}`}>
        {member.role}
      </span>

      {/* Status */}
      <div className="hidden md:flex items-center gap-1.5 text-[11px]">
        <span className={`relative flex h-1.5 w-1.5 ${isInvited ? '' : ''}`}>
          {isInvited && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-status-warning opacity-75 animate-ping" />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
            isActive ? 'bg-status-success' : isInvited ? 'bg-status-warning' : 'bg-text-tertiary'
          }`} />
        </span>
        <span className={
          isActive ? 'text-status-success' : isInvited ? 'text-status-warning' : 'text-text-tertiary'
        }>
          {member.status === 'active' ? 'Active' : member.status === 'invited' ? 'Invited' : 'Inactive'}
        </span>
      </div>

      {/* Date */}
      <span className="text-xs text-text-tertiary font-mono hidden lg:block">{formattedDate}</span>

      {/* Actions */}
      {isAdmin && !isCurrentUser && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => { setMenuOpen(!menuOpen); setRoleDropdownOpen(false) }}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            aria-label="Member actions"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-surface-elevated border border-surface-border rounded-xl shadow-surface-md z-20 py-1 animate-scale-in">
              {!isOwner && (
                <div className="relative">
                  <button
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-hover flex items-center justify-between transition-colors"
                  >
                    Change Role
                    <svg className="w-3.5 h-3.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {roleDropdownOpen && (
                    <div className="absolute right-full top-0 mr-1.5 w-36 bg-surface-elevated border border-surface-border rounded-xl shadow-surface-md py-1 animate-scale-in">
                      {ASSIGNABLE_ROLES.map((role) => (
                        <button
                          key={role}
                          onClick={() => {
                            if (role !== member.role) onChangeRole(member.id, role)
                            setMenuOpen(false)
                            setRoleDropdownOpen(false)
                          }}
                          className={`w-full text-left px-4 py-2 text-sm capitalize transition-colors ${
                            role === member.role
                              ? 'text-accent bg-accent-muted font-medium'
                              : 'text-text-primary hover:bg-surface-hover'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isOwner && member.status === 'active' && (
                <button
                  onClick={() => { onToggleStatus(member.id, 'deactivated'); setMenuOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-status-error hover:bg-status-error-bg transition-colors"
                >
                  Deactivate
                </button>
              )}

              {!isOwner && member.status === 'deactivated' && (
                <button
                  onClick={() => { onToggleStatus(member.id, 'active'); setMenuOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-status-success hover:bg-status-success-bg transition-colors"
                >
                  Reactivate
                </button>
              )}

              {member.status === 'invited' && (
                <button
                  onClick={() => { onResendInvite(member); setMenuOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors"
                >
                  Copy Invite Link
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
