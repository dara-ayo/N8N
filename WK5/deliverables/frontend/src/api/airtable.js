/**
 * Airtable API client with rate-limit-aware request queue.
 *
 * Airtable enforces 5 requests/second per base. This module serialises all
 * outgoing requests through a simple queue that guarantees at most 5 calls per
 * rolling 1-second window, backing off automatically on 429 responses.
 */

const API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const BASE_URL = 'https://api.airtable.com/v0';

// ---------------------------------------------------------------------------
// Configuration validation
// ---------------------------------------------------------------------------

export function getConfigError() {
  if (!API_KEY) return 'VITE_AIRTABLE_API_KEY is not set. Copy .env.example to .env and add your Airtable API key.';
  if (!BASE_ID) return 'VITE_AIRTABLE_BASE_ID is not set. Copy .env.example to .env and add your Airtable Base ID.';
  return null;
}

// ---------------------------------------------------------------------------
// Rate-limited request queue (max 5 req/s)
// ---------------------------------------------------------------------------

const MAX_PER_SECOND = 5;
const WINDOW_MS = 1000;

let timestamps = []; // tracks recent request timestamps
let queue = [];       // pending requests
let processing = false;

function drainQueue() {
  if (processing) return;
  processing = true;

  (async () => {
    while (queue.length > 0) {
      // Remove timestamps older than 1 second
      const now = Date.now();
      timestamps = timestamps.filter((t) => now - t < WINDOW_MS);

      if (timestamps.length >= MAX_PER_SECOND) {
        // Wait until the oldest timestamp exits the window
        const waitMs = WINDOW_MS - (now - timestamps[0]) + 10;
        await sleep(waitMs);
        continue;
      }

      const { resolve, reject, fn } = queue.shift();
      timestamps.push(Date.now());

      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }
    processing = false;
  })();
}

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ resolve, reject, fn });
    drainQueue();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Low-level fetch wrapper
// ---------------------------------------------------------------------------

class AirtableError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'AirtableError';
    this.status = status;
    this.details = details;
  }
}

const MAX_RETRIES = 3;

async function airtableFetch(path, options = {}, _retryCount = 0) {
  const configError = getConfigError();
  if (configError) throw new AirtableError(configError, 0, null);

  const url = path.startsWith('http') ? path : `${BASE_URL}/${BASE_ID}/${path}`;

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (networkError) {
    throw new AirtableError(
      'Network error: Unable to reach Airtable. Check your internet connection and try again.',
      0,
      { originalError: networkError.message },
    );
  }

  // Handle 429 with retry (capped to prevent infinite recursion)
  if (response.status === 429) {
    if (_retryCount >= MAX_RETRIES) {
      throw new AirtableError(
        'Rate limit exceeded. Too many requests to Airtable. Please wait a moment and try again.',
        429,
        null,
      );
    }
    const retryAfter = parseInt(response.headers.get('Retry-After') || '30', 10);
    await sleep(retryAfter * 1000);
    return airtableFetch(path, options, _retryCount + 1);
  }

  if (!response.ok) {
    let errorBody;
    try {
      errorBody = await response.json();
    } catch {
      try {
        errorBody = await response.text();
      } catch {
        errorBody = null;
      }
    }

    const message =
      errorBody?.error?.message ||
      (typeof errorBody === 'string' ? errorBody : null) ||
      `Airtable API returned ${response.status}`;

    throw new AirtableError(message, response.status, errorBody);
  }

  // 204 No Content (e.g. DELETE)
  if (response.status === 204) return null;

  return response.json();
}

// Wrap every call through the queue
function queuedFetch(path, options) {
  return enqueue(() => airtableFetch(path, options));
}

// ---------------------------------------------------------------------------
// Table helpers (URL-encode table names that have spaces)
// ---------------------------------------------------------------------------

function tablePath(tableName) {
  return encodeURIComponent(tableName);
}

// ---------------------------------------------------------------------------
// Target Personas
// ---------------------------------------------------------------------------

/**
 * List personas sorted by Run Date descending.
 * Returns { records: [...] }
 */
export async function listPersonas({ pageSize = 50, offset } = {}) {
  const params = new URLSearchParams();
  params.set('sort[0][field]', 'Run Date');
  params.set('sort[0][direction]', 'desc');
  params.set('pageSize', String(pageSize));
  if (offset) params.set('offset', offset);

  return queuedFetch(`${tablePath('Target Personas')}?${params.toString()}`);
}

/**
 * Create a new persona record.
 * @param {object} fields  — { "Job Title", "Location", "Company Size", "Keywords", "Status" }
 */
export async function createPersona(fields) {
  return queuedFetch(tablePath('Target Personas'), {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

/**
 * List leads with optional filters, search, sorting and pagination.
 *
 * @param {object} opts
 * @param {string} [opts.pipelineStatus]   — filter by Pipeline Status
 * @param {string} [opts.emailStatus]      — filter by Email Status
 * @param {string} [opts.sourcePersonaId]  — filter by Source Persona record ID
 * @param {string} [opts.search]           — free-text search across name/company/email
 * @param {boolean}[opts.readyForReview]   — quick filter: Complete + Deliverable
 * @param {number} [opts.pageSize]         — records per page (default 25)
 * @param {string} [opts.offset]           — Airtable pagination offset
 */
export async function listLeads({
  pipelineStatus,
  emailStatus,
  sourcePersonaId,
  search,
  readyForReview,
  pageSize = 25,
  offset,
} = {}) {
  const formulas = [];

  if (readyForReview) {
    formulas.push('{Pipeline Status} = "Complete"');
    formulas.push('{Email Status} = "Deliverable"');
  } else {
    if (pipelineStatus) formulas.push(`{Pipeline Status} = "${escapeAirtable(pipelineStatus)}"`);
    if (emailStatus) formulas.push(`{Email Status} = "${escapeAirtable(emailStatus)}"`);
  }

  if (sourcePersonaId) {
    formulas.push(`RECORD_ID() != "" `); // placeholder — we filter client-side for linked records
  }

  if (search) {
    const q = escapeAirtable(search);
    formulas.push(
      `OR(FIND(LOWER("${q}"), LOWER({Full Name})), FIND(LOWER("${q}"), LOWER({Company Name})), FIND(LOWER("${q}"), LOWER({Email})))`
    );
  }

  const params = new URLSearchParams();
  if (formulas.length > 0) {
    const combined =
      formulas.length === 1 ? formulas[0] : `AND(${formulas.join(', ')})`;
    params.set('filterByFormula', combined);
  }
  params.set('sort[0][field]', 'Full Name');
  params.set('sort[0][direction]', 'asc');
  params.set('pageSize', String(pageSize));
  if (offset) params.set('offset', offset);

  const data = await queuedFetch(`${tablePath('Leads')}?${params.toString()}`);

  // Client-side filter for linked record (Source Persona) because Airtable
  // filterByFormula doesn't directly support linked record ID matching in a
  // simple way without knowing the displayed value.
  if (sourcePersonaId && data.records) {
    data.records = data.records.filter((r) => {
      const linked = r.fields['Source Persona'];
      return Array.isArray(linked) && linked.includes(sourcePersonaId);
    });
  }

  return data;
}

/**
 * Retrieve a single lead by record ID.
 */
export async function getLead(recordId) {
  return queuedFetch(`${tablePath('Leads')}/${recordId}`);
}

/**
 * List all personas (for filter dropdown). Lightweight — only fetches name fields.
 */
export async function listPersonaOptions() {
  const params = new URLSearchParams();
  params.set('fields[]', 'Job Title');
  params.set('sort[0][field]', 'Job Title');
  params.set('sort[0][direction]', 'asc');
  params.set('pageSize', '100');

  return queuedFetch(`${tablePath('Target Personas')}?${params.toString()}`);
}

// ---------------------------------------------------------------------------
// Run Logs
// ---------------------------------------------------------------------------

/**
 * List run logs sorted by Start Time descending.
 * Returns { records: [...] }
 */
export async function listRunLogs({ pageSize = 50, offset } = {}) {
  const params = new URLSearchParams();
  params.set('sort[0][field]', 'Start Time');
  params.set('sort[0][direction]', 'desc');
  params.set('pageSize', String(pageSize));
  if (offset) params.set('offset', offset);

  return queuedFetch(`${tablePath('Run Logs')}?${params.toString()}`);
}

// ---------------------------------------------------------------------------
// Update persona status
// ---------------------------------------------------------------------------

/**
 * Update an existing persona record's fields (typically Status).
 * @param {string} recordId — Airtable record ID
 * @param {object} fields   — fields to patch, e.g. { Status: "Ready to Run" }
 */
export async function updatePersona(recordId, fields) {
  return queuedFetch(`${tablePath('Target Personas')}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

// ---------------------------------------------------------------------------
// n8n Webhook trigger
// ---------------------------------------------------------------------------

const N8N_WEBHOOK_URL =
  import.meta.env.VITE_N8N_WEBHOOK_URL ||
  'http://localhost:5678/webhook/wk5-lead-gen';

/**
 * Trigger the n8n lead-gen workflow by POSTing to the webhook endpoint.
 * @param {string} recordId — The Airtable record ID of the persona to process
 * @returns {Promise<object>} — The webhook response body
 */
export async function triggerWorkflow(recordId) {
  let response;
  try {
    response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'RECORD_UPDATED',
        record: { id: recordId },
      }),
    });
  } catch (networkError) {
    throw new Error(
      'Network error: Unable to reach the n8n webhook. Make sure the n8n server is running and the webhook URL is correct.',
    );
  }

  if (!response.ok) {
    let errorBody;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = null;
    }
    throw new Error(
      `n8n webhook returned ${response.status}${errorBody ? `: ${errorBody}` : ''}`
    );
  }

  // Some webhooks return 200 with no body
  const text = await response.text();
  if (!text) return { ok: true };

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, body: text };
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Escape double quotes for Airtable formula strings.
 */
function escapeAirtable(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
