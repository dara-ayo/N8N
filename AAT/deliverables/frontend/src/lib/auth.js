/**
 * Role hierarchy and permission utilities for RBAC.
 */

export const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
}

/**
 * Check whether `userRole` meets or exceeds the `requiredRole` in the hierarchy.
 * Returns false for any unrecognised role.
 */
export function hasMinRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole]
  const requiredLevel = ROLE_HIERARCHY[requiredRole]
  if (userLevel === undefined || requiredLevel === undefined) return false
  return userLevel >= requiredLevel
}

/**
 * Map of actions to the minimum role required to perform them.
 */
const ACTION_MIN_ROLES = {
  manage_team: 'admin',
  connect_platform: 'owner',
  submit_content: 'editor',
  select_draft: 'editor',
  publish: 'admin',
  view: 'viewer',
}

/**
 * Check whether `userRole` is allowed to perform `action`.
 * Returns false for unrecognised actions or roles.
 */
export function canPerformAction(userRole, action) {
  const minRole = ACTION_MIN_ROLES[action]
  if (!minRole) return false
  return hasMinRole(userRole, minRole)
}
