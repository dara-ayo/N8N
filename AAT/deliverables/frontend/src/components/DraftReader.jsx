import { useState } from 'react'

const ANGLE_CONFIG = {
  Contrarian: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Contrarian Angle' },
  'How-To': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Practical How-To' },
  'Data & Trends': { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', label: 'Data & Trends' },
  'Thought Leadership': { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Thought Leadership' },
  'Case Study': { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', label: 'Case Study' },
}

function wordCount(text) {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

// ── SEO Score ──────────────────────────────────────────────────────────────
function calcSeoScore(content, title) {
  if (!content) return 0
  let score = 0

  // +20 has H1 title (non-empty title supplied)
  if (title && title.trim().length > 0) score += 20

  // +20 keywords appear in first 100 words
  const first100 = content.trim().split(/\s+/).slice(0, 100).join(' ').toLowerCase()
  const titleWords = (title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3)
  if (titleWords.length > 0 && titleWords.some(w => first100.includes(w))) score += 20

  // +20 has H2/H3 subheadings (lines starting with ## or ###)
  if (/^#{2,3}\s/m.test(content)) score += 20

  // +20 word range 700-2500
  const wc = wordCount(content)
  if (wc >= 700 && wc <= 2500) score += 20

  // +10 has [LINK:] suggestions
  if (/\[LINK:/i.test(content)) score += 10

  // +10 has [IMAGE:] suggestions
  if (/\[IMAGE:/i.test(content)) score += 10

  return Math.min(score, 100)
}

// ── Flesch-Kincaid Readability Grade ───────────────────────────────────────
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!word) return 1
  // Count vowel groups as syllables
  const matches = word.match(/[aeiouy]+/g)
  let count = matches ? matches.length : 1
  // Subtract silent trailing 'e'
  if (word.endsWith('e') && count > 1) count -= 1
  return Math.max(1, count)
}

function calcReadabilityGrade(content) {
  if (!content) return null
  // Split into sentences
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
  const sentenceCount = sentences.length || 1
  const words = content.trim().split(/\s+/).filter(Boolean)
  const wordCountVal = words.length || 1

  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0)
  const avgWordsPerSentence = wordCountVal / sentenceCount
  const avgSyllablesPerWord = totalSyllables / wordCountVal

  // Flesch-Kincaid Grade Level formula
  const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59
  return Math.max(1, Math.round(grade))
}

// ── Keyword Density (top 3 two-to-three word phrases) ─────────────────────
function calcKeywordDensity(content) {
  if (!content) return []
  const stopWords = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'is','it','its','this','that','are','was','were','be','been','being',
    'have','has','had','do','does','did','will','would','could','should',
    'may','might','can','by','from','as','not','we','our','your','their',
    'they','he','she','his','her','you','i','my','me','us','so','if','then',
    'which','who','what','when','how','there','here','up','down','out','into',
  ])

  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))

  const phraseCounts = {}

  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(' ')
      phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1
    }
  }

  return Object.entries(phraseCounts)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([phrase, count]) => ({ phrase, count }))
}

// ── SEO Score Circle ───────────────────────────────────────────────────────
function SeoCircle({ score }) {
  const size = 40
  const strokeWidth = 3.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const gap = circumference - progress

  let color, textColor
  if (score >= 80) {
    color = '#34d399'   // emerald-400
    textColor = 'text-emerald-400'
  } else if (score >= 60) {
    color = '#fbbf24'   // amber-400
    textColor = 'text-amber-400'
  } else {
    color = '#f87171'   // red-400
    textColor = 'text-rose-400'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${progress} ${gap}`}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono ${textColor}`}>
          {score}
        </span>
      </div>
      <div>
        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider leading-none mb-0.5">SEO</p>
        <p className={`text-xs font-semibold ${textColor}`}>
          {score >= 80 ? 'Strong' : score >= 60 ? 'Moderate' : 'Weak'}
        </p>
      </div>
    </div>
  )
}

// ── Stats Bar ──────────────────────────────────────────────────────────────
function ContentScoreBar({ content, title }) {
  const seoScore = calcSeoScore(content, title)
  const grade = calcReadabilityGrade(content)
  const wc = wordCount(content)
  const keywords = calcKeywordDensity(content)

  return (
    <div className="mx-6 mb-4 mt-2 bg-surface-secondary border border-surface-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-3">
      {/* SEO Score */}
      <SeoCircle score={seoScore} />

      <div className="w-px h-8 bg-white/[0.06] hidden sm:block" />

      {/* Readability */}
      <div>
        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-0.5">Readability</p>
        <p className="text-sm font-semibold text-text-primary font-mono">
          {grade !== null ? `Grade ${grade}` : '—'}
        </p>
      </div>

      <div className="w-px h-8 bg-white/[0.06] hidden sm:block" />

      {/* Word Count */}
      <div>
        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-0.5">Words</p>
        <p className="text-sm font-semibold text-text-primary font-mono">{wc.toLocaleString()}</p>
      </div>

      {keywords.length > 0 && (
        <>
          <div className="w-px h-8 bg-white/[0.06] hidden sm:block" />
          {/* Keyword Density */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Top Phrases</p>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map(({ phrase, count }) => (
                <span
                  key={phrase}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-tertiary border border-surface-border text-[11px] text-text-secondary font-mono"
                >
                  {phrase}
                  <span className="text-text-tertiary">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function DraftReader({ drafts, onSelect, selectingDraftIdx }) {
  const [activeDraft, setActiveDraft] = useState(0)

  if (!drafts || drafts.length === 0) {
    return (
      <div className="card text-center py-10 text-text-secondary text-sm border-dashed">
        No drafts available yet. They may still be loading.
      </div>
    )
  }

  const draft = drafts[activeDraft]
  const angle = draft.angle || `Draft ${activeDraft + 1}`
  const title = draft.title || 'Untitled Draft'
  const content = draft.content || ''
  const words = wordCount(content)
  const angleStyle = ANGLE_CONFIG[angle] || { color: 'text-text-secondary', bg: 'bg-surface-elevated', border: 'border-surface-border', label: angle }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="section-title">Choose a Draft</h2>
          <p className="text-sm text-text-secondary mt-1">
            Read each draft carefully, then select the one you want adapted for all platforms.
          </p>
        </div>
      </div>

      {/* Draft Tabs — small clickable pills to switch between drafts */}
      <div className="flex items-center gap-2">
        {drafts.map((d, i) => {
          const a = d.angle || `Draft ${i + 1}`
          const as = ANGLE_CONFIG[a] || { color: 'text-text-secondary', bg: 'bg-surface-elevated', border: 'border-surface-border' }
          const isActive = activeDraft === i
          return (
            <button
              key={i}
              onClick={() => setActiveDraft(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium border transition-all duration-150 ${
                isActive
                  ? `${as.bg} ${as.border} ${as.color} shadow-sm`
                  : 'bg-surface-secondary border-surface-border text-text-tertiary hover:text-text-secondary hover:border-surface-border'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                isActive ? 'bg-white/10' : 'bg-surface-tertiary'
              }`}>
                {i + 1}
              </span>
              {a}
            </button>
          )
        })}
      </div>

      {/* Full Draft Content */}
      <div className="bg-surface-secondary border border-surface-border rounded-2xl overflow-hidden" key={activeDraft}>
        {/* Draft Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-tertiary/30">
          <div className="flex items-center gap-3">
            <span className={`badge border text-[11px] px-2.5 py-1 ${angleStyle.bg} ${angleStyle.color} ${angleStyle.border}`}>
              {angleStyle.label}
            </span>
            <span className="text-xs text-text-tertiary font-mono">{words} words</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>Draft {activeDraft + 1} of {drafts.length}</span>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => setActiveDraft(Math.max(0, activeDraft - 1))}
                disabled={activeDraft === 0}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-surface-tertiary border border-surface-border hover:border-surface-border disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setActiveDraft(Math.min(drafts.length - 1, activeDraft + 1))}
                disabled={activeDraft === drafts.length - 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-surface-tertiary border border-surface-border hover:border-surface-border disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-lg font-semibold text-text-primary leading-snug">{title}</h3>
        </div>

        {/* AI Content Score Stats Bar */}
        <ContentScoreBar content={content} title={title} />

        {/* Content — full width, comfortable reading */}
        <div className="px-6 pb-6">
          <div className="text-sm text-text-secondary leading-[1.8] whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
            {content}
          </div>
        </div>

        {/* Select Action Bar */}
        <div className="px-6 py-4 border-t border-surface-border bg-surface-tertiary/20 flex items-center justify-between">
          <p className="text-xs text-text-tertiary">
            Selecting this draft will adapt it for LinkedIn, X/Twitter, and Newsletter.
          </p>
          <button
            onClick={() => onSelect(draft, activeDraft)}
            disabled={selectingDraftIdx === activeDraft}
            className="btn-gradient flex items-center gap-2"
          >
            {selectingDraftIdx === activeDraft ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adapting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Select Draft {activeDraft + 1}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
