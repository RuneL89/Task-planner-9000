import { tasks, timeEntries, taskConnections, type Task, type InsertTask, type TimeEntry, type InsertTimeEntry, type TaskConnection, type InsertTaskConnection, type TaskWithRelations } from "@shared/schema";
import { db } from "./db";
import { eq, desc, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // Task operations
  getTasks(): Promise<TaskWithRelations[]>;
  getTask(id: string): Promise<TaskWithRelations | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Time entry operations
  getTimeEntries(taskId: string): Promise<TimeEntry[]>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry>;
  deleteTimeEntry(id: string): Promise<void>;
  getActiveTimeEntry(taskId: string): Promise<TimeEntry | undefined>;
  
  // Task connection operations
  getTaskConnections(): Promise<TaskConnection[]>;
  createTaskConnection(connection: InsertTaskConnection): Promise<TaskConnection>;
  deleteTaskConnection(id: string): Promise<void>;
  
  // Statistics
  getTaskStats(): Promise<{ totalTasks: number; completedTasks: number; totalTimeSpent: number }>;
}

export class DatabaseStorage implements IStorage {
  async getTasks(): Promise<TaskWithRelations[]> {
    const allTasks = await db.query.tasks.findMany({
      with: {
        subtasks: true,
        parentTask: true,
        timeEntries: true,
        sourceConnections: true,
        targetConnections: true,
      },
      orderBy: [desc(tasks.createdAt)],
    });
    return allTasks;
  }

  async getTask(id: string): Promise<TaskWithRelations | undefined> {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        subtasks: true,
        parentTask: true,
        timeEntries: true,
        sourceConnections: true,
        targetConnections: true,
      },
    });
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({
        ...insertTask,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .returning();
    return task;
  }

  async updateTask(id: string, updateTask: Partial<InsertTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({
        ...updateTask,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    // Delete related time entries and connections first
    await db.delete(timeEntries).where(eq(timeEntries.taskId, id));
    await db.delete(taskConnections).where(eq(taskConnections.sourceTaskId, id));
    await db.delete(taskConnections).where(eq(taskConnections.targetTaskId, id));
    
    // Delete subtasks
    await db.delete(tasks).where(eq(tasks.parentTaskId, id));
    
    // Delete the task
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getTimeEntries(taskId: string): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(eq(timeEntries.taskId, taskId)).orderBy(desc(timeEntries.createdAt));
  }

  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await db
      .insert(timeEntries)
      .values(timeEntry)
      .returning();
    return entry;
  }

  async updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry> {
    const [entry] = await db
      .update(timeEntries)
      .set(timeEntry)
      .where(eq(timeEntries.id, id))
      .returning();
    return entry;
  }

  async deleteTimeEntry(id: string): Promise<void> {
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  async getActiveTimeEntry(taskId: string): Promise<TimeEntry | undefined> {
    const entries = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.taskId, taskId))
      .where(isNull(timeEntries.endTime));
    const [entry] = entries;
    return entry || undefined;
  }

  async getTaskConnections(): Promise<TaskConnection[]> {
    return await db.select().from(taskConnections);
  }

  async createTaskConnection(connection: InsertTaskConnection): Promise<TaskConnection> {
    const [conn] = await db
      .insert(taskConnections)
      .values(connection)
      .returning();
    return conn;
  }

  async deleteTaskConnection(id: string): Promise<void> {
    await db.delete(taskConnections).where(eq(taskConnections.id, id));
  }

  async getTaskStats(): Promise<{ totalTasks: number; completedTasks: number; totalTimeSpent: number }> {
    const totalTasksResult = await db.select({ count: sql`count(*)` }).from(tasks);
    const completedTasksResult = await db.select({ count: sql`count(*)` }).from(tasks).where(eq(tasks.status, 'completed'));
    const totalTimeResult = await db.select({ total: sql`sum(${tasks.timeSpent})` }).from(tasks);

    return {
      totalTasks: Number(totalTasksResult[0]?.count || 0),
      completedTasks: Number(completedTasksResult[0]?.count || 0),
      totalTimeSpent: Number(totalTimeResult[0]?.total || 0),
    };
  }
}

export const storage = new DatabaseStorage();
