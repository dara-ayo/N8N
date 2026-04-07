const N8N_BASE = import.meta.env.VITE_N8N_WEBHOOK_BASE
const PATH_PREFIX = import.meta.env.VITE_WEBHOOK_PATH_PREFIX || ''

/**
 * Submit a new content idea to the n8n content-submit webhook.
 */
export async function submitContent({ rawIdea, url, publishImmediately, tone }) {
  const payload = {}
  if (rawIdea && rawIdea.trim()) payload.rawIdea = rawIdea.trim()
  if (url && url.trim()) payload.url = url.trim()
  payload.publishImmediately = !!publishImmediately
  if (tone) payload.tone = tone

  const response = await fetch(`${N8N_BASE}/${PATH_PREFIX}content-submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  let data
  try { data = await response.json() } catch { data = {} }
  if (!response.ok) throw new Error(data.message || `Submission failed (${response.status})`)
  return data
}

/**
 * Select a draft and trigger platform adaptation.
 */
export async function selectDraft({ submissionId, selectedDraft, publishImmediately }) {
  const response = await fetch(`${N8N_BASE}/${PATH_PREFIX}draft-select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submission_id: submissionId,
      selected_draft: selectedDraft,
      publishImmediately: !!publishImmediately,
    }),
  })

  let data
  try { data = await response.json() } catch { data = {} }
  if (!response.ok) throw new Error(data.message || `Draft selection failed (${response.status})`)
  return data
}

/**
 * Publish adapted content to one or more platforms.
 */
export async function publishContent({ submissionId, platforms }) {
  const response = await fetch(`${N8N_BASE}/${PATH_PREFIX}publish-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submission_id: submissionId,
      platforms: platforms || ['linkedin', 'twitter', 'newsletter'],
    }),
  })

  let data
  try { data = await response.json() } catch { data = {} }
  if (!response.ok) throw new Error(data.message || `Publishing failed (${response.status})`)
  return data
}
