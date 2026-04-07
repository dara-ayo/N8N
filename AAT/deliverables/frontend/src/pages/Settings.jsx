import { useEffect, useState, useCallback } from 'react'
import { fetchConnections, disconnectPlatform, getAllPlatformTypes } from '../lib/platforms'
import { useToast } from '../components/Toast'
import { useTheme } from '../contexts/ThemeContext'
import PlatformCard from '../components/PlatformCard'
import LinkedInConnect from '../components/LinkedInConnect'
import TwitterConnect from '../components/TwitterConnect'
import NewsletterConnect from '../components/NewsletterConnect'

const TONES = ['Professional', 'Casual', 'Bold', 'Educational', 'Storytelling']
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Arabic', 'Chinese', 'Hindi']

function loadNotifications() {
  try {
    const stored = localStorage.getItem('contentflow-notifications')
    if (stored) return JSON.parse(stored)
  } catch {}
  return { draftsReady: true, publishComplete: true, errors: true }
}

function saveNotifications(prefs) {
  try {
    localStorage.setItem('contentflow-notifications', JSON.stringify(prefs))
  } catch {}
}

function loadDefaults() {
  try {
    const stored = localStorage.getItem('contentflow-defaults')
    if (stored) return JSON.parse(stored)
  } catch {}
  return { tone: 'Professional', language: 'English' }
}

function saveDefaults(defaults) {
  try {
    localStorage.setItem('contentflow-defaults', JSON.stringify(defaults))
  } catch {}
}

/* ── Toggle Switch Component ──────────────────────────────── */
function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
          checked ? 'bg-accent' : 'bg-surface-border'
        }`}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
      </div>
    </div>
  )
}

/* ── Section Card Wrapper ─────────────────────────────────── */
function SectionCard({ title, description, children }) {
  return (
    <section className="card mb-6">
      <div className="mb-5">
        <h2 className="section-title">{title}</h2>
        {description && (
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

export default function Settings() {
  const toast = useToast()
  const { preference, setTheme } = useTheme()
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connectingPlatform, setConnectingPlatform] = useState(null)

  // Notification preferences
  const [notifications, setNotifications] = useState(loadNotifications)

  // Content defaults
  const [defaults, setDefaults] = useState(loadDefaults)

  // Persist notification changes
  useEffect(() => { saveNotifications(notifications) }, [notifications])

  // Persist content default changes
  useEffect(() => { saveDefaults(defaults) }, [defaults])

  const loadConnections = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchConnections()
      setConnections(data)
    } catch (err) {
      console.error('Failed to fetch connections:', err)
      setError('Failed to load platform connections.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConnections() }, [loadConnections])

  const getConnectionForPlatform = (platformType) => {
    return (
      connections.find((c) => c.platform === platformType && c.status === 'active') ||
      connections.find((c) => c.platform === platformType && c.status === 'expired') ||
      null
    )
  }

  const handleDisconnect = async (connectionId) => {
    try {
      await disconnectPlatform(connectionId)
      setConnections((prev) => prev.filter((c) => c.id !== connectionId))
      toast.success('Platform disconnected.')
    } catch (err) {
      console.error('Failed to disconnect:', err)
      toast.error('Failed to disconnect. Please try again.')
    }
  }

  const platformTypes = getAllPlatformTypes()

  const themeOptions = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'System' },
  ]

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-8 pb-6 border-b border-surface-border">
        <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Settings</p>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your preferences, platform connections, and publishing settings.</p>
      </div>

      {/* ── Appearance ─────────────────────────────────────── */}
      <SectionCard title="Appearance" description="Customize how ContentFlow looks.">
        <div>
          <label className="block text-[11px] font-medium text-text-tertiary mb-3 uppercase tracking-wider">Theme</label>
          <div
            className="inline-flex rounded-xl bg-surface-tertiary p-1 gap-1 relative"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            {/* Animated indicator */}
            <div
              className="absolute inset-y-1 rounded-lg bg-surface-elevated shadow-surface transition-all duration-200 ease-out"
              style={{
                width: `calc(${100 / 3}% - 5px)`,
                left: `calc(${themeOptions.findIndex((o) => o.value === preference) * (100 / 3)}% + 4px)`,
                border: '1px solid var(--border-muted)',
              }}
            />
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={`relative z-10 px-5 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150 select-none ${
                  preference === option.value ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── Platform Connections ────────────────────────────── */}
      <SectionCard title="Connected Platforms" description="Connect your accounts to publish content directly from the platform.">
        {error && (
          <div className="mb-5 alert-error rounded-xl">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              className="text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-tertiary rounded-2xl p-5" style={{ border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl skeleton" />
                  <div className="w-2 h-2 rounded-full skeleton" />
                </div>
                <div className="h-5 skeleton w-24 mb-2" />
                <div className="h-3 skeleton w-36 mb-4" />
                <div className="h-8 skeleton w-28 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {platformTypes.map((type) => (
              <PlatformCard
                key={type}
                platformType={type}
                platform={getConnectionForPlatform(type)}
                onConnect={() => setConnectingPlatform(type)}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Notifications ──────────────────────────────────── */}
      <SectionCard title="Notifications" description="Choose what emails you receive.">
        <div className="divide-y divide-surface-border">
          <ToggleSwitch
            checked={notifications.draftsReady}
            onChange={(val) => setNotifications((prev) => ({ ...prev, draftsReady: val }))}
            label="Email me when drafts are ready"
            description="Get notified when your AI-generated drafts are available for review."
          />
          <ToggleSwitch
            checked={notifications.publishComplete}
            onChange={(val) => setNotifications((prev) => ({ ...prev, publishComplete: val }))}
            label="Email me when publishing completes"
            description="Get notified when content is successfully published to your platforms."
          />
          <ToggleSwitch
            checked={notifications.errors}
            onChange={(val) => setNotifications((prev) => ({ ...prev, errors: val }))}
            label="Email me on errors"
            description="Get notified when something goes wrong with a submission or publish."
          />
        </div>
      </SectionCard>

      {/* ── Content Defaults ───────────────────────────────── */}
      <SectionCard title="Content Defaults" description="Set default values for new submissions.">
        {/* Default Tone */}
        <div className="mb-5">
          <label className="block text-[11px] font-medium text-text-tertiary mb-2 uppercase tracking-wider">Default Tone</label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDefaults((prev) => ({ ...prev, tone: t }))}
                className={defaults.tone === t ? 'filter-pill-active' : 'filter-pill'}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Default Language */}
        <div>
          <label htmlFor="default-language" className="block text-[11px] font-medium text-text-tertiary mb-2 uppercase tracking-wider">Default Language</label>
          <select
            id="default-language"
            value={defaults.language}
            onChange={(e) => setDefaults((prev) => ({ ...prev, language: e.target.value }))}
            className="w-full max-w-xs h-11 px-4 bg-surface-tertiary text-text-primary text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-150 appearance-none cursor-pointer"
            style={{ border: '1px solid var(--border-muted)' }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </SectionCard>

      {/* ── About ──────────────────────────────────────────── */}
      <SectionCard title="About">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-1">
            <span className="text-text-secondary">App</span>
            <span className="text-text-primary font-medium">ContentFlow</span>
          </div>
          <div className="flex items-center justify-between py-1 border-t border-surface-border">
            <span className="text-text-secondary">Version</span>
            <span className="text-text-primary font-medium">1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-1 border-t border-surface-border">
            <span className="text-text-secondary">Builder</span>
            <span className="text-text-primary font-medium">Ayodele Oluwafimidaraayo</span>
          </div>
          <div className="flex items-center justify-between py-1 border-t border-surface-border">
            <span className="text-text-secondary">Agency</span>
            <span className="text-text-primary font-medium">Fetemi Marketing</span>
          </div>
        </div>
      </SectionCard>

      {/* Modals */}
      <LinkedInConnect isOpen={connectingPlatform === 'linkedin'} onClose={() => setConnectingPlatform(null)} />
      <TwitterConnect isOpen={connectingPlatform === 'twitter'} onClose={() => setConnectingPlatform(null)} />
      <NewsletterConnect
        isOpen={connectingPlatform === 'newsletter'}
        onClose={() => setConnectingPlatform(null)}
        onConnected={(connection) => {
          setConnections((prev) => [connection, ...prev])
          setConnectingPlatform(null)
          toast.success('Newsletter connected!')
        }}
      />
    </div>
  )
}
