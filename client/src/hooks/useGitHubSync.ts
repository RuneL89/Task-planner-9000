import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/lib/db";
import { fetchRepoJson, updateRepoJson, createRepoJson, registerSyncPush } from "@/lib/githubSync";
import { useToast } from "@/hooks/use-toast";

const PAT_KEY = "github_pat";
const LAST_SYNC_KEY = "github_last_sync";
const DEBOUNCE_MS = 5000;

export type SyncStatus = "idle" | "pulling" | "pushing" | "synced" | "error";

export function useGitHubSync() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    return raw ? parseInt(raw, 10) : null;
  });
  const [pat, setPat] = useState<string>(() => localStorage.getItem(PAT_KEY) || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const savePat = useCallback((token: string) => {
    localStorage.setItem(PAT_KEY, token);
    setPat(token);
  }, []);

  const clearPat = useCallback(() => {
    localStorage.removeItem(PAT_KEY);
    setPat("");
  }, []);

  const pull = useCallback(async () => {
    if (!pat) return false;
    setStatus("pulling");
    try {
      const remote = await fetchRepoJson(pat);
      if (!remote) {
        setStatus("idle");
        return false;
      }

      const remoteTime = new Date(remote.exportedAt).getTime();
      const localTime = lastSyncAt || 0;

      if (remoteTime > localTime) {
        await db.tasks.clear();
        await db.taskConnections.clear();
        if (remote.tasks?.length) await db.tasks.bulkAdd(remote.tasks);
        if (remote.taskConnections?.length) await db.taskConnections.bulkAdd(remote.taskConnections);

        const now = Date.now();
        localStorage.setItem(LAST_SYNC_KEY, now.toString());
        setLastSyncAt(now);
        setStatus("synced");
        toast({ title: "Synced from cloud", description: "Tasks loaded from GitHub." });
        return true;
      }

      setStatus("idle");
      return false;
    } catch (err: any) {
      setStatus("error");
      toast({ title: "Sync failed", description: err.message || "Could not pull from GitHub.", variant: "destructive" });
      return false;
    }
  }, [pat, lastSyncAt, toast]);

  const push = useCallback(async () => {
    if (!pat) return false;
    setStatus("pushing");
    try {
      const tasks = await db.tasks.toArray();
      const taskConnections = await db.taskConnections.toArray();
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        appName: "Task Planner 9000",
        tasks,
        taskConnections,
      };

      let ok = await updateRepoJson(pat, payload);
      if (!ok) {
        ok = await createRepoJson(pat, payload);
      }

      if (ok) {
        const now = Date.now();
        localStorage.setItem(LAST_SYNC_KEY, now.toString());
        setLastSyncAt(now);
        setStatus("synced");
        return true;
      } else {
        setStatus("error");
        toast({ title: "Sync failed", description: "Could not push to GitHub. Check your PAT and permissions.", variant: "destructive" });
        return false;
      }
    } catch (err: any) {
      setStatus("error");
      toast({ title: "Sync failed", description: err.message || "Could not push to GitHub.", variant: "destructive" });
      return false;
    }
  }, [pat, toast]);

  const syncNow = useCallback(async () => {
    const pulled = await pull();
    if (!pulled) {
      await push();
    }
  }, [pull, push]);

  useEffect(() => {
    if (pat) {
      pull();
    }
  }, [pat, pull]);

  useEffect(() => {
    if (!pat) return;

    const handleBeforeUnload = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      // Best-effort synchronous push not possible with fetch,
      // but we clear the debounce so any pending push runs now
      push();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pat, push]);

  const requestPush = useCallback(() => {
    if (!pat) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      push();
    }, DEBOUNCE_MS);
  }, [pat, push]);

  useEffect(() => {
    registerSyncPush(requestPush);
  }, [requestPush]);

  return {
    status,
    lastSyncAt,
    pat,
    savePat,
    clearPat,
    syncNow,
    requestPush,
  };
}
