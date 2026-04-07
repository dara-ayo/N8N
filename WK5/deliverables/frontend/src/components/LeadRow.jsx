import StatusBadge from './StatusBadge';

/**
 * A single row in the Leads table. Shows core fields and action buttons.
 */
export default function LeadRow({ lead, onViewMessages }) {
  const f = lead.fields;

  const websiteUrl = f['Company Website'];
  const linkedinUrl = f['LinkedIn URL'];
  const email = f['Email'];

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      {/* Name + Title + Company */}
      <td className="px-4 py-3 text-sm">
        <div className="font-medium text-gray-900">
          {f['Full Name'] || <span className="text-gray-400 italic">Unknown</span>}
        </div>
        <div className="text-gray-500 text-xs mt-0.5">
          {f['Job Title'] && <span>{f['Job Title']}</span>}
          {f['Job Title'] && f['Company Name'] && <span> at </span>}
          {f['Company Name'] && (
            <span className="font-medium">{f['Company Name']}</span>
          )}
        </div>
      </td>

      {/* Email + Status */}
      <td className="px-4 py-3 text-sm">
        {email ? (
          <div>
            <a
              href={`mailto:${email}`}
              className="text-indigo-600 hover:text-indigo-800 hover:underline break-all"
            >
              {email}
            </a>
            <div className="mt-1">
              <StatusBadge type="email" value={f['Email Status']} />
            </div>
          </div>
        ) : (
          <span className="text-gray-400 italic text-xs">No email</span>
        )}
      </td>

      {/* Website + LinkedIn with status badges */}
      <td className="px-4 py-3 text-sm">
        <div className="space-y-1.5">
          {/* Website */}
          <div className="flex items-center gap-1.5">
            {websiteUrl ? (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-[140px]"
                title={websiteUrl}
              >
                Website
              </a>
            ) : (
              <span className="text-gray-400 text-xs">No website</span>
            )}
            <StatusBadge type="website" value={f['Website Status']} />
          </div>

          {/* LinkedIn */}
          <div className="flex items-center gap-1.5">
            {linkedinUrl ? (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-[140px]"
                title={linkedinUrl}
              >
                LinkedIn
              </a>
            ) : (
              <span className="text-gray-400 text-xs">No LinkedIn</span>
            )}
            <StatusBadge type="linkedin" value={f['LinkedIn Status']} />
          </div>
        </div>
      </td>

      {/* Location + Company Size */}
      <td className="px-4 py-3 text-sm text-gray-600">
        <div>{f['Location'] || <span className="text-gray-400 italic text-xs">--</span>}</div>
        {f['Company Size'] && (
          <div className="text-xs text-gray-400 mt-0.5">{f['Company Size']} employees</div>
        )}
      </td>

      {/* Pipeline Status */}
      <td className="px-4 py-3 text-sm">
        <StatusBadge type="pipeline" value={f['Pipeline Status']} />
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-sm text-right">
        <button
          type="button"
          onClick={() => onViewMessages(lead)}
          className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          View Messages
        </button>
      </td>
    </tr>
  );
}
