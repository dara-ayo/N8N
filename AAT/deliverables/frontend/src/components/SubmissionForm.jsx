import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitContent } from '../lib/api'
import ErrorDisplay from './ErrorDisplay'

const URL_REGEX = /^https?:\/\/.+/
const MAX_RAW_IDEA_LENGTH = 10000
const PAYLOAD_WARNING_BYTES = 900000

function estimatePayloadSize(rawIdea, url) {
  const payload = JSON.stringify({ rawIdea, url, publishImmediately: false })
  return new Blob([payload]).size
}

export default function SubmissionForm() {
  const navigate = useNavigate()

  const [rawIdea, setRawIdea] = useState('')
  const [url, setUrl] = useState('')
  const [publishImmediately, setPublishImmediately] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})

  function validate() {
    const errors = {}
    const hasRawIdea = rawIdea.trim().length > 0
    const hasUrl = url.trim().length > 0
    if (!hasRawIdea && !hasUrl) errors.general = 'Please provide at least a raw idea or a URL.'
    if (hasUrl && !URL_REGEX.test(url.trim())) errors.url = 'URL must start with http:// or https://'
    if (rawIdea.length > MAX_RAW_IDEA_LENGTH) errors.rawIdea = `Raw idea must be ${MAX_RAW_IDEA_LENGTH.toLocaleString()} characters or fewer.`
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const result = await submitContent({
        rawIdea: rawIdea.trim() || undefined,
        url: url.trim() || undefined,
        publishImmediately,
      })
      const submissionId = result.submissionId || result.id || result.submission_id
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
    } finally {
      setIsSubmitting(false)
    }
  }

  const payloadSize = estimatePayloadSize(rawIdea, url)
  const showPayloadWarning = payloadSize > PAYLOAD_WARNING_BYTES
  const ideaOverLimit = rawIdea.length > MAX_RAW_IDEA_LENGTH

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <ErrorDisplay message={error} onDismiss={() => setError(null)} />
      )}

      {validationErrors.general && (
        <div className="alert-error rounded-xl text-sm py-2.5">
          {validationErrors.general}
        </div>
      )}

      {/* Raw Idea */}
      <div>
        <label htmlFor="rawIdea" className="block text-xs font-medium text-text-secondary mb-1.5">
          Raw Idea
        </label>
        <p className="text-xs text-text-tertiary mb-2">
          Describe your content idea, key points, or paste raw text.
        </p>
        <textarea
          id="rawIdea"
          rows={6}
          value={rawIdea}
          onChange={(e) => {
            setRawIdea(e.target.value)
            if (validationErrors.rawIdea || validationErrors.general) setValidationErrors({})
          }}
          placeholder="e.g., Write about how AI is changing content marketing workflows..."
          className={`input-field resize-y ${validationErrors.rawIdea ? 'border-status-error/50 focus:ring-status-error/40' : ''}`}
        />
        <div className="flex items-center justify-between mt-1.5">
          {validationErrors.rawIdea ? (
            <span className="text-xs text-status-error">{validationErrors.rawIdea}</span>
          ) : <span />}
          <span className={`text-xs ${ideaOverLimit ? 'text-status-error font-semibold' : rawIdea.length > MAX_RAW_IDEA_LENGTH * 0.9 ? 'text-status-warning' : 'text-text-tertiary'}`}>
            {rawIdea.length.toLocaleString()} / {MAX_RAW_IDEA_LENGTH.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-surface-border" />
        <span className="text-xs text-text-tertiary font-medium px-1">OR</span>
        <div className="flex-1 border-t border-surface-border" />
      </div>

      {/* URL */}
      <div>
        <label htmlFor="url" className="block text-xs font-medium text-text-secondary mb-1.5">
          Source URL
        </label>
        <p className="text-xs text-text-tertiary mb-2">
          Provide a URL to an article or resource to generate content from.
        </p>
        <input
          id="url"
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            if (validationErrors.url || validationErrors.general) setValidationErrors({})
          }}
          placeholder="https://example.com/article"
          className={`input-field ${validationErrors.url ? 'border-status-error/50 focus:ring-status-error/40' : ''}`}
        />
        {validationErrors.url && (
          <span className="text-xs text-status-error mt-1 block">{validationErrors.url}</span>
        )}
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
            Content will be published to all platforms right after the selected draft is adapted.
          </p>
        </div>
      </div>

      {/* Payload Warning */}
      {showPayloadWarning && (
        <div className="alert-warning rounded-xl text-sm py-2.5">
          Submission approaching 1MB limit ({(payloadSize / 1024).toFixed(0)}KB). Consider shortening.
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting...
            </>
          ) : (
            'Submit Content'
          )}
        </button>
        <button type="button" onClick={() => navigate('/')} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  )
}
