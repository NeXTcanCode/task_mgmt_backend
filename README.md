# Task Management Backend

REST API for a task and time tracking app. Express 5 + MongoDB/Mongoose + JWT auth. Features task CRUD, a running timer, daily summary with timezone support, and optional AI-assisted task creation and insights.

## Tech Stack

| Concern       | Choice                        |
| ------------- | ----------------------------- |
| Runtime       | Node.js (CommonJS)            |
| Framework     | Express 5                     |
| Database      | MongoDB (Atlas) + Mongoose    |
| Auth          | JWT in an httpOnly cookie     |
| Password hash | bcryptjs                      |
| Validation    | Zod                           |
| Security      | helmet, cors, express-rate-limit |
| AI calls      | Node `fetch` (OpenRouter, else Gemini) |

## Quick Start

```bash
npm install
cp .env.example .env       # set MONGODB_URI and JWT_SECRET
npm run dev                # or npm start
```

Prereqs: Node >= 18 (uses built-in `fetch`), a MongoDB instance.

## Environment

```
PORT=3000
MONGODB_URI=               # required
JWT_SECRET=                # required — server refuses to start without it
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
OPENROUTER_API_KEY=        # optional, enables AI
# Models selected automatically through openrouter/free.
AI_API_KEY=                # legacy Gemini, only without OPENROUTER_API_KEY
AI_MODEL=gemini-2.5-flash
```

AI features are optional. Without keys, tasks create fine (AI falls back to raw input); insights return `aiGenerated: false`.

## Scripts

| Command         | Action                        |
| --------------- | ----------------------------- |
| `npm run dev`   | Start with nodemon (auto-restart) |
| `npm start`     | Start the server              |

## Project Layout

```
src/
├── server.js          # app setup, middleware, routes, DB connect
├── config/            # db connection
├── models/            # Mongoose schemas (User, Task, TimeLog)
├── routes/            # route definitions only
├── controllers/       # one per resource (auth, task, timeLog, summary, insights)
├── validators/        # Zod schemas per resource
├── middleware/        # requireAuth, validate, rateLimiter, errorHandler, notFound
└── utils/             # AppError, token, dayRange, timeWindow, aiClient
```

## Key Design Points

- **Auth:** JWT signed with the user's `_id`, stored in an httpOnly cookie so browser JS can't read it. Cookie expiry follows the token's `exp` so they always expire together.
- **Data isolation:** every Task/TimeLog query filters by `userId` from the token. Another user's resource returns **404**, never 403, so it doesn't leak existence.
- **Timer:** server sets `startTime`/`endTime` (client can't tamper). One running timer per user. Pause = stop, resume = new log. Starting on a `pending` task flips it to `in_progress`. A DB partial unique index enforces the single-running-timer rule.
- **Timezone:** "today" derives from the client's `tzOffset`. Sessions crossing midnight are split by `utils/timeWindow.js`. `dueDate` is stored as a `YYYY-MM-DD` string (a calendar day, not an instant) so it compares correctly across timezones.
- **AI:** `POST /api/tasks/ai-suggest` and insight endpoints send small pre-computed context (totals, minutes per day) rather than raw docs. Database errors return real 404s; only the LLM call itself falls back.
- **Rate limits:** auth routes per IP; AI endpoints share one per-user limiter (30 / 15 min) since every call costs money.
- **Deployment:** set `app.set('trust proxy', 1)` so Express trusts Render's proxy IP for correct rate limiting.

## API

Base URL `/api`, JSON only. Full contracts, response shapes, and examples in **[API_CONTRACTS.md](API_CONTRACTS.md)**.

Endpoints:

- **Auth:** `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **Tasks:** `POST /api/tasks/ai-suggest`, `CRUD /api/tasks`, `GET /api/tasks/:id`, timer start/stop
- **Timer:** `POST /api/tasks/:id/timer/start`, `POST /api/tasks/:id/timer/stop`
- **Time logs:** `GET /api/timelogs`, `GET /api/timelogs/active`, `DELETE /api/timelogs/:id`
- **Summary:** `GET /api/summary/today?tzOffset=-330`
- **Insights:** `GET /api/insights?range=week|month`, `GET /api/tasks/:id/insights`

## Docs

| File                          | Covers                            |
| ----------------------------- | --------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Design decisions, lifecycle, auth details |
| [API_CONTRACTS.md](API_CONTRACTS.md) | All endpoints, request/response   |
| [DB_DESIGN.md](DB_DESIGN.md)  | Schemas, indexes, integrity rules |
| [FOLDER_STR.md](FOLDER_STR.md) | Layered folder responsibilities   |
| [PROMPTS.md](PROMPTS.md)      | AI prompt templates               |
