import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NewSubmission from './pages/NewSubmission'
import SubmissionDetail from './pages/SubmissionDetail'
import Team from './pages/Team'
import Settings from './pages/Settings'
import OAuthCallback from './pages/OAuthCallback'
import Login from './pages/Login'
import AcceptInvite from './pages/AcceptInvite'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/invite/:token" element={<AcceptInvite />} />
      <Route path="/settings/callback/:platform" element={<OAuthCallback />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/submit"
        element={
          <ProtectedRoute minRole="editor">
            <Layout>
              <NewSubmission />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/submission/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <SubmissionDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute minRole="admin">
            <Layout>
              <Team />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute minRole="owner">
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all — send to dashboard */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
