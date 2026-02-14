# CRM – Feature Suggestions & Improvement Guide

This document reflects analysis of your **current codebase** and suggests **additional features**, **must-haves for a CRM**, and **concrete improvements**.

---

## 1. What You Have Today (Current State)

### Implemented features
- **Auth:** Signup (company + admin), login, logout, profile, change password
- **Clients:** List (paginated, filter by status & assigned, **search by name/email/phone**), add, edit, delete, **bulk update status / bulk assign / bulk delete**, Excel export, **assignedTo (owner)**
- **Employees:** List (**sorted by name**), add, **invite by email** (Invitation flow), edit, delete, view login logs (admin)
- **Admin:** Dashboard (counts, status breakdown, recent activity, overdue/due-today tasks), **status options** (sorted by name), meeting calendar
- **Activities:** Notes/calls/meetings per client (client detail page)
- **Tasks:** Follow-up tasks per client (due date, assignee, done toggle)
- **Notifications:** In-app (client added, client assigned, bulk assigned, meeting reminder), sidebar badge, mark as read
- **UX:** Sidebar (collapsible, persisted), toasts, empty states, **icon-only actions** in tables, **alphabetical sort** (clients, employees, status options)

### Tech stack
- Node.js, Express, MongoDB (Mongoose), EJS, Tailwind (CDN), Font Awesome, session auth, Helmet, rate limiting (auth), express-validator (selected routes), Mailgun (email), ExcelJS (export)

---

## 2. Other Features You Can Add (Prioritized)

### High value (core CRM)

| Feature | Description | Effort |
|--------|-------------|--------|
| **Deal / opportunity value** | Add `value` (number) and `expectedCloseDate` to Client (or a separate Deal model). Dashboard: “Pipeline value”, “Won this month”. | Small |
| **Pipeline / sales stages** | Use status as “stage” (Lead → Qualified → Proposal → Won/Lost) or add a separate Stage model with order. Kanban view: drag clients between stages. | Medium |
| **Client import (CSV)** | Upload CSV; map columns to Client fields; bulk create with validation. Reuse status options. | Medium |
| **Contact history timeline** | Single timeline on client detail merging Activities + Tasks + status changes (and optionally “Client created/updated”). | Small |
| **Email integration** | Log “email sent” as activity; optional “Send email” from client detail (using your Mailgun). | Medium |
| **Custom fields** | Admin-defined custom fields per company (e.g. “Industry”, “Budget”). Store as key-value or JSON on Client. | Medium |

### Medium value (productivity & reporting)

| Feature | Description | Effort |
|--------|-------------|--------|
| **Reports & charts** | “Clients by status”, “New clients per month”, “Meetings per month” (tables + simple charts, e.g. Chart.js). | Medium |
| **Advanced filters** | Filter clients by date range (created/meeting), assigned, status, and combine with search. Save filter presets. | Medium |
| **Audit log** | Log who changed what (client/employee/status). Model: userId, action, entityType, entityId, changes, createdAt. “History” tab on client. | Medium |
| **Reminders for tasks** | Email or in-app reminder X hours before task due (reuse notification + Mailgun). | Small |
| **Dashboard widgets** | Let admin/employee choose widgets (e.g. “My overdue tasks”, “Clients added this week”, “Upcoming meetings”). | Medium |
| **Mobile-friendly list** | Card view for clients/employees on small screens instead of horizontal scroll only. | Small |

### Nice to have

| Feature | Description | Effort |
|--------|-------------|--------|
| **Document attachment** | Store files per client (contract, proposal). Use local storage or S3; link from client detail. | Medium |
| **Duplicate client detection** | On add/edit, warn if similar name/email exists (fuzzy or exact match). | Small |
| **Bulk email** | Select clients, compose one email, send via Mailgun (to verified addresses). | Medium |
| **Two-factor auth (2FA)** | TOTP (e.g. spektr) for admin or all users. | Medium |
| **API for integrations** | REST API key for company; endpoints to list/create/update clients (for Zapier, other tools). | Medium |

---

## 3. What Must Be in a CRM Tool (Checklist)

These are commonly expected in a CRM; you already have most of the first block.

### You already have
- **Contact/account management** – Clients with name, email, phone, address, notes
- **Ownership / assignment** – assignedTo (owner) and “My clients” view
- **Status / stage** – Custom status options and filtering
- **Activities** – Notes, calls, meetings per client
- **Tasks / follow-ups** – Due dates, assignee, completion
- **Search** – By name, email, phone
- **Multi-user & roles** – Admin vs employee, company-scoped
- **Basic reporting** – Excel export, dashboard counts
- **Notifications** – In-app for assignments and reminders
- **Meetings** – Meeting date on client + calendar view

### Strongly recommended (you’re close or can add soon)
- **Pipeline / deal value** – See “what’s in the pipeline” and “value” (you have status; adding value + optional stages completes this)
- **History / audit** – Who did what and when (audit log + timeline)
- **Email from CRM** – At least “log email” or “send email” linked to client (you have Mailgun)
- **Import** – CSV import for clients (very common ask)
- **Mobile-friendly UI** – Responsive + optional card view for lists

### Often expected in “full” CRMs (later)
- **Reporting & dashboards** – Charts, saved reports, scheduled emails
- **Custom fields** – Company-specific data
- **Integrations** – Calendar sync, email sync, API
- **Document storage** – Files per contact/deal
- **Territory / team** – Teams or regions with visibility rules

---

## 4. Other Improvements You Can Make

### 4.1 Code & architecture
- **Single layout EJS** – One `layout.ejs` (sidebar + main wrapper + footer); each page only fills “main”. Reduces duplication.
- **Config module** – Central `config.js` reading `process.env` (MONGODB_URI, SESSION_SECRET, PORT, MAILGUN_*, etc.) and use it everywhere instead of scattering `process.env`.
- **Logging** – Replace `console.log`/`console.error` with a logger (e.g. pino or winston) with levels and structure.
- **Remove debug logs** – Search for any remaining `console.log` in controllers and remove or gate behind `NODE_ENV`.
- **Indexes** – Ensure indexes for: Client `{ companyId: 1, name: 1 }`, `{ companyId: 1, status: 1 }`, `{ companyId: 1, assignedTo: 1 }`; Notification `{ userId: 1, read: 1 }`; Task/Activity by client and date where needed.

### 4.2 Security & robustness
- **CSRF** – Add CSRF tokens for state-changing forms (e.g. `csurf` or `csrf-csrf`) to protect against cross-site request forgery.
- **Session store** – Use `connect-mongo` (or similar) for session persistence and shared sessions across processes.
- **Input validation** – Ensure all mutation routes use express-validator (or equivalent); validate and sanitize ObjectIds for `:id` params.
- **Global error handler** – Ensure all errors go through one handler; return generic message to user and log details (you have errorHandler; verify it’s used for all routes).

### 4.3 Frontend & UX
- **Delete confirmation modal** – Replace `confirm()` with a small modal (“Are you sure…?” with Cancel / Delete) for delete actions.
- **Breadcrumbs** – e.g. `Dashboard > Clients > Edit John` for orientation and back navigation.
- **Pagination** – “Page 1 of N” and optional page number links in addition to Prev/Next.
- **Accessibility** – `aria-label` on icon-only buttons (you use `title`; add `aria-label` too); visible focus states; sufficient contrast.
- **Loading states** – Skeleton loaders or spinners on list/dashboard load; disable submit and show “Saving…” on form submit (you have form loading; extend to lists if needed).
- **Error/retry** – On failed fetch or submit, show toast “Something went wrong. Try again.” with optional retry.

### 4.4 Data & product
- **StatusOption uniqueness** – If names must be unique per company only, use compound unique index `{ companyId: 1, name: 1 }` instead of global unique on `name`.
- **Soft delete for clients** – Optional: add `deletedAt`; filter out deleted by default; allow “restore” and “purge” from admin. Keeps history and avoids accidental data loss.
- **Meeting timezone** – Store `meetingDate` in UTC and display in user’s timezone (or store timezone per company/user) for clarity in multi-timezone use.

### 4.5 Testing & quality
- **Tests** – Add a few critical tests: login/signup, client CRUD (with company scoping), one notification or bulk action. Jest + supertest is a good fit.
- **API versioning** – If you add a public API later, use path prefix (e.g. `/api/v1/`) from the start.

---

## 5. Suggested Order of Work

1. **Quick wins** – Delete confirmation modal, breadcrumbs, remove console logs, ensure indexes and StatusOption per-company uniqueness.
2. **High-value CRM** – Deal value + expected close date; client CSV import; single “Contact history” timeline on client detail.
3. **Reporting** – “Clients by status” and “New clients per month” (table + simple chart).
4. **Robustness** – CSRF, session store, full validation on all mutations, tests for auth and client CRUD.
5. **Polish** – Audit log, custom fields or pipeline view, mobile card view, 2FA if needed.

You can adjust this order to match what your users need most (e.g. import and reports before deal value).
