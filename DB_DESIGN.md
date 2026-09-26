# Database Design

MongoDB (Atlas) with Mongoose ODM. Three collections with strict ownership rules: every Task and TimeLog belongs to a User. Emphasizes data isolation, correct timezone handling, and efficient indexing for common queries.

```
User 1 ──── * Task 1 ──── * TimeLog
  └──────────────────────── * TimeLog   (userId stored on TimeLog for fast, isolated queries)
```

> **Managed by Mongoose, never set in code:** `_id` is generated automatically, and `createdAt`/`updatedAt` come from `{ timestamps: true }` on every schema. They're not listed in the tables below.

## User

| Field        | Type     | Rules                              |
| ------------ | -------- | ---------------------------------- |
| name         | String   | required, trimmed, 2–50 chars      |
| email        | String   | required, unique, lowercase, trimmed |
| passwordHash | String   | required, `select: false`          |

**Indexes:** `{ email: 1 }` unique

`passwordHash` is never returned in any response.

## Task

| Field       | Type     | Rules                                                    |
| ----------- | -------- | -------------------------------------------------------- |
| userId      | ObjectId | ref User, required, indexed                              |
| title       | String   | required, trimmed, 1–200 chars                           |
| description | String   | optional, up to 2000 chars, default `""`                  |
| rawInput    | String   | optional: the original natural-language input            |
| status      | String   | enum `pending` \| `in_progress` \| `completed`, default `pending` |
| priority    | String   | enum `low` \| `medium` \| `high`, default `medium`       |
| dueDate     | String   | calendar day `"YYYY-MM-DD"`, default `null`              |
| completedAt | Date     | set when status becomes `completed`, cleared otherwise   |

**Indexes:**
- `{ userId: 1, createdAt: -1 }` for the task list
- `{ userId: 1, completedAt: 1 }` for the daily summary

**Why `dueDate` is a string:** a due date is a calendar day, not a moment in time. Stored as a `Date` it would shift by the user's timezone (e.g. `2026-09-30` in India is `2026-09-29T18:30Z`). As `"YYYY-MM-DD"` it stays the same everywhere, sorts correctly, and "overdue" is a plain string comparison with the user's local date.

**Why `completedAt`:** the daily summary needs to know *when* a task was completed. `status` alone can't tell us that.

## TimeLog

| Field     | Type     | Rules                                             |
| --------- | -------- | ------------------------------------------------- |
| userId    | ObjectId | ref User, required                                |
| taskId    | ObjectId | ref Task, required                                |
| startTime | Date     | required, set by the server                       |
| endTime   | Date     | `null` while running, set by the server on stop   |
| duration  | Number   | seconds, `0` while running, calculated on stop    |

**Indexes:**
- `{ userId: 1, startTime: -1 }` for the time log list
- `{ taskId: 1 }` for per-task totals
- `{ userId: 1, endTime: 1 }` for logs that overlap a day or range (daily summary, insights), so sessions that cross midnight are found
- `{ userId: 1 }` **unique, partial** where `endTime` is null (`$type: "null"`). At the database level, this ensures a user can have only one running timer. Queries for the running timer use `endTime: { $type: "null" }` so they can use this index.

## Derived Data (calculated, not stored)

| Value                   | How                                                              |
| ----------------------- | ---------------------------------------------------------------- |
| Total time per task     | aggregate: `$match { userId, taskId }` → `$group` sum `duration` |
| Elapsed (running timer) | `now - startTime` (computed on the client)                       |
| Today's tracked time    | logs overlapping today, each cut at midnight (running = up to now) |
| Overdue                 | not completed and `dueDate < today` (user's local `YYYY-MM-DD`)  |

## Integrity Rules

- Deleting a task deletes all of its time logs.
- Status changes update `completedAt`: it's set to now when the status becomes `completed` and set to `null` otherwise.
- Starting a timer on a `pending` task changes its status to `in_progress`.
- A log can only be created for a task owned by the same user.
