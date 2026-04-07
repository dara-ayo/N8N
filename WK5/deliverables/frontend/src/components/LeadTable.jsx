import { useState } from 'react';
import LeadRow from './LeadRow';
import MessageDrawer from './MessageDrawer';

/**
 * The leads data table. Receives an array of Airtable records and handles
 * the message drawer state.
 */
export default function LeadTable({ records, isLoading }) {
  const [selectedLead, setSelectedLead] = useState(null);

  // Skeleton loader rows
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Lead', 'Email', 'Links', 'Location', 'Status', ''].map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-4 py-3">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-48" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 bg-gray-200 rounded w-40 mb-1" />
                  <div className="h-5 bg-gray-100 rounded-full w-20" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 bg-gray-100 rounded w-24 mb-1" />
                  <div className="h-4 bg-gray-100 rounded w-20" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 bg-gray-100 rounded w-24 mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-16" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-5 bg-gray-100 rounded-full w-20" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-7 bg-gray-100 rounded w-28" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return null; // Parent handles empty state
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Links
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onViewMessages={setSelectedLead}
              />
            ))}
          </tbody>
        </table>
      </div>

      {selectedLead && (
        <MessageDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </>
  );
}
