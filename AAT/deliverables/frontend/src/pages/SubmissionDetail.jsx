import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchSubmission, fetchDrafts, fetchAdaptedContent, updateAdaptedContentBySubmission } from '../lib/supabase'
import { selectDraft, publishContent } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { hasMinRole } from '../lib/auth'
import { useToast } from '../components/Toast'
import RoleGate from '../components/RoleGate'
import StatusBadge from '../components/StatusBadge'
import DraftReader from '../components/DraftReader'
import ErrorDisplay from '../components/ErrorDisplay'
import { GeneratingState } from '../components/EmptyState'


const POLL_STATUSES = ['generating', 'processing']
const INITIAL_POLL_INTERVAL = 5000
const MAX_POLL_INTERVAL = 30000
const BACKOFF_MULTIPLIER = 1.5
const ADAPTED_CONTENT_STATUSES = ['processing', 'scheduled', 'published']

function wordCount(text) {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

function charCountClass(count, limit) {
  if (count >= limit) return 'text-status-error font-semibold'
  if (count >= limit * 0.9) return 'text-status-warning font-medium'
  return 'text-text-tertiary'
}

const PLATFORM_TABS = [
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    activeIconColor: 'text-status-info',
  },
  {
    key: 'twitter',
    label: 'X / Twitter',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    activeIconColor: 'text-text-primary',
  },
  {
    key: 'newsletter',
    label: 'Newsletter',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    activeIconColor: 'text-status-success',
  },
]

export default function SubmissionDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const toast = useToast()

  const [submission, setSubmission] = useState(null)
  const [drafts, setDrafts] = useState([])
  const [adaptedContent, setAdaptedContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectingDraftIdx, setSelectingDraftIdx] = useState(null)
  const [selectError, setSelectError] = useState(null)

  const [editLinkedin, setEditLinkedin] = useState('')
  const [editTwitter, setEditTwitter] = useState('')
  const [editNewsletterSubject, setEditNewsletterSubject] = useState('')
  const [editNewsletterContent, setEditNewsletterContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const [activeTab, setActiveTab] = useState('linkedin')

  const [publishPlatforms, setPublishPlatforms] = useState({ linkedin: true, twitter: true, newsletter: true })
  const [scheduleDate, setScheduleDate] = useState('')
  const [publishing, setPublishing] = useState(false)

  const pollIntervalRef = useRef(INITIAL_POLL_INTERVAL)
  const pollTimerRef = useRef(null)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const sub = await fetchSubmission(id)
      setSubmission(sub)

      if (sub.drafts && Array.isArray(sub.drafts) && sub.drafts.length > 0) {
        setDrafts(sub.drafts)
      } else if (['pending_review', 'processing', 'published', 'scheduled'].includes(sub.status)) {
        const draftData = await fetchDrafts(id)
        setDrafts(draftData || [])
      }

      if (ADAPTED_CONTENT_STATUSES.includes(sub.status) || sub.selected_draft) {
        const adapted = await fetchAdaptedContent(id)
        if (adapted && adapted.length > 0) {
          const item = adapted[0]
          setAdaptedContent(item)
          setEditLinkedin(item.linkedin_content || '')
          setEditTwitter(item.twitter_content || '')
          setEditNewsletterSubject(item.newsletter_subject || '')
          setEditNewsletterContent(item.newsletter_content || '')
          setHasUnsavedChanges(false)
        }
      }
      return sub
    } catch (err) {
      setError(err.message || 'Failed to load submission details.')
      return null
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    function schedulePoll() {
      pollTimerRef.current = setTimeout(async () => {
        const sub = await loadData()
        if (sub && POLL_STATUSES.includes(sub.status)) {
          pollIntervalRef.current = Math.min(pollIntervalRef.current * BACKOFF_MULTIPLIER, MAX_POLL_INTERVAL)
          schedulePoll()
        }
      }, pollIntervalRef.current)
    }
    if (submission && POLL_STATUSES.includes(submission.status)) {
      pollIntervalRef.current = INITIAL_POLL_INTERVAL
      schedulePoll()
    }
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current) }
  }, [submission?.status, loadData])

  useEffect(() => {
    if (!adaptedContent) return
    const changed =
      editLinkedin !== (adaptedContent.linkedin_content || '') ||
      editTwitter !== (adaptedContent.twitter_content || '') ||
      editNewsletterSubject !== (adaptedContent.newsletter_subject || '') ||
      editNewsletterContent !== (adaptedContent.newsletter_content || '')
    setHasUnsavedChanges(changed)
  }, [editLinkedin, editTwitter, editNewsletterSubject, editNewsletterContent, adaptedContent])

  // Cmd+S shortcut
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && adaptedContent && hasUnsavedChanges) {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [adaptedContent, hasUnsavedChanges, editLinkedin, editTwitter, editNewsletterSubject, editNewsletterContent])

  async function handleSelectDraft(draft, index) {
    setSelectError(null)
    setSelectingDraftIdx(index)
    try {
      await selectDraft({
        submissionId: id,
        selectedDraft: index + 1,
        publishImmediately: submission.publish_immediately ?? false,
      })
      toast.success('Draft selected! Adapting content for platforms...')
      await loadData()
    } catch (err) {
      setSelectError(err.message || 'Failed to select draft.')
      toast.error('Failed to select draft.')
    } finally {
      setSelectingDraftIdx(null)
    }
  }

  async function handleSave() {
    if (!adaptedContent) return
    setSaving(true)
    try {
      await updateAdaptedContentBySubmission(id, {
        linkedin_content: editLinkedin,
        twitter_content: editTwitter,
        twitter_char_count: editTwitter.length,
        newsletter_subject: editNewsletterSubject,
        newsletter_content: editNewsletterContent,
        newsletter_word_count: wordCount(editNewsletterContent),
      })
      setAdaptedContent((prev) => ({
        ...prev,
        linkedin_content: editLinkedin,
        twitter_content: editTwitter,
        twitter_char_count: editTwitter.length,
        newsletter_subject: editNewsletterSubject,
        newsletter_content: editNewsletterContent,
        newsletter_word_count: wordCount(editNewsletterContent),
      }))
      setHasUnsavedChanges(false)
      toast.success('Changes saved successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    const platforms = Object.entries(publishPlatforms)
      .filter(([, checked]) => checked)
      .map(([platform]) => platform)
    if (platforms.length === 0) {
      toast.error('Select at least one platform.')
      return
    }
    setPublishing(true)
    try {
      // If a schedule date is set, save it to adapted_content
      if (scheduleDate) {
        await updateAdaptedContentBySubmission(id, { scheduled_for: scheduleDate })
        toast.success(`Scheduled for ${new Date(scheduleDate).toLocaleString()}`)
      } else {
        await publishContent({ submissionId: id, platforms })
        const isRepublish = submission.status === 'published'
        toast.success(isRepublish ? `Republishing to ${platforms.join(', ')} started!` : 'Publishing to all platforms started!')
      }
      const poll = setInterval(async () => {
        const sub = await loadData()
        if (sub && (sub.status === 'published' || sub.status === 'scheduled')) {
          clearInterval(poll)
        }
      }, 3000)
      setTimeout(() => clearInterval(poll), 60000)
    } catch (err) {
      toast.error(`${submission.status === 'published' ? 'Republish' : 'Publish'} failed: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-4 w-32 skeleton mb-4" />
        <div className="card">
          <div className="h-6 w-48 skeleton mb-3" />
          <div className="h-4 w-32 skeleton mb-2" />
          <div className="h-4 w-64 skeleton" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-secondary border border-surface-border rounded-2xl p-5">
              <div className="h-5 w-20 skeleton mb-3" />
              <div className="h-4 w-full skeleton mb-2" />
              <div className="h-4 w-3/4 skeleton mb-2" />
              <div className="h-4 w-1/2 skeleton" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && !submission) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <ErrorDisplay message={error} onRetry={loadData} />
      </div>
    )
  }

  if (!submission) return null

  const inputType = submission.input_type === 'url' ? 'URL' : 'Raw Idea'
  const inputContent = submission.raw_input || submission.content_base || ''
  const canEdit = hasMinRole(profile?.role, 'editor')
  const canPublish = hasMinRole(profile?.role, 'admin')
  const showAdaptedContent = adaptedContent && (
    submission.status === 'scheduled' ||
    submission.status === 'published' ||
    submission.status === 'processing' ||
    submission.selected_draft
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back nav + breadcrumb */}
      <div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Submission Info Card */}
      <div className="bg-surface-secondary border border-surface-border rounded-2xl p-6 shadow-surface">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[15px] font-semibold text-text-primary mb-2">Submission Details</h1>
            <StatusBadge status={submission.status} />
          </div>
          <span className="font-mono text-xs bg-surface-tertiary px-2.5 py-1 rounded-lg border border-surface-border text-text-tertiary">
            #{submission.id?.slice(0, 8)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-surface-border">
          <div>
            <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Input Type</p>
            <p className="text-sm font-medium text-text-primary">{inputType}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Created</p>
            <p className="text-sm font-medium text-text-primary">
              {submission.created_at ? new Date(submission.created_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
          {submission.updated_at && (
            <div>
              <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Updated</p>
              <p className="text-sm font-medium text-text-primary">
                {new Date(submission.updated_at).toLocaleDateString()}
              </p>
            </div>
          )}
          {submission.selected_draft && (
            <div>
              <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Selected Draft</p>
              <p className="text-sm font-medium text-text-primary">Draft #{submission.selected_draft}</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-surface-border">
          <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2">Input Content</p>
          <div className="bg-surface-tertiary border border-surface-border rounded-xl px-4 py-3.5 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-44 overflow-y-auto font-mono text-[13px]">
            {inputContent || 'No input content recorded.'}
          </div>
        </div>
      </div>

      {/* Errors */}
      {error && <ErrorDisplay message={error} onDismiss={() => setError(null)} />}
      {selectError && <ErrorDisplay message={selectError} onDismiss={() => setSelectError(null)} />}

      {/* Generating */}
      {submission.status === 'generating' && <GeneratingState />}

      {/* Draft Selection - Full Width Reader */}
      {submission.status === 'pending_review' && canEdit && (
        <DraftReader
          drafts={drafts}
          onSelect={(draft, index) => handleSelectDraft(draft, index)}
          selectingDraftIdx={selectingDraftIdx}
        />
      )}

      {/* Processing */}
      {submission.status === 'processing' && !adaptedContent && (
        <div className="card text-center py-16">
          <div className="mx-auto mb-5 w-12 h-12 relative">
            <div className="absolute inset-0 rounded-full border-2 border-surface-border" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-2">Adapting Content</h3>
          <p className="text-sm text-text-secondary max-w-sm mx-auto">
            Optimizing for LinkedIn, X/Twitter, and Newsletter. Usually 15-30 seconds.
          </p>
        </div>
      )}

      {/* Adapted Content - Tab Layout */}
      {showAdaptedContent && (
        <div className="space-y-0">
          <div className="flex items-center justify-between mb-0">
            <h2 className="section-title">Adapted Content</h2>
            {hasUnsavedChanges && (
              <span className="badge border bg-status-warning-bg text-status-warning border-status-warning/25">
                Unsaved changes
              </span>
            )}
          </div>

          {/* Tab Bar */}
          <div className="flex items-center gap-1 border-b border-surface-border mt-3 mb-6">
            {PLATFORM_TABS.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 -mb-px transition-all duration-150 ${
                    isActive
                      ? `text-text-primary border-accent`
                      : 'text-text-tertiary border-transparent hover:text-text-secondary hover:border-surface-border'
                  }`}
                >
                  <span className={isActive ? tab.activeIconColor : ''}>{tab.icon}</span>
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Panels */}
          <div className="animate-fade-in" key={activeTab}>
            {/* LinkedIn Tab */}
            {activeTab === 'linkedin' && (
              <div>
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="text-text-tertiary">LinkedIn Post</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono ${charCountClass(editLinkedin.length, 3000)}`}>
                      {editLinkedin.length} / 3,000
                    </span>
                    <span className="text-text-tertiary font-mono">{wordCount(editLinkedin)} words</span>
                  </div>
                </div>
                {canEdit ? (
                  <textarea
                    value={editLinkedin}
                    onChange={(e) => setEditLinkedin(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-tertiary border border-surface-border rounded-xl text-sm text-text-secondary leading-relaxed resize-y min-h-[180px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-150"
                    rows={8}
                  />
                ) : (
                  <div className="bg-surface-tertiary rounded-xl p-4 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap border border-surface-border">
                    {adaptedContent.linkedin_content || 'No content'}
                  </div>
                )}
              </div>
            )}

            {/* X / Twitter Tab */}
            {activeTab === 'twitter' && (
              <div>
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="text-text-tertiary">X / Twitter Post</span>
                  <span className={`font-mono ${charCountClass(editTwitter.length, 280)}`}>
                    {editTwitter.length} / 280
                    {editTwitter.length > 280 && ' (over limit)'}
                  </span>
                </div>
                {canEdit ? (
                  <textarea
                    value={editTwitter}
                    onChange={(e) => setEditTwitter(e.target.value)}
                    className={`w-full px-4 py-3 bg-surface-tertiary border rounded-xl text-sm text-text-secondary leading-relaxed resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-150 ${editTwitter.length > 280 ? 'border-status-error/50' : 'border-surface-border'}`}
                    rows={4}
                  />
                ) : (
                  <div className="bg-surface-tertiary rounded-xl p-4 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap border border-surface-border">
                    {adaptedContent.twitter_content || 'No content'}
                  </div>
                )}
              </div>
            )}

            {/* Newsletter Tab */}
            {activeTab === 'newsletter' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Subject Line</p>
                  {canEdit ? (
                    <input
                      type="text"
                      value={editNewsletterSubject}
                      onChange={(e) => setEditNewsletterSubject(e.target.value)}
                      className="input-field text-sm"
                      placeholder="Newsletter subject..."
                    />
                  ) : (
                    <p className="text-sm font-medium text-text-primary bg-surface-tertiary rounded-xl px-4 py-2.5 border border-surface-border">
                      {adaptedContent.newsletter_subject || 'No subject'}
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Content</p>
                    <span className="text-xs font-mono text-text-tertiary">{wordCount(canEdit ? editNewsletterContent : adaptedContent.newsletter_content)} words</span>
                  </div>
                  {canEdit ? (
                    <textarea
                      value={editNewsletterContent}
                      onChange={(e) => setEditNewsletterContent(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-tertiary border border-surface-border rounded-xl text-sm text-text-secondary leading-relaxed resize-y min-h-[240px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-150"
                      rows={10}
                    />
                  ) : (
                    <div className="bg-surface-tertiary rounded-xl p-4 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap border border-surface-border">
                      {adaptedContent.newsletter_content || 'No content'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>


          {/* Save Row */}
          <div className="flex items-center justify-between pt-5 mt-5 border-t border-surface-border">
            <div className="flex items-center gap-3">
              {canEdit && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || saving}
                    className="btn-primary"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  {hasUnsavedChanges && (
                    <button
                      onClick={() => {
                        setEditLinkedin(adaptedContent.linkedin_content || '')
                        setEditTwitter(adaptedContent.twitter_content || '')
                        setEditNewsletterSubject(adaptedContent.newsletter_subject || '')
                        setEditNewsletterContent(adaptedContent.newsletter_content || '')
                      }}
                      className="btn-ghost text-sm"
                    >
                      Discard
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Unified Publish / Schedule Section */}
          {canPublish && (
            <RoleGate minRole="admin">
              <div className={`card mt-4 ${submission.status === 'published' ? 'border-status-success/25 bg-status-success-bg' : 'border-accent-border bg-accent-muted/20'}`}>
                {/* Header */}
                {submission.status === 'published' ? (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-status-success/15 border border-status-success/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-status-success">Published</h3>
                      {adaptedContent?.published_at && (
                        <p className="text-xs text-status-success/80 mt-0.5">
                          Last published: {new Date(adaptedContent.published_at).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-accent-muted border border-accent-border flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary">Publish</h3>
                  </div>
                )}

                {/* Scheduled info */}
                {adaptedContent?.scheduled_for && submission.status !== 'published' && (
                  <div className="mb-4 bg-accent-muted/30 border border-accent-border rounded-xl px-4 py-2.5 text-sm text-text-secondary">
                    Scheduled for: {new Date(adaptedContent.scheduled_for).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
                  </div>
                )}

                {/* Platform checkboxes */}
                <div className="flex flex-wrap gap-4 mb-4">
                  {[
                    { key: 'linkedin', label: 'LinkedIn' },
                    { key: 'twitter', label: 'X / Twitter' },
                    { key: 'newsletter', label: 'Newsletter' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={publishPlatforms[key]}
                        onChange={(e) => setPublishPlatforms((prev) => ({ ...prev, [key]: e.target.checked }))}
                        className="w-4 h-4 rounded border border-surface-border bg-surface-tertiary accent-accent cursor-pointer"
                      />
                      <span className="text-sm text-text-secondary">{label}</span>
                    </label>
                  ))}
                </div>

                {/* Schedule date/time picker */}
                {submission.status !== 'published' && (
                  <div className="mb-4">
                    <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5 block">
                      Schedule for (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="input-field text-sm max-w-xs"
                    />
                  </div>
                )}

                {/* Unsaved warning */}
                {hasUnsavedChanges && (
                  <div className="mb-3 alert-warning rounded-xl text-xs py-2">
                    You have unsaved changes. Save them before publishing.
                  </div>
                )}

                {/* Action button */}
                <button
                  onClick={handlePublish}
                  disabled={publishing || hasUnsavedChanges || !Object.values(publishPlatforms).some(Boolean)}
                  className="btn-gradient"
                >
                  {publishing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {submission.status === 'published' ? 'Republishing...' : scheduleDate ? 'Scheduling...' : 'Publishing...'}
                    </>
                  ) : submission.status === 'published' ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Republish Selected
                    </>
                  ) : scheduleDate ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Schedule
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Publish Now
                    </>
                  )}
                </button>
              </div>
            </RoleGate>
          )}
        </div>
      )}

      {/* Error status */}
      {submission.status === 'error' && (
        <div className="card border-status-error/25 bg-status-error-bg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-status-error/15 border border-status-error/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-status-error mb-1">Processing Error</h3>
              <p className="text-sm text-status-error/80 mb-3">
                {submission.error_details || 'Something went wrong while processing your submission.'}
              </p>
              <Link to="/submit" className="btn-primary text-xs px-3 py-1.5">
                Create New Submission
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
