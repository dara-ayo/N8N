import { useState, useEffect, useCallback } from 'react';

/**
 * Slide-over panel that displays the 3-step email sequence + LinkedIn message
 * for a given lead.
 */
export default function MessageDrawer({ lead, onClose }) {
  const [activeTab, setActiveTab] = useState('email1');
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  const fields = lead.fields;

  const tabs = [
    {
      id: 'email1',
      label: 'Email 1 (Intro)',
      subject: fields['Email Subject Line 1'],
      body: fields['Email Body 1'],
    },
    {
      id: 'email2',
      label: 'Email 2 (Follow-up)',
      subject: fields['Email Subject Line 2'],
      body: fields['Email Body 2'],
    },
    {
      id: 'email3',
      label: 'Email 3 (Break-up)',
      subject: fields['Email Subject Line 3'],
      body: fields['Email Body 3'],
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      subject: null,
      body: fields['LinkedIn Message'],
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab);
  const hasAnyMessage = tabs.some((t) => t.body);
  const generationStatus = fields['Message Generation Status'];

  function handleCopy() {
    if (!currentTab) return;
    const text = [currentTab.subject && `Subject: ${currentTab.subject}`, currentTab.body]
      .filter(Boolean)
      .join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {fields['Full Name'] || 'Unknown Lead'}
            </h2>
            <p className="text-sm text-gray-500">
              {fields['Job Title'] ? `${fields['Job Title']} at ` : ''}
              {fields['Company Name'] || ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close messages panel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lead details summary */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
          {fields['Email'] && (
            <div><span className="font-medium text-gray-500">Email:</span> {fields['Email']}</div>
          )}
          {fields['Location'] && (
            <div><span className="font-medium text-gray-500">Location:</span> {fields['Location']}</div>
          )}
          {fields['Company Website'] && (
            <div>
              <span className="font-medium text-gray-500">Website:</span>{' '}
              <a href={fields['Company Website']} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate">
                {fields['Company Website'].replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {fields['Company Size'] && (
            <div><span className="font-medium text-gray-500">Company Size:</span> {fields['Company Size']}</div>
          )}
          {fields['LinkedIn URL'] && (
            <div>
              <span className="font-medium text-gray-500">LinkedIn:</span>{' '}
              <a href={fields['LinkedIn URL']} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                Profile
              </a>
            </div>
          )}
        </div>

        {/* Generation status banner */}
        {generationStatus && generationStatus !== 'Generated' && (
          <div className={`px-6 py-2 text-sm ${
            generationStatus === 'Failed' || generationStatus === 'Skipped'
              ? 'bg-red-50 text-red-700'
              : 'bg-yellow-50 text-yellow-700'
          }`}>
            Message generation status: <strong>{generationStatus}</strong>
            {generationStatus === 'Skipped' && ' -- email was invalid or lead was a duplicate.'}
            {generationStatus === 'Failed' && ' -- the AI generation step returned an error.'}
            {generationStatus === 'Incomplete' && ' -- some messages were not generated.'}
            {generationStatus === 'Limited Context' && ' -- generated with minimal company context.'}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex px-6 -mb-px" aria-label="Message tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const hasContent = !!tab.body;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-3 px-3 border-b-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-indigo-500 text-indigo-600'
                      : hasContent
                        ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        : 'border-transparent text-gray-300 cursor-default'
                  }`}
                >
                  {tab.label}
                  {!hasContent && (
                    <span className="ml-1 text-xs text-gray-300">(empty)</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!hasAnyMessage ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51" />
              </svg>
              <p className="text-sm">No messages have been generated for this lead yet.</p>
            </div>
          ) : currentTab ? (
            <div>
              {currentTab.subject && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Subject
                  </label>
                  <div className="bg-gray-50 rounded-md px-4 py-2 text-sm text-gray-900 border border-gray-200">
                    {currentTab.subject}
                  </div>
                </div>
              )}
              {currentTab.body ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {currentTab.id === 'linkedin' ? 'Message' : 'Body'}
                    </label>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-md px-4 py-3 text-sm text-gray-800 border border-gray-200 whitespace-pre-wrap leading-relaxed">
                    {currentTab.body}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  This message has not been generated.
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
