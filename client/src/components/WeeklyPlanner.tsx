import { useState, useMemo } from "react";
import { useTasks, useUpdateTask } from "@/hooks/use-tasks";
import type { TaskWithRelations } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface WeeklyPlannerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMainTaskIds: string[];
}

interface SubtaskWithParent extends TaskWithRelations {
  mainTaskId: string;
  mainTaskTitle: string;
}

export function WeeklyPlanner({ isOpen, onClose, selectedMainTaskIds }: WeeklyPlannerProps) {
  const { data: allTasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);

  const subtasksToSchedule = useMemo(() => {
    if (!allTasks) return [];

    const result: SubtaskWithParent[] = [];

    const getSubtasksRecursively = (
      task: TaskWithRelations,
      mainTaskId: string,
      mainTaskTitle: string
    ) => {
      if (task.subtasks && task.subtasks.length > 0) {
        for (const subtask of task.subtasks) {
          if (subtask.status !== "completed") {
            result.push({
              ...subtask,
              mainTaskId,
              mainTaskTitle,
            });
          }
          getSubtasksRecursively(subtask, mainTaskId, mainTaskTitle);
        }
      }
    };

    for (const mainTaskId of selectedMainTaskIds) {
      const mainTask = allTasks.find((t) => t.id === mainTaskId);
      if (mainTask) {
        getSubtasksRecursively(mainTask, mainTask.id, mainTask.title);
      }
    }

    return result;
  }, [allTasks, selectedMainTaskIds]);

  const currentSubtask = subtasksToSchedule[currentIndex];
  const totalSubtasks = subtasksToSchedule.length;
  const isCompleted = currentIndex >= totalSubtasks;

  const handleSwipeRight = (taskId: string) => {
    setShowDatePicker(taskId);
  };

  const handleDateSelected = async (taskId: string, deadline: string) => {
    await updateTask.mutateAsync({
      id: taskId,
      task: { deadline },
    });
    setShowDatePicker(null);
    setCurrentIndex((prev) => prev + 1);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      data-testid="weekly-planner-overlay"
    >
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        <div
          className="text-white text-center text-lg font-medium"
          data-testid="progress-indicator"
        >
          {isCompleted
            ? "All tasks scheduled!"
            : `Task ${currentIndex + 1} of ${totalSubtasks}`}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 min-h-[400px] flex items-center justify-center">
          {isLoading ? (
            <div className="text-gray-500">Loading tasks...</div>
          ) : isCompleted ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Great job!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                You've scheduled all your subtasks for the week.
              </p>
            </div>
          ) : currentSubtask ? (
            <div className="w-full">
              <SwipeCardPlaceholder
                task={currentSubtask}
                onSwipeRight={handleSwipeRight}
              />
              {showDatePicker === currentSubtask.id && (
                <DatePickerPopupPlaceholder
                  taskId={currentSubtask.id}
                  onDateSelected={handleDateSelected}
                  onClose={() => setShowDatePicker(null)}
                />
              )}
            </div>
          ) : (
            <div className="text-gray-500">No subtasks to schedule</div>
          )}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            data-testid="button-done-for-now"
          >
            Done for Now
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SwipeCardPlaceholderProps {
  task: SubtaskWithParent;
  onSwipeRight: (taskId: string) => void;
}

function SwipeCardPlaceholder({ task, onSwipeRight }: SwipeCardPlaceholderProps) {
  return (
    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
      <div className="mb-4">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Main Task: {task.mainTaskTitle}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {task.title}
        </h3>
        {task.description && (
          <p className="text-gray-600 dark:text-gray-400">{task.description}</p>
        )}
      </div>
      <Button onClick={() => onSwipeRight(task.id)} className="mt-4">
        Schedule Task (Swipe Right Placeholder)
      </Button>
      <div className="mt-4 text-xs text-gray-400">
        SwipeCard component will be implemented here
      </div>
    </div>
  );
}

interface DatePickerPopupPlaceholderProps {
  taskId: string;
  onDateSelected: (taskId: string, deadline: string) => void;
  onClose: () => void;
}

function DatePickerPopupPlaceholder({
  taskId,
  onDateSelected,
  onClose,
}: DatePickerPopupPlaceholderProps) {
  const handleSelectDate = () => {
    const today = new Date().toISOString().split("T")[0];
    onDateSelected(taskId, today);
  };

  return (
    <div className="mt-4 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-6 bg-blue-50 dark:bg-blue-900/20">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Select a Deadline
      </h4>
      <div className="flex gap-2">
        <Button onClick={handleSelectDate} size="sm">
          Today (Placeholder)
        </Button>
        <Button onClick={onClose} variant="outline" size="sm">
          Cancel
        </Button>
      </div>
      <div className="mt-4 text-xs text-gray-400">
        DatePickerPopup component will be implemented here
      </div>
    </div>
  );
}
