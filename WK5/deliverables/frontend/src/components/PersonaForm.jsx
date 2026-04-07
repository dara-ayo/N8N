import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPersona, triggerWorkflow } from '../api/airtable';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const INITIAL_FORM = {
  jobTitle: '',
  location: '',
  companySize: '',
  keywords: '',
};

/**
 * Validates form values and returns an object mapping field names to error
 * messages. An empty object means no errors.
 */
function validate(values) {
  const errors = {};

  if (!values.jobTitle.trim()) {
    errors.jobTitle = 'Job Title is required. Enter the role you are targeting (e.g., "Head of Operations").';
  } else if (values.jobTitle.trim().length < 2) {
    errors.jobTitle = 'Job Title must be at least 2 characters.';
  }

  if (!values.location.trim()) {
    errors.location = 'Location is required. Enter a city, country, or "Remote".';
  } else if (values.location.trim().length < 2) {
    errors.location = 'Location must be at least 2 characters.';
  }

  if (!values.companySize) {
    errors.companySize = 'Select a company size range.';
  }

  // Keywords are optional per schema but required per spec
  if (!values.keywords.trim()) {
    errors.keywords = 'Add at least one keyword to refine the search (e.g., "SaaS, automation, AI").';
  }

  return errors;
}

export default function PersonaForm({ onToast }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [webhookPhase, setWebhookPhase] = useState(null); // null | 'triggering' | 'done' | 'error'

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ fields }) => {
      // Step 1: Create the persona record in Airtable
      const result = await createPersona(fields);

      // Step 2: If status is "Ready to Run", trigger the n8n webhook
      if (fields.Status === 'Ready to Run' && result?.id) {
        setWebhookPhase('triggering');
        try {
          await triggerWorkflow(result.id);
          setWebhookPhase('done');
          onToast?.({
            type: 'success',
            message: 'Pipeline triggered! The n8n workflow is now processing your persona.',
          });
        } catch (webhookErr) {
          setWebhookPhase('error');
          // The persona was created successfully, so we don't throw here.
          // Instead, notify the user that the record was saved but the
          // webhook failed, so they can retry via the Run button.
          onToast?.({
            type: 'error',
            message: `Persona saved, but failed to trigger pipeline: ${webhookErr.message}. Use the "Run" button to retry.`,
            duration: 8000,
          });
        }
      } else {
        onToast?.({
          type: 'success',
          message: 'Persona saved as Draft.',
        });
      }

      return result;
    },
    onSuccess: () => {
      setForm(INITIAL_FORM);
      setErrors({});
      setTouched({});
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    },
    onSettled: () => {
      // Reset webhook phase after a short delay so the user sees the feedback
      setTimeout(() => setWebhookPhase(null), 2000);
    },
  });

  function handleChange(field, value) {
    const next = { ...form, [field]: value };
    setForm(next);

    // Clear error for this field on change if it was touched
    if (touched[field]) {
      const newErrors = validate(next);
      setErrors((prev) => ({
        ...prev,
        [field]: newErrors[field] || undefined,
      }));
    }
  }

  function handleBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const newErrors = validate(form);
    setErrors((prev) => ({
      ...prev,
      [field]: newErrors[field] || undefined,
    }));
  }

  function handleSubmit(status) {
    // Mark all fields as touched
    setTouched({ jobTitle: true, location: true, companySize: true, keywords: true });

    const validationErrors = validate(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    const fields = {
      'Job Title': form.jobTitle.trim(),
      Location: form.location.trim(),
      'Company Size': form.companySize,
      Keywords: form.keywords.trim(),
      Status: status,
    };

    setWebhookPhase(null);
    mutation.mutate({ fields });
  }

  const isSubmitting = mutation.isPending;
  const isRunAction = mutation.variables?.fields?.Status === 'Ready to Run';

  const inputClass = (field) =>
    `w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none transition-colors ${
      errors[field] && touched[field]
        ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
        : 'border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
    }`;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Create Target Persona
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        Define who you want to find. The automation will search for leads matching these criteria.
      </p>

      {/* Success banner */}
      {mutation.isSuccess && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Persona created successfully.
          {isRunAction && webhookPhase === 'done'
            ? ' The n8n pipeline has been triggered and is running.'
            : isRunAction && webhookPhase === 'error'
            ? ' Saved as "Ready to Run", but the pipeline trigger failed. Use the "Run" button in the list below to retry.'
            : isRunAction && webhookPhase === 'triggering'
            ? ' Triggering the n8n pipeline...'
            : ' It has been saved as a Draft.'}
        </div>
      )}

      {/* Error banner */}
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <strong>Failed to create persona:</strong>{' '}
          {mutation.error?.message || 'An unexpected error occurred. Please try again.'}
        </div>
      )}

      <div className="space-y-4">
        {/* Job Title */}
        <div>
          <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
            Job Title <span className="text-red-500">*</span>
          </label>
          <input
            id="jobTitle"
            type="text"
            placeholder='e.g., "Head of Operations", "Founder", "CEO"'
            value={form.jobTitle}
            onChange={(e) => handleChange('jobTitle', e.target.value)}
            onBlur={() => handleBlur('jobTitle')}
            className={inputClass('jobTitle')}
            disabled={isSubmitting}
          />
          {errors.jobTitle && touched.jobTitle && (
            <p className="mt-1 text-xs text-red-600">{errors.jobTitle}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            id="location"
            type="text"
            placeholder='e.g., "New York, USA", "London, UK", "Remote"'
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            onBlur={() => handleBlur('location')}
            className={inputClass('location')}
            disabled={isSubmitting}
          />
          {errors.location && touched.location && (
            <p className="mt-1 text-xs text-red-600">{errors.location}</p>
          )}
        </div>

        {/* Company Size */}
        <div>
          <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-1">
            Company Size <span className="text-red-500">*</span>
          </label>
          <select
            id="companySize"
            value={form.companySize}
            onChange={(e) => handleChange('companySize', e.target.value)}
            onBlur={() => handleBlur('companySize')}
            className={inputClass('companySize')}
            disabled={isSubmitting}
          >
            <option value="">Select a size range...</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} employees
              </option>
            ))}
          </select>
          {errors.companySize && touched.companySize && (
            <p className="mt-1 text-xs text-red-600">{errors.companySize}</p>
          )}
        </div>

        {/* Keywords */}
        <div>
          <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
            Keywords <span className="text-red-500">*</span>
          </label>
          <textarea
            id="keywords"
            rows={3}
            placeholder='Comma-separated keywords to refine the search, e.g., "SaaS, automation, AI, operations"'
            value={form.keywords}
            onChange={(e) => handleChange('keywords', e.target.value)}
            onBlur={() => handleBlur('keywords')}
            className={inputClass('keywords')}
            disabled={isSubmitting}
          />
          {errors.keywords && touched.keywords && (
            <p className="mt-1 text-xs text-red-600">{errors.keywords}</p>
          )}
        </div>

        {/* Submit buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSubmit('Draft')}
            disabled={isSubmitting}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting && !isRunAction
              ? 'Saving...'
              : 'Save as Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('Ready to Run')}
            disabled={isSubmitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting && isRunAction
              ? webhookPhase === 'triggering'
                ? 'Triggering pipeline...'
                : 'Submitting...'
              : 'Submit & Run'}
          </button>
        </div>
      </div>
    </div>
  );
}
