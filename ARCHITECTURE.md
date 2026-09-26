# Backend Architecture

REST API for a task and time tracking application. Built with Express 5, MongoDB/Mongoose, and JWT authentication. Emphasizes data security, timezone correctness, and clean separation of concerns.

## Tech Stack

| Concern       | Choice                           |
| ------------- | -------------------------------- |
| Runtime       | Node.js (CommonJS modules)       |
| Framework     | Express 5                        |
| Database      | MongoDB (Atlas) with Mongoose    |
| Auth          | JWT stored in an httpOnly cookie |
| Password hash | bcryptjs                         |
| Validation    | Zod                              |
| Security      | helmet, cors, express-rate-limit |
| Logging       | morgan                           |
| Config        | dotenv                           |

## NPM Packages

### Dependencies

| Package            | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| express            | Web framework: routing, middleware, request/response           |
| mongoose           | MongoDB ODM: schemas, models, queries                          |
| dotenv             | Loads `.env` variables into `process.env`                      |
| cors               | Allows the frontend origin to call the API with credentials    |
| cookie-parser      | Parses the `Cookie` header into `req.cookies` (reads the JWT)  |
| bcryptjs           | Hashes and compares passwords (pure JS, no native build)       |
| jsonwebtoken       | Signs and verifies the JWT                                     |
| zod                | Validates request body, params and query                       |
| helmet             | Sets secure HTTP headers                                       |
| express-rate-limit | Limits repeated requests: auth routes per IP (brute force), AI routes per user (LLM cost) |
| morgan             | Logs HTTP requests to the console                              |

### Dev Dependencies

| Package | Purpose                                        |
| ------- | ---------------------------------------------- |
| nodemon | Restarts the server automatically on file save |

### AI calls

No SDK. `utils/aiClient.js` calls the LLM with Node's built-in `fetch`: OpenRouter when `OPENROUTER_API_KEY` is set, otherwise Gemini (`AI_API_KEY`).

### Install

```bash
npm i express mongoose dotenv cors cookie-parser bcryptjs jsonwebtoken zod helmet express-rate-limit morgan
npm i -D nodemon
```

## Folder Structure

```
backend/
├── src/
│   ├── server.js           # express app setup (middleware + routes), DB connect, listen
│   ├── config/             # env loading, db connection
│   ├── models/             # mongoose schemas (User, Task, TimeLog)
│   ├── routes/             # route definitions only
│   ├── controllers/        # one per resource: auth, task, timeLog, summary, insights
│   ├── validators/         # zod schemas per resource
│   ├── middleware/         # auth, validate, error handler, not-found
│   └── utils/              # helpers (AppError, token, dayRange, timeWindow, aiClient)
├── .env.example
├── ARCHITECTURE.md
├── API_CONTRACTS.md
├── DB_DESIGN.md
└── PROMPTS.md
```

### Routes vs Controllers

- **Route** maps a URL and method to a function, e.g. `POST /api/tasks` → `createTask`. Routes have no logic.
- **Controller** is that function. It reads `req`, talks to the model and sends the `res`.

| Controller                  | Handles                          |
| --------------------------- | -------------------------------- |
| `authController.js`         | signup, login, logout, me        |
| `taskController.js`         | task CRUD, AI suggest            |
| `timeLogController.js`      | start/stop timer, list/delete logs |
| `summaryController.js`      | today's summary                  |
| `insightsController.js`     | AI insights (all tasks, one task) |

## Models (key → value)

Full rules and indexes are in `DB_DESIGN.md`. `_id`, `createdAt` and `updatedAt` aren't listed: Mongoose adds them automatically (`{ timestamps: true }`) and the code never sets them.

### User

| Key          | Value type | Example                          | Notes                              |
| ------------ | ---------- | -------------------------------- | ---------------------------------- |
| name         | String     | `"Jane Doe"`                     | required, 2–50 chars               |
| email        | String     | `"jane@example.com"`             | required, unique, lowercase        |
| passwordHash | String     | `"$2a$10$Xk..."`                 | bcrypt hash, `select: false`       |

### Task

| Key          | Value type | Example                                         | Notes                                         |
| ------------ | ---------- | ----------------------------------------------- | --------------------------------------------- |
| userId       | ObjectId   | `66f5a1...`                                     | ref `User`, taken from `req.user.id`          |
| title        | String     | `"Follow up with UI Designer"`                  | required                                      |
| description  | String     | `"Send a Slack message to confirm wireframes."` | default `""`                                  |
| rawInput     | String     | `"follow up with designer"`                     | what the user originally typed                |
| status       | String     | `"pending"`                                     | enum: `pending`, `in_progress`, `completed`   |
| priority     | String     | `"high"`                                        | enum: `low`, `medium`, `high`; default `medium` |
| dueDate      | String/null| `"2026-09-30"`                                  | calendar day `YYYY-MM-DD`, default `null`     |
| completedAt  | Date/null  | `null`                                          | set when status → `completed`, else `null`    |

### TimeLog

| Key          | Value type | Example                | Notes                                          |
| ------------ | ---------- | ---------------------- | ---------------------------------------------- |
| userId       | ObjectId   | `66f5a1...`            | ref `User`, taken from `req.user.id`           |
| taskId       | ObjectId   | `66f5b2...`            | ref `Task`                                     |
| startTime    | Date       | `2026-09-26T10:00:00Z` | set by the server (`new Date()`) on start      |
| endTime      | Date/null  | `null`                 | `null` = running; set by the server on stop    |
| duration     | Number     | `0`                    | seconds; calculated on stop (`end - start`)    |

**Who sets what:**
- **From the client (validated by Zod):** name, email, password (hashed before saving), title, description, rawInput, status, priority, dueDate
- **From the server:** userId (from the JWT), taskId (from the URL), startTime, endTime, duration, completedAt
- **From Mongoose:** _id, createdAt, updatedAt

## Request Lifecycle

```
Request
  → helmet → cors → express.json → cookie-parser → morgan
  → router
      → authLimiter (auth routes, per IP)
      → requireAuth (verifies JWT cookie, sets req.user)
      → aiLimiter (AI routes, per user)
      → validate(zodSchema) (body / params / query)
      → controller
  → notFound handler
  → error handler (single place that formats error responses)
```

Express 5 forwards rejected promises from async handlers to the error handler automatically, so controllers don't need a try/catch wrapper.

## Authentication & Authorization

- **Signup/Login:** the password is hashed with bcryptjs. On success, the server signs a JWT with the user's Mongoose `_id` as the payload (`jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })`) and sets it as a cookie.
- **IDs and timestamps are generated by Mongoose, never written manually.** `_id` is created automatically when a document is saved, and `createdAt`/`updatedAt` are managed by `{ timestamps: true }` on each schema. The code never sets these fields itself.
- **Token expiry:** JWT expires in **1 day** (`JWT_EXPIRES_IN=1d`). `setAuthCookie` (`utils/token.js`) reads the `exp` from the signed token and uses it as the cookie `expires`, so the cookie and the JWT always expire together, even if `JWT_EXPIRES_IN` changes.
- **Cookie settings:**
  - `httpOnly`: the cookie is sent with requests, but browser JavaScript (`document.cookie`) can't read it. If an XSS bug lets an attacker run script on the page, they still can't steal the token. The name doesn't mean "HTTP, not HTTPS": `secure` handles HTTPS. This is also why the token goes in a cookie rather than `localStorage`, which any script can read.
  - `secure` (production): the cookie is only sent over HTTPS.
  - `sameSite`: controls whether the browser sends the cookie on cross-site requests.
    - `'lax'` (local): sent only to the same site. On localhost, the frontend and backend count as the same site.
    - `'none'` (production): sent cross-site as well. It's needed because the frontend (Netlify) and backend (Render) are on different domains, and it requires `secure: true`.
- **Logout:** clears the cookie.
- **`requireAuth` middleware:** reads the cookie, verifies the JWT and attaches `req.user = { id }`, where `id` is the `_id` from the token payload. It returns 401 if the cookie is missing or invalid.
- **Data isolation:** every query on Task or TimeLog includes `userId: req.user.id`. If a resource belongs to someone else, the API returns **404**, not 403, so it doesn't reveal that the resource exists.

## Time Tracking Design

- A running timer is a TimeLog with `endTime: null`.
- The **server** sets `startTime` and `endTime`, never the client. This keeps tracking accurate and tamper-resistant.
- `duration` (seconds) is calculated when the timer stops.
- **Pause and resume:** there is no separate "pause" state. Pause = Stop, which closes the current session. Resume = Start, which creates a new TimeLog. A task worked on in 3 sittings has 3 TimeLogs, and its total time is the sum of their `duration`s. Task has no `startedAt` field because the first TimeLog's `startTime` already records when work began.
- **Auto status on Start:** if the task is `pending` when the timer starts, the server changes it to `in_progress`. Tasks that are already `in_progress` or `completed` keep their status. Stopping the timer never changes the status; the user marks a task `completed` themselves.
- Only **one running timer per user** is allowed. Starting another returns 409.
- Queries for the running timer use `endTime: { $type: "null" }`, not `endTime: null`. `null` also matches a *missing* field, so MongoDB can't use the partial index (which is defined with `$type: "null"`); `$type` matches it exactly.
- The frontend shows elapsed time as `now - startTime`, using the active log from the API, so the timer survives page refreshes.
- Deleting a task also deletes its time logs.

## Daily Summary

- "Today" is based on the user's timezone. The client sends `tzOffset` (minutes, the value of JS `Date.getTimezoneOffset()`).
- The summary includes:
  - tasks that have time logs today
  - total seconds tracked today
- **Sessions that cross midnight are split.** The summary loads every log that *overlaps* today (ended after midnight, or still running) and counts only the part inside today (`utils/timeWindow.js`). A session from 23:00 to 01:00 counts 1h yesterday and 1h today; a timer running since 23:30 yesterday counts from midnight to now.
  - tasks completed today (using `completedAt`)
  - tasks that are still pending or in progress
  - tasks that are overdue (not completed, `dueDate` before today) and tasks due today

## Priority and Due Date

- `priority` is `low | medium | high` (default `medium`). The task list can be filtered by it and sorted by it (high first).
- `dueDate` is stored as a **calendar day string** (`"YYYY-MM-DD"`, what `<input type="date">` produces), not a timestamp. A due date means "this day" in the user's own calendar, so storing an instant would shift it across timezones. The string format also sorts and compares correctly, so "overdue" is simply `dueDate < today's local date`.
- Sending `dueDate: null` clears it. Due dates in the past are allowed (they show up as overdue).

## AI Features (optional)

- **Task suggestion:** `POST /api/tasks/ai-suggest` sends the natural-language input to an LLM and returns `{ title, description }`. If the AI call fails or times out, it falls back to the raw input as the title, so creating a task never depends on the AI.
- **Insights:** `GET /api/insights?range=week|month` and `GET /api/tasks/:id/insights` return a short summary and tips. If the LLM fails, the response is `{ summary: "", tips: [], aiGenerated: false }` and the frontend hides the AI card.
- **Compact context:** the insights endpoints never send raw documents to the LLM. The server pre-computes a small summary: totals (minutes tracked, sessions, open/overdue/completed counts), minutes per local day, and per task its title, status, priority, due date and minutes tracked. Only tasks that matter for the range are included (open, completed in the range, or worked on in it), capped at 40, most-worked first. This keeps the prompt small as data grows, and the model doesn't have to add up numbers itself.
- **Errors vs AI failures:** database errors (bad id, task not found) are thrown before the LLM call and return a real 404. Only the LLM call itself falls back.
- **Rate limit:** all AI endpoints share one limiter, **30 requests per user every 15 minutes** (429 after that). It is keyed by user id, not IP, because every call costs money on the LLM provider.

## Error Handling

All errors use the same response format (see `API_CONTRACTS.md`):

- Zod errors → 400 with field details
- Mongoose duplicate key → 409
- Invalid ObjectId → 404
- Too many requests → 429 (auth per IP, AI per user)
- Unknown errors → 500 with a generic message (the stack trace is only logged, never sent)

## Environment Variables

```
PORT=3000
MONGODB_URI=
JWT_SECRET=               # required: the server refuses to start without it
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
OPENROUTER_API_KEY=       # optional, enables AI features
# Model selection uses openrouter/free automatically (OPENROUTER_MODEL is ignored).
AI_API_KEY=               # legacy Gemini, used only without OPENROUTER_API_KEY
AI_MODEL=gemini-2.5-flash
```

`.env.example` has the same list.

## Deployment Notes

- Backend on Render, DB on MongoDB Atlas, frontend on netlify.
- Set `app.set('trust proxy', 1)`. On Render, every request passes through Render's proxy first, so Express sees the proxy's IP instead of the user's IP. This setting tells Express to trust the proxy's `X-Forwarded-For` header (`1` means trust one proxy hop), so `req.ip` is the real client IP.
  - **Why it matters here:** express-rate-limit counts requests per IP. Without this setting, every user shares the proxy's IP and one user's failed logins would lock out everyone. express-rate-limit also warns when it detects this misconfiguration.
- CORS is configured with `origin: CLIENT_ORIGIN` and `credentials: true`.
