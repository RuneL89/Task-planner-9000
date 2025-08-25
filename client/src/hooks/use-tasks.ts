import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { TaskWithRelations, InsertTask, TaskConnection, InsertTaskConnection } from "@shared/schema";

// Since server now returns properly nested tasks, we don't need to rebuild hierarchy
function ensureTasksHaveSubtasks(tasks: TaskWithRelations[]): TaskWithRelations[] {
  return tasks.map(task => ({
    ...task,
    subtasks: task.subtasks || []
  }));
}

export function useTasks() {
  return useQuery<TaskWithRelations[]>({
    queryKey: ["/api/tasks"],
    select: (data) => ensureTasksHaveSubtasks(data),
  });
}

export function useTask(id: string) {
  return useQuery<TaskWithRelations>({
    queryKey: ["/api/tasks", id],
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", task);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, task }: { id: string; task: Partial<InsertTask> }) => {
      const response = await apiRequest("PUT", `/api/tasks/${id}`, task);
      return response.json();
    },
    onSuccess: (_, { id }) => {
      // Invalidate the main tasks list
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      // Invalidate the specific task query
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      // Also invalidate any active timer queries for this task
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "active-timer"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}

export function useTaskConnections() {
  return useQuery<TaskConnection[]>({
    queryKey: ["/api/task-connections"],
  });
}

export function useCreateTaskConnection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (connection: InsertTaskConnection) => {
      const response = await apiRequest("POST", "/api/task-connections", connection);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-connections"] });
    },
  });
}

export function useToggleTaskCollapse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isCollapsed }: { id: string; isCollapsed: boolean }) => {
      const response = await apiRequest("PUT", `/api/tasks/${id}`, { isCollapsed });
      return response.json();
    },
    onSuccess: (_, { id }) => {
      // Invalidate the main tasks list
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      // Invalidate the specific task query
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
    },
  });
}

export function useTaskStats() {
  return useQuery<{ totalTasks: number; completedTasks: number; totalTimeSpent: number }>({
    queryKey: ["/api/stats"],
  });
}
