import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, type Task, type TaskConnection, type TaskWithRelations } from '@/lib/db';
import { buildTaskHierarchy, flattenTasks, ensureTasksHaveSubtasks } from '@/lib/taskHierarchy';
import { requestSyncPush } from '@/lib/githubSync';

export type InsertTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;
export type InsertTaskConnection = Omit<TaskConnection, 'id' | 'createdAt'>;

export function useTasks() {
  return useQuery<TaskWithRelations[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const allTasks = await db.tasks.toArray();
      return buildTaskHierarchy(allTasks);
    },
    select: (data) => flattenTasks(data),
    staleTime: Infinity,
  });
}

export function useTasksNested() {
  return useQuery<TaskWithRelations[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const allTasks = await db.tasks.toArray();
      return buildTaskHierarchy(allTasks);
    },
    select: (data) => ensureTasksHaveSubtasks(data),
    staleTime: Infinity,
  });
}

export function useTask(id: string) {
  return useQuery<TaskWithRelations | undefined>({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const allTasks = await db.tasks.toArray();
      const hierarchy = buildTaskHierarchy(allTasks);
      const findTask = (tasks: TaskWithRelations[]): TaskWithRelations | undefined => {
        for (const t of tasks) {
          if (t.id === id) return t;
          const found = findTask(t.subtasks || []);
          if (found) return found;
        }
      };
      return findTask(hierarchy);
    },
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskData: InsertTask) => {
      const now = new Date().toISOString();
      const newTask: Task = {
        ...taskData,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        completedAt: taskData.status === 'completed' ? now : null,
      };
      await db.tasks.add(newTask);
      return newTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      requestSyncPush();
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, task }: { id: string; task: Partial<InsertTask> }) => {
      const existing = await db.tasks.get(id);
      if (!existing) throw new Error('Task not found');

      const updates: Partial<Task> = {
        ...task,
        updatedAt: new Date().toISOString(),
      };

      if (task.status === 'completed' && existing.status !== 'completed') {
        updates.completedAt = new Date().toISOString();
      } else if (task.status && task.status !== 'completed' && existing.status === 'completed') {
        updates.completedAt = null;
      }

      await db.tasks.update(id, updates);

      let parentId = existing.parentTaskId;
      while (parentId) {
        await db.tasks.update(parentId, { updatedAt: new Date().toISOString() });
        const parent = await db.tasks.get(parentId);
        parentId = parent?.parentTaskId || null;
      }

      return { ...existing, ...updates };
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      requestSyncPush();
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const idsToDelete: string[] = [];

      const collect = async (taskId: string) => {
        idsToDelete.push(taskId);
        const children = await db.tasks.where('parentTaskId').equals(taskId).toArray();
        for (const child of children) {
          await collect(child.id);
        }
      };

      await collect(id);

      await db.taskConnections
        .where('sourceTaskId')
        .anyOf(idsToDelete)
        .delete();
      await db.taskConnections
        .where('targetTaskId')
        .anyOf(idsToDelete)
        .delete();

      await db.tasks.bulkDelete(idsToDelete);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      requestSyncPush();
    },
  });
}

export function useTaskConnections() {
  return useQuery<TaskConnection[]>({
    queryKey: ['taskConnections'],
    queryFn: () => db.taskConnections.toArray(),
    staleTime: Infinity,
  });
}

export function useCreateTaskConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connection: InsertTaskConnection) => {
      const newConn: TaskConnection = {
        ...connection,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      await db.taskConnections.add(newConn);
      return newConn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskConnections'] });
      requestSyncPush();
    },
  });
}

export function useToggleTaskCollapse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isCollapsed }: { id: string; isCollapsed: boolean }) => {
      await db.tasks.update(id, {
        isCollapsed,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      requestSyncPush();
    },
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const all = await db.tasks.toArray();
      const completed = all.filter((t) => t.status === 'completed').length;
      return { totalTasks: all.length, completedTasks: completed };
    },
    staleTime: Infinity,
  });
}

export async function getTaskDeletionInfo(id: string): Promise<{ taskCount: number; taskTitles: string[] }> {
  const tasksToDelete: string[] = [];

  const collect = async (taskId: string) => {
    const task = await db.tasks.get(taskId);
    if (task) {
      tasksToDelete.push(task.title);
      const children = await db.tasks.where('parentTaskId').equals(taskId).toArray();
      for (const child of children) {
        await collect(child.id);
      }
    }
  };

  await collect(id);

  return {
    taskCount: tasksToDelete.length,
    taskTitles: tasksToDelete,
  };
}
