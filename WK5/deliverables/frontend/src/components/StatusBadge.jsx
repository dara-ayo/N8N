/**
 * Renders a color-coded badge for various status fields.
 *
 * Usage:
 *   <StatusBadge type="pipeline" value="Complete" />
 *   <StatusBadge type="email" value="Deliverable" />
 *   <StatusBadge type="persona" value="Running" />
 *   <StatusBadge type="website" value="Valid" />
 *   <StatusBadge type="linkedin" value="Valid" />
 */

const COLOR_MAP = {
  // Pipeline Status
  pipeline: {
    Queued: 'bg-gray-100 text-gray-700',
    Verifying: 'bg-blue-100 text-blue-700',
    Enriching: 'bg-sky-100 text-sky-700',
    'Validating Email': 'bg-purple-100 text-purple-700',
    'Generating Messages': 'bg-indigo-100 text-indigo-700',
    Complete: 'bg-green-100 text-green-700',
    Partial: 'bg-yellow-100 text-yellow-700',
    Error: 'bg-red-100 text-red-700',
    Skipped: 'bg-gray-100 text-gray-500',
    'No Contact Info': 'bg-orange-100 text-orange-700',
  },

  // Email Status
  email: {
    Deliverable: 'bg-green-100 text-green-700',
    Invalid: 'bg-red-100 text-red-700',
    Unknown: 'bg-yellow-100 text-yellow-700',
    'Accept-All': 'bg-yellow-100 text-yellow-700',
    Disposable: 'bg-red-100 text-red-700',
    'Role-Address': 'bg-orange-100 text-orange-700',
    Skipped: 'bg-gray-100 text-gray-500',
    Error: 'bg-red-100 text-red-700',
  },

  // Persona Status
  persona: {
    Draft: 'bg-gray-100 text-gray-600',
    'Ready to Run': 'bg-blue-100 text-blue-700',
    Running: 'bg-yellow-100 text-yellow-700',
    Complete: 'bg-green-100 text-green-700',
    Error: 'bg-red-100 text-red-700',
    'No Results': 'bg-orange-100 text-orange-700',
    'Input Error': 'bg-pink-100 text-pink-700',
  },

  // Website Status
  website: {
    Valid: 'bg-green-100 text-green-700',
    Invalid: 'bg-red-100 text-red-700',
    Timeout: 'bg-yellow-100 text-yellow-700',
    Redirected: 'bg-blue-100 text-blue-700',
    Blocked: 'bg-orange-100 text-orange-700',
    Parked: 'bg-gray-100 text-gray-600',
    Skipped: 'bg-gray-100 text-gray-500',
    Unknown: 'bg-gray-100 text-gray-500',
  },

  // LinkedIn Status
  linkedin: {
    Valid: 'bg-green-100 text-green-700',
    Invalid: 'bg-red-100 text-red-700',
    'Bot-Blocked': 'bg-orange-100 text-orange-700',
    'Company Page': 'bg-blue-100 text-blue-700',
    Skipped: 'bg-gray-100 text-gray-500',
    Unknown: 'bg-gray-100 text-gray-500',
  },
};

const DEFAULT_COLOR = 'bg-gray-100 text-gray-600';

export default function StatusBadge({ type, value }) {
  if (!value) return <span className="text-gray-400 text-xs italic">--</span>;

  const colors = COLOR_MAP[type]?.[value] || DEFAULT_COLOR;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${colors}`}
    >
      {value}
    </span>
  );
}
