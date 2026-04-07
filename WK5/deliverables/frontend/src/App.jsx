import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import PersonasPage from './pages/PersonasPage';
import LeadsPage from './pages/LeadsPage';

function NavBar() {
  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`;

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-indigo-600">LeadGen</span>
            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
              WK5
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/personas" className={linkClass}>
              Personas
            </NavLink>
            <NavLink to="/leads" className={linkClass}>
              Leads
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/personas" replace />} />
          <Route path="/personas" element={<PersonasPage />} />
          <Route path="/leads" element={<LeadsPage />} />
        </Routes>
      </main>
    </div>
  );
}
