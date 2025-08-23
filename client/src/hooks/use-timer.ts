import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { TimeEntry, InsertTimeEntry } from "@shared/schema";

export function useActiveTimer(taskId: string) {
  return useQuery<TimeEntry | null>({
    queryKey: ["/api/tasks", taskId, "active-timer"],
    enabled: !!taskId,
  });
}

export function useStartTimer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, description }: { taskId: string; description?: string }) => {
      const timeEntry: InsertTimeEntry = {
        taskId,
        startTime: new Date(),
        description,
      };
      const response = await apiRequest("POST", `/api/tasks/${taskId}/time-entries`, timeEntry);
      return response.json();
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "active-timer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });
}

export function useStopTimer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ timeEntryId, taskId }: { timeEntryId: string; taskId: string }) => {
      const endTime = new Date();
      const response = await apiRequest("PUT", `/api/time-entries/${timeEntryId}`, {
        endTime,
      });
      return response.json();
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "active-timer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}

export function useTimer(taskId: string) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const { data: activeTimer } = useActiveTimer(taskId);
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (activeTimer?.startTime && !activeTimer.endTime) {
      interval = setInterval(() => {
        const now = new Date();
        const start = new Date(activeTimer.startTime);
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeTimer]);

  const handleStart = () => {
    if (!activeTimer) {
      startTimer.mutate({ taskId });
    }
  };

  const handleStop = () => {
    if (activeTimer?.id) {
      stopTimer.mutate({ timeEntryId: activeTimer.id, taskId });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isRunning: !!activeTimer && !activeTimer.endTime,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    startTimer: handleStart,
    stopTimer: handleStop,
    isStarting: startTimer.isPending,
    isStopping: stopTimer.isPending,
  };
}
