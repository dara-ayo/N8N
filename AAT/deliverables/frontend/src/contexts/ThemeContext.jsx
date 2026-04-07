import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'contentflow-theme'

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  } catch {}
  return 'dark'
}

function resolveTheme(preference) {
  if (preference === 'system') return getSystemTheme()
  return preference
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getInitialTheme)
  const [resolved, setResolved] = useState(() => resolveTheme(getInitialTheme()))

  // Apply the resolved theme class to <html>
  useEffect(() => {
    const root = document.documentElement
    const theme = resolveTheme(preference)
    setResolved(theme)
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [preference])

  // Listen for system theme changes when preference is 'system'
  useEffect(() => {
    if (preference !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    function handler() {
      const theme = getSystemTheme()
      setResolved(theme)
      document.documentElement.classList.remove('dark', 'light')
      document.documentElement.classList.add(theme)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [preference])

  // Persist preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {}
  }, [preference])

  const toggleTheme = useCallback(() => {
    setPreference((prev) => {
      const current = resolveTheme(prev)
      return current === 'dark' ? 'light' : 'dark'
    })
  }, [])

  const setTheme = useCallback((value) => {
    if (value === 'dark' || value === 'light' || value === 'system') {
      setPreference(value)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: resolved, preference, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
