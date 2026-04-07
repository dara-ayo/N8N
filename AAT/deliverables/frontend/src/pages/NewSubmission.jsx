import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitContent } from '../lib/api'
import { fetchAllSubmissionTitles } from '../lib/supabase'
import { useToast } from '../components/Toast'
import ErrorDisplay from '../components/ErrorDisplay'

const URL_REGEX = /^https?:\/\/.+/
const MAX_RAW_IDEA_LENGTH = 10000

const PROGRESS_STEPS = [
  { label: 'Extracting content...', time: 0 },
  { label: 'Analyzing key themes...', time: 8000 },
  { label: 'Generating Draft 1...', time: 18000 },
  { label: 'Generating Draft 2...', time: 28000 },
  { label: 'Generating Draft 3...', time: 38000 },
]

export default function NewSubmission() {
  const navigate = useNavigate()
  const toast = useToast()

  const [inputMode, setInputMode] = useState('idea')
  const [rawIdea, setRawIdea] = useState('')
  const [url, setUrl] = useState('')
  const [publishImmediately, setPublishImmediately] = useState(false)
  const [tone, setTone] = useState('Professional')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [progressStep, setProgressStep] = useState(0)
  const [progressPercent, setProgressPercent] = useState(0)
  const [duplicateWarning, setDuplicateWarning] = useState(null)
  const debounceTimerRef = useRef(null)

  // Progress step animation during submission
  useEffect(() => {
    if (!isSubmitting) {
      setProgressStep(0)
      setProgressPercent(0)
      return
    }
    const timers = []
    const percents = [10, 30, 55, 75, 90]
    PROGRESS_STEPS.forEach((step, i) => {
      if (i === 0) {
        setProgressStep(0)
        setProgressPercent(percents[0])
        return
      }
      timers.push(setTimeout(() => {
        setProgressStep(i)
        setProgressPercent(percents[i])
      }, step.time))
    })
    return () => timers.forEach(clearTimeout)
  }, [isSubmitting])

  // Debounced duplicate check when rawIdea changes
  useEffect(() => {
    if (inputMode !== 'idea' || rawIdea.trim().length < 20) {
      setDuplicateWarning(null)
      return
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const submissions = await fetchAllSubmissionTitles()
        const inputWords = rawIdea.toLowerCase().match(/\b\w{4,}\b/g) || []
        if (inputWords.length === 0) return
        for (const sub of submissions) {
          const existing = ((sub.raw_input || '') + ' ' + (sub.content_base || '')).toLowerCase()
          const matchCount = inputWords.filter((w) => existing.includes(w)).length
          if (matchCount >= 3) {
            const title = (sub.raw_input || sub.content_base || '').slice(0, 50)
            const daysAgo = Math.floor((Date.now() - new Date(sub.created_at).getTime()) / 86400000)
            const daysLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`
            setDuplicateWarning({ title, daysLabel, status: sub.status })
            return
          }
        }
        setDuplicateWarning(null)
      } catch {
        // silently ignore — duplicate check is non-blocking
      }
    }, 500)
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current) }
  }, [rawIdea, inputMode])

  function validate() {
    const errors = {}
    if (inputMode === 'idea') {
      if (!rawIdea.trim()) errors.rawIdea = 'Please enter your content idea.'
      if (rawIdea.length > MAX_RAW_IDEA_LENGTH) errors.rawIdea = `Must be ${MAX_RAW_IDEA_LENGTH.toLocaleString()} characters or fewer.`
    } else {
      if (!url.trim()) errors.url = 'Please enter a URL.'
      if (url.trim() && !URL_REGEX.test(url.trim())) errors.url = 'URL must start with http:// or https://'
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const result = await submitContent({
        rawIdea: inputMode === 'idea' ? rawIdea.trim() : undefined,
        url: inputMode === 'url' ? url.trim() : undefined,
        publishImmediately,
        tone,
      })
      const submissionId = result.submissionId || result.id || result.submission_id
      toast.success('Content submitted! Generating drafts...')
      if (submissionId) {
        navigate(`/submission/${submissionId}`)
      } else {
        navigate('/')
      }
    } catch (err) {
      if (err.status === 400) {
        setError(`Validation error: ${err.message}`)
      } else if (err.status === 409) {
        setError(`Duplicate submission: ${err.message}`)
      } else if (err.status >= 500) {
        setError(`Server error: ${err.message}. Please try again later.`)
      } else {
        setError(err.message || 'An unexpected error occurred.')
      }
      toast.error('Failed to submit content.')
    } finally {
      setIsSubmitting(false)
    }
  }, [inputMode, rawIdea, url, publishImmediately, tone, navigate, toast])

  // Cmd+Enter shortcut
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        const form = document.getElementById('submit-form')
        if (form) form.requestSubmit()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const ideaOverLimit = rawIdea.length > MAX_RAW_IDEA_LENGTH
  const modeIndex = inputMode === 'idea' ? 0 : 1

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-8 pb-6 border-b border-surface-border">
        <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Create</p>
        <h1 className="page-title">New Submission</h1>
        <p className="page-subtitle">
          Submit a content idea or URL to generate draft content across multiple angles.
        </p>
      </div>

      <div className="max-w-[640px] mx-auto">
        <div className="bg-surface-secondary border border-surface-border rounded-2xl p-8 shadow-surface-md">
          <form id="submit-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <ErrorDisplay message={error} onDismiss={() => setError(null)} />
            )}

            {/* Input Mode Toggle - Segmented Control */}
            <div>
              <label className="block text-[11px] font-medium text-text-tertiary mb-2 uppercase tracking-wider">Input Type</label>
              <div className="flex rounded-xl bg-surface-tertiary border border-surface-border p-1 gap-1 relative">
                {/* Animated indicator */}
                <div
                  className="absolute inset-y-1 rounded-lg bg-surface-elevated border border-surface-border shadow-surface transition-all duration-200 ease-out"
                  style={{ width: 'calc(50% - 4px)', left: `calc(${modeIndex * 50}% + 4px)` }}
                />
                <button
                  type="button"
                  onClick={() => { setInputMode('idea'); setValidationErrors({}) }}
                  className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 select-none z-10 ${
                    inputMode === 'idea' ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Raw Idea
                </button>
                <button
                  type="button"
                  onClick={() => { setInputMode('url'); setValidationErrors({}) }}
                  className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 select-none z-10 ${
                    inputMode === 'url' ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  URL
                </button>
              </div>
            </div>

            {/* Raw Idea Input */}
            {inputMode === 'idea' && (
              <div className="animate-fade-in">
                <label htmlFor="rawIdea" className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">
                  Content Idea
                </label>
                <p className="text-xs text-text-tertiary mb-3 leading-relaxed">
                  Describe your content idea, key points, or paste raw text to be transformed.
                </p>
                <textarea
                  id="rawIdea"
                  rows={8}
                  value={rawIdea}
                  onChange={(e) => {
                    setRawIdea(e.target.value)
                    if (validationErrors.rawIdea) setValidationErrors({})
                  }}
                  placeholder="e.g., Write about how AI is changing content marketing workflows. Include stats about efficiency gains, common tools being adopted, and predictions for 2025..."
                  className={`w-full px-4 py-3 bg-surface-tertiary text-text-primary text-sm leading-relaxed border border-surface-border rounded-xl placeholder:text-text-tertiary/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 resize-y min-h-[160px] transition-all duration-150 ${validationErrors.rawIdea ? 'border-status-error/50 focus:ring-status-error/20' : ''}`}
                />
                <div className="flex items-center justify-between mt-2">
                  {validationErrors.rawIdea ? (
                    <span className="text-xs text-status-error">{validationErrors.rawIdea}</span>
                  ) : <span />}
                  <span className={`text-xs font-mono ${ideaOverLimit ? 'text-status-error font-semibold' : rawIdea.length > MAX_RAW_IDEA_LENGTH * 0.9 ? 'text-status-warning font-medium' : 'text-text-tertiary/50'}`}>
                    {rawIdea.length.toLocaleString()} / {MAX_RAW_IDEA_LENGTH.toLocaleString()}
                  </span>
                </div>
                {duplicateWarning && (
                  <div className="mt-3 flex items-start gap-2 px-3.5 py-3 rounded-xl border bg-status-warning-bg border-status-warning/25 text-status-warning text-xs leading-relaxed">
                    <span className="flex-shrink-0 mt-px">&#9888;</span>
                    <span>
                      Similar content found: &ldquo;{duplicateWarning.title}&rdquo; was submitted {duplicateWarning.daysLabel} (status: {duplicateWarning.status}). Continue anyway?
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* URL Input */}
            {inputMode === 'url' && (
              <div className="animate-fade-in">
                <label htmlFor="url" className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">
                  Source URL
                </label>
                <p className="text-xs text-text-tertiary mb-3 leading-relaxed">
                  Paste a URL to an article, blog post, or resource. We'll extract the content and generate drafts.
                </p>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <input
                    id="url"
                    type="text"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value)
                      if (validationErrors.url) setValidationErrors({})
                    }}
                    placeholder="https://example.com/article"
                    className={`w-full h-11 pl-11 pr-4 bg-surface-tertiary text-text-primary text-sm border border-surface-border rounded-xl placeholder:text-text-tertiary/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-150 ${validationErrors.url ? 'border-status-error/50 focus:ring-status-error/20' : ''}`}
                  />
                  {url.trim() && URL_REGEX.test(url.trim()) && (
                    <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-status-success transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {url.trim() && !URL_REGEX.test(url.trim()) && (
                    <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-status-error transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                {validationErrors.url && (
                  <span className="text-xs text-status-error mt-1.5 block">{validationErrors.url}</span>
                )}
              </div>
            )}

            {/* Tone Selector */}
            <div>
              <label className="block text-[11px] font-medium text-text-tertiary mb-2 uppercase tracking-wider">Tone</label>
              <div className="flex flex-wrap gap-2">
                {['Professional', 'Casual', 'Bold', 'Educational', 'Storytelling'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`filter-pill ${tone === t ? 'filter-pill-active' : ''}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Publish Toggle */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-tertiary border border-surface-border">
              <button
                type="button"
                role="switch"
                aria-checked={publishImmediately}
                onClick={() => setPublishImmediately(!publishImmediately)}
                className={`relative mt-0.5 inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                  publishImmediately ? 'bg-accent' : 'bg-surface-border'
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${publishImmediately ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <div>
                <span className="text-sm font-medium text-text-primary">Publish immediately after adaptation</span>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Content will be published to all connected platforms right after the selected draft is adapted.
                </p>
              </div>
            </div>

            {/* Submit Button - Gradient CTA */}
            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={isSubmitting} className="btn-gradient w-full h-12">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating Drafts...
                  </>
                ) : (
                  <>
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Drafts
                  </>
                )}
              </button>
            </div>
            <div className="flex justify-center">
              <button type="button" onClick={() => navigate('/')} className="text-sm text-text-tertiary hover:text-text-secondary transition-colors">
                Cancel
              </button>
            </div>

            {/* Progress Steps */}
            {isSubmitting && (
              <div className="mt-6 animate-fade-in">
                <div className="h-0.5 bg-surface-border rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="space-y-2">
                  {PROGRESS_STEPS.map((step, i) => {
                    const isDone = i < progressStep
                    const isActive = i === progressStep
                    return (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                          {isDone ? (
                            <svg className="w-4 h-4 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isActive ? (
                            <div className="w-4 h-4 rounded-full border-2 border-surface-border border-t-accent animate-spin" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-surface-border" />
                          )}
                        </div>
                        <span className={isDone ? 'text-text-tertiary line-through' : isActive ? 'text-text-primary' : 'text-text-tertiary/40'}>
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
