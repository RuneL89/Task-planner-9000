import { useState, useMemo } from "react";
import { useTasks, useUpdateTask } from "@/hooks/use-tasks";
import type { TaskWithRelations } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { SwipeCard } from "@/components/SwipeCard";
import { DatePickerPopup } from "@/components/DatePickerPopup";
import { queryClient } from "@/lib/queryClient";

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

  const handleSwipeRight = () => {
    if (currentSubtask) {
      setShowDatePicker(currentSubtask.id);
    }
  };

  const handleSwipeLeft = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  const handleDateSelected = async (date: Date) => {
    if (currentSubtask) {
      await updateTask.mutateAsync({
        id: currentSubtask.id,
        task: { deadline: date.toISOString().split("T")[0] },
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setShowDatePicker(null);
      setCurrentIndex((prev) => prev + 1);
    }
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
              <SwipeCard
                task={currentSubtask}
                mainTaskTitle={currentSubtask.mainTaskTitle}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
              />
              <DatePickerPopup
                isOpen={showDatePicker === currentSubtask.id}
                onClose={() => setShowDatePicker(null)}
                onSelectDate={handleDateSelected}
              />
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
