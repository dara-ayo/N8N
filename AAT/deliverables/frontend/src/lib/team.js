import { supabase } from './supabase'

const ROLE_ORDER = { owner: 1, admin: 2, editor: 3, viewer: 4 }

/**
 * Fetch all team members ordered by role hierarchy then display name.
 */
export async function fetchTeamMembers() {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error

  // Sort in JS since Supabase can't sort by custom role hierarchy
  return (data || []).sort((a, b) => {
    const roleA = ROLE_ORDER[a.role] || 99
    const roleB = ROLE_ORDER[b.role] || 99
    if (roleA !== roleB) return roleA - roleB
    const nameA = (a.display_name || a.email || '').toLowerCase()
    const nameB = (b.display_name || b.email || '').toLowerCase()
    return nameA.localeCompare(nameB)
  })
}

/**
 * Invite a new team member by inserting a row with status 'invited'.
 */
export async function inviteTeamMember({ email, role, displayName, invitedBy }) {
  const inviteToken = crypto.randomUUID()

  const { data, error } = await supabase
    .from('team_members')
    .insert({
      email,
      role,
      display_name: displayName || null,
      invited_by: invitedBy,
      invite_token: inviteToken,
      status: 'invited',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a team member's role.
 */
export async function updateMemberRole(memberId, newRole) {
  const { data, error } = await supabase
    .from('team_members')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Toggle a team member's status (activate / deactivate).
 */
export async function toggleMemberStatus(memberId, newStatus) {
  const { data, error } = await supabase
    .from('team_members')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Look up a team member by invite token.
 * Uses a SECURITY DEFINER RPC so unauthenticated (anon) visitors can call it
 * — the direct table SELECT is blocked for the anon role by RLS.
 */
export async function lookupInvite(token) {
  const { data, error } = await supabase.rpc('lookup_invite', { p_token: token })
  if (error) throw error
  // rpc returns an array; .single() equivalent
  return data?.[0] ?? null
}

/**
 * Accept an invitation: set user_id and mark status as 'active'.
 * Uses a SECURITY DEFINER RPC to bypass the RLS deadlock where the invited
 * user's row has user_id=NULL so neither branch of the UPDATE policy passes.
 */
export async function acceptInvite(token) {
  const { error } = await supabase.rpc('accept_invite', { p_token: token })
  if (error) throw error
}
