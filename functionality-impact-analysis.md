# Functionality Impact Analysis — Option B + Repo JSON Sync

This document evaluates every user-facing frontend functionality to determine what breaks, changes, or stays identical when migrating from **Express + PostgreSQL** to a static frontend on **GitHub Pages** using **Dexie.js + IndexedDB** as a local cache, with a **JSON file stored in the GitHub repo** as the centralized data source synced via the GitHub REST API.

The user is the sole user and never uses two devices simultaneously, eliminating race conditions.

---

## Legend

| Judgement | Meaning |
|-----------|---------|
| **No change** | The user experience is visually and behaviorally identical to the current app. |
| **Change but still functional** | The user experience is slightly different in mechanism, timing, or URL shape, but the feature still works correctly. |
| **Will be broken** | The feature will not work unless additional code changes are made. |

---

## Impact Table

| # | User Functionality | Judgement | Explanation |
|---|-------------------|-----------|-------------|
| 1 | **View tasks on interactive canvas** | No change | `TaskCanvas` and `TaskNode` consume the same `useTasks()` hook. The data shape stays identical. The JSON-in-repo approach does not affect rendering logic. |
| 2 | **Create a new task** | No change | `TaskModal` calls `useCreateTask().mutate()`, which writes to IndexedDB and debounced-writes to the repo JSON via GitHub API. The UI flow (open modal → fill form → save → toast → close) is identical. |
| 3 | **Edit an existing task** | No change | Same as creation: `useUpdateTask` writes to IndexedDB, then syncs to repo. Status transitions, deadline changes, priority updates all behave the same. |
| 4 | **Delete a task with cascade warning** | Change but still functional | Currently `TaskModal` fetches `/api/tasks/:id/deletion-info`. This endpoint disappears. The recursive count must be computed client-side via Dexie (`db.tasks.where('parentTaskId')` traversal) before showing the `confirm()` dialog. The user sees the same confirmation message. |
| 5 | **Add a subtask via "+" button on node** | No change | TaskNode's "+" button opens `TaskModal` with `parentTask` pre-filled. Data saves to IndexedDB, then syncs to repo. No visible difference. |
| 6 | **Collapse/expand tasks to show/hide subtasks** | No change | The toggle button calls `useToggleTaskCollapse`, which updates `isCollapsed` in IndexedDB. Because `isCollapsed` is a local UI preference, it does not need to sync to the repo (or optionally can). `TaskCanvas` re-computes visible nodes identically. |
| 7 | **Drag tasks on canvas to reposition** | No change | `onNodeDragStop` in `TaskCanvas` calls `useUpdateTask` to save `positionX` and `positionY`. Data goes to IndexedDB, then syncs to repo. Canvas refresh and edge re-routing behave identically. |
| 8 | **Create manual connections between tasks** | No change | React Flow's `onConnect` handler calls `useCreateTaskConnection`, which writes to IndexedDB and syncs to repo. The gray animated edge appears instantly. |
| 9 | **Delete manual connections** | No change | Currently marked as a TODO in `TaskModal`. The feature was already non-functional; migration neither fixes nor breaks it further. |
| 10 | **Navigate to task from sidebar deadline sections** | No change | Clicking a task in the sidebar calls `onFocusTask`, which triggers `focusTask` in `TaskCanvas`. Same code path, same behavior. |
| 11 | **Navigate to task from Main Tasks dropdown** | No change | `MainTasksDropdown` items call `onFocusTask`. Behavior identical to sidebar navigation. |
| 12 | **View task stats in sidebar (total/completed counts)** | No change | `useTaskStats` counts tasks from IndexedDB. The numbers render the same way in the sidebar cards. |
| 13 | **View deadline-categorized task lists in sidebar** | No change | The sidebar computes categories locally by iterating over the task array. No server logic involved. |
| 14 | **Auto-complete main task prompt** | No change | `home.tsx` monitors the `tasks` array via `useEffect` and shows `CompletionDialog` when all descendants are `completed`. Pure client-side logic. |
| 15 | **Mark main task completed from dialog** | No change | Calls `useUpdateTask` to set status to `completed`. Same as editing any task. |
| 16 | **Dismiss completion dialog / add more subtasks** | No change | Dismissal updates local React state. "Add more subtasks" opens `TaskModal` pre-filled with the main task as parent. |
| 17 | **"Plan the next 7 days" weekly planner** | No change | `MainTaskSelector` → `WeeklyPlanner` → `SwipeCard` → `DatePickerPopup` flow is entirely client-side. It reads tasks from IndexedDB and assigns deadlines via `useUpdateTask`. |
| 18 | **Swipe cards to schedule or skip tasks** | No change | `SwipeCard` uses `framer-motion` drag gestures. Purely local UI state. |
| 19 | **View Completed Tasks page** | Change but still functional | The page itself renders identically. However, on GitHub Pages the URL must change from `/completed-tasks` to `/#/completed-tasks` because GitHub Pages does not support HTML5 `pushState` SPA routing. Refreshing a direct link to `/completed-tasks` returns a 404 without hash routing. **Fix required.** |
| 20 | **Filter completed tasks by time period (1–4 weeks / All)** | No change | Filtering is done client-side in `completed-tasks.tsx` with `date-fns`. |
| 21 | **View completion status badges (Early / On Time / Late)** | No change | Computed client-side by comparing `completedAt` vs `deadline` with `date-fns`. |
| 22 | **View auto-cleanup countdown badge on completed subtasks** | No change | `TaskNode` computes the countdown by walking up `allTasks` to find the parent main task's cleanup settings. All data is already in the client. |
| 23 | **Auto-cleanup actual deletion of old completed tasks** | Change but still functional | Currently triggered server-side on every `GET /api/tasks`. With the static app, this runs client-side in a `useEffect` on app mount. The same deletion logic (fully-completed branch check, retention period math, 20-task batch limit) runs in the browser, then syncs the updated JSON to the repo. Same end result: old completed subtasks disappear. |
| 24 | **Mobile controls (zoom buttons, floating action button)** | No change | `MobileControls` is purely presentational. No data layer involved. |
| 25 | **Long-press to edit on mobile** | No change | `TaskNode` uses `setTimeout` on `mouseDown`/`touchStart`. Purely local interaction. |
| 26 | **Toast notifications (success/error feedback)** | No change | `useToast` is a client-side singleton with no backend dependency. |
| 27 | **Offline access** | Change but still functional | The app keeps IndexedDB as a local cache, so it works offline for reads and local edits. Changes made offline are queued and synced to the repo JSON when connectivity returns. If the user opens the app while offline, they see their last-synced data. This is actually an improvement over the original server-dependent app. |
| 28 | **Access app from multiple devices with same data** | No change | **This is the key fix.** The JSON file in the repo acts as the central database. On app load, each device fetches the latest JSON from `raw.githubusercontent.com` and hydrates IndexedDB. On changes, each device commits the JSON back to the repo. Because the user never uses two devices simultaneously, there are no write conflicts. The experience matches the current centralized backend. |
| 29 | **Page refresh while on Completed Tasks page** | No change | Switch wouter from History API to hash routing via `useHashLocation` from `wouter/use-hash-location`. URLs become `/#/completed-tasks`. GitHub Pages always serves `index.html` for the root path, and the JavaScript router reads the hash to render the correct page. Refreshing any route works correctly. |
| 30 | **Direct link/bookmark to Completed Tasks page** | No change | With hash routing, bookmarks and direct links use the hash fragment (e.g., `/#/completed-tasks`), which is handled entirely client-side. GitHub Pages never sees the route, so bookmarks work reliably across all devices. |
| 31 | **Data persistence across browser sessions** | No change | Data persists in the GitHub repo as a committed JSON file. Even if the user clears browser data, the next app load fetches the JSON from the repo and restores all tasks. The repo is the source of truth. |
| 32 | **App loading speed on startup** | Change but still functional | Previously the app showed a spinner while fetching from `/api/tasks` (network round-trip to PostgreSQL). With repo JSON, the app fetches a single static JSON file from `raw.githubusercontent.com` on load. For small-to-medium task datasets, this is comparable or faster than the original API call. The JSON parse + Dexie bulk-insert is very fast. |
| 33 | **View last sync timestamp & manual sync** | Change but still functional | Instead of a manual export, the UI shows a "Last sync" timestamp (the `updatedAt` of the most recently changed task, or the last GitHub API commit time) so the user knows how fresh the data is. A "Sync Now" button forces an immediate push/pull to GitHub, useful if the automatic debounced sync feels laggy or if the user wants to guarantee data is written before switching devices. |
| 34 | **Git sync latency** | Change but still functional | There is a ~1–3 second debounce between making a change and the JSON being committed to the repo. The user sees their change instantly (IndexedDB is immediate), but if they close the browser tab within 3 seconds of making a change, the write to the repo may not complete. A `beforeunload` handler can force a final sync. Also, GitHub API has rate limits (5000 req/hour), which is generous for personal use. |

---

## Summary of Required Code Changes to Prevent Breakage

| Issue | Required Fix | File(s) Affected |
|-------|-------------|------------------|
| Hash routing for GitHub Pages | Switch wouter to `useHashLocation` | `client/src/App.tsx` |
| Deletion info without backend | Replace `fetch(/api/tasks/:id/deletion-info)` with recursive Dexie count in `TaskModal` | `client/src/components/TaskModal.tsx` |
| Auto-cleanup trigger | Move `cleanupCompletedTasks` logic into a `useEffect` in `home.tsx` | `client/src/pages/home.tsx` |
| Query key strings | Change TanStack Query keys from `['/api/tasks']` to `['tasks']` etc. | `client/src/hooks/use-tasks.ts` |
| GitHub API sync layer | New module to read/write repo JSON file via GitHub REST API | New: `client/src/lib/githubSync.ts` |
| Dexie database schema | Create IndexedDB tables matching current PostgreSQL schema | New: `client/src/lib/db.ts` |
| Data load on startup | Fetch repo JSON on app mount, hydrate IndexedDB | `client/src/hooks/use-tasks.ts` or `client/src/App.tsx` |
| Data write on changes | Debounced commit of IndexedDB state to repo JSON | New: `client/src/hooks/useGitHubSync.ts` |
| GitHub PAT setup UI | Dialog to collect and store Personal Access Token | New: `client/src/components/SyncSettingsDialog.tsx` |
| Sidebar sync controls | Add sync status, manual sync trigger, export button | `client/src/components/Sidebar.tsx` |

---

## Bottom Line

With the **repo JSON sync** layer and **hash routing** fixes applied, the migration preserves **~100% of user-facing functionality identically** or with only URL-cosmetic changes. There are **zero breakages** after all fixes are implemented.

The repo-JSON approach turns GitHub itself into your database, giving you centralized persistence without any backend hosting costs. Every core interaction works the same or better, and you can seamlessly switch between your phone, work laptop, and personal laptop.
