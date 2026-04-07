import { useState, useEffect, useMemo } from 'react'
import { updateAdaptedContent } from '../lib/supabase'

function charCountClass(count, limit) {
  if (count >= limit) return 'text-status-error font-semibold'
  if (count >= limit * 0.9) return 'text-status-warning font-medium'
  return 'text-text-tertiary'
}

function wordCount(text) {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

const PLATFORM_ICONS = {
  LinkedIn: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  'X / Twitter': (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  Newsletter: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
}

function PlatformSection({ title, children, editable }) {
  const icon = PLATFORM_ICONS[title]
  return (
    <div className={`card ${editable ? 'border-accent-border bg-accent-muted/10' : ''}`}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${editable ? 'bg-accent text-white' : 'bg-surface-elevated text-text-secondary border border-surface-border'}`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {editable && (
          <span className="ml-auto text-xs text-accent font-medium px-2 py-0.5 bg-accent-muted rounded-full border border-accent-border">
            Editable
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function ContentBlock({ label, content, charLimit, showWordCount }) {
  const chars = (content || '').length
  const words = wordCount(content)
  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{label}</p>}
      <div className="bg-surface-tertiary rounded-xl p-4 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap border border-surface-border">
        {content || 'No content available'}
      </div>
      <div className="flex items-center gap-3 text-xs">
        {charLimit && (
          <span className={charCountClass(chars, charLimit)}>
            {chars} / {charLimit} chars{chars >= charLimit && ' (truncated)'}
          </span>
        )}
        {showWordCount && <span className="text-text-tertiary">{words} words</span>}
      </div>
    </div>
  )
}

function EditableContentBlock({ label, value, onChange, charLimit, showWordCount, isTextarea = true }) {
  const chars = (value || '').length
  const words = wordCount(value)
  const overLimit = charLimit && chars > charLimit
  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{label}</p>}
      {isTextarea ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`input-field resize-y min-h-[120px] text-sm leading-relaxed ${overLimit ? 'border-status-error/50 focus:ring-status-error/40' : ''}`}
          rows={6}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="input-field text-sm"
        />
      )}
      <div className="flex items-center gap-3 text-xs">
        {charLimit && (
          <span className={charCountClass(chars, charLimit)}>
            {chars} / {charLimit} chars{overLimit && ' (over limit)'}
          </span>
        )}
        {showWordCount && <span className="text-text-tertiary">{words} words</span>}
      </div>
    </div>
  )
}

function MetaInfo({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2 text-xs text-text-tertiary">
      <span className="font-medium">{label}:</span>
      {value.startsWith('http') ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate max-w-xs">
          {value}
        </a>
      ) : (
        <span>{value}</span>
      )}
    </div>
  )
}

export default function AdaptedContentView({ adaptedContent, editable = false, submissionId, onSave }) {
  const item = adaptedContent && adaptedContent.length > 0 ? adaptedContent[0] : null

  const [linkedinContent, setLinkedinContent] = useState('')
  const [twitterContent, setTwitterContent] = useState('')
  const [newsletterSubject, setNewsletterSubject] = useState('')
  const [newsletterContent, setNewsletterContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (item) {
      setLinkedinContent(item.linkedin_content || '')
      setTwitterContent(item.twitter_content || '')
      setNewsletterSubject(item.newsletter_subject || '')
      setNewsletterContent(item.newsletter_content || '')
    }
  }, [item])

  const hasChanges = useMemo(() => {
    if (!item) return false
    return (
      linkedinContent !== (item.linkedin_content || '') ||
      twitterContent !== (item.twitter_content || '') ||
      newsletterSubject !== (item.newsletter_subject || '') ||
      newsletterContent !== (item.newsletter_content || '')
    )
  }, [item, linkedinContent, twitterContent, newsletterSubject, newsletterContent])

  useEffect(() => { if (hasChanges) setSaveSuccess(false) }, [hasChanges])

  async function handleSave() {
    if (!item?.id) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await updateAdaptedContent(item.id, {
        linkedin_content: linkedinContent,
        twitter_content: twitterContent,
        twitter_char_count: twitterContent.length,
        newsletter_subject: newsletterSubject,
        newsletter_content: newsletterContent,
      })
      setSaveSuccess(true)
      if (onSave) onSave()
    } catch (err) {
      setSaveError(err.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  if (!adaptedContent || adaptedContent.length === 0) {
    return (
      <div className="card text-center py-10 text-text-secondary text-sm border-dashed">
        No adapted content available yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="section-title">Adapted Content</h2>

      {(item.linkedin_content || editable) && (
        <PlatformSection title="LinkedIn" editable={editable}>
          {editable ? (
            <EditableContentBlock value={linkedinContent} onChange={setLinkedinContent} charLimit={3000} />
          ) : (
            <ContentBlock content={item.linkedin_content} charLimit={3000} />
          )}
          <div className="mt-3">
            <MetaInfo label="Published at" value={item.published_at ? new Date(item.published_at).toLocaleString() : null} />
          </div>
        </PlatformSection>
      )}

      {(item.twitter_content || editable) && (
        <PlatformSection title="X / Twitter" editable={editable}>
          {editable ? (
            <EditableContentBlock value={twitterContent} onChange={setTwitterContent} charLimit={280} />
          ) : (
            <>
              <ContentBlock content={item.twitter_content} charLimit={280} />
              <div className="mt-3">
                <MetaInfo label="Character count" value={item.twitter_char_count ? String(item.twitter_char_count) : null} />
              </div>
            </>
          )}
          <div className="mt-3">
            <MetaInfo label="Published at" value={item.published_at ? new Date(item.published_at).toLocaleString() : null} />
          </div>
        </PlatformSection>
      )}

      {(item.newsletter_content || editable) && (
        <PlatformSection title="Newsletter" editable={editable}>
          {editable ? (
            <>
              <div className="mb-3">
                <EditableContentBlock label="Subject Line" value={newsletterSubject} onChange={setNewsletterSubject} isTextarea={false} />
              </div>
              <EditableContentBlock label="Content" value={newsletterContent} onChange={setNewsletterContent} showWordCount />
            </>
          ) : (
            <>
              {item.newsletter_subject && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Subject Line</p>
                  <p className="text-sm font-medium text-text-primary bg-surface-tertiary rounded-xl px-4 py-2.5 border border-surface-border">
                    {item.newsletter_subject}
                  </p>
                </div>
              )}
              <ContentBlock content={item.newsletter_content} showWordCount />
            </>
          )}
          <div className="mt-3">
            <MetaInfo label="Sent at" value={item.published_at ? new Date(item.published_at).toLocaleString() : null} />
          </div>
        </PlatformSection>
      )}

      {/* Save controls */}
      {editable && (
        <div className="card border-surface-border">
          {saveError && <div className="mb-3 alert-error rounded-xl text-sm py-2.5">{saveError}</div>}
          {saveSuccess && !hasChanges && (
            <div className="mb-3 alert-success rounded-xl text-sm py-2.5">Changes saved successfully.</div>
          )}
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={!hasChanges || saving} className="btn-primary">
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
            {hasChanges && <span className="text-sm text-status-warning font-medium">Unsaved changes</span>}
          </div>
        </div>
      )}
    </div>
  )
}
