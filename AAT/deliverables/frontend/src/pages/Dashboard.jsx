import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchSubmissions, getCachedSubmissions, fetchAdaptedContentAll, getCachedAdaptedContentAll } from '../lib/supabase'
import SubmissionList from '../components/SubmissionList'
import EmptyState from '../components/EmptyState'
import ErrorDisplay from '../components/ErrorDisplay'

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'generating', label: 'Generating' },
  { value: 'pending_review', label: 'Ready for Review' },
  { value: 'processing', label: 'Processing' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'error', label: 'Error' },
]

function StatCard({ label, value, icon, gradient, iconBg, iconBorder, iconColor }) {
  return (
    <div className="stat-card group">
      <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: gradient }} />
      <div className="relative">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${iconBg} border ${iconBorder}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <p className="text-2xl font-mono font-medium text-text-primary tabular-nums leading-none">
          {value}
        </p>
        <p className="text-xs text-text-tertiary mt-1.5 font-medium">{label}</p>
      </div>
    </div>
  )
}

// ─── Analytics Bar ────────────────────────────────────────────────────────────

function AnalyticsBar({ submissions, adaptedContent }) {
  const now = new Date()

  // This week vs previous week submission counts
  const weekCounts = useMemo(() => {
    const msDay = 86400000
    const thisWeekStart = new Date(now.getTime() - 7 * msDay)
    const prevWeekStart = new Date(now.getTime() - 14 * msDay)
    let thisWeek = 0
    let prevWeek = 0
    for (const s of submissions) {
      const d = new Date(s.created_at)
      if (d >= thisWeekStart) thisWeek++
      else if (d >= prevWeekStart) prevWeek++
    }
    return { thisWeek, prevWeek }
  }, [submissions])

  const weekDelta = weekCounts.thisWeek - weekCounts.prevWeek
  const weekUp = weekDelta >= 0

  // Average word count across all drafts (content_base field used as proxy)
  const avgWords = useMemo(() => {
    const withContent = submissions.filter((s) => s.content_base)
    if (withContent.length === 0) return 0
    const total = withContent.reduce((acc, s) => {
      const words = (s.content_base || '').trim().split(/\s+/).filter(Boolean).length
      return acc + words
    }, 0)
    return Math.round(total / withContent.length)
  }, [submissions])

  // Platform split from adapted_content
  const platformSplit = useMemo(() => {
    const counts = { linkedin: 0, x: 0, newsletter: 0 }
    for (const ac of (adaptedContent || [])) {
      const p = (ac.platform || '').toLowerCase()
      if (p === 'linkedin') counts.linkedin++
      else if (p === 'x' || p === 'twitter') counts.x++
      else if (p === 'newsletter') counts.newsletter++
    }
    return counts
  }, [adaptedContent])

  const platformTotal = platformSplit.linkedin + platformSplit.x + platformSplit.newsletter
  const pctOf = (n) => platformTotal === 0 ? 0 : Math.round((n / platformTotal) * 100)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {/* This Week */}
      <div
        className="relative rounded-2xl p-4 border border-surface-border overflow-hidden"
        style={{ background: 'rgba(124,106,245,0.04)', backdropFilter: 'blur(8px)' }}
      >
        <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium mb-2">This Week</p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-mono font-medium text-text-primary tabular-nums leading-none">
            {weekCounts.thisWeek}
          </span>
          <span className={`flex items-center gap-0.5 text-sm font-medium pb-0.5 ${weekUp ? 'text-status-success' : 'text-status-error'}`}>
            {weekUp ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {Math.abs(weekDelta)}
          </span>
        </div>
        <p className="text-[11px] text-text-tertiary mt-1">
          vs {weekCounts.prevWeek} last week
        </p>
      </div>

      {/* Avg Words / Draft */}
      <div
        className="relative rounded-2xl p-4 border border-surface-border overflow-hidden"
        style={{ background: 'rgba(59,130,246,0.04)', backdropFilter: 'blur(8px)' }}
      >
        <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium mb-2">Avg Words / Draft</p>
        <span className="text-3xl font-mono font-medium text-text-primary tabular-nums leading-none">
          {avgWords.toLocaleString()}
        </span>
        <p className="text-[11px] text-text-tertiary mt-1">
          across {submissions.filter((s) => s.content_base).length} drafts
        </p>
      </div>

      {/* Platform Split */}
      <div
        className="relative rounded-2xl p-4 border border-surface-border overflow-hidden"
        style={{ background: 'rgba(34,197,94,0.03)', backdropFilter: 'blur(8px)' }}
      >
        <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium mb-3">Platform Split</p>
        {platformTotal === 0 ? (
          <p className="text-[11px] text-text-tertiary">No adapted content yet.</p>
        ) : (
          <div className="space-y-1.5">
            {[
              { key: 'linkedin', label: 'LinkedIn', color: '#0a66c2' },
              { key: 'x', label: 'X', color: '#e7e9ea' },
              { key: 'newsletter', label: 'Newsletter', color: '#7c6af5' },
            ].map(({ key, label, color }) => {
              const pct = pctOf(platformSplit[key])
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-text-tertiary w-16 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-text-secondary w-6 text-right">{platformSplit[key]}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Content Calendar ─────────────────────────────────────────────────────────

function ContentCalendar({ submissions }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [tooltip, setTooltip] = useState(null) // { day, items, x, y }
  const tooltipRef = useRef(null)

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long' })

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setTooltip(null)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setTooltip(null)
  }

  // Build day → submissions map for the viewed month
  const dayMap = useMemo(() => {
    const map = {}
    for (const s of submissions) {
      const d = new Date(s.created_at)
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(s)
      }
    }
    return map
  }, [submissions, viewYear, viewMonth])

  // Build calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  // Pad leading empty cells
  const cells = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Pad trailing to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const isToday = (day) =>
    day !== null &&
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear

  const handleDayClick = (e, day) => {
    if (!day || !dayMap[day]) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip(prev => prev?.day === day ? null : { day, items: dayMap[day], rect })
  }

  // Close tooltip on outside click
  useEffect(() => {
    if (!tooltip) return
    const handle = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setTooltip(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [tooltip])

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="relative" ref={tooltipRef}>
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-text-primary">
          {monthName} {viewYear}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[10px] uppercase tracking-wider text-text-tertiary py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-10" />
          }
          const subs = dayMap[day] || []
          const hasPublished = subs.some((s) => s.status === 'published')
          const hasScheduled = subs.some((s) => s.status === 'scheduled')
          const isActive = tooltip?.day === day
          const todayCell = isToday(day)

          return (
            <button
              key={day}
              onClick={(e) => handleDayClick(e, day)}
              className={[
                'relative h-10 w-full rounded-lg flex flex-col items-center justify-center text-[12px] font-mono transition-colors',
                todayCell
                  ? 'bg-surface-tertiary ring-1 ring-accent/40 text-text-primary'
                  : subs.length > 0
                    ? 'bg-surface-secondary hover:bg-surface-tertiary text-text-primary cursor-pointer'
                    : 'bg-surface-secondary text-text-tertiary cursor-default',
                isActive ? 'ring-1 ring-accent/60' : '',
              ].join(' ')}
            >
              <span className="leading-none">{day}</span>
              {(hasPublished || hasScheduled) && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasPublished && (
                    <span className="w-1 h-1 rounded-full" style={{ background: '#7c6af5' }} />
                  )}
                  {hasScheduled && (
                    <span className="w-1 h-1 rounded-full" style={{ background: '#f59e0b' }} />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <span className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
          <span className="w-2 h-2 rounded-full" style={{ background: '#7c6af5' }} />
          Published
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
          <span className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
          Scheduled
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
          <span className="w-3 h-3 rounded-sm ring-1 ring-accent/40 inline-block bg-surface-tertiary" />
          Today
        </span>
      </div>

      {/* Tooltip popup */}
      {tooltip && (
        <div
          className="mt-3 rounded-xl border border-surface-border p-3 space-y-1.5 animate-fade-in"
          style={{ background: 'rgba(20,18,34,0.97)', backdropFilter: 'blur(12px)' }}
        >
          <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium mb-2">
            {monthName} {tooltip.day}
          </p>
          {tooltip.items.map((s) => {
            const title = s.raw_input
              ? s.raw_input.slice(0, 60) + (s.raw_input.length > 60 ? '…' : '')
              : s.id
            const isPublished = s.status === 'published'
            const isScheduled = s.status === 'scheduled'
            return (
              <div key={s.id} className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: isPublished ? '#7c6af5' : isScheduled ? '#f59e0b' : '#6b7280' }}
                />
                <span className="text-xs text-text-secondary truncate">{title}</span>
                <span className="text-[10px] text-text-tertiary capitalize ml-auto shrink-0">{s.status}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const cached = getCachedSubmissions()
  const cachedContent = getCachedAdaptedContentAll()
  const [submissions, setSubmissions] = useState(cached || [])
  const [adaptedContent, setAdaptedContent] = useState(cachedContent || [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [calendarOpen, setCalendarOpen] = useState(false)

  const loadSubmissions = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setError(null)
      const data = await fetchSubmissions()
      setSubmissions(data || [])
    } catch (err) {
      if (!isBackground) setError(err.message || 'Failed to load submissions.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAdaptedContent = useCallback(async () => {
    try {
      const data = await fetchAdaptedContentAll()
      setAdaptedContent(data || [])
    } catch {
      // non-critical — analytics degrade gracefully
    }
  }, [])

  useEffect(() => {
    loadSubmissions(false)
    loadAdaptedContent()
  }, [loadSubmissions, loadAdaptedContent])

  useEffect(() => {
    const interval = setInterval(() => loadSubmissions(true), 15000)
    return () => clearInterval(interval)
  }, [loadSubmissions])

  const filtered = useMemo(() => {
    let result = submissions
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((s) => {
        const text = (s.raw_input || '') + (s.content_base || '') + (s.id || '')
        return text.toLowerCase().includes(q)
      })
    }
    return result
  }, [submissions, statusFilter, search])

  const statusCounts = useMemo(() => {
    const counts = {}
    for (const s of submissions) {
      counts[s.status] = (counts[s.status] || 0) + 1
    }
    return counts
  }, [submissions])

  const stats = useMemo(() => ({
    total: submissions.length,
    pending: statusCounts['pending_review'] || 0,
    published: statusCounts['published'] || 0,
    scheduled: statusCounts['scheduled'] || 0,
  }), [submissions.length, statusCounts])

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b border-surface-border">
        <div>
          <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Dashboard</p>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link to="/submit" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Submission
        </Link>
      </div>

      {/* Stats Bar */}
      {!loading && submissions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Submissions"
            value={stats.total}
            gradient="linear-gradient(135deg, rgba(124,106,245,0.06) 0%, transparent 60%)"
            iconBg="bg-accent-muted"
            iconBorder="border-accent-border"
            iconColor="text-accent"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            label="Drafts Pending Review"
            value={stats.pending}
            gradient="linear-gradient(135deg, rgba(59,130,246,0.06) 0%, transparent 60%)"
            iconBg="bg-status-info-bg"
            iconBorder="border-status-info/20"
            iconColor="text-status-info"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
          />
          <StatCard
            label="Published"
            value={stats.published}
            gradient="linear-gradient(135deg, rgba(34,197,94,0.06) 0%, transparent 60%)"
            iconBg="bg-status-success-bg"
            iconBorder="border-status-success/20"
            iconColor="text-status-success"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <StatCard
            label="Scheduled"
            value={stats.scheduled}
            gradient="linear-gradient(135deg, rgba(245,158,11,0.06) 0%, transparent 60%)"
            iconBg="bg-status-warning-bg"
            iconBorder="border-status-warning/20"
            iconColor="text-status-warning"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Analytics Bar */}
      {!loading && submissions.length > 0 && (
        <AnalyticsBar submissions={submissions} adaptedContent={adaptedContent} />
      )}

      {/* Content Calendar */}
      {!loading && submissions.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setCalendarOpen((o) => !o)}
            className="flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors mb-3 group"
          >
            <svg
              className={`w-3.5 h-3.5 text-text-tertiary group-hover:text-text-secondary transition-transform duration-200 ${calendarOpen ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-3.5 h-3.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {calendarOpen ? 'Hide Calendar' : 'Show Calendar'}
          </button>

          {calendarOpen && (
            <div
              className="rounded-2xl border border-surface-border p-5 animate-fade-in"
              style={{ background: 'rgba(124,106,245,0.03)', backdropFilter: 'blur(8px)' }}
            >
              <ContentCalendar submissions={submissions} />
            </div>
          )}
        </div>
      )}

      {/* Search + Filter */}
      {!loading && submissions.length > 0 && (
        <div className="space-y-4 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search submissions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-surface-secondary border border-surface-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-surface-tertiary transition-all duration-150"
            />
            {!search && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] text-text-tertiary/50 font-mono">
                <kbd className="px-1 py-0.5 rounded bg-surface-tertiary border border-surface-border">K</kbd>
              </span>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => {
              const count = f.value === 'all' ? submissions.length : (statusCounts[f.value] || 0)
              if (f.value !== 'all' && count === 0) return null
              const active = statusFilter === f.value
              return (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={active ? 'filter-pill-active' : 'filter-pill'}
                >
                  {f.label}
                  {count > 0 && (
                    <span className={active ? 'bg-accent/20 text-accent px-1 py-0 rounded-full font-mono text-[10px]' : 'text-text-tertiary/60'}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6">
          <ErrorDisplay message={error} onDismiss={() => setError(null)} onRetry={loadSubmissions} />
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-surface-secondary border border-surface-border">
              <div className="w-8 h-8 rounded-full skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 skeleton" />
                <div className="h-3 w-32 skeleton" />
              </div>
              <div className="h-3 w-12 skeleton" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && submissions.length === 0 && !error && <EmptyState />}

      {/* Filtered empty */}
      {!loading && submissions.length > 0 && filtered.length === 0 && (
        <div className="card text-center py-12 border-dashed">
          <svg className="w-8 h-8 text-text-tertiary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm text-text-secondary">No submissions match your filters.</p>
          <button
            onClick={() => { setSearch(''); setStatusFilter('all') }}
            className="mt-3 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <SubmissionList submissions={filtered} />
      )}
    </div>
  )
}
