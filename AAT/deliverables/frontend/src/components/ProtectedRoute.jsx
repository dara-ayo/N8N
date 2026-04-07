import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { hasMinRole } from '../lib/auth'

export default function ProtectedRoute({ children, minRole }) {
  const { isAuthenticated, loading, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    // Show nothing for the first 150ms to avoid flashing the spinner on fast loads
    return <div className="min-h-screen bg-surface" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (minRole && !hasMinRole(profile?.role, minRole)) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-status-warning-bg border border-status-warning/25 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-status-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v.01M12 9v3m0-9a9 9 0 110 18 9 9 0 010-18z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-text-primary mb-2">Insufficient Permissions</h2>
          <p className="text-sm text-text-secondary">
            You do not have the required role to access this page. Contact an administrator if you believe this is a mistake.
          </p>
        </div>
      </div>
    )
  }

  return children
}
