import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listPersonas, updatePersona, triggerWorkflow } from '../api/airtable';
import StatusBadge from './StatusBadge';

/** Statuses that are eligible for the "Run" action. */
const RUNNABLE_STATUSES = new Set(['Draft', 'Error', 'No Results', 'Input Error']);

/**
 * Displays a list of recent Target Persona records below the creation form.
 */
export default function PersonaList({ onToast }) {
  const queryClient = useQueryClient();
  const [runningIds, setRunningIds] = useState(new Set());

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['personas'],
    queryFn: () => listPersonas({ pageSize: 20 }),
    // Auto-refresh every 10 seconds when any persona is in a running state
    refetchInterval: (query) => {
      const records = query.state.data?.records || [];
      const hasRunning = records.some((r) => {
        const s = r.fields['Status'];
        return s === 'Running' || s === 'Ready to Run';
      });
      return hasRunning ? 10_000 : false;
    },
  });

  async function handleRun(recordId) {
    // Guard against double-clicks
    if (runningIds.has(recordId)) return;

    setRunningIds((prev) => new Set(prev).add(recordId));

    try {
      // Step 1: Update Airtable status to "Ready to Run"
      await updatePersona(recordId, { Status: 'Ready to Run' });

      // Step 2: Trigger the n8n webhook
      await triggerWorkflow(recordId);

      onToast?.({
        type: 'success',
        message: 'Pipeline triggered! The n8n workflow is now processing.',
      });

      // Refresh the persona list to reflect new status
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    } catch (err) {
      onToast?.({
        type: 'error',
        message: `Failed to trigger pipeline: ${err.message}`,
        duration: 8000,
      });
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(recordId);
        return next;
      });
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Personas</h3>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="h-4 bg-gray-200 rounded w-40" />
              <div className="h-4 bg-gray-100 rounded w-28" />
              <div className="h-5 bg-gray-100 rounded-full w-20" />
              <div className="h-4 bg-gray-100 rounded w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6 mt-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Recent Personas</h3>
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Could not load personas:</strong>{' '}
          {error?.message || 'Failed to connect to Airtable. Check your API key and Base ID.'}
        </div>
      </div>
    );
  }

  const records = data?.records || [];

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Recent Personas</h3>
        <div className="text-center py-8">
          <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <p className="text-sm text-gray-500">
            No personas yet. Create one above to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 mt-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-900">Recent Personas</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Leads
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.map((record) => {
              const f = record.fields;
              const status = f['Status'] || '';
              const canRun = RUNNABLE_STATUSES.has(status);
              const isRunning = runningIds.has(record.id);

              return (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">
                      {f['Job Title'] || '--'}
                    </div>
                    {f['Keywords'] && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                        {f['Keywords']}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {f['Location'] || '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {f['Company Size'] || '--'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <StatusBadge type="persona" value={status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 font-mono">
                    {f['Lead Count'] != null ? f['Lead Count'] : '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {canRun ? (
                      <button
                        type="button"
                        onClick={() => handleRun(record.id)}
                        disabled={isRunning}
                        className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Set status to Ready to Run and trigger the n8n pipeline"
                      >
                        {isRunning ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Running...
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                            </svg>
                            Run
                          </>
                        )}
                      </button>
                    ) : status === 'Running' || status === 'Ready to Run' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-yellow-700">
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        In progress
                      </span>
                    ) : status === 'Complete' ? (
                      <span className="text-xs text-green-600">Done</span>
                    ) : (
                      <span className="text-xs text-gray-400">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
