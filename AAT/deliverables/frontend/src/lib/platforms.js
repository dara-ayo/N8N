import { supabase } from './supabase'

/**
 * Platform metadata definitions.
 */
const PLATFORM_META = {
  linkedin: {
    name: 'LinkedIn',
    icon: '\uD83D\uDCBC',
    color: 'blue',
    colorClasses: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-800',
      icon: 'bg-blue-100 text-blue-600',
    },
    description: 'Share professional content and thought leadership posts to your LinkedIn profile.',
  },
  twitter: {
    name: 'X / Twitter',
    icon: '\uD835\uDD4F',
    color: 'gray',
    colorClasses: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      badge: 'bg-gray-100 text-gray-800',
      icon: 'bg-gray-900 text-white',
    },
    description: 'Publish tweets and threads to your X / Twitter account.',
  },
  newsletter: {
    name: 'Email Newsletter',
    icon: '\u2709\uFE0F',
    color: 'emerald',
    colorClasses: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-800',
      icon: 'bg-emerald-100 text-emerald-600',
    },
    description: 'Send email newsletters to your subscribers via your ESP provider.',
  },
}

/**
 * Get metadata for a given platform type.
 * @param {string} platformType - 'linkedin' | 'twitter' | 'newsletter'
 * @returns {object} Platform metadata
 */
export function getPlatformMeta(platformType) {
  return PLATFORM_META[platformType] || null
}

/**
 * Get all platform types supported by the system.
 * @returns {string[]}
 */
export function getAllPlatformTypes() {
  return ['linkedin', 'twitter', 'newsletter']
}

/**
 * Fetch all active platform connections from Supabase.
 * @returns {Promise<object[]>}
 */
export async function fetchConnections() {
  const { data, error } = await supabase
    .from('platform_connections')
    .select('*')
    .in('status', ['active', 'expired'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Disconnect a platform by setting its status to 'revoked'.
 * @param {string} connectionId - UUID of the platform_connections row
 * @returns {Promise<object>}
 */
export async function disconnectPlatform(connectionId) {
  const { data, error } = await supabase
    .from('platform_connections')
    .update({ status: 'revoked' })
    .eq('id', connectionId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Save a new platform connection to Supabase.
 * @param {object} connectionData - Fields to insert into platform_connections
 * @returns {Promise<object>}
 */
export async function saveConnection(connectionData) {
  const { data, error } = await supabase
    .from('platform_connections')
    .insert(connectionData)
    .select()
    .single()

  if (error) throw error
  return data
}
