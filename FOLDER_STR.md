# Backend Folder Structure

Organized for scalability and clarity. Each layer (config, models, routes, controllers, validators, middleware, utils) has a single responsibility. Dependencies flow downward: routes call controllers, controllers use models and utils, all errors flow through the error handler.

```
backend/
├── src/
│   ├── server.js                  # express app setup (middleware + routes), DB connect, listen
│   │
│   ├── config/
│   │   └── db.js                  # mongoose.connect(MONGO_URI)
│   │
│   ├── models/
│   │   ├── User.js                # name, email, passwordHash
│   │   ├── Task.js                # userId, title, description, rawInput, status, priority, dueDate, completedAt
│   │   └── TimeLog.js             # userId, taskId, startTime, endTime, duration
│   │
│   ├── routes/
│   │   ├── index.js               # mounts all routers under /api
│   │   ├── authRoutes.js          # /api/auth/*
│   │   ├── taskRoutes.js          # /api/tasks/* (incl. timer start/stop, ai-suggest)
│   │   ├── timeLogRoutes.js       # /api/timelogs/*
│   │   └── summaryRoutes.js       # /api/summary/*
│   │
│   ├── controllers/
│   │   ├── authController.js      # signup, login, logout, me
│   │   ├── taskController.js      # create, list, get, update, delete, aiSuggest
│   │   ├── timeLogController.js   # startTimer, stopTimer, list, getActive, delete
│   │   └── summaryController.js   # today
│   │
│   ├── validators/
│   │   ├── authValidator.js       # zod: signup, login
│   │   ├── taskValidator.js       # zod: create, update, aiSuggest, id param, query
│   │   ├── timeLogValidator.js    # zod: list query, id param
│   │   └── summaryValidator.js    # zod: tzOffset query
│   │
│   ├── middleware/
│   │   ├── requireAuth.js         # verify JWT cookie → req.user
│   │   ├── validate.js            # runs a zod schema on body/params/query
│   │   ├── rateLimiter.js         # express-rate-limit: auth (per IP), AI (per user)
│   │   ├── notFound.js            # 404 for unknown routes
│   │   └── errorHandler.js        # formats all errors into one response shape
│   │
│   └── utils/
│       ├── AppError.js            # custom error class (message + statusCode)
│       ├── token.js               # signToken, cookie options
│       ├── dayRange.js            # start/end of "today" from tzOffset
│       ├── timeWindow.js          # logs overlapping a day/range, seconds inside it
│       └── aiClient.js            # optional: call LLM for task suggestion and insights
│
├── .env                           # real secrets (git-ignored)
├── .env.example                   # env var names without values (committed)
├── .gitignore                     # node_modules, .env, layman.md
├── package.json
├── ARCHITECTURE.md
├── API_CONTRACTS.md
├── DB_DESIGN.md
├── PROMPTS.md
├── folderStr.md
└── layman.md                      # personal notes (git-ignored)
```

## Build order

1. `config/` → `server.js` (server runs and connects to the DB)
2. `utils/AppError.js`, `middleware/notFound.js`, `middleware/errorHandler.js`
3. `models/User.js` → auth validator, controller and routes → `requireAuth.js`, `rateLimiter.js`
4. `models/Task.js` → task validator, controller and routes
5. `models/TimeLog.js` → timer and time log controller and routes
6. `utils/dayRange.js` → summary controller and routes
7. `utils/aiClient.js` (optional, last)
