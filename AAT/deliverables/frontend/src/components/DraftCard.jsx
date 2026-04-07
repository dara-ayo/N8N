import { useState } from 'react'

const ANGLE_CONFIG = {
  Contrarian: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/15' },
  'How-To': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15' },
  'Data & Trends': { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/15' },
  'Thought Leadership': { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/15' },
  'Case Study': { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/15' },
  'Listicle': { color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/15' },
}

function wordCount(text) {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function DraftCard({ draft, index, canSelect, onSelect, isSelecting }) {
  const [expanded, setExpanded] = useState(false)

  const angle = draft.angle || `Draft ${index + 1}`
  const title = draft.title || 'Untitled Draft'
  const content = draft.content || ''
  const words = wordCount(content)
  const isLong = content.length > 300

  const angleStyle = ANGLE_CONFIG[angle] || {
    color: 'text-text-secondary',
    bg: 'bg-surface-elevated',
    border: 'border-surface-border',
  }

  return (
    <div className="relative flex flex-col bg-surface-secondary border border-surface-border rounded-2xl p-5 transition-all duration-200 hover:border-accent/25 hover:-translate-y-[2px] hover:shadow-card-hover group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-surface-tertiary border border-surface-border flex items-center justify-center text-[10px] font-semibold text-text-tertiary font-mono">
            {index + 1}
          </div>
          <span className={`badge border text-[11px] px-2 py-0.5 ${angleStyle.bg} ${angleStyle.color} ${angleStyle.border}`}>
            {angle}
          </span>
        </div>
        <span className="text-xs text-text-tertiary whitespace-nowrap font-mono">{words} words</span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-text-primary leading-snug mb-3">{title}</h3>

      {/* Content */}
      <div className="text-xs text-text-tertiary leading-relaxed flex-1">
        {expanded || !isLong ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <p className="whitespace-pre-wrap line-clamp-4">{content}</p>
        )}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-accent hover:text-accent-hover font-medium mt-2 transition-colors"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Action */}
      {canSelect && (
        <div className="border-t border-surface-border mt-4 pt-4">
          <button
            onClick={onSelect}
            disabled={isSelecting}
            className={`w-full h-9 flex items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-all duration-150 ${
              isSelecting
                ? 'bg-surface-tertiary border border-surface-border text-text-secondary'
                : 'bg-surface-tertiary border border-surface-border text-text-secondary hover:bg-accent-muted hover:border-accent-border hover:text-accent'
            }`}
          >
            {isSelecting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Selecting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Select This Draft
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
