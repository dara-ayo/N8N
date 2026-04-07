import { Link } from 'react-router-dom'

export default function EmptyState({
  title = 'No submissions yet',
  description = 'Create your first content submission to get started.',
  actionLabel = 'New Submission',
  actionTo = '/submit',
  showAction = true,
}) {
  return (
    <div className="card text-center py-20 px-6 border-dashed">
      <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-accent-muted border border-accent-border flex items-center justify-center">
        <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-xs mx-auto mb-8">{description}</p>
      {showAction && (
        <Link to={actionTo} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

export function GeneratingState() {
  const hints = [
    'Analyzing your input...',
    'Researching angles and perspectives...',
    'Crafting three unique drafts...',
    'Almost there...',
  ]

  return (
    <div className="card text-center py-20 px-6">
      <div className="mx-auto mb-6 w-14 h-14 relative">
        <div className="absolute inset-0 rounded-full border-2 border-surface-border" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
        <div className="absolute inset-2 rounded-full bg-accent-muted flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-2">Generating Your Content</h3>
      <p className="text-sm text-text-secondary max-w-sm mx-auto mb-8">
        Our AI is crafting three unique draft angles. This usually takes 30–60 seconds.
      </p>
      <div className="flex flex-col items-center gap-2">
        {hints.map((hint, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs text-text-tertiary"
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            <div className="w-1 h-1 rounded-full bg-accent/50 animate-pulse" />
            {hint}
          </div>
        ))}
      </div>
    </div>
  )
}
