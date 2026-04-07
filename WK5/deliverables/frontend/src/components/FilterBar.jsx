import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listPersonaOptions } from '../api/airtable';

const PIPELINE_STATUSES = [
  'Queued',
  'Verifying',
  'Enriching',
  'Validating Email',
  'Generating Messages',
  'Complete',
  'Partial',
  'Error',
  'Skipped',
  'No Contact Info',
];

const EMAIL_STATUSES = [
  'Deliverable',
  'Invalid',
  'Unknown',
  'Accept-All',
  'Disposable',
  'Role-Address',
  'Skipped',
  'Error',
];

export default function FilterBar({ filters, onFilterChange }) {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Track whether we've mounted so the debounce effect doesn't fire on first
  // render (the parent already has the correct initial filters).
  const mountedRef = useRef(false);

  // Debounce search input so we don't fire a request on every keystroke.
  // We call onSearchChange which is defined below and always reads the
  // current `filters` prop (no stale closure).
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      handleSearchCommit(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // This function is called after the debounce. Because it's declared in the
  // component body (not inside the effect), it always closes over the latest
  // `filters` and `onFilterChange` props.
  function handleSearchCommit(trimmed) {
    const next = { ...filters };
    if (trimmed) {
      next.search = trimmed;
    } else {
      delete next.search;
    }
    onFilterChange(next);
  }

  // Fetch persona list for the Source Persona filter dropdown
  const { data: personaData } = useQuery({
    queryKey: ['persona-options'],
    queryFn: listPersonaOptions,
    staleTime: 60_000,
  });

  const personas = personaData?.records || [];

  function handleChange(key, value) {
    const next = { ...filters };
    if (value === '' || value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
    // Clear readyForReview if user picks specific status filters
    if ((key === 'pipelineStatus' || key === 'emailStatus') && value) {
      delete next.readyForReview;
    }
    onFilterChange(next);
  }

  function handleReadyForReview() {
    if (filters.readyForReview) {
      onFilterChange({});
    } else {
      onFilterChange({ readyForReview: true });
    }
  }

  function clearAll() {
    setSearchInput('');
    onFilterChange({});
  }

  const hasActiveFilters =
    filters.pipelineStatus ||
    filters.emailStatus ||
    filters.sourcePersonaId ||
    filters.search ||
    filters.readyForReview;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Search
          </label>
          <input
            type="text"
            placeholder="Name, company, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Pipeline Status */}
        <div className="min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Pipeline Status
          </label>
          <select
            value={filters.pipelineStatus || ''}
            onChange={(e) => handleChange('pipelineStatus', e.target.value)}
            disabled={!!filters.readyForReview}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50"
          >
            <option value="">All</option>
            {PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Email Status */}
        <div className="min-w-[150px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Email Status
          </label>
          <select
            value={filters.emailStatus || ''}
            onChange={(e) => handleChange('emailStatus', e.target.value)}
            disabled={!!filters.readyForReview}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50"
          >
            <option value="">All</option>
            {EMAIL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Source Persona */}
        <div className="min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Source Persona
          </label>
          <select
            value={filters.sourcePersonaId || ''}
            onChange={(e) => handleChange('sourcePersonaId', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="">All Personas</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fields['Job Title'] || p.id}
              </option>
            ))}
          </select>
        </div>

        {/* Quick filter */}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={handleReadyForReview}
            className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
              filters.readyForReview
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Ready for Review
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
