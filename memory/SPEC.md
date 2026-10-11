# DigiPhonics Technology — IT Recruitment & Career Placement Platform

Recruitment/placement company site + portals. **NOT a training institute** — no courses,
batches, or enrollment fees anywhere in the product.

Stack: FastAPI + motor/MongoDB backend (`/api`), Vite + React 19 + TS strict frontend.
Sessions are httpOnly cookies (`dp_session`), DB-backed in `sessions` (TTL index).

## Roles
`candidate` · `employer` (both self-register) · `employee` · `admin` (created only from
`/admin/users` — public registration can never create staff).

## Candidate tracks (one unified profile; category is switchable without losing history)
`fresher`, `non_it_to_it`, `career_gap`, `experienced` — landing pages at
`/candidates/{freshers|non-it-to-it|career-gap|experienced}`.

## Public routes
`/` · `/about` · `/candidates/:slug` · `/jobs` · `/jobs/:jobId` · `/interview-questions` ·
`/resume-resources` · `/employer` · `/contact` · `/privacy` · `/terms` ·
`/service-agreement` · `/refund-policy` · `/login` · `/register`

## Portals
- **Candidate** `/dashboard` (+ `/profile`, `/applications`, `/saved`, `/offers`, `/services`)
- **Employee** `/employee` — assigned work only (tabs: assigned work, offer reviews, profile+ID)
- **Admin** `/admin` (+ `/jobs`, `/applications`, `/questions`, `/offers`, `/fees`, `/users`, `/content`, `/enquiries`)

## Key flows
1. **Employer submission → moderation**: `POST /api/employer/submissions` creates `status=pending`;
   only `status=approved` is publicly listed. Admin moderates (`approved|rejected|paused|closed|archived`)
   and separately sets `verification_status` (`verified|unverified`) — verified is set manually only
   after employer/vacancy checks. Recruiter contact fields are masked for non-staff/non-owner.
2. **Application tracking**: stages `applied → under_review → shortlisted → interview_scheduled →
   interview_completed → selected|not_selected → offer_received → joined|closed`. Only admin, or an
   employee with an `application` assignment, can change a stage. Every change appends to
   `status_history` (actor + timestamp) and notifies the candidate.
3. **Interviews**: `POST /api/applications/{id}/interviews` (date/time, tz, type, link/venue,
   interviewer) auto-moves the application to `interview_scheduled` + notifies.
4. **Offers/placement**: candidate submits offer + private PDF; admin or assigned employee records
   `approved|needs_resubmission|rejected`. Approved = verified placement. Offer letters are never public.
5. **Service charges**: admin configures a service (name, amount, currency, tax, who pays, trigger
   conditions, refund terms, due terms; material edits bump `version`). Candidate must accept terms
   (`fee_agreements` stores version + timestamp) **before** an invoice can be issued — the backend
   rejects invoicing a candidate without an agreement. **Payments are DISABLED**: confirmation is
   manual admin reconciliation only, which then issues a receipt. Candidates can dispute.
6. **Files**: private storage in `backend/uploads`, metadata in `files`. Access via
   `POST /api/files/{id}/download-link` → 5-minute token. Admin: all; owner: own; employee: only files
   on records assigned to them. Extension allow-lists per category, 5 MB cap.
7. **Questions**: public browse/search/filter/paginate; candidates bookmark; `/questions/practice`
   returns a random set. Admin CRUD + validated CSV import (`question,category,topic,difficulty,
   question_type,answer,explanation,example,options(|),tags(|),published`).
8. **Content**: `site_content` key/value, admin-editable; frontend falls back to `DEFAULT_CONTENT`
   in `src/lib/constants.ts` so pages render with no backend.

## Collections
users, sessions, candidate_profiles, employer_profiles, employee_profiles, jobs, applications,
interviews, saved_jobs, questions, question_bookmarks, offer_submissions, service_configs,
fee_agreements, fee_records, notifications, contact_enquiries, assignments, audit_logs,
site_content, files, download_tokens

## Seed data
`backend/seed.py` creates **only** the admin + employee accounts (see
`memory/test_credentials.md`). **No demo jobs, questions, or candidates** — the owner enters real
data through the portals. Every list view therefore has a designed empty state.

`backend/reset_data.py` purges all business data (jobs, applications, questions, fees, offers,
enquiries, audit logs, non-staff users) while keeping the two staff accounts — used to clear
test data.

## Notes
- `GET /api/content/{key}` returns a 200 with `value: ""` when the admin has not customised that
  key; the frontend then renders the bundled `DEFAULT_CONTENT` copy. Never a 404.
- Any route returning a raw Mongo doc must pass it through `clean()` (`lib/storage.py`) to drop
  `_id` — a leaked `ObjectId` is not JSON-serializable and surfaces as a 500.
- Guests trigger one expected `401 /api/auth/me` (the `useMe` probe, `retry: false`); this is how
  the public site renders role-aware nav and is not an error.

## Deliberate behaviours (not bugs)
- Empty DB: job board, question library, services and all portal lists show empty states.
- Online payment collection is intentionally disabled (owner's choice + spec requirement).
- Notifications are in-app only (no email provider configured).
- An employee sees nothing until an admin assigns them a job/application/offer.
