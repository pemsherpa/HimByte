# Himbyte — roadmap, gaps, and go-to-market readiness

This document captures **what is still open**, **future work**, **requirements to mature into a full restaurant / hotel management system**, **testing expectations**, **pre-deployment checklist**, and **how to prepare credible client demos**.

---

## Current product snapshot

Himbyte is a multi-tenant **restaurant operating system** focused on QR ordering, staff approval flows, kitchen/staff surfaces, owner finance (vendors, payables), and HR basics (employees, employment history, **weekly shift templates**). Realtime and Supabase-backed features assume a configured project with migrations applied.

---

## Remaining work (near-term)

These items are commonly still needed before calling the product “complete” for operations-heavy venues:

| Area | Gap |
|------|-----|
| **HR / shifts** | Shift templates are **weekly recurring, same calendar day** only (`010_employee_shifts.sql`). No overnight shifts, split shifts as first-class data, or calendar-specific overrides (holidays). |
| **Payroll** | Salary fields are indicative; no tax/VAT on payroll, no payslips, no bank export, no attendance vs shifts reconciliation. |
| **Inventory / recipes** | Menu and stock are not fully tied to COGS, wastage, or supplier lot tracking. |
| **Reporting** | Owner analytics exist; limited P&amp;L, cash vs digital split, and Nepal-specific statutory reports (where applicable). |
| **Permissions** | Fine-grained roles (e.g. cashier-only, floor-only) may need expansion beyond current profile roles. |
| **Offline / resilience** | Limited offline behavior for POS or KDS; depends on connectivity. |
| **Mobile apps** | Web-first; native apps are optional for scale. |

*(See also `remaining.md` in the repo for any task-specific notes.)*

---

## Future work (mid–long term)

- **Workforce**: clock-in/out, attendance vs scheduled shifts, leave requests, overtime rules.
- **Scheduling**: drag-and-drop roster, open shifts, swap requests, notifications (SMS/WhatsApp where viable).
- **Integrations**: payment gateways, fiscal printers, e-invoicing where required, accounting exports (CSV/API).
- **Multi-branch**: one owner, many outlets, consolidated reporting.
- **Compliance**: data retention, consent, audit logs for sensitive HR/financial actions.
- **Performance**: load testing on realtime order volume, DB indexes, caching for read-heavy dashboards.

---

## Requirements for a “proper” management system (target bar)

Use this as a product checklist, not only engineering:

1. **Multi-tenancy**: Strict `restaurant_id` isolation in app logic; RLS aligned in Supabase for direct client access patterns.
2. **Auditability**: Who changed prices, approved orders, edited payroll-related fields, deleted shifts.
3. **Reliability**: Backups, migration discipline, health checks, error monitoring (see deployment section).
4. **Security**: Secrets only on server; service role never exposed to browsers; staff auth session handling reviewed.
5. **Operational runbooks**: How to onboard a tenant, reset demo data, handle subscription states.
6. **Support**: Known limitations documented (e.g. shift model, VAT fields).

---

## Types of testing (recommended)

| Type | Purpose |
|------|--------|
| **Unit** | Pure helpers (pricing, time parsing, urgency calculations). |
| **Integration** | API routes against Supabase (or demo mode) for orders, admin, owner HR, shifts. |
| **E2E (Playwright/Cypress)** | Critical paths: guest QR → order → staff approve → KDS; owner creates menu item; owner adds employee + shift. |
| **Manual / exploratory** | UX on phones, tablets, poor network; staff gate under concurrent orders. |
| **Security** | RLS policy tests; JWT expiry; cross-tenant access attempts on IDs. |
| **Load / soak** (pre-scale) | Realtime fan-out, order burst during peak hours simulation. |
| **Accessibility** | Keyboard, contrast, touch targets for staff in low light. |

Automate at least **smoke E2E** + **API integration** on the main branch before widening production use.

---

## Before deployment (checklist)

**Environment**

- [ ] `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` set on API; client has `VITE_SUPABASE_*` where needed.
- [ ] `CLIENT_URL` / CORS origins include production frontend URLs.
- [ ] All SQL migrations applied (including `010_employee_shifts.sql` for shift management).

**Application**

- [ ] Demo mode **off** in production (`SUPABASE_URL` must be set).
- [ ] Storage buckets and policies for menu images (see `005_storage_menu_images.sql`).
- [ ] Error tracking (e.g. Sentry) and structured logging on API.
- [ ] Rate limiting / abuse considerations on public guest endpoints if exposed.

**Data & compliance**

- [ ] Backup strategy documented (Supabase backups + restore drill).
- [ ] PII handling understood (guest contact, employee data).

**Process**

- [ ] Version tagging / changelog for customer-facing releases.
- [ ] Rollback plan for migrations and deploys.

---

## Making it ready to show prospective clients

1. **Stable demo tenant**: One polished restaurant (realistic menu, photos, table/room QR labels) plus a **scripted walkthrough** (5–10 minutes): QR → order → approval → kitchen → optional hotel service.
2. **Owner story**: Vendors/payables + HR with at least one employee and **weekly shifts** configured so the “operations” narrative lands.
3. **Honest positioning**: Lead with QR ordering + staff workflows; present finance/HR as “owner cockpit” modules that grow with their needs.
4. **Leave-behind**: One-pager PDF or short URL with pricing posture, support SLA (even if “beta”), and **known limitations** (e.g. shift model v1).
5. **Capture feedback**: Simple form or notes template (role, venue type, must-have vs nice-to-have).

---

## Document maintenance

Update this file when major modules ship or when go-live criteria change. Link new migrations (e.g. shift tables) in release notes so operators know what to apply.
