export default function ErrorDisplay({ message, onDismiss, onRetry }) {
  if (!message) return null

  return (
    <div className="alert-error rounded-xl">
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{message}</p>
        {(onRetry || onDismiss) && (
          <div className="flex items-center gap-3 mt-1.5">
            {onRetry && (
              <button onClick={onRetry} className="text-xs font-medium underline underline-offset-2 hover:opacity-80 transition-opacity">
                Retry
              </button>
            )}
            {onDismiss && (
              <button onClick={onDismiss} className="text-xs font-medium opacity-70 hover:opacity-100 transition-opacity">
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  )
}
