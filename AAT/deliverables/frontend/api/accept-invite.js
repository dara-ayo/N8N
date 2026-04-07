export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token, password } = req.body || {}

  if (!token || !password) {
    return res.status(400).json({ error: 'Missing token or password.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const headers = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey }

  // 1. Look up invite token
  const memberResp = await fetch(
    `${supabaseUrl}/rest/v1/team_members?invite_token=eq.${encodeURIComponent(token)}&select=id,email,role,status`,
    { headers }
  )
  const members = await memberResp.json()

  if (!Array.isArray(members) || !members.length) {
    return res.status(400).json({ error: 'Invalid or expired invitation.' })
  }

  const member = members[0]

  if (member.status === 'deactivated') {
    return res.status(400).json({ error: 'This invitation has been revoked.' })
  }

  // 2. Create auth user (email_confirm: true = no confirmation email sent)
  let userId
  const createResp = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: member.email, password, email_confirm: true }),
  })
  const createData = await createResp.json()

  if (createResp.ok) {
    userId = createData.id
  } else if (createData.error_code === 'email_exists') {
    // User already has an auth account — find them and update their password
    const listResp = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, { headers })
    const listData = await listResp.json()
    const existing = listData.users?.find((u) => u.email === member.email)
    if (!existing) return res.status(500).json({ error: 'Failed to set up account.' })
    userId = existing.id
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, email_confirm: true }),
    })
  } else {
    return res.status(500).json({ error: createData.msg || 'Failed to create account.' })
  }

  // 3. Link user_id in team_members and mark active
  await fetch(`${supabaseUrl}/rest/v1/team_members?id=eq.${member.id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId, status: 'active' }),
  })

  return res.status(200).json({ success: true, email: member.email })
}
