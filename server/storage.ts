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
  getTaskDeletionCount(id: string): Promise<{ taskCount: number; taskTitles: string[] }>;
  
  
  // Task connection operations
  getTaskConnections(): Promise<TaskConnection[]>;
  createTaskConnection(connection: InsertTaskConnection): Promise<TaskConnection>;
  deleteTaskConnection(id: string): Promise<void>;
  
  // Statistics
  getTaskStats(): Promise<{ totalTasks: number; completedTasks: number; }>;
}

export class DatabaseStorage implements IStorage {
  async getTasks(): Promise<TaskWithRelations[]> {
    // Fetch root tasks first
    const rootTasks = await db.query.tasks.findMany({
      where: isNull(tasks.parentTaskId),
      with: {
        parentTask: true,
        sourceConnections: true,
        targetConnections: true,
      },
      orderBy: [desc(tasks.createdAt)],
    });

    // Recursively build complete hierarchy for each root task
    const tasksWithSubtasks = await Promise.all(
      rootTasks.map(async (rootTask) => {
        return await this.buildTaskHierarchy(rootTask);
      })
    );

    return tasksWithSubtasks;
  }

  // Helper method to recursively build task hierarchy
  private async buildTaskHierarchy(task: TaskWithRelations): Promise<TaskWithRelations> {
    // Get all direct children of this task
    const children = await db.query.tasks.findMany({
      where: eq(tasks.parentTaskId, task.id),
      with: {
        parentTask: true,
        sourceConnections: true,
        targetConnections: true,
      },
      orderBy: [desc(tasks.createdAt)],
    });

    // Recursively build hierarchy for each child
    const subtasksWithHierarchy = await Promise.all(
      children.map(async (child) => {
        return await this.buildTaskHierarchy(child);
      })
    );

    // Return the task with its complete subtask hierarchy
    return {
      ...task,
      subtasks: subtasksWithHierarchy
    };
  }

  async getTask(id: string): Promise<TaskWithRelations | undefined> {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        parentTask: true,
        sourceConnections: true,
        targetConnections: true,
      },
    });
    
    if (!task) return undefined;
    
    // Build complete hierarchy for this task
    return await this.buildTaskHierarchy(task);
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
    // Recursive function to delete tasks and their subtasks
    const deleteTaskRecursively = async (taskId: string) => {
      // First, find all direct children
      const children = await db.query.tasks.findMany({
        where: eq(tasks.parentTaskId, taskId),
        columns: { id: true }
      });
      
      // Recursively delete all children first
      for (const child of children) {
        await deleteTaskRecursively(child.id);
      }
      
      // Delete related connections for this task
      await db.delete(taskConnections).where(eq(taskConnections.sourceTaskId, taskId));
      await db.delete(taskConnections).where(eq(taskConnections.targetTaskId, taskId));
      
      // Finally delete the task itself
      await db.delete(tasks).where(eq(tasks.id, taskId));
    };
    
    await deleteTaskRecursively(id);
  }

  // Get count of tasks that will be deleted (for user confirmation)
  async getTaskDeletionCount(id: string): Promise<{ taskCount: number; taskTitles: string[] }> {
    const tasksToDelete: string[] = [];
    
    const collectTasksRecursively = async (taskId: string) => {
      // Get the task
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
        columns: { title: true }
      });
      
      if (task) {
        tasksToDelete.push(task.title);
        
        // Get all direct children
        const children = await db.query.tasks.findMany({
          where: eq(tasks.parentTaskId, taskId),
          columns: { id: true }
        });
        
        // Recursively collect children
        for (const child of children) {
          await collectTasksRecursively(child.id);
        }
      }
    };
    
    await collectTasksRecursively(id);
    
    return {
      taskCount: tasksToDelete.length,
      taskTitles: tasksToDelete
    };
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
