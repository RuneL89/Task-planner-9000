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
  cleanupCompletedTasks(): Promise<number>;
  
  
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

  // Helper method to check if a task and all its descendants are completed
  private async isFullyCompletedBranch(taskId: string): Promise<boolean> {
    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      columns: { status: true }
    });

    // If task doesn't exist or is not completed, return false
    if (!task || task.status !== 'completed') {
      return false;
    }

    // Get all direct children
    const children = await db.query.tasks.findMany({
      where: eq(tasks.parentTaskId, taskId),
      columns: { id: true }
    });

    // If there are children, check if all are completed recursively
    for (const child of children) {
      const isChildBranchCompleted = await this.isFullyCompletedBranch(child.id);
      if (!isChildBranchCompleted) {
        return false;
      }
    }

    // All children (if any) are completed
    return true;
  }

  // Helper method to count all descendants of a task
  private async countDescendants(taskId: string): Promise<number> {
    // Get all direct children
    const children = await db.query.tasks.findMany({
      where: eq(tasks.parentTaskId, taskId),
      columns: { id: true }
    });

    // Count is number of children plus all their descendants
    let count = children.length;
    
    for (const child of children) {
      count += await this.countDescendants(child.id);
    }

    return count;
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
    
    // Recursively update all ancestor tasks' updatedAt timestamps
    let currentParentId = task.parentTaskId;
    while (currentParentId) {
      const [parentTask] = await db
        .update(tasks)
        .set({
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(tasks.id, currentParentId))
        .returning();
      
      // Move to the next parent in the chain
      currentParentId = parentTask?.parentTaskId || null;
    }
    
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

  async cleanupCompletedTasks(): Promise<number> {
    // Find all main tasks with auto cleanup enabled
    const mainTasksWithCleanup = await db.query.tasks.findMany({
      where: sql`${tasks.isMainTask} = true AND ${tasks.autoCleanupEnabled} = true AND ${tasks.autoCleanupPeriod} != 'off'`,
      columns: { id: true, autoCleanupPeriod: true }
    });

    const eligibleTaskIds: string[] = [];

    // Helper function to collect eligible tasks recursively
    const collectEligibleTasks = async (taskId: string, cleanupPeriod: string) => {
      // Get all direct children of this task
      const children = await db.query.tasks.findMany({
        where: eq(tasks.parentTaskId, taskId),
        columns: { id: true, isMainTask: true, status: true, completedAt: true }
      });

      for (const child of children) {
        // Check if this child is eligible
        if (
          !child.isMainTask &&
          child.status === 'completed' &&
          child.completedAt
        ) {
          // Check if fully completed branch
          const isFullyCompleted = await this.isFullyCompletedBranch(child.id);
          
          if (isFullyCompleted) {
            // Check if older than cleanup period
            const now = new Date();
            const completedAt = new Date(child.completedAt);
            let daysOld = 0;

            switch (cleanupPeriod) {
              case '1day':
                daysOld = 1;
                break;
              case '1week':
                daysOld = 7;
                break;
              case '1month':
                daysOld = 30;
                break;
            }

            const cutoffDate = new Date(now);
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            if (completedAt <= cutoffDate) {
              eligibleTaskIds.push(child.id);
            }
          }
        }

        // Recursively check children even if parent is not eligible
        await collectEligibleTasks(child.id, cleanupPeriod);
      }
    };

    // Collect eligible tasks from each main task
    for (const mainTask of mainTasksWithCleanup) {
      await collectEligibleTasks(mainTask.id, mainTask.autoCleanupPeriod!);
    }

    // Delete eligible tasks, but track total count to stay under 20 task limit
    let totalDeleted = 0;
    
    for (const taskId of eligibleTaskIds) {
      // Count how many tasks will be deleted (task + all descendants)
      const descendantCount = await this.countDescendants(taskId);
      const branchCount = descendantCount + 1; // +1 for the task itself
      
      // Stop if deleting this branch would exceed the 20 task limit
      if (totalDeleted + branchCount > 20) {
        break;
      }
      
      await this.deleteTask(taskId);
      totalDeleted += branchCount;
    }

    return totalDeleted;
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
