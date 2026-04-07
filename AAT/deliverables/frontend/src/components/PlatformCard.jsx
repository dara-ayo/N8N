import { useState } from 'react'
import { getPlatformMeta } from '../lib/platforms'
import RoleGate from './RoleGate'

const PLATFORM_ICONS = {
  linkedin: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  twitter: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  newsletter: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
}

const PLATFORM_LOGO_STYLES = {
  linkedin: 'bg-[#0077b5]/15 border border-[#0077b5]/20 text-[#0a91c0]',
  twitter: 'bg-surface-tertiary border border-surface-border text-text-primary',
  newsletter: 'bg-status-success-bg border border-status-success/20 text-status-success',
}

export default function PlatformCard({ platform, platformType, onConnect, onDisconnect }) {
  const [disconnecting, setDisconnecting] = useState(false)
  const meta = getPlatformMeta(platformType)

  if (!meta) return null

  const isConnected = platform && platform.status === 'active'
  const isExpired = platform && platform.status === 'expired'

  const handleDisconnect = async () => {
    if (!platform) return
    setDisconnecting(true)
    try { await onDisconnect(platform.id) }
    finally { setDisconnecting(false) }
  }

  const outerClass = isConnected
    ? 'relative flex flex-col bg-surface-secondary rounded-2xl p-5 border border-status-success/20 transition-all duration-200'
    : isExpired
    ? 'relative flex flex-col bg-surface-secondary border border-status-warning/20 rounded-2xl p-5 transition-all duration-200'
    : 'relative flex flex-col bg-surface-secondary border border-surface-border rounded-2xl p-5 transition-all duration-200 hover:border-surface-border'

  const connectedShadow = isConnected ? { boxShadow: '0 0 0 1px rgba(34,197,94,0.08), 0 0 20px rgba(34,197,94,0.04)' } : {}

  return (
    <div className={outerClass} style={connectedShadow}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${PLATFORM_LOGO_STYLES[platformType] || 'bg-surface-elevated border border-surface-border text-text-secondary'}`}>
          {PLATFORM_ICONS[platformType]}
        </div>
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
          isConnected ? 'bg-status-success shadow-glow-green' : isExpired ? 'bg-status-warning' : 'bg-surface-border'
        }`} />
      </div>

      {/* Name + Status */}
      <h3 className="text-[15px] font-semibold text-text-primary">{meta.name}</h3>
      {isConnected && platform.platform_username && (
        <p className="text-xs text-text-tertiary mt-0.5">@{platform.platform_username}</p>
      )}
      {isConnected && platform.display_name && !platform.platform_username && (
        <p className="text-xs text-text-tertiary mt-0.5">{platform.display_name}</p>
      )}
      {!isConnected && !isExpired && (
        <p className="text-xs text-text-tertiary mt-0.5">{meta.description}</p>
      )}
      {isExpired && (
        <p className="text-xs text-status-warning mt-0.5">Token expired - reconnect required</p>
      )}

      {/* Connection details */}
      {platform && isConnected && platform.created_at && (
        <p className="text-xs text-text-tertiary mt-2">
          Connected {new Date(platform.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-4">
        <RoleGate minRole="owner">
          {isConnected || isExpired ? (
            <>
              {isExpired && (
                <button type="button" className="btn-primary text-xs" onClick={onConnect}>Reconnect</button>
              )}
              <button
                type="button"
                className="btn-danger text-xs"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Disconnecting...
                  </>
                ) : 'Disconnect'}
              </button>
            </>
          ) : (
            <button type="button" className="btn-secondary text-xs" onClick={onConnect}>
              Connect {meta.name}
            </button>
          )}
        </RoleGate>
      </div>
    </div>
  )
}
