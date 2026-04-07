const STATUS_CONFIG = {
  generating: {
    label: 'Generating',
    color: 'text-status-warning',
    bg: 'bg-status-warning-bg',
    border: 'border-status-warning/25',
    dot: 'bg-status-warning',
    pulse: true,
  },
  pending_review: {
    label: 'Ready for Review',
    color: 'text-status-info',
    bg: 'bg-status-info-bg',
    border: 'border-status-info/25',
    dot: 'bg-status-info',
    pulse: false,
  },
  processing: {
    label: 'Processing',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    dot: 'bg-orange-400',
    pulse: true,
  },
  draft_selected: {
    label: 'Draft Selected',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    dot: 'bg-violet-400',
    pulse: false,
  },
  published: {
    label: 'Published',
    color: 'text-status-success',
    bg: 'bg-status-success-bg',
    border: 'border-status-success/25',
    dot: 'bg-status-success',
    pulse: false,
  },
  scheduled: {
    label: 'Scheduled',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    dot: 'bg-purple-400',
    pulse: false,
  },
  error: {
    label: 'Error',
    color: 'text-status-error',
    bg: 'bg-status-error-bg',
    border: 'border-status-error/25',
    dot: 'bg-status-error',
    pulse: false,
  },
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    color: 'text-text-secondary',
    bg: 'bg-surface-elevated',
    border: 'border-surface-border',
    dot: 'bg-text-tertiary',
    pulse: false,
  }

  return (
    <span className={`badge border ${config.bg} ${config.color} ${config.border}`}>
      <span className="relative flex h-1.5 w-1.5">
        {config.pulse && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75 animate-ping`} />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dot}`} />
      </span>
      {config.label}
    </span>
  )
}
