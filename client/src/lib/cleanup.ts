import { db, type Task } from './db';
import { addDays, differenceInDays } from 'date-fns';

async function isFullyCompletedBranch(taskId: string): Promise<boolean> {
  const task = await db.tasks.get(taskId);
  if (!task || task.status !== 'completed') return false;

  const children = await db.tasks.where('parentTaskId').equals(taskId).toArray();
  for (const child of children) {
    if (!(await isFullyCompletedBranch(child.id))) return false;
  }
  return true;
}

async function countDescendants(taskId: string): Promise<number> {
  const children = await db.tasks.where('parentTaskId').equals(taskId).toArray();
  let count = children.length;
  for (const child of children) {
    count += await countDescendants(child.id);
  }
  return count;
}

export async function cleanupCompletedTasks(): Promise<number> {
  const mainTasks = await db.tasks
    .where('isMainTask')
    .equals(1)
    .and((t) => t.autoCleanupEnabled && t.autoCleanupPeriod !== 'off')
    .toArray();

  const eligibleTaskIds: string[] = [];

  const collectEligible = async (taskId: string, cleanupPeriod: string) => {
    const children = await db.tasks.where('parentTaskId').equals(taskId).toArray();

    for (const child of children) {
      if (
        !child.isMainTask &&
        child.status === 'completed' &&
        child.completedAt
      ) {
        const fullyCompleted = await isFullyCompletedBranch(child.id);
        if (fullyCompleted) {
          const completedDate = new Date(child.completedAt);
          let retentionDays = 0;
          switch (cleanupPeriod) {
            case '1day': retentionDays = 1; break;
            case '1week': retentionDays = 7; break;
            case '1month': retentionDays = 30; break;
          }
          const cutoff = addDays(new Date(), -retentionDays);
          if (completedDate <= cutoff) {
            eligibleTaskIds.push(child.id);
          }
        }
      }
      await collectEligible(child.id, cleanupPeriod);
    }
  };

  for (const mainTask of mainTasks) {
    await collectEligible(mainTask.id, mainTask.autoCleanupPeriod!);
  }

  let totalDeleted = 0;
  for (const taskId of eligibleTaskIds) {
    const descendantCount = await countDescendants(taskId);
    const branchCount = descendantCount + 1;
    if (totalDeleted + branchCount > 20) break;

    const idsToDelete: string[] = [];
    const collectIds = async (id: string) => {
      idsToDelete.push(id);
      const children = await db.tasks.where('parentTaskId').equals(id).toArray();
      for (const child of children) {
        await collectIds(child.id);
      }
    };
    await collectIds(taskId);

    await db.taskConnections.where('sourceTaskId').anyOf(idsToDelete).delete();
    await db.taskConnections.where('targetTaskId').anyOf(idsToDelete).delete();
    await db.tasks.bulkDelete(idsToDelete);

    totalDeleted += branchCount;
  }

  return totalDeleted;
}
