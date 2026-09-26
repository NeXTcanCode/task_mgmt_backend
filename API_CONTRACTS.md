# API Contracts & Endpoints

**Base URL:** `/api`  
**Format:** All requests and responses use JSON  
**Authentication:** httpOnly cookie named `token`; clients must send requests with credentials (`credentials: 'include'` / `withCredentials: true`)

🔒 = requires authentication (returns 401 without a valid cookie).

## Response Format

**Success**
```json
{ "success": true, "data": { ... } }
```

**Error**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [{ "field": "email", "message": "Invalid email" }]
  }
}
```
`details` appears only on validation errors.

## Status Codes

| Code | When                                                    |
| ---- | ------------------------------------------------------- |
| 200  | Successful read/update/delete                           |
| 201  | Resource created                                        |
| 400  | Validation failed (Zod)                                 |
| 401  | Not logged in, invalid/expired token, wrong credentials |
| 404  | Resource not found **or not owned by the user**         |
| 409  | Email already registered, timer already running         |
| 429  | Too many requests (auth: per IP; AI: 30 per user / 15 min) |
| 500  | Unexpected server error                                 |

---

## Auth

### POST /api/auth/signup
```json
// request
{ "name": "Jane", "email": "jane@example.com", "password": "secret123" }
```
- name: 2–50 chars
- email: valid email
- password: 8–72 chars

`201` → sets the cookie
```json
{ "success": true, "data": { "user": { "id": "...", "name": "Jane", "email": "jane@example.com" } } }
```
Errors: `400`, `409` (email already registered)

### POST /api/auth/login
```json
{ "email": "jane@example.com", "password": "secret123" }
```
`200` → sets the cookie, same body as signup. Errors: `400`, `401` ("Invalid email or password")

### POST /api/auth/logout
`200` → clears the cookie. `{ "success": true, "data": null }`

### GET /api/auth/me 🔒
`200` → `{ "success": true, "data": { "user": { ... } } }`

---

## Tasks

**Task object**
```json
{
  "id": "...",
  "title": "Follow up with UI Designer",
  "description": "Send a Slack message to confirm wireframe delivery status.",
  "rawInput": "follow up with designer",
  "status": "pending",
  "priority": "medium",
  "dueDate": "2026-09-30",
  "completedAt": null,
  "totalTime": 0,
  "createdAt": "2026-09-26T10:00:00.000Z",
  "updatedAt": "2026-09-26T10:00:00.000Z"
}
```
`totalTime` is in seconds and is calculated from the task's completed time logs.

- `priority`: `low` | `medium` | `high` (default `medium`)
- `dueDate`: `"YYYY-MM-DD"` or `null` (a calendar day, not a timestamp)

### POST /api/tasks/ai-suggest 🔒
```json
{ "input": "follow up with designer" }
```
`200` → `{ "success": true, "data": { "title": "...", "description": "...", "aiGenerated": true } }`

If the AI call fails, the response is `aiGenerated: false`, with `title` set to the input and an empty `description`. Rate limited with the other AI endpoints: `429` after 30 AI requests per user in 15 minutes.

### POST /api/tasks 🔒
```json
{ "title": "...", "description": "...", "rawInput": "...", "status": "pending", "priority": "high", "dueDate": "2026-09-30" }
```
Only `title` is required. `priority` defaults to `medium`, `dueDate` to `null`. `201` → `{ data: { task } }`

### GET /api/tasks 🔒
Optional query parameters:
- `?status=pending|in_progress|completed`
- `?priority=low|medium|high`
- `?sort=newest|dueDate|priority` (default `newest`). `dueDate` = earliest first, tasks without a due date last. `priority` = high → low. Ties stay newest first.

`200` → `{ data: { tasks: [Task] } }`

### GET /api/tasks/:id 🔒
`200` → `{ data: { task } }`. Errors: `404`

### PATCH /api/tasks/:id 🔒
Partial update: any of `title`, `description`, `status`, `priority`, `dueDate` (`null` clears it). The body must have at least one field.

`200` → `{ data: { task } }`. Errors: `400`, `404`

### DELETE /api/tasks/:id 🔒
Also deletes the task's time logs. `200` → `{ data: null }`. Errors: `404`

---

## Timer

### POST /api/tasks/:id/timer/start 🔒
No body. `201` → `{ data: { timeLog } }` (with `endTime: null`)

Side effect: if the task's status is `pending`, it becomes `in_progress`.

Errors:
- `404`: task not found
- `409`: a timer is already running (the response includes the active log's `taskId`)

### POST /api/tasks/:id/timer/stop 🔒
No body. `200` → `{ data: { timeLog } }` with `endTime` and `duration` set

Errors: `404` if no timer is running for this task

---

## Time Logs

**TimeLog object**
```json
{
  "id": "...",
  "taskId": "...",
  "task": { "id": "...", "title": "..." },
  "startTime": "2026-09-26T10:00:00.000Z",
  "endTime": "2026-09-26T10:25:00.000Z",
  "duration": 1500
}
```

### GET /api/timelogs 🔒
Optional query parameters: `?taskId=...`, `?from=ISO&to=ISO`

`200` → `{ data: { timeLogs: [TimeLog] } }`, newest first

### GET /api/timelogs/active 🔒
`200` → `{ data: { timeLog } }`. `timeLog` is `null` if no timer is running.

### DELETE /api/timelogs/:id 🔒
`200` → `{ data: null }`. Errors: `404`

---

## Summary

### GET /api/summary/today?tzOffset=-330 🔒
`tzOffset` is in minutes and is the value of JS `new Date().getTimezoneOffset()`. It defaults to `0` (UTC).

`200`
```json
{
  "success": true,
  "data": {
    "date": "2026-09-26",
    "totalTrackedSeconds": 5400,
    "tasksWorkedOn": [{ "id": "...", "title": "...", "status": "in_progress", "trackedSeconds": 3600 }],
    "completedToday": [{ "id": "...", "title": "...", "completedAt": "..." }],
    "inProgress": [{ "id": "...", "title": "...", "priority": "high", "dueDate": null }],
    "pending": [{ "id": "...", "title": "...", "priority": "medium", "dueDate": "2026-09-30" }],
    "overdue": [{ "id": "...", "title": "...", "priority": "high", "dueDate": "2026-09-20" }],
    "dueToday": [{ "id": "...", "title": "...", "priority": "low", "dueDate": "2026-09-26" }]
  }
}
```
- `overdue`: not completed and `dueDate` is before today (the user's local date), earliest first.
- `dueToday`: not completed and `dueDate` is today.
