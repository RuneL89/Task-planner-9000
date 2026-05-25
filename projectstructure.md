# Project Structure — Task Planner 9000

This document describes every folder and file that contributes to the functional behavior of the application. After reading this, a competent developer should understand how the app works without opening any source files.

---

## Root Configuration Files

| File | Description |
|------|-------------|
| `package.json` | Node dependencies and scripts. Notable scripts: `dev` (runs Express dev server via tsx), `build` (Vite client build + esbuild server bundle), `start` (production server), `db:push` (Drizzle schema push). |
| `vite.config.ts` | Vite configuration. Sets `client/` as root, builds to `dist/public/`, defines path aliases `@/` → `client/src/`, `@shared/` → `shared/`. Includes React plugin and Replit-specific plugins in dev. |
| `tsconfig.json` | TypeScript config with `ESNext` module, `bundler` resolution, path aliases matching Vite. Includes `client/src/**/*`, `shared/**/*`, `server/**/*`. |
| `tailwind.config.ts` | Tailwind CSS v3 configuration with custom colors (CSS variables), sidebar tokens, accordion animations, and `@tailwindcss/typography` plugin. |
| `postcss.config.js` | PostCSS setup with `tailwindcss` and `autoprefixer` plugins. |
| `drizzle.config.ts` | Drizzle Kit configuration pointing to `server/db.ts` for schema pushes. |
| `components.json` | shadcn/ui project metadata (style, base color, Tailwind config path, alias paths). |

---

## `client/` — Frontend

### `client/index.html`
Standard Vite entry HTML. Loads `src/main.tsx`.

### `client/src/main.tsx`
React 18 entry point. Creates root and renders `<App />`. Imports global styles.

### `client/src/index.css`
Global CSS including Tailwind directives (`@tailwind base/components/utilities`), CSS variable definitions for theming (light/dark mode via `next-themes` variables), and custom scrollbar styles.

---

### `client/src/App.tsx`
Top-level React component. Wraps the app in:
- `QueryClientProvider` (TanStack Query)
- `TooltipProvider`
- `Toaster`
- `Router` (wouter `Switch` with routes: `/` → Home, `/completed-tasks` → CompletedTasks, fallback → NotFound)

---

### `client/src/pages/`

| File | Description |
|------|-------------|
| `home.tsx` | **Main application page.** Orchestrates all major UI pieces: Sidebar, TaskCanvas, TaskModal, CompletionDialog, MainTaskSelector, WeeklyPlanner. Manages sidebar open/close state, modal state, completion dialog state, dismissed-completed-tasks set, and selected main task IDs for planning. Contains the core auto-completion logic: monitors `tasks` data via `useEffect` and prompts to complete a main task when all descendants are marked completed. Also handles auto-reverting a main task to `in_progress` when subtasks become incomplete again. |
| `completed-tasks.tsx` | **Completed tasks page** (`/completed-tasks`). Fetches all tasks, filters to `status === "completed"`, groups them by their root main task, and displays them in card layout with completion status badges ("Completed Early", "On Time", "Completed Late"). Includes time-period filters (1–4 weeks, All). |
| `not-found.tsx` | Simple 404 page with an alert card. |

---

### `client/src/components/` — Feature Components

| File | Description |
|------|-------------|
| `TaskCanvas.tsx` | **React Flow canvas.** Converts flat task data into React Flow nodes (`useNodesState`) and edges (`useEdgesState`). Handles: filtering hidden tasks (collapsed ancestors), auto-positioning new tasks, generating parent-child edges (blue, static) and manual connection edges (gray, animated), node drag-stop auto-save (persists `positionX/Y` via `useUpdateTask`), new edge creation (calls `useCreateTaskConnection`), and the `focusTask` navigation function (zooms canvas, collapses other main tasks, expands target ancestors). Wrapped in `ReactFlowProvider`. |
| `TaskNode.tsx` | **Visual node card rendered inside React Flow.** Displays: status dot, "MAIN TASK" badge, title, description, status/priority badges, deadline text ("Due in X days" / "Overdue"), auto-cleanup countdown badge (🗑️), progress bar for main tasks (completed/total descendants), subtask count, collapse toggle button, and a "+" button to add subtasks. Implements long-press detection for mobile edit. Contains `isFullyCompletedBranch` and `findParentMainTask` helpers used for cleanup indicator logic. |
| `Sidebar.tsx` | **Collapsible left sidebar.** Shows app title, quick stats (total/completed task counts), "Create New Task" button, "View Completed Tasks" link, and a scrollable task list organized into deadline sections: Overdue, Today, Upcoming Deadlines, No Deadline, Completed. Each section is collapsible. Clicking a task calls `onFocusTask` to navigate the canvas. Supports both mobile (slide-over with overlay) and desktop (fixed toggle) layouts. |
| `TaskModal.tsx` | **Create/Edit task dialog.** Form fields: title, description, status dropdown, priority dropdown, deadline date picker (Popover + Calendar), task type toggle (Main/Sub), hierarchical parent task selector (custom tree UI), auto-cleanup settings (checkbox + retention period dropdown, only for main tasks), and additional task connections toggle list (only when editing a subtask). Handles submission via `useCreateTask` or `useUpdateTask`, and deletion with recursive subtask count confirmation (fetches `/api/tasks/:id/deletion-info`). |
| `CompletionDialog.tsx` | **Modal shown when all subtasks of a main task are completed.** Offers three actions: "Mark Main Task as Completed", "Add More Sub Tasks", or "Keep as Is". |
| `MainTaskSelector.tsx` | **Dialog for selecting main tasks to plan.** Shows all non-completed main tasks as checkboxes. User selects tasks and clicks "Start Planning" to open the WeeklyPlanner. |
| `MainTasksDropdown.tsx` | **Top-nav dropdown** showing all main tasks ordered by `updatedAt` desc. Displays status dot, title, deadline, and subtask count. Clicking a task navigates the canvas to it. |
| `WeeklyPlanner.tsx` | **Full-screen overlay for "Plan the next 7 days."** Collects all non-completed subtasks from selected main tasks, then presents them one at a time via `SwipeCard`. Swiping right opens `DatePickerPopup` to assign a deadline; swiping left skips. Tracks progress counter. |
| `SwipeCard.tsx` | **Tinder-style swipeable card** inside WeeklyPlanner. Uses `framer-motion` drag. Shows breadcrumb path (parent chain), task title, description, and deadline. Swipe right → schedule, swipe left → skip. |
| `DatePickerPopup.tsx` | **Weekday selector dialog** inside WeeklyPlanner. Shows Monday–Friday buttons with dates for the current/next week. Selecting a date assigns it as the task deadline and advances to next card. |
| `MobileControls.tsx` | **Floating mobile controls** (only visible on mobile): zoom in/out, fit view, and a large circular "+" FAB to create a task. Positioned fixed over the canvas. |

---

### `client/src/components/ui/` — shadcn/ui Primitive Components

All components in this folder are generic, unstyled or lightly-styled Radix UI primitives wrapped with Tailwind classes and `cn()` utility. They are **not business-logic specific** and are reused across the app.

Key primitives used by feature components:
- `dialog.tsx`, `dialog` (Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter) — used by TaskModal, CompletionDialog, MainTaskSelector, DatePickerPopup
- `button.tsx` (Button) — used everywhere
- `card.tsx` (Card, CardContent, CardHeader, CardTitle) — used by TaskNode, Sidebar stats, Completed Tasks page
- `badge.tsx` (Badge) — used by TaskNode, Sidebar, Completed Tasks
- `input.tsx`, `textarea.tsx` — form inputs in TaskModal
- `select.tsx` (Select, SelectContent, SelectItem, SelectTrigger, SelectValue) — status, priority, cleanup period selectors
- `calendar.tsx` (Calendar) — date picker in TaskModal
- `popover.tsx` (Popover, PopoverContent, PopoverTrigger) — wraps Calendar for deadline picker
- `checkbox.tsx` (Checkbox) — auto-cleanup toggle, main task selector, connection toggles
- `switch.tsx` (Switch) — additional connection toggles in TaskModal
- `scroll-area.tsx` (ScrollArea) — Sidebar task list, MainTaskSelector list
- `separator.tsx` (Separator) — visual dividers
- `toast.tsx`, `toaster.tsx` — toast notifications
- `tooltip.tsx` (TooltipProvider) — app-wide tooltip wrapper
- `accordion.tsx`, `alert-dialog.tsx`, `alert.tsx`, `aspect-ratio.tsx`, `avatar.tsx`, `breadcrumb.tsx`, `carousel.tsx`, `chart.tsx`, `collapsible.tsx`, `command.tsx`, `context-menu.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `form.tsx`, `hover-card.tsx`, `input-otp.tsx`, `label.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `pagination.tsx`, `progress.tsx`, `radio-group.tsx`, `resizable.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `slider.tsx`, `table.tsx`, `tabs.tsx`, `toggle-group.tsx`, `toggle.tsx` — available in the design system but not currently used by active feature components.

---

### `client/src/hooks/`

| File | Description |
|------|-------------|
| `use-tasks.ts` | **Core data layer hooks.** Exports: `useTasks` (flat list for canvas), `useTasksNested` (hierarchical list for sidebar), `useTask` (single task), `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useGetTaskDeletionInfo`, `useTaskConnections`, `useCreateTaskConnection`, `useToggleTaskCollapse`, `useTaskStats`. All hooks use TanStack Query (`useQuery`/`useMutation`) and call REST endpoints (`/api/tasks`, `/api/task-connections`, `/api/stats`). Includes `flattenTasksForCanvas` helper to deduplicate nested task trees. |
| `use-mobile.tsx` | Detects mobile viewport (< 768px) using `useSyncExternalStore` + `matchMedia`. Returns boolean. No re-render flicker. |
| `use-toast.ts` | Global toast notification state manager. Uses a reducer pattern with a singleton `memoryState` and listener array. Exported `toast()` function can be called imperatively from anywhere. `useToast()` hook subscribes component to toast state. Limit: 1 toast visible at a time. |

---

### `client/src/lib/`

| File | Description |
|------|-------------|
| `queryClient.ts` | Configures TanStack Query's `QueryClient`. Default `queryFn` uses `fetch` with credentials. `apiRequest()` helper wraps `fetch` for mutations. Sets `staleTime: Infinity`, `refetchOnWindowFocus: false`, `retry: false`. |
| `utils.ts` | Utility function `cn()` — merges Tailwind classes via `clsx` + `tailwind-merge`. |

---

## `server/` — Backend

| File | Description |
|------|-------------|
| `server/index.ts` | Express application entry point. Sets up JSON parsing, request logging middleware (captures response body and duration), database health-check retry loop (`waitForDatabase`), route registration, global error handler, and Vite dev middleware (in development) or static file serving (in production). Listens on `PORT` env var (default 5000). |
| `server/routes.ts` | **REST API route definitions.** Registers all endpoints under `/api/`: `GET /api/tasks` (triggers background `cleanupCompletedTasks`), `GET /api/tasks/:id`, `POST /api/tasks`, `PUT /api/tasks/:id` (auto-manages `completedAt` timestamp based on status transitions), `GET /api/tasks/:id/deletion-info`, `DELETE /api/tasks/:id`, `GET /api/task-connections`, `POST /api/task-connections`, `DELETE /api/task-connections/:id`, `GET /api/stats`. Validates request bodies with Zod schemas. |
| `server/storage.ts` | **Database access layer.** Defines `IStorage` interface and `DatabaseStorage` implementation using Drizzle ORM. Key methods: `getTasks()` (fetches root tasks and recursively builds full hierarchy via `buildTaskHierarchy`), `getTask(id)`, `createTask`, `updateTask` (also recursively bumps ancestor `updatedAt`), `deleteTask` (recursive cascade delete of subtasks + connections), `getTaskDeletionCount` (recursive count for confirmation dialog), `cleanupCompletedTasks` (finds main tasks with auto-cleanup enabled, checks fully-completed branches against retention period, deletes up to 20 tasks per batch), `getTaskConnections`, `createTaskConnection`, `deleteTaskConnection`, `getTaskStats`. |
| `server/db.ts` | Database client setup. Uses `@neondatabase/serverless` `Pool` with `ws` WebSocket constructor override. Creates Drizzle ORM instance with schema. Throws if `DATABASE_URL` env var is missing. |
| `server/vite.ts` | Development-only Vite integration. `setupVite()` creates a Vite dev server in middleware mode and serves `client/index.html` with cache-busting query params. `serveStatic()` serves production static files from `public/` and falls back to `index.html` for SPA routing. |

---

## `shared/` — Shared Code

| File | Description |
|------|-------------|
| `shared/schema.ts` | **Single source of truth for database schema and types.** Defines two Drizzle tables: `tasks` (columns: id, title, description, status, priority, deadline, isMainTask, isCollapsed, parentTaskId, positionX, positionY, createdAt, updatedAt, completedAt, autoCleanupEnabled, autoCleanupPeriod) and `taskConnections` (id, sourceTaskId, targetTaskId, createdAt). Sets up self-referencing relations (`parent_subtasks`) and connection relations. Exports Zod insert schemas (`insertTaskSchema`, `insertTaskConnectionSchema`) and TypeScript types (`Task`, `InsertTask`, `TaskConnection`, `InsertTaskConnection`, `TaskWithRelations`). |

---

## Data Flow Summary

1. **Frontend** React components render task data sourced from TanStack Query hooks.
2. **Hooks** in `use-tasks.ts` fetch from Express REST endpoints (`/api/tasks`, etc.).
3. **Routes** in `server/routes.ts` receive requests, validate with Zod, and delegate to `storage.ts`.
4. **Storage** in `server/storage.ts` uses Drizzle ORM to query PostgreSQL (Neon).
5. **Schema** in `shared/schema.ts` defines the tables, relations, and types used by both frontend and backend.
6. **Backend** recursively builds task hierarchies when returning data; frontend receives fully nested trees.
7. **Canvas** flattens nested trees into React Flow nodes, filtering out tasks hidden by collapsed ancestors.
