import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { TaskWithRelations, InsertTask, TaskConnection, InsertTaskConnection } from "@shared/schema";

export function useTasks() {
  return useQuery<TaskWithRelations[]>({
    queryKey: ["/api/tasks"],
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
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

export function useTaskStats() {
  return useQuery<{ totalTasks: number; completedTasks: number; totalTimeSpent: number }>({
    queryKey: ["/api/stats"],
  });
}
