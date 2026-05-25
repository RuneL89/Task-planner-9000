import type { Task, TaskWithRelations } from './db';

export function buildTaskHierarchy(tasks: Task[]): TaskWithRelations[] {
  const taskMap = new Map<string, TaskWithRelations>(
    tasks.map((t) => [t.id, { ...t, subtasks: [] as TaskWithRelations[] }])
  );

  const roots: TaskWithRelations[] = [];

  for (const task of Array.from(taskMap.values())) {
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      taskMap.get(task.parentTaskId)!.subtasks!.push(task);
    } else {
      roots.push(task);
    }
  }

  roots.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return roots;
}

export function flattenTasks(tasks: TaskWithRelations[]): TaskWithRelations[] {
  const result: TaskWithRelations[] = [];
  const visit = (task: TaskWithRelations) => {
    result.push(task);
    task.subtasks?.forEach(visit);
  };
  tasks.forEach(visit);
  return result;
}

export function ensureTasksHaveSubtasks(tasks: TaskWithRelations[]): TaskWithRelations[] {
  return tasks.map((task) => ({
    ...task,
    subtasks: task.subtasks || [],
  }));
}
