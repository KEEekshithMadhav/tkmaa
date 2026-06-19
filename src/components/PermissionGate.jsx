'use client'
import { useAuth } from '@/context/AuthContext'

/**
 * PermissionGate — Gated rendering based on user permissions or roles.
 *
 * Props:
 *  - permission: string (e.g. 'CREATE_BRANCH') or array of strings
 *  - role: string (e.g. 'super_admin') or array of strings (alternative/override check)
 *  - requireAll: boolean (if true, user must have all specified permissions, defaults to false)
 *  - fallback: React Node to render if user doesn't have access (defaults to null)
 */
export default function PermissionGate({
  children,
  permission,
  role,
  requireAll = false,
  fallback = null
}) {
  const { role: userRole, can, loading } = useAuth()

  if (loading) return null

  // Role checking
  if (role) {
    const rolesToCheck = Array.isArray(role) ? role : [role]
    const hasRole = rolesToCheck.includes(userRole)
    if (!hasRole) return fallback
  }

  // Permission checking
  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission]
    const hasAccess = requireAll
      ? perms.every(p => can(p))
      : perms.some(p => can(p))

    if (!hasAccess) return fallback
  }

  return <>{children}</>
}
