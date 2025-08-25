import { tasks, taskConnections, type Task, type InsertTask, type TaskConnection, type InsertTaskConnection, type TaskWithRelations } from "@shared/schema";
import { db } from "./db";
import { eq, desc, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // Task operations
  getTasks(): Promise<TaskWithRelations[]>;
  getTask(id: string): Promise<TaskWithRelations | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  
  // Task connection operations
  getTaskConnections(): Promise<TaskConnection[]>;
  createTaskConnection(connection: InsertTaskConnection): Promise<TaskConnection>;
  deleteTaskConnection(id: string): Promise<void>;
  
  // Statistics
  getTaskStats(): Promise<{ totalTasks: number; completedTasks: number; }>;
}

export class DatabaseStorage implements IStorage {
  async getTasks(): Promise<TaskWithRelations[]> {
    const allTasks = await db.query.tasks.findMany({
      with: {
        subtasks: true,
        parentTask: true,
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
    // Delete related connections first
    await db.delete(taskConnections).where(eq(taskConnections.sourceTaskId, id));
    await db.delete(taskConnections).where(eq(taskConnections.targetTaskId, id));
    
    // Delete subtasks
    await db.delete(tasks).where(eq(tasks.parentTaskId, id));
    
    // Delete the task
    await db.delete(tasks).where(eq(tasks.id, id));
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

  async getTaskStats(): Promise<{ totalTasks: number; completedTasks: number }> {
    const totalTasksResult = await db.select({ count: sql`count(*)` }).from(tasks);
    const completedTasksResult = await db.select({ count: sql`count(*)` }).from(tasks).where(eq(tasks.status, 'completed'));

    return {
      totalTasks: Number(totalTasksResult[0]?.count || 0),
      completedTasks: Number(completedTasksResult[0]?.count || 0),
    };
  }
}

export const storage = new DatabaseStorage();
