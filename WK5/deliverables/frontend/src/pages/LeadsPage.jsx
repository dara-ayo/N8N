import { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listLeads, getConfigError } from '../api/airtable';
import FilterBar from '../components/FilterBar';
import LeadTable from '../components/LeadTable';
import Pagination from '../components/Pagination';

export default function LeadsPage() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);

  // We keep a stack of Airtable offset tokens so the user can paginate back
  const [offsetStack, setOffsetStack] = useState([undefined]); // index 0 = page 1

  const currentOffset = offsetStack[page - 1];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['leads', filters, currentOffset],
    queryFn: () =>
      listLeads({
        ...filters,
        pageSize: 25,
        offset: currentOffset,
      }),
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = useCallback((newFilters) => {
    // Clean up undefined values so React Query cache keys are consistent.
    // JSON.stringify strips undefined values, so { search: undefined } and {}
    // hash to the same key -- but Object.keys differ, which can confuse
    // React's state comparison. Remove undefined keys to be safe.
    const cleaned = {};
    for (const [k, v] of Object.entries(newFilters)) {
      if (v !== undefined) cleaned[k] = v;
    }
    setFilters(cleaned);
    setPage(1);
    setOffsetStack([undefined]);
  }, []);

  function handleNext() {
    if (data?.offset) {
      setOffsetStack((prev) => {
        const next = [...prev];
        next[page] = data.offset; // store the offset for the next page
        return next;
      });
      setPage((p) => p + 1);
    }
  }

  function handlePrev() {
    if (page > 1) {
      setPage((p) => p - 1);
    }
  }

  const configError = getConfigError();

  if (configError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Configuration Required
          </h2>
          <p className="text-sm text-red-700">{configError}</p>
        </div>
      </div>
    );
  }

  const records = data?.records || [];
  const hasMore = !!data?.offset;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lead Review Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review, filter, and inspect leads discovered by the automation pipeline.
        </p>
      </div>

      <FilterBar filters={filters} onFilterChange={handleFilterChange} />

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 mb-4">
          <h3 className="text-sm font-semibold text-red-800 mb-1">
            Failed to load leads
          </h3>
          <p className="text-sm text-red-700">
            {error?.message || 'Could not connect to Airtable. Verify your API key and Base ID are correct.'}
          </p>
          {error?.status === 401 && (
            <p className="text-sm text-red-600 mt-2">
              HTTP 401: Your Airtable API key is invalid or expired. Generate a new one at{' '}
              <a
                href="https://airtable.com/create/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                airtable.com/create/tokens
              </a>.
            </p>
          )}
          {error?.status === 404 && (
            <p className="text-sm text-red-600 mt-2">
              HTTP 404: The Leads table was not found. Make sure your Base ID is correct and the table is named exactly "Leads".
            </p>
          )}
          {error?.status === 422 && (
            <p className="text-sm text-red-600 mt-2">
              HTTP 422: Airtable rejected the request. This usually means a field name in the filter does not match the schema. Check that all field names match the Airtable base exactly.
            </p>
          )}
          {error?.status === 429 && (
            <p className="text-sm text-red-600 mt-2">
              Rate limited: Too many requests to Airtable. The app will retry automatically, but if this persists, wait a few seconds and refresh.
            </p>
          )}
          {error?.status === 0 && (
            <p className="text-sm text-red-600 mt-2">
              Network error: Could not reach the Airtable API. Check your internet connection and try again.
            </p>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <LeadTable records={[]} isLoading />}

      {/* Empty state */}
      {!isLoading && !isError && records.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No leads found</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            {filters.readyForReview
              ? 'No leads are ready for review yet. Leads must have Pipeline Status "Complete" and Email Status "Deliverable".'
              : filters.pipelineStatus || filters.emailStatus || filters.search
                ? 'No leads match the current filters. Try adjusting your search or clearing filters.'
                : 'No leads in the database yet. Create a Target Persona and run the pipeline to discover leads.'}
          </p>
        </div>
      )}

      {/* Data table */}
      {!isLoading && !isError && records.length > 0 && (
        <>
          <div className="mb-2 text-xs text-gray-500">
            Showing {records.length} lead{records.length !== 1 ? 's' : ''}
            {hasMore ? ' (more available)' : ''}
          </div>
          <LeadTable records={records} isLoading={false} />
          <Pagination
            page={page}
            hasMore={hasMore}
            canGoPrev={page > 1}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        </>
      )}
    </div>
  );
}
