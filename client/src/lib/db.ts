import Dexie, { type EntityTable } from 'dexie';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high';
  deadline: string | null;
  isMainTask: boolean;
  isCollapsed: boolean;
  parentTaskId: string | null;
  positionX: number;
  positionY: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  autoCleanupEnabled: boolean;
  autoCleanupPeriod: 'off' | '1day' | '1week' | '1month';
}

export interface TaskConnection {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  createdAt: string;
}

export interface TaskWithRelations extends Task {
  subtasks?: TaskWithRelations[];
}

export type InsertTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;

class TaskPlannerDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  taskConnections!: EntityTable<TaskConnection, 'id'>;

  constructor() {
    super('TaskPlannerDB');
    this.version(1).stores({
      tasks: 'id, parentTaskId, status, isMainTask, isCollapsed, completedAt',
      taskConnections: 'id, sourceTaskId, targetTaskId',
    });
  }
}

export const db = new TaskPlannerDB();
