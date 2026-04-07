import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

const NAV_LINKS = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: '/submit',
    label: 'New Submission',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    to: '/team',
    label: 'Team',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

function SunIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function MoonIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
}

export default function Layout({ children }) {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { profile, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(path) {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col
          bg-surface-secondary shadow-sidebar
          transition-all duration-200 ease-out
          ${collapsed ? 'w-14' : 'w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        `}
        style={{ borderRight: '1px solid var(--border-light)' }}
      >
        {/* Brand */}
        <div
          className={`flex items-center h-14 flex-shrink-0 ${collapsed ? 'justify-center px-0' : 'px-4 gap-2.5'}`}
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
            <img
              src="/logo.svg"
              alt="ContentFlow"
              className="w-8 h-8 flex-shrink-0 rounded-xl shadow-glow-sm group-hover:shadow-glow-accent transition-all duration-200"
            />
            {!collapsed && (
              <span className="text-sm font-semibold text-text-primary tracking-tight">
                ContentFlow
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="ml-auto p-1 rounded-lg text-text-tertiary hover:text-text-primary transition-all duration-150 hidden lg:flex"
              title="Collapse sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="absolute -right-3 top-4 w-6 h-6 rounded-full bg-surface-secondary flex items-center justify-center text-text-tertiary hover:text-text-primary shadow-surface transition-all duration-150 hidden lg:flex"
              style={{ border: '1px solid var(--border-muted)' }}
              title="Expand sidebar"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1 overflow-y-auto">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={isActive(link.to) ? 'nav-link-active' : 'nav-link'}
              title={collapsed ? link.label : undefined}
            >
              <span className={`flex-shrink-0 ${isActive(link.to) ? 'text-accent' : 'text-text-tertiary group-hover:text-text-secondary'} transition-colors`}>
                {link.icon}
              </span>
              {!collapsed && link.label}
            </Link>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className={`px-3 pb-3 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] font-medium text-text-tertiary hover:text-text-primary transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="flex-shrink-0 relative w-[18px] h-[18px]">
              <span
                className="absolute inset-0 transition-all duration-300"
                style={{
                  opacity: theme === 'dark' ? 1 : 0,
                  transform: theme === 'dark' ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.5)',
                }}
              >
                <MoonIcon className="w-[18px] h-[18px]" />
              </span>
              <span
                className="absolute inset-0 transition-all duration-300"
                style={{
                  opacity: theme === 'light' ? 1 : 0,
                  transform: theme === 'light' ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
                }}
              >
                <SunIcon className="w-[18px] h-[18px]" />
              </span>
            </span>
            {!collapsed && (theme === 'dark' ? 'Dark Mode' : 'Light Mode')}
          </button>
        </div>

        {/* User info */}
        <div
          className={`p-3 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}
          style={{ borderTop: '1px solid var(--border-light)' }}
        >
          <div className={`flex items-center ${collapsed ? '' : 'gap-3'} w-full`}>
            <div className="w-8 h-8 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center text-xs font-semibold text-accent flex-shrink-0">
              {(profile?.display_name || profile?.email || '?')[0].toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary leading-none truncate">
                    {profile?.display_name || profile?.email}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-0.5 capitalize">
                    {profile?.role}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary transition-colors flex-shrink-0"
                  title="Sign out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-30 lg:hidden w-10 h-10 rounded-xl bg-surface-secondary flex items-center justify-center text-text-secondary hover:text-text-primary shadow-surface transition-all"
        style={{ border: '1px solid var(--border-muted)' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Main content */}
      <main
        className={`min-h-screen transition-all duration-200 ${collapsed ? 'lg:ml-14' : 'lg:ml-60'}`}
        style={{
          backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% -10%, rgba(124,106,245,0.07) 0%, transparent 100%)',
        }}
      >
        <div className="max-w-[900px] mx-auto px-6 sm:px-8 py-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
