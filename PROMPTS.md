# Development Log — Key Decisions & Architecture Review

This document outlines the major architectural and design decisions made during backend development, including the reasoning behind each choice. AI tools (ChatGPT, Claude Code) were used as design partners for planning, validation, and review. All application code was written independently.

---

## 1. Stack & Schema Design

**Tool:** Claude Code  
**Approach:** Validated the proposed tech stack (`express`, `mongoose`, `zod`, etc.) and reviewed a preliminary schema (User / Task / TimeLog) against the assignment requirements.  
**Key Decisions:**

- Zod covers runtime validation.
- Switched `bcrypt` → `bcryptjs` to avoid native build issues when deploying.
- Added `completedAt` and `rawInput` to Task, and timestamps.
- TimeLog: `endTime: null` means a timer is running, timestamps are set by the server, and a user can have only one running timer.
- Return 404 for other users' resources. Cross-site cookie setup for deployment.

## 2. Module System (CommonJS)

**Tool:** Claude Code  
**Approach:** Confirmed CommonJS (`require`) compatibility across the stack.  
**Result:** All dependencies support CommonJS; configured `"type": "commonjs"` in package.json for consistency.

## 3. Documentation Structure

**Tool:** Claude Code  
**Approach:** Designed a suite of technical documents for recruiter and team review.  
**Result:** Created four core documents:
- `ARCHITECTURE.md` — Stack, tech choices, folder structure, request lifecycle
- `API_CONTRACTS.md` — Endpoint reference with request/response examples
- `DB_DESIGN.md` — Schema design, indexes, data integrity rules
- `PROMPTS.md` — This file: decision log and design rationale

## 4. Authentication & Middleware Architecture

**Tool:** Claude Code  
**Approach:** Reviewed core middleware concerns: cookie security (`sameSite`), proxy trust, and separation of concerns (routes vs controllers).  
**Result:**
- JWT and cookie expiry: **1 day** (synchronized)
- Consolidated `app.js` and `server.js` into a single entry point
- Added detailed explanations of `sameSite: 'lax'`, `trust proxy: 1`, and the routes/controller pattern to `ARCHITECTURE.md`

## 5. Dependency Documentation

**Tool:** Claude Code  
**Approach:** Documented each npm dependency with its purpose and role in the architecture.  
**Result:** Added comprehensive **NPM Packages** section to `ARCHITECTURE.md` listing all dependencies and their functions.

## 6. Security: Middleware & Cookie Hardening

**Tool:** Claude Code  
**Approach:** Validated security middleware setup: `trust proxy`, `httpOnly` cookies, CORS, rate limiting.  
**Result:**
- Clarified `trust proxy: 1` is essential on Render for accurate client IP detection (needed for per-IP rate limiting)
- Documented that `httpOnly` prevents XSS script access to the token (not HTTP vs HTTPS; that's `secure: true`)
- Each security layer (`helmet`, `cors`, `express-rate-limit`) documented with its specific purpose

## 7. JWT & Mongoose Field Management

**Tool:** Claude Code  
**Approach:** Established strict rules for field ownership: Mongoose handles system fields, server sets operational fields, client provides only validated input.  
**Result:**
- JWT payload: `{ id: user._id }`
- Mongoose auto-manages: `_id` (on create), `createdAt`, `updatedAt` (via `timestamps: true`)
- Code never writes these fields; documented in ARCHITECTURE.md's "Models" section

## 8. Folder Structure & Build Order

**Tool:** Claude Code  
**Approach:** Designed a scalable folder organization with clear file responsibilities and dependency order.  
**Result:** Created `FOLDER_STR.md` with:
- File-by-file purpose descriptions
- Recommended build order (config → auth → tasks → timers → summary → AI)
- Rationale for each layer's separation

## 9. Request Logging (Morgan)

**Tool:** Claude Code  
**Approach:** Validated logging strategy alongside input validation.  
**Result:** Morgan logs HTTP traffic (method, URL, status, response time) for development debugging and production monitoring. Zod validates request *data*; Morgan logs the *requests*—complementary concerns.

## 10. Data Model & Field Ownership

**Tool:** Claude Code  
**Approach:** Documented which entity owns each field and when it's set (client vs server vs Mongoose).  
**Result:** Added comprehensive **Models** section to ARCHITECTURE.md showing:
- User: name, email, passwordHash
- Task: userId, title, description, rawInput, status, priority, dueDate, completedAt
- TimeLog: userId, taskId, startTime, endTime, duration
- Clear notes on field ownership and constraints

## 11. Timer Design: Pause, Resume & Task Lifecycle

**Tool:** Claude Code  
**Approach:** Resolved timer lifecycle and whether to store start date separately.  
**Result:**
- **No separate `startedAt` field** on Task. Each Start→Stop creates a TimeLog; pause = stop, resume = new log
- Total work time = sum of TimeLog durations
- First log's `startTime` marks when work began
- `completedAt` timestamp is essential (time logs record sessions, not completions)

## 12. Auto-Status Transitions & Dual-Purpose Completion

**Tool:** Claude Code  
**Approach:** Clarified why both `status` and `completedAt` are needed despite seeming redundant.  
**Result:**
- **Rule added:** Starting a timer on a `pending` task auto-transitions it to `in_progress`
- **Why `completedAt` is required:** TimeLog records *work sessions*; `completedAt` records *status changes*. A task can be marked complete without using the timer, and the daily summary needs to know which tasks were completed *today* (not just which have time logged today)
- Documented in ARCHITECTURE.md, DB_DESIGN.md, and API_CONTRACTS.md

## 13. Full Backend Implementation

**Tool:** Claude Code  
**Approach:** Implemented the complete backend from the architecture and design documents, with iterative review and testing.  
**Result:** Implemented all layers:
- **Error handling:** Custom `AppError` class, centralized error handler, 404 fallback
- **Validation:** Zod schemas per resource (auth, task, timeLog, summary)
- **Middleware:** `requireAuth`, `validate`, `rateLimiter` (per-IP for auth, per-user for AI)
- **Models & Indexes:** User, Task, TimeLog with optimal indexes including partial unique index for single running timer
- **Controllers:** Auth, Task, TimeLog, Summary with full CRUD and business logic
- **Routes:** RESTful endpoints mounted under `/api`
- **Server:** Express 5 setup with middleware order: helmet → cors → json → cookieParser → morgan → router → errorHandler
- **AI Integration:** Optional LLM client (OpenRouter or Gemini) with graceful fallback
- **Configuration:** `.env.example` and `.gitignore`
- **Response Format:** Standardized `{ success, data }` / `{ success, error }` across all endpoints
- **Testing:** Validated against in-memory MongoDB: validation (400), auth (401), conflicts (409), ownership (404), cascade deletes, daily summary, rate limiting (429)

## 14. Task Prioritization & Deadline Tracking

**Tool:** Claude Code  
**Approach:** Extended the task model to support priority levels and due dates, with careful attention to timezone handling.  
**Result:**
- **Schema:** Added `priority` (`low | medium | high`, default `medium`) and `dueDate`
- **Critical Design Decision:** `dueDate` stored as calendar-day string `"YYYY-MM-DD"`, not as `Date` timestamp
  - Rationale: A due date is a calendar day (user's local date), not a point in time. Storing as `Date` would shift it across timezones (30 Sep in India = 29 Sep 18:30 UTC). String format sorts correctly and keeps "overdue" as a simple comparison with user's local date.
- **Validation:** Zod enforces format (`YYYY-MM-DD`) and rejects impossible dates (e.g., `2026-02-30`). `null` value clears the due date.
- **Queries:** 
  - List endpoint: `?priority=low|medium|high` filter
  - Sort options: `sort=newest|dueDate|priority` (earliest due date first; high priority first; no due date sorts last)
- **Summary:** Daily summary now includes `overdue` (not completed, due date before today) and `dueToday` lists; pending/in-progress items include priority and due date
- **Testing:** Validated defaults, validation errors, sorting (all three orders), filtering, clearing due dates, and "overdue" in IST
- **Documentation:** Aligned ARCHITECTURE.md, API_CONTRACTS.md, DB_DESIGN.md, FOLDER_STR.md

## 15. Performance Audit & Correctness Fixes

**Tools:** ChatGPT (initial review), Claude Code (deep dive and fixes)  
**Approach:** Conducted comprehensive performance review, validated each suggestion against actual code and API usage patterns, then fixed identified bugs and optimizations.

**Review Findings:**
- **False Positives:** Some suggestions (extra indexes on status/priority, pagination, stored totalTime field) didn't apply to actual usage. The frontend fetches all tasks once and filters/sorts client-side, so additional indexes would be unused.
- **Real Bugs Found:**
  - Midnight-crossing sessions calculated incorrectly in daily summary
  - Insights endpoint returned 200 for bad task IDs instead of 404
  - `ai-suggest` had no rate limiting (AI endpoints unprotected)
  - LLM context contained raw logs without running-timer state; running sessions showed as 0 seconds

**Fixes Implemented:**
- **AI Rate Limiting:** New `aiLimiter` middleware — **30 requests per user per 15 minutes**, shared across `ai-suggest`, task insights, and weekly insights (keyed by user ID, applied after `requireAuth`)
- **Compact LLM Context (`utils/aiClient.js`):** 
  - Pre-computed totals (minutes tracked, session count, open/overdue/completed)
  - Minutes per local day breakdown
  - At most 40 relevant tasks (open, completed in range, or worked on), ranked by time spent
  - Running timer counts elapsed time up to now (not 0)
- **Insights Error Handling:** Context built before LLM call, so invalid/unknown task IDs return 404; only LLM failure falls back to `{ aiGenerated: false }`
- **Midnight Boundary (`utils/timeWindow.js`):** 
  - Summary loads logs that *overlap* today, counts only time inside today's boundary
  - Handles sessions crossing midnight correctly (e.g., 23:30 yesterday to 01:30 today splits correctly)
  - New index: `{ userId: 1, endTime: 1 }` for efficient overlap queries
- **Running Timer Queries:** Use `endTime: { $type: "null" }` to leverage partial unique index (verified with `explain()`)
- **Cookie Expiry:** Derived from JWT's `exp` claim (not a fixed 24 hours), so expiry matches JWT lifetime
- **Server Startup:** Refuses to start without `JWT_SECRET` set
- **Configuration:** `.env.example` now lists OpenRouter variables for optional AI features

**Skipped Intentionally:** Pagination (no frontend demand), stored `totalTime` (sync complexity vs. minimal gain), additional task indexes (not queried that way)

**Testing:** Validated 28+ scenarios: cookie expiry drift, timer conflicts, midnight splits in IST, insights 404 vs fallback, per-user rate limit enforcement, LLM context shape

**Documentation:** Updated ARCHITECTURE.md, DB_DESIGN.md, API_CONTRACTS.md

## 0. Initial Schema Draft

**Tool:** ChatGPT  
**Approach:** Preliminary schema design for the task management domain.  
**Result:** Initial User / Task / TimeLog field list, refined through subsequent design decisions.

---

## Summary

This document captures the architectural thinking and iterative refinement that went into the backend. Key principles guiding the design:

- **Data Ownership:** Clear separation between client-provided input, server-computed state, and Mongoose-managed system fields
- **Timezone Correctness:** Due dates stored as calendar strings to avoid shift-across-timezones bugs; summary calculations respect user's local timezone
- **Security First:** httpOnly cookies, CSRF-safe sameSite settings, per-IP auth rate limits, per-user AI rate limits, cross-site data isolation via 404 returns
- **Performance:** Indexed queries for hot paths (user + createdAt, userId + completedAt, midnight overlap), partial unique index for single running timer, compact LLM context instead of full data dumps
- **Reliability:** Centralized error handling, validated 404 vs real failures in AI calls, graceful fallback for optional AI features, tested against in-memory MongoDB

All code written independently; AI tools used for design validation and review.
