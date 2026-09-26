# TaskTracker Project Overview

A production-grade single-user task and time-tracking application with React frontend and Express/MongoDB backend. Full authentication, task management, real-time timers, AI suggestions, and analytics.

**Demo Account:** email: `demo1234@gmail.com`, password: `demo1234`

## Product

TaskTracker enables users to:

- Register and log in securely with JWT-based authentication
- Create, manage, and organize tasks with status, priority, and due dates
- Track work sessions with a precise timer (one active timer per user)
- View AI-powered task suggestions and insights
- Analyze time tracking with charts and daily summaries
- Filter, sort, and bulk-manage tasks

The app emphasizes data security (httpOnly cookies, per-user data isolation), timezone correctness (local day calculations), and mobile-first UX (360px responsive design).

## Repository layout

```text
task_mgmt/
├── frontend/          React 18 + Vite SPA
├── backend/           Express 5 + MongoDB
├── PROJECT_OVERVIEW.md (this file)
```

## Frontend Implementation

### Tech Stack

| Component     | Choice                     | Version           |
| ------------- | -------------------------- | ----------------- |
| Build system  | Vite                       | 5.4.10            |
| UI Framework  | React 18                   | 18.3.1            |
| Routing       | React Router               | 6.28.0            |
| Server state  | TanStack Query             | 5.59.0            |
| Forms         | react-hook-form            | 7.89.0            |
| Charts        | Chart.js + react-chartjs-2 | 4.5.1 + 5.3.1     |
| Notifications | sonner                     | 2.0.8             |
| CSS Framework | Bootstrap 5                | CDN + custom CSS  |
| HTTP          | Native fetch API           | with interceptors |

### Architecture

**Entry point:** `src/main.jsx`

- Initializes `QueryClient` with defaults: `staleTime: 30s`, `refetchOnWindowFocus: true`, no retry on 401/403/404/409
- Creates `BrowserRouter` and mounts `<App/>`
- Imports `styles.css` (auth pages) and `app.css` (app shell with design tokens)

**Authentication & routing:**

- `useMe()` hook queries `['me']` to determine login status
- `ProtectedRoute` wraps authenticated pages; redirects to `/login` if not authenticated
- `PublicOnlyRoute` wraps login/signup; redirects to `/` if logged in
- Global 401 handler: any query other than `['me']` that returns 401 triggers logout

### Routes (built & fully functional)

| Route        | Component      | Status     | Access        |
| ------------ | -------------- | ---------- | ------------- |
| `/login`     | LoginPage      | ✅         | Public only   |
| `/signup`    | SignupPage     | ✅         | Public only   |
| `/`          | TasksPage      | ✅         | Authenticated |
| `/tasks/:id` | TaskDetailPage | ✅         | Authenticated |
| `/insights`  | InsightsPage   | ✅         | Authenticated |
| `/timelogs`  | TimeLogsPage   | ⏳ Planned | Authenticated |
| `/summary`   | SummaryPage    | ⏳ Planned | Authenticated |
| `*`          | NotFoundPage   | ✅         | Public        |

### State Management

| Kind             | Purpose                              | Storage              |
| ---------------- | ------------------------------------ | -------------------- |
| **Server state** | User, tasks, timers, logs, summaries | TanStack Query cache |
| **URL state**    | Filters, sorting, pagination         | Search params        |
| **Form state**   | Input values, validation             | react-hook-form      |
| **UI state**     | Modals, menus, overlays              | React hooks          |
| **Feedback**     | Toasts and alerts                    | sonner library       |

**Query keys:**

- `['me']` — current user or `null` (401)
- `['tasks']` — user's tasks, newest first
- `['task', id]` — single task detail
- `['timelogs', { taskId?, from?, to? }]` — time logs (params dropped if undefined)
- `['timelogs', 'active']` — running timer or `null`
- `['summary', 'today']` — today's summary with timezone offset
- `['insights', 'all', 'week' | 'month']` — AI summary for all tasks (staleTime 5m, no auto-refetch)
- `['insights', 'task', id]` — AI summary for one task

**Mutations invalidate query prefixes:**

- Create/update/delete task → `['tasks']`, `['summary']`
- Start/stop timer → `['timelogs']`, `['tasks']`, `['summary']`
- Delete log → `['timelogs']`, `['tasks']`, `['summary']`

### Main Components

**Layouts:**

- `Layout` — Sidebar + `<Outlet />` + `ActiveTimerBar`
- `Sidebar` — icon rail (≥992px) or hamburger + offcanvas (<992px)
- `ActiveTimerBar` — running task, live clock, Stop button (fixed on mobile)

**Pages:**

- `LoginPage` / `SignupPage` — auth forms with validation
- `TasksPage` — dashboard with stat tiles, responsive table/cards, filters, bulk actions
- `TaskDetailPage` — full task view with edit mode, time logs, per-task insights
- `InsightsPage` — 7-day and 30-day overview charts, AI summary, reminders

**Components:**

- `TaskTable` (≥992px) / `TaskCard` (<992px) — same data, responsive layout
- `TaskForm` — modal for create/edit with AI suggestions
- `StatusSelect` / `PriorityBadge` / `OverdueBadge` — status and priority pills
- `BulkActionBar` — select/update/delete multiple tasks
- `InsightsPanel` — side panel with task stats and AI insights
- `AiSummaryCard` — AI summary or "unavailable" fallback
- `Modal` / `ConfirmModal` — Esc closes, scroll lock, focus trapping
- Charts: `BarChart` / `LineChart` / `DoughnutChart` + `ChartFigure` with empty state

### Mobile-First Responsive Design

- Base styles target 360px phones; media queries add 768px (tablet) and 992px (desktop)
- No horizontal scroll; long text wraps
- Tap targets ≥44px high
- Inputs ≥16px font (prevents iOS zoom)
- Bootstrap grid: start `col-12`, widen with `col-md-6` / `col-lg-4`

### API Layer

**`src/api/client.js` exports `apiFetch(path, { method, body, query })`:**

- Prefixes `import.meta.env.VITE_API_URL` (empty for local dev proxy)
- Sends `credentials: 'include'` so cookies go with every request
- On success: returns `json.data`
- On failure: throws `ApiError { status, message, details }`
- Undefined/null/empty query values are dropped

**All API calls go through `src/api/{auth,tasks,timelogs,insights,summary}.js` hooks:**

- Never call fetch directly from components
- Use TanStack Query mutations and queries (defined in `src/hooks/`)

### Timer Mechanics

- One running timer per user, enforced by server and UI
- **Elapsed = now − startTime (from server)**, recalculated every second via `useElapsed`
- Running task shows **Stop** + live clock; other tasks' Start buttons disabled
- Starting a timer on a `pending` task changes it to `in_progress`
- Stopping doesn't change status; users mark complete manually
- `task.totalTime` counts finished sessions only; UI adds elapsed for the running task
- On 409 (timer conflict), UI shows error and refetches active timer

### Charts (Chart.js)

- Registered once in `main.jsx` with only needed controllers (Bar, Line, Doughnut)
- Chart data derived with `useMemo` from query data; never stored in state
- Colors read from CSS variables (`--priority-high`, `--status-done`, etc.) in `chartTheme.js`
- Fixed height (220px mobile, 280px desktop) to prevent collapse/overflow
- Each chart in `<figure>` with `<figcaption>` (key statistic) + `aria-label` on canvas
- Empty state: "No time tracked yet" instead of empty axes

### AI Features (optional)

- **Task suggestion:** `POST /api/tasks/ai-suggest` — LLM generates title/description from raw input; falls back to raw input if AI unavailable
- **Insights:** `GET /api/insights?range=week|month` and `GET /api/tasks/:id/insights` — AI summary + tips; fallback is `{ summary: "", tips: [], aiGenerated: false }`
- **Rate limit:** shared limiter across AI endpoints (30 requests per user per 15 min → 429)
- **Key never in frontend:** LLM API key is server-side only; frontend never builds prompts or calls LLM directly

### Accessibility & UX

- Every input has a `<label>`; buttons have clear text (not just icons)
- Row checkboxes with `aria-label`; header checkbox indeterminate when partly selected
- Status and priority shown with **text + color**, not color alone
- Confirm before destructive actions (delete task, delete log, bulk delete)
- Icon-only buttons have `aria-label` (e.g., "Start timer: Progress Update")
- Animations stop under `prefers-reduced-motion`
- Per-page `document.title` (e.g., "Tasks · TaskTracker")

### Local Development

```bash
cd frontend && npm install && npm run dev
# Vite dev server runs on http://localhost:5173
# Proxies /api to http://localhost:3000 (backend)
```

**Environment:**

```
VITE_API_URL=         # (empty for local; proxy handles /api)
```

## Backend Implementation

### Tech Stack

| Component     | Choice                           | Version             |
| ------------- | -------------------------------- | ------------------- |
| Runtime       | Node.js (CommonJS)               | 18+                 |
| Framework     | Express                          | 5.2.1               |
| Database      | MongoDB + Mongoose               | 9.10.2              |
| Auth          | JWT in httpOnly cookie           | jsonwebtoken 9.0.3  |
| Password hash | bcryptjs                         | 3.0.3               |
| Validation    | Zod                              | 4.6.5               |
| Security      | helmet, cors, express-rate-limit | 8.3.0, 2.8.6, 8.7.0 |
| Logging       | morgan                           | 1.12.1              |
| Dev           | nodemon                          | 3.1.14              |

### Architecture

**Entry point:** `src/server.js`

- Loads `.env` variables via dotenv
- Configures middleware: helmet, cors, json, cookie-parser, morgan
- Connects to MongoDB via Mongoose
- Mounts routes at `/api`
- Applies global 404 and error handlers
- Listens on `PORT` (default 3000)

**Middleware stack (per request):**

```
helmet → cors → express.json → cookie-parser → morgan
  → authLimiter (signup/login, per IP)
  → requireAuth (verifies JWT, sets req.user)
  → aiLimiter (AI routes, per user)
  → validate(zodSchema)
  → controller
→ notFound handler
→ error handler (formats all responses)
```

**Module structure:**

- `src/config/` — env loading, MongoDB connection
- `src/models/` — Mongoose schemas: User, Task, TimeLog
- `src/routes/` — route definitions (map URL + method to controller)
- `src/controllers/` — business logic: auth, tasks, timers, summaries, insights
- `src/validators/` — Zod schemas for request bodies, params, query
- `src/middleware/` — auth verification, validation, rate limiting, error handling
- `src/utils/` — helpers: JWT/cookies, AI client, date utilities, AppError

### Database Design

**Three collections (all with user isolation):**

| Model       | Fields                                                                                                                                                                                                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**    | `name` (2–50 chars), `email` (unique, lowercase), `passwordHash` (bcrypt, `select: false`), `_id`, `createdAt`, `updatedAt`                                                                                                                                                                     |
| **Task**    | `userId` (ref User), `title` (1–200), `description` (0–2000), `rawInput` (original text), `status` (pending\|in_progress\|completed), `priority` (low\|medium\|high, default medium), `dueDate` (YYYY-MM-DD, default null), `completedAt` (set when completed), `_id`, `createdAt`, `updatedAt` |
| **TimeLog** | `userId` (ref User), `taskId` (ref Task), `startTime` (server-set), `endTime` (null while running), `duration` (seconds, 0 while running), `_id`, `createdAt`, `updatedAt`                                                                                                                      |

**Indexes:**

- User: `{ email: 1 }` unique
- Task: `{ userId: 1, createdAt: -1 }` (list), `{ userId: 1, completedAt: 1 }` (summary)
- TimeLog: `{ userId: 1, startTime: -1 }` (list), `{ taskId: 1 }` (totals), `{ userId: 1, endTime: 1 }` (summaries), `{ userId: 1 }` unique partial where `endTime` is null (one running timer per user)

**Key design rules:**

- `dueDate` is a **string** (`YYYY-MM-DD`), not a timestamp, so it doesn't shift across timezones
- `completedAt` is a **Date**, set when status becomes completed, cleared otherwise
- `totalTime` per task is **derived** from completed logs (sum of `duration`); never stored
- `endTime: null` means timer is running; queries use `$type: "null"` to leverage the partial index
- Deleting a task cascades: deletes all its time logs

### Authentication & Authorization

- **Signup/Login:** passwords hashed with bcryptjs; JWT signed with `JWT_SECRET`; JWT expires in **1 day**
- **JWT in cookie:** `httpOnly` (XSS-safe), `secure` (HTTPS only in prod), `sameSite: 'lax'` (local) or `'none'` (prod, with `secure`)
- **`requireAuth` middleware:** verifies JWT from cookie, sets `req.user = { id }`; returns 401 if invalid
- **Data isolation:** every query filters by `userId: req.user.id`; missing/foreign resources return **404** (not 403)
- **Logout:** clears the cookie

### Time Tracking

- **One running timer per user** enforced by partial unique index
- **Server sets `startTime` and `endTime`** — client never controls timing (tamper-resistant)
- **Pause/resume pattern:** Stop closes the log, Start opens a new one. A task worked on in 3 sessions has 3 TimeLog documents
- **Auto status on Start:** if task is `pending`, changes to `in_progress`. Already `in_progress` or `completed` tasks keep their status
- **Stopping never changes status** — user marks complete manually
- **Duration calculated on stop:** `duration = endTime - startTime` in seconds

### Daily Summary (timezone-aware)

"Today" is the user's local day, calculated from `tzOffset` (JS `Date.getTimezoneOffset()` in minutes).

Includes:

- **Total tracked today** — sum of logs (including partial running timer cut at midnight)
- **Tasks worked on today** — any log overlapping today
- **Completed today** — status is completed AND `completedAt` is today
- **Pending/In-progress** — current status, any count
- **Overdue** — not completed AND `dueDate < today`
- **Due today** — not completed AND `dueDate = today`

**Sessions crossing midnight are split:** a 23:00–01:00 session counts 1h yesterday and 1h today.

### API Endpoints

**Response format:**

```json
Success:  { "success": true, "data": {...} }
Error:    { "success": false, "error": { "message": "...", "details": [{...}] } }
```

**Status codes:** 200 (ok), 201 (created), 400 (validation), 401 (auth), 404 (not found or not owned), 409 (conflict: duplicate email, timer running), 429 (rate limit), 500 (server error)

#### Authentication (rate-limited per IP)

| Method | Path               | Body                      | Notes                               |
| ------ | ------------------ | ------------------------- | ----------------------------------- |
| POST   | `/api/auth/signup` | `{name, email, password}` | 201 on success; 409 if email exists |
| POST   | `/api/auth/login`  | `{email, password}`       | 200 on success; 401 if invalid      |
| POST   | `/api/auth/logout` | —                         | Clears cookie                       |
| GET    | `/api/auth/me`     | —                         | 🔒 Returns current user or 401      |

#### Tasks (all 🔒)

| Method | Path                    | Body/Query                                                       | Notes                                                          |
| ------ | ----------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| POST   | `/api/tasks/ai-suggest` | `{input}`                                                        | LLM generates title/description; fallback to input if AI fails |
| POST   | `/api/tasks`            | `{title, description?, rawInput?, status?, priority?, dueDate?}` | 201; title required                                            |
| GET    | `/api/tasks`            | `?status=&priority=&sort=`                                       | Default sort: newest; returns all user's tasks                 |
| GET    | `/api/tasks/:id`        | —                                                                | 404 if not found                                               |
| PATCH  | `/api/tasks/:id`        | `{title?, description?, status?, priority?, dueDate?}`           | Partial update; at least one field required                    |
| DELETE | `/api/tasks/:id`        | —                                                                | Also deletes task's time logs                                  |

#### Timer (all 🔒)

| Method | Path                         | Notes                                                                     |
| ------ | ---------------------------- | ------------------------------------------------------------------------- |
| POST   | `/api/tasks/:id/timer/start` | 201; side effect: changes `pending` → `in_progress`; 409 if timer running |
| POST   | `/api/tasks/:id/timer/stop`  | 200; sets `endTime` and `duration`                                        |

#### Time Logs (all 🔒)

| Method | Path                   | Query                      | Notes                         |
| ------ | ---------------------- | -------------------------- | ----------------------------- |
| GET    | `/api/timelogs`        | `?taskId=&from=ISO&to=ISO` | Newest first; params optional |
| GET    | `/api/timelogs/active` | —                          | Returns running log or null   |
| DELETE | `/api/timelogs/:id`    | —                          | 404 if not found              |

#### Summary (🔒)

| Method | Path                 | Query               | Notes                             |
| ------ | -------------------- | ------------------- | --------------------------------- |
| GET    | `/api/summary/today` | `?tzOffset=minutes` | Returns date, totals, task arrays |

#### Insights (🔒, AI rate-limited: 30 per user per 15 min)

| Method | Path                      | Query                | Notes                                                   |
| ------ | ------------------------- | -------------------- | ------------------------------------------------------- |
| GET    | `/api/insights`           | `?range=week\|month` | AI summary + tips for all tasks; fallback on AI failure |
| GET    | `/api/tasks/:id/insights` | —                    | AI summary + tips for one task                          |

### Error Handling

All errors go through a centralized handler that formats responses consistently:

- **Zod validation errors** → 400 with `details: [{ field, message }]`
- **Mongoose duplicate key** → 409
- **Invalid ObjectId** → 404
- **Rate limit exceeded** → 429
- **Unknown errors** → 500 with generic message (stack trace logged, not sent)

### Local Development

```bash
cd backend && npm install && npm run dev
# Server runs on http://localhost:3000

```

## Current Build Status

| Feature                                    | Status      |
| ------------------------------------------ | ----------- |
| Authentication (signup/login/logout)       | ✅ Complete |
| Task CRUD + filtering/sorting              | ✅ Complete |
| Bulk operations (update/delete)            | ✅ Complete |
| Timer with one-per-user enforcement        | ✅ Complete |
| Time logs (create, list, delete)           | ✅ Complete |
| Daily summary (timezone-aware)             | ✅ Complete |
| Charts (7d, 30d overview)                  | ✅ Complete |
| AI suggestions (task creation)             | ✅ Complete |
| AI insights (all tasks, per-task)          | ✅ Complete |
| Task detail page with insights             | ✅ Complete |
| Responsive design (360px–1440px+)          | ✅ Complete |
| Mobile-first layout + timer bar            | ✅ Complete |
| Accessibility (labels, aria, color + text) | ✅ Complete |
| Time logs page                             | ⏳ Planned  |
| Summary page                               | ⏳ Planned  |

## Quality Assurance

- ✅ Cross-browser testing (Chromium headless)
- ✅ Responsive verification (360px, 768px, 1440px, 1920px)
- ✅ Mobile UX: no horizontal scroll, 44px+ tap targets
- ✅ Accessibility: full label coverage, aria-labels, keyboard navigation
- ✅ Zero console errors
- ✅ API error handling (validation, auth, rate limits, database errors)

## Getting Started

### Demo Account

**Email:** `demo1234@gmail.com`
**Password:** `demo1234`

**To test locally:**

1. Start backend: `cd backend && npm install && npm run dev`
2. Start frontend: `cd frontend && npm install && npm run dev`
3. Open http://localhost:5173
4. Log in with demo credentials
5. Create tasks, track time, view insights

### Development Workflow

1. **Backend changes:** files in `backend/src/` auto-reload via nodemon
2. **Frontend changes:** files in `frontend/src/` auto-reload via Vite HMR
3. **API contract changes:** see `backend/API_CONTRACTS.md` for endpoint specs
4. **Database schema changes:** see `backend/DB_DESIGN.md` for indexes and relationships

## Documentation

- `frontend/ARCHITECTURE.md` — component structure, state management, routing, charts
- `frontend/PROMPTS.md` — AI task-suggestion prompts
- `frontend/docs/pages/` — per-page design specs
- `backend/ARCHITECTURE.md` — middleware, controllers, models, auth, timers
- `backend/API_CONTRACTS.md` — endpoint specs, request/response formats, status codes
- `backend/DB_DESIGN.md` — schemas, indexes, data isolation rules
- `backend/PROMPTS.md` — AI insights prompts
