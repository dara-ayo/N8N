import { useNavigate } from 'react-router-dom'
import StatusBadge from './StatusBadge'

function timeAgo(dateString) {
  if (!dateString) return ''
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now - date) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function previewText(submission) {
  const raw = submission.raw_input || submission.content_base || ''
  if (raw) return raw.length > 140 ? raw.slice(0, 140) + '...' : raw
  return 'No content preview'
}

function InputTypeIcon({ type }) {
  if (type === 'url') {
    return (
      <div className="w-8 h-8 rounded-full bg-status-info-bg border border-status-info/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-status-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </div>
  )
}

export default function SubmissionList({ submissions }) {
  const navigate = useNavigate()

  return (
    <div className="space-y-2">
      {submissions.map((submission) => (
        <button
          key={submission.id}
          onClick={() => navigate(`/submission/${submission.id}`)}
          className="group relative flex items-center gap-4 p-4 rounded-xl w-full text-left
                     bg-surface-secondary border border-surface-border
                     hover:border-accent/20 hover:bg-surface-elevated
                     hover:-translate-y-[1px] hover:shadow-card-hover
                     active:translate-y-0
                     transition-all duration-200 cursor-pointer"
        >
          <InputTypeIcon type={submission.input_type} />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary leading-snug line-clamp-1 mb-1">
              {previewText(submission)}
            </p>
            <div className="flex items-center gap-3 text-xs text-text-tertiary">
              <StatusBadge status={submission.status} />
              <span>{timeAgo(submission.created_at)}</span>
              {submission.selected_draft && (
                <span>Draft #{submission.selected_draft}</span>
              )}
            </div>
          </div>

          <svg
            className="w-4 h-4 text-text-tertiary/40 group-hover:text-text-tertiary transition-colors flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ))}
    </div>
  )
}
