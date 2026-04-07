# WK5 LeadGen Frontend -- Setup Instructions

## Prerequisites

- **Node.js 18+** (check with `node --version`)
- **npm 9+** (check with `npm --version`)
- An **Airtable account** with the WK5-LeadGen base already set up (see `airtable_schema.md`)

---

## 1. Install dependencies

```bash
cd deliverables/frontend
npm install
```

This will install React 18, Vite, Tailwind CSS, TanStack Query, and React Router.

---

## 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set these two values:

```
VITE_AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
VITE_AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

### How to find your Airtable API Key (Personal Access Token)

1. Go to [https://airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click **Create new token**
3. Give it a name (e.g., "WK5 LeadGen Frontend")
4. Under **Scopes**, add:
   - `data.records:read` -- to list personas and leads
   - `data.records:write` -- to create persona records
5. Under **Access**, add your WK5-LeadGen base
6. Click **Create token** and copy the value (it starts with `pat`)

### How to find your Airtable Base ID

1. Go to [https://airtable.com/developers/web/api/introduction](https://airtable.com/developers/web/api/introduction)
2. Select your **WK5-LeadGen** base from the list
3. The Base ID is shown in the introduction section and in the URL -- it starts with `app` (e.g., `appABC123XYZ456`)

---

## 3. Start the dev server

```bash
npm run dev
```

The app will start at **http://localhost:5173** and should open automatically in your browser.

---

## 4. What you should see

### Personas page (`/personas` -- the default route)

- A **Create Target Persona** form with fields for Job Title, Location, Company Size, and Keywords
- Two submit buttons: **Save as Draft** and **Submit & Run**
- Below the form, a **Recent Personas** table showing any existing personas from your Airtable base with their status and lead count
- If no personas exist yet, you will see an empty state message

### Leads page (`/leads`)

- A **filter bar** at the top with:
  - Search input (searches across name, company, and email)
  - Pipeline Status dropdown
  - Email Status dropdown
  - Source Persona dropdown
  - "Ready for Review" quick-filter button
  - "Clear All" link (appears when filters are active)
- A **data table** showing all leads with their name, email (with validation badge), website/LinkedIn links (with status badges), and pipeline status
- A **View Messages** button on each row that opens a slide-over panel showing the 3-step email sequence and LinkedIn message
- **Pagination** controls at the bottom (25 leads per page)
- If no leads exist yet, you will see a helpful empty state message

---

## 5. Production build

To create a production build:

```bash
npm run build
```

The output will be in the `dist/` directory. You can preview it locally:

```bash
npm run preview
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Configuration Required" error on page load | Your `.env` file is missing or the variables are not set. Copy `.env.example` to `.env` and add your values, then restart the dev server. |
| "Airtable API returned 401" | Your API key is invalid or expired. Generate a new Personal Access Token at [airtable.com/create/tokens](https://airtable.com/create/tokens). |
| "Airtable API returned 404" | Your Base ID is wrong, or the table names don't match the schema. The tables must be named exactly "Target Personas" and "Leads". |
| "Airtable API returned 422" | A field name in the request doesn't match the Airtable base. Verify all field names match `airtable_schema.md` exactly. |
| Styles not loading | Make sure `npm install` completed successfully. Tailwind CSS is processed by PostCSS during development. |
| Page is blank with no errors | Open the browser console (F12) and check for JavaScript errors. Most likely a missing environment variable. |
