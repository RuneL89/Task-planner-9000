import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { TaskWithRelations, InsertTask, TaskConnection, InsertTaskConnection } from "@shared/schema";

// Helper function to build nested task hierarchy
function buildTaskHierarchy(tasks: TaskWithRelations[]): TaskWithRelations[] {
  // Create a map for quick lookup
  const taskMap = new Map<string, TaskWithRelations>();
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, subtasks: [] });
  });

  // Build the hierarchy
  const rootTasks: TaskWithRelations[] = [];
  
  tasks.forEach(task => {
    const taskWithHierarchy = taskMap.get(task.id)!;
    
    if (task.parentTaskId) {
      const parent = taskMap.get(task.parentTaskId);
      if (parent) {
        if (!parent.subtasks) parent.subtasks = [];
        parent.subtasks.push(taskWithHierarchy);
      }
    } else {
      rootTasks.push(taskWithHierarchy);
    }
  });

  return rootTasks;
}

export function useTasks() {
  return useQuery<TaskWithRelations[]>({
    queryKey: ["/api/tasks"],
    select: (data) => buildTaskHierarchy(data),
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
