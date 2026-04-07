import { getConfigError } from '../api/airtable';
import PersonaForm from '../components/PersonaForm';
import PersonaList from '../components/PersonaList';
import { useToast, ToastContainer } from '../components/Toast';

export default function PersonasPage() {
  const configError = getConfigError();
  const { toasts, addToast, removeToast } = useToast();

  if (configError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Configuration Required
          </h2>
          <p className="text-sm text-red-700 mb-4">{configError}</p>
          <div className="rounded-md bg-white border border-red-200 p-4 text-sm font-mono text-gray-700">
            <p className="text-gray-500 mb-1"># 1. Copy the example env file</p>
            <p>cp .env.example .env</p>
            <p className="text-gray-500 mt-3 mb-1"># 2. Fill in your values in .env</p>
            <p>VITE_AIRTABLE_API_KEY=pat...</p>
            <p>VITE_AIRTABLE_BASE_ID=app...</p>
            <p className="text-gray-500 mt-3 mb-1"># 3. Restart the dev server</p>
            <p>npm run dev</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Target Personas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define your ideal lead profile. Submitting with "Submit & Run" will trigger the n8n automation pipeline.
        </p>
      </div>

      <PersonaForm onToast={addToast} />
      <PersonaList onToast={addToast} />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
