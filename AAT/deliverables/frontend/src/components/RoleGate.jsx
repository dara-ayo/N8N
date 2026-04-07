import { useAuth } from '../contexts/AuthContext'
import { hasMinRole } from '../lib/auth'

/**
 * RoleGate
 *
 * Conditionally renders its children based on the current user's role.
 *
 * Usage:
 *   <RoleGate minRole="admin">
 *     <button>Delete</button>
 *   </RoleGate>
 *
 *   <RoleGate allowedRoles={['owner', 'admin']}>
 *     <button>Manage Team</button>
 *   </RoleGate>
 *
 * Props:
 *  - allowedRoles  (string[]) — explicit list of allowed roles
 *  - minRole       (string)   — minimum role in the hierarchy
 *  - fallback      (node)     — optional element to render when access is denied
 *  - children      — content to render when access is granted
 *
 * If both `allowedRoles` and `minRole` are provided, the user must satisfy
 * at least one of the two checks.
 */
export default function RoleGate({
  allowedRoles,
  minRole,
  fallback = null,
  children,
}) {
  const { profile } = useAuth()
  const userRole = profile?.role

  if (!userRole) return fallback

  // Check allowedRoles list
  if (allowedRoles && allowedRoles.includes(userRole)) {
    return children
  }

  // Check minRole hierarchy
  if (minRole && hasMinRole(userRole, minRole)) {
    return children
  }

  return fallback
}
