# CRM Project – Analysis & Roadmap

This document summarizes what the app does today, then suggests **extra CRM features** and **frontend/backend improvements** you can add over time.

---

## 1. Current state (what you have)

### 1.1 Stack
- **Backend:** Node.js, Express 5, MongoDB (Mongoose), session auth, bcrypt, dotenv
- **Frontend:** EJS, Tailwind (CDN), Font Awesome, FullCalendar (meetings), ExcelJS (export)
- **Other:** Login logs with IP + optional geolocation (OpenCage), multi-tenant by Company

### 1.2 Data model
| Model        | Purpose |
|-------------|---------|
| **Company** | Tenant; one per organization |
| **User**    | name, email, passwordHash, role (admin \| employee), companyId |
| **Client**  | name, contactNumber, email, address, meetingDate, notes, status (ref StatusOption), companyId, addedBy |
| **StatusOption** | Custom statuses per company (e.g. Active, Pending) |
| **LoginLog**| userId, loginTime, IP, userAgent, lat/long, address fields |
| **Invitation** | email, companyId, invitedBy, tempPassword, accepted – **defined but not used in any route** |

### 1.3 Features in place
- **Auth:** Signup (creates company + admin), login, logout, profile, change password
- **Clients:** List (paginated, filter by status), add, edit, delete, Excel download, company-scoped
- **Employees:** List, add, edit, delete, view login logs (admin only), company-scoped
- **Admin:** Dashboard (counts + status breakdown), status options CRUD, meeting calendar (client meeting dates)
- **UX:** Sidebar (collapsible, persisted in localStorage), toasts, form loading state, empty states, table hover/striped/sticky header, basic inline validation

### 1.4 Gaps (quick observations)
- **Invitation** model is unused (no invite-employee flow).
- No global error handler; some routes send plain text on error.
- No rate limiting, no security headers (e.g. Helmet).
- No validation library (only ad-hoc checks).
- No tests.
- `console.log` left in client controller.
- StatusOption has global `unique: true` on `name` (should be per-company if two companies can have same status name).

---

## 2. Extra CRM features (by priority)

### High value, fits current model

1. **Client search**
   - Search clients by name, email, or phone (debounced input).
   - Backend: query with `$regex` or text index on Client; keep companyId and status filter.

2. **Assign client to employee (owner)**
   - Add `assignedTo: ObjectId ref User` (optional) on Client.
   - List/detail: show “Assigned to” and filter by “My clients” for employees.
   - Admin can assign/reassign when adding or editing a client.

3. **Activities / notes / timeline per client**
   - New model: **Activity** (clientId, userId, type: 'note' | 'call' | 'meeting', content, createdAt).
   - Client detail or “Activity” tab: list activities, add note/call/meeting.
   - Gives a simple timeline and history per client.

4. **Use Invitation for adding employees**
   - Replace “add employee with default password” with: admin sends invite (email); create Invitation with temp password (or link with token).
   - Invitee signs up with that email + temp password, sets new password; mark Invitation accepted and create User.
   - Improves security and onboarding.

5. **Follow-up / tasks**
   - New model: **Task** or **FollowUp** (clientId, assignedTo, dueDate, title, done, createdAt).
   - List “Due today” or “Overdue” on dashboard; simple list or calendar view.
   - Optional reminder (e.g. email or in-app).

6. **Dashboard “Recent activity” for real**
   - Today: placeholder content. Replace with real data: e.g. last 10 clients created/updated, last 5 logins, or last 5 activities.

### Medium value

7. **Client import (CSV)**
   - Upload CSV (name, email, phone, etc.); map columns; validate and bulk-create clients (company-scoped).
   - Reuse status options; set default status or leave empty.

8. **Meeting reminders**
   - Cron or scheduled job: find clients with `meetingDate` in next 24h (or 1h); send email or create in-app notification.
   - Requires minimal “notification” or email sending (e.g. Nodemailer + template).

9. **Simple pipeline / deal stage (optional)**
   - If you want “sales pipeline”: add a second dimension (e.g. “Stage”: Lead, Qualified, Proposal, Won, Lost) or reuse StatusOption as pipeline stages and add value/expected close date.

10. **Audit log**
    - New model: **AuditLog** (userId, action, entityType, entityId, old/new snapshot or diff, createdAt).
    - Log create/update/delete for Client and optionally User; show “History” on client or in admin.

### Nice to have

11. **Bulk actions on clients**
    - Select multiple clients; bulk update status or bulk assign to employee; bulk delete (with confirmation).

12. **Client detail page**
    - Dedicated page per client: info card, activities, tasks, meetings, edit button (instead of only list + edit form).

13. **Reports**
    - Beyond Excel export: e.g. “Clients by status”, “New clients per month”, “Meetings per month” (charts or tables).

14. **Notifications**
    - In-app: “New client assigned to you or new client add by x employee”, “Meeting tomorrow with X”. Store in DB, show badge in header/sidebar, mark as read.

---

## 3. Frontend improvements

### Already done (from FRONTEND-IMPROVEMENTS)
- Toasts, empty states, form loading, table improvements, inline validation, flash on redirect.

### Next steps (in order)

1. **Delete confirmation modal**
   - Replace `confirm()` for delete client/employee with a small modal: “Are you sure you want to delete …?” with Cancel / Delete. Reduces accidental deletes.

2. **Breadcrumbs**
   - e.g. `Dashboard > Clients > Edit John` under the page heading. Improves orientation and back navigation.

3. **Client search (UI)**
   - Search input on clients list; debounced request or form submit with `?search=...`. Goes with the “Client search” backend feature above.

4. **Pagination UX**
   - “Page 1 of 5” and optional page numbers (1, 2, 3 …) in addition to Prev/Next. Better for large lists.

5. **Skeleton loaders**
   - On clients/employees list and dashboard: show gray blocks while data loads, then replace with real content. Improves perceived performance.

6. **Accessibility**
   - Visible focus states (ring/outline) on links and buttons; `aria-label` on icon-only buttons; ensure contrast (WCAG AA). Helps keyboard and screen-reader users.

7. **Dark mode**
   - Toggle in sidebar or profile; persist in localStorage; use Tailwind `dark:` or CSS variables for main, sidebar, tables, forms.

8. **Error / offline handling**
   - On fetch/form submit failure: toast or banner “Something went wrong. Try again.” with optional retry. Improves resilience.

9. **Responsive tables**
   - On very small screens: consider card layout per client/employee instead of horizontal scroll only (or keep scroll but add “card view” toggle).

10. **Consistent layout**
    - Consider a single “layout” EJS that includes sidebar, main wrapper, and footer; each page only fills “main” content. Reduces duplication and keeps header/footer in sync.

---

## 4. Backend improvements

### Security & robustness

1. **Global error handler**
   - Central `app.use((err, req, res, next) => { ... })`: log err, respond with 500 and a generic message or render an error page. Prevents leaking stack traces and unhandled rejections.

2. **Async wrapper**
   - Wrap route handlers so unhandled promise rejections go to the error handler (e.g. `const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)`).

3. **Input validation**
   - Use **express-validator** (or Joi) for all POST/PUT body and critical query params: signup, login, client add/edit, employee add/edit, profile update, status options. Return 400 with clear messages instead of 500 or DB errors.

4. **Rate limiting**
   - Apply **express-rate-limit** to `/auth/login` and optionally to `/auth/signup` and API routes. Reduces brute force and abuse.

5. **Security headers**
   - Use **helmet** to set X-Content-Type-Options, X-Frame-Options, etc. Quick win for security.

6. **Session**
   - Already using SESSION_SECRET from env. Consider: session store (e.g. connect-mongo) if you scale or need cross-process sessions; and absolute session expiry (e.g. 7 days).

### Code quality

7. **Remove debug logs**
   - Remove `console.log(statusOptions)` and `console.log(user.companyId)` (and any similar) from production code; use a small logger if you need logs.

8. **Validation and sanitization**
   - Validate ObjectIds for `:id` params (return 400 if invalid) so Mongoose doesn’t throw. Sanitize strings if you render user input in HTML (EJS escapes by default; be careful with `-` raw output).

9. **StatusOption uniqueness**
   - If status names should be unique per company only: change to compound unique index `{ companyId: 1, name: 1 }` and remove global `unique: true` on `name`.

### Data & performance

10. **Indexes**
    - Client: `{ companyId: 1, createdAt: -1 }`, `{ companyId: 1, status: 1 }`, optional `{ companyId: 1, name: 1 }` or text index for search.
    - User: `{ companyId: 1, role: 1 }`, keep existing on `email`.
    - LoginLog: `{ userId: 1, loginTime: -1 }`.
    - StatusOption: `{ companyId: 1 }`, and compound unique above if used.

11. **Lean and select**
    - Use `.lean()` for read-only views (already done for client edit). Where possible use `.select()` to limit fields and reduce payload.

### Structure & maintainability

12. **Invitation flow**
    - Implement invite-employee flow using the Invitation model: create invitation, send email (or show link with token), accept page that sets password and creates User. Deprecate or keep “add employee with default password” as admin-only fallback.

13. **Environment and config**
    - Single `config.js` or `config/index.js` that reads from `process.env` and exports MONGODB_URI, SESSION_SECRET, PORT, NODE_ENV, OPENCAGE_API_KEY. Use it in app and controllers instead of scattering `process.env` everywhere.

14. **Logging**
    - Use a minimal logger (e.g. **pino** or **winston**) instead of `console.log`/`console.error` so you can level and structure logs later.

15. **Tests**
    - Start with a few critical paths: auth (login/signup), client CRUD (with company scoping), and maybe one API route. Jest + supertest is a common choice for Express + MongoDB.

---

## 5. Suggested order of work

**Phase 1 – Quick wins**
- Backend: global error handler + async wrapper, remove console.logs, add helmet, rate limit login.
- Frontend: delete confirmation modal, breadcrumbs.

**Phase 2 – Core CRM**
- Client search (backend + frontend).
- Assign client to employee (assignedTo + UI).
- Activities/notes per client (model + API + UI).

**Phase 3 – Security & quality**
- express-validator on all mutation routes.
- Invitation-based employee onboarding.
- Indexes and optional config module.

**Phase 4 – Polish**
- Dashboard with real recent activity, follow-ups/tasks, CSV import, or reports (pick based on priority).
- Frontend: pagination UX, skeleton loaders, dark mode, a11y.

You can adjust the order to match what matters most for your users (e.g. “assign to me” and “notes” first if sales team is the main user).
