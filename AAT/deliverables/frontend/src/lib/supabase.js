import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl || '', supabaseKey || '')

// Simple in-memory cache to avoid re-fetching on every page navigation
const cache = {}
function getCached(key) { return cache[key] || null }
function setCache(key, data) { cache[key] = data }

/**
 * Fetch all submissions ordered by most recent first.
 */
export async function fetchSubmissions() {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  setCache('submissions', data)
  return data
}

/**
 * Get cached submissions (returns instantly, may be stale).
 */
export function getCachedSubmissions() {
  return getCached('submissions')
}

/**
 * Fetch a single submission by ID.
 */
export async function fetchSubmission(id) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch all drafts for a given submission.
 * Drafts are stored as a JSONB array in submissions.drafts, not a separate table.
 */
export async function fetchDrafts(submissionId) {
  const { data, error } = await supabase
    .from('submissions')
    .select('drafts')
    .eq('id', submissionId)
    .single()

  if (error) throw error
  return data?.drafts || []
}

/**
 * Fetch adapted content for a given submission.
 */
export async function fetchAdaptedContent(submissionId) {
  const { data, error } = await supabase
    .from('adapted_content')
    .select('*')
    .eq('submission_id', submissionId)

  if (error) throw error
  return data
}

/**
 * Fetch all adapted_content rows (used for analytics).
 */
export async function fetchAdaptedContentAll() {
  const cached = getCached('adapted_content_all')
  if (cached) return cached

  const { data, error } = await supabase
    .from('adapted_content')
    .select('*')

  if (error) throw error
  setCache('adapted_content_all', data)
  return data
}

/**
 * Get cached adapted_content_all (returns instantly, may be stale).
 */
export function getCachedAdaptedContentAll() {
  return getCached('adapted_content_all')
}

/**
 * Update adapted content by submission_id.
 * This is the primary method used for saving edits.
 */
export async function updateAdaptedContentBySubmission(submissionId, updates) {
  const { data, error } = await supabase
    .from('adapted_content')
    .update(updates)
    .eq('submission_id', submissionId)
    .select()

  if (error) throw error
  return data?.[0] || null
}

/**
 * Fetch lightweight submission data for duplicate detection.
 * Returns id, raw_input, content_base, status, and created_at for all submissions.
 */
export async function fetchAllSubmissionTitles() {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, raw_input, content_base, status, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Update an adapted_content record by its row ID.
 */
export async function updateAdaptedContent(id, updates) {
  const { data, error } = await supabase
    .from('adapted_content')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
