# National Accounts — Internal Portal

A premium internal web application built for **National Accounts**, an Australian chartered accounting firm. Designed for 16 staff members to manage clients, jobs, compliance, and productivity across the practice.

---

## Brand & Design System

| Token | Value | Usage |
|---|---|---|
| Deep Navy | `#0D1B2A` | Primary anchor, sidebar, headings |
| Gold/Champagne | `#C9A84C` | Accent, CTA buttons, active states |
| Crisp White | `#FFFFFF` | Primary background |
| Cool Grey | `#F4F5F7` | Section backgrounds |
| Dark Slate | `#2D3748` | Body text |
| Card Border | `#E2E8F0` | Borders, dividers |
| Success | `#22C55E` | Cleared / reconciled states |
| Warning | `#F59E0B` | Needs review / amber alerts |
| Error | `#EF4444` | Flagged / overdue items |

**Typography:** Inter (clean modern sans-serif)
**Feel:** Corporate-Luxury — professional chartered accountant meets premium fintech

---

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (dev server & build)
- **Tailwind CSS** with semantic design tokens
- **shadcn/ui** component library
- **React Router v6** (client-side routing)
- **TanStack React Query** (data fetching layer)
- **Recharts** (charts & data visualisation)
- **Framer Motion** (animations)
- **Lucide React** (icons)

---

## Pages & Flows

### 1. Dashboard (`/`)

**Purpose:** At-a-glance overview of practice operations.

- **Stat cards** across the top: Total Clients (2,000), Jobs In Progress, Overdue Items, Team Utilisation
- **Recent Jobs panel** showing the latest jobs with client name, job type, assigned staff, due date, and AI review status
- **Team Capacity panel** with utilisation bars per staff member (green < 70%, amber 70–85%, red > 85%)
- Export button for data download

### 2. BAS Review (`/bas-review`)

**Purpose:** Quarterly BAS compliance review with AI-assisted flagging.

- Tabular list of 200–300 BAS returns per quarter
- Each row displays: Client name, Period, Status badge (Pending Review / Flagged / Cleared), AI flag count, Assigned staff
- **AI Status indicators:** Green tick (cleared), Amber (needs review), Red (flagged — miscoded transactions, GST errors)
- Search by client name
- Filter by status
- Export functionality

### 3. Job Pipeline (`/job-pipeline`)

**Purpose:** Kanban-style workflow tracking for all jobs.

- **Five stages:** ITR Draft → Prepared → Completed → Approved → Sent
- Each card shows: Client name, Assigned staff, Due date, Days in current stage
- Cards are colour-coded by urgency (overdue items highlighted in red)
- Filter by staff member dropdown
- Navy column headers with gold accent on active/hovered stage
- Search across all columns

### 4. Productivity Reports (`/productivity`)

**Purpose:** Weekly staff performance and capacity tracking.

- Table of all 16 staff members
- Columns: Staff name, Jobs completed, Utilisation %, Capacity bar, AI review stats
- **Capacity bars:** Green (< 70%), Amber (70–85%), Red (> 85%)
- Clearly identifies underutilised and overloaded staff
- Export to PDF button

### 5. Payroll Reconciliation (`/payroll-rec`)

**Purpose:** Track payroll reconciliation status per client per period.

- Client list with period-based reconciliation status
- Columns: Client, Period, Status (Reconciled / Outstanding / Discrepancy), Reconciled count, Outstanding count, Discrepancies count, AI Review
- Flagged discrepancies highlighted with destructive colour
- AI review indicators on each row
- Search and export

### 6. Super Reconciliation (`/super-rec`)

**Purpose:** Superannuation compliance tracking (SGA obligations).

- Same layout pattern as Payroll Reconciliation
- Columns: Client, Period, Status (Compliant / Non-Compliant / Outstanding), Compliance %, Outstanding items, AI Review
- SGA compliance status clearly visible per client
- Search and export

### 7. Client Records (`/clients`)

**Purpose:** Master client database with grading system.

- Searchable table of 2,000+ clients
- Columns: Client name, Industry, Grade, Assigned staff, Active jobs, Revenue, AI status
- **Grading system:** Bronze, Silver, Gold, Platinum — displayed as coloured badge tags
- **Bulk operations:** Select multiple clients via checkboxes, bulk update grades via dropdown
- Filter by grade tier
- Search by client name
- Export functionality

---

## Global UI Elements

| Element | Description |
|---|---|
| **Sidebar** | Deep navy background, gold active-state indicators, collapsible to icon-only mode |
| **Top Navigation** | Logo left ("National Accounts" in navy, "Internal Portal" in gold), notification bell with red dot, user avatar right |
| **AI Status Badges** | Tri-state on every data screen: ✓ Cleared (green), ⚠ Review (amber), ✕ Flagged (red) |
| **Search** | Available on every data screen |
| **Export** | Gold CTA button on every screen |
| **Status Badges** | Contextual colour-coded pills for all workflow states |

---

## Component Architecture

```
src/
├── components/
│   ├── AppLayout.tsx          # Main layout wrapper (sidebar + top nav + content)
│   ├── AppSidebar.tsx         # Collapsible navy sidebar with navigation
│   ├── TopNav.tsx             # Top bar with user info and notifications
│   ├── PageHeader.tsx         # Reusable page header with search & export
│   ├── AIStatusBadge.tsx      # Tri-state AI review indicator
│   ├── StatusBadge.tsx        # Generic status pill component
│   ├── GradeBadge.tsx         # Client tier badge (Bronze–Platinum)
│   ├── NavLink.tsx            # Active-aware navigation link
│   └── ui/                   # shadcn/ui primitives
├── pages/
│   ├── Dashboard.tsx
│   ├── BASReview.tsx
│   ├── JobPipeline.tsx
│   ├── Productivity.tsx
│   ├── PayrollRec.tsx
│   ├── SuperRec.tsx
│   ├── ClientRecords.tsx
│   └── NotFound.tsx
├── hooks/                     # Custom React hooks
├── lib/                       # Utility functions
├── App.tsx                    # Router configuration
├── main.tsx                   # Entry point
└── index.css                  # Design tokens & global styles
```

---

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Notes

- All data is currently **mock/static** — designed to be connected to a backend (e.g. Supabase, Xero API) in future
- Optimised for **desktop** use (1280px+ viewports)
- Built as a **single-page application** with client-side routing
- No authentication layer yet — intended for internal network / VPN access
