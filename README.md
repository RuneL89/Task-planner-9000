# Task Planner 9000

A visual, canvas-based task management app that runs entirely in the browser. No server. No database. Just you, your tasks, and GitHub.

![Task Planner 9000](https://img.shields.io/badge/deployed%20on-GitHub%20Pages-blue)

## What is this?

Task Planner 9000 is a productivity app built around **main tasks** and **subtasks** you arrange on an interactive canvas. Create a main task, break it down into subtasks, draw connections between related work, set deadlines, and track completion — all with a visual, node-based interface.

**Key features:**

- **Visual Canvas** — Drag, zoom, and arrange tasks as nodes using React Flow
- **Hierarchical Tasks** — Main tasks contain subtasks (and sub-subtasks) that can be collapsed/expanded
- **Task Connections** — Draw dependency lines between any tasks on the canvas
- **Deadline Tracking** — Sidebar shows overdue, due today, upcoming, and no-deadline tasks
- **Weekly Planner** — Select main tasks and plan your next 7 days
- **Completed Tasks View** — Filterable history grouped by main task with early/on-time/late badges
- **Auto-Cleanup** — Main tasks can auto-delete fully-completed subtask branches after 1 day, 1 week, or 1 month
- **Cross-Device Sync** — Syncs via a JSON file stored in the GitHub repo itself

## Architecture

This is a **static single-page app** deployed to **GitHub Pages**. There is no backend.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your Browser  │────▶│  IndexedDB      │     │  GitHub Pages   │
│  (React + Vite) │     │  (Dexie.js)     │     │  (Static HTML)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ raw.githubusercontent.com │  │  GitHub REST API │
│  (read data/tasks.json)   │  │ (write data/tasks.json) │
└─────────────────┘     └─────────────────┘
```

### Local Storage — IndexedDB

All task data lives in your browser's IndexedDB via [Dexie.js](https://dexie.org/):

- **Instant** — No network latency for reads or writes
- **Offline-first** — Works without internet
- **Structured** — Two tables: `tasks` and `taskConnections`

### Cross-Device Sync — GitHub API

To keep tasks in sync across devices, the app reads and writes a `data/tasks.json` file directly in this GitHub repository:

- **Reads** — Fetches from `raw.githubusercontent.com` (bypasses Pages cache)
- **Writes** — Uses the GitHub REST API (`PUT /repos/{owner}/{repo}/contents/data/tasks.json`)
- **Conflict-free** — Designed for a single user who never uses two devices simultaneously; pulls on app open, pushes on changes
- **Privacy** — Your data stays in your own repo; no third-party servers involved

## Setup & Deployment

### 1. Fork this repo

Fork the repository so you own the `data/tasks.json` file.

### 2. Enable GitHub Pages

Go to **Settings → Pages** in your fork and set the source to deploy from the `main` branch using the `/ (root)` folder.

### 3. Configure sync (optional but recommended)

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens) and create a **Personal Access Token** with `repo` scope
2. Open the deployed app, click **GitHub Sync Settings** in the sidebar, and paste your token
3. The app will auto-sync on every change (debounced 5 seconds) and auto-pull when you open the app

### 4. Build locally (optional)

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run deploy   # deploy dist/ to gh-pages branch
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Routing | Wouter (hash routing for GitHub Pages) |
| Local DB | Dexie.js (IndexedDB wrapper) |
| State | TanStack Query |
| Canvas | React Flow (@xyflow/react) |
| UI | Radix UI + shadcn/ui + Tailwind CSS |
| Forms | React Hook Form + Zod |
| Dates | date-fns |
| Sync | GitHub REST API |

## Project Structure

```
├── client/src/
│   ├── components/       # UI components (TaskCanvas, Sidebar, TaskModal, etc.)
│   ├── hooks/
│   │   ├── use-tasks.ts        # All task CRUD via Dexie
│   │   └── useGitHubSync.ts    # Auto-pull/push logic
│   ├── lib/
│   │   ├── db.ts               # Dexie schema
│   │   ├── taskHierarchy.ts    # Client-side tree builder
│   │   ├── githubSync.ts       # GitHub API wrapper
│   │   └── cleanup.ts          # Auto-cleanup logic
│   ├── pages/
│   │   ├── home.tsx            # Main canvas + sidebar
│   │   └── completed-tasks.tsx # Completion history
│   └── App.tsx             # Hash router setup
├── data/
│   └── tasks.json          # Sync file (lives in repo)
├── dist/                   # Build output (deployed to Pages)
├── vite.config.ts
└── package.json
```

## Sync Behavior

| Event | Action |
|-------|--------|
| App opens | Pulls from `data/tasks.json`. If remote is newer, replaces local IndexedDB |
| Task created/updated/deleted | Debounced push (5s) to `data/tasks.json` |
| Browser closes | Attempts to flush any pending push |
| Manual "Sync Now" | Forces a pull-then-push cycle |

## Routing

GitHub Pages doesn't support SPA history routing, so the app uses **hash routing**:

- Home: `https://yourname.github.io/Task-planner-9000/#/`
- Completed tasks: `https://yourname.github.io/Task-planner-9000/#/completed-tasks`

## Data Model

### Task

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `title` | string | Task name |
| `description` | string \| null | Details |
| `status` | enum | `pending`, `in_progress`, `completed`, `on_hold` |
| `priority` | enum | `low`, `medium`, `high` |
| `deadline` | string \| null | ISO date |
| `isMainTask` | boolean | Top-level task |
| `isCollapsed` | boolean | Children hidden |
| `parentTaskId` | string \| null | Parent task reference |
| `positionX` / `positionY` | number | Canvas coordinates |
| `createdAt` / `updatedAt` | string | Timestamps |
| `completedAt` | string \| null | Set when status → completed |
| `autoCleanupEnabled` | boolean | Enable auto-deletion |
| `autoCleanupPeriod` | enum | `off`, `1day`, `1week`, `1month` |

### TaskConnection

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `sourceTaskId` | string | From task |
| `targetTaskId` | string | To task |
| `createdAt` | string | Timestamp |

## Auto-Cleanup

Main tasks can automatically delete fully-completed subtask branches after a retention period:

- Only branches where **all descendants** are `completed` are eligible
- Main tasks themselves are **never** deleted
- Runs lazily on app load, max 20 tasks per batch
- Eligible tasks show a "🗑️ Cleans up in X days" badge on the canvas

## License

MIT
