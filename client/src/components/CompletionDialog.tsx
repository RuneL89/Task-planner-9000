import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Plus } from "lucide-react";
import type { TaskWithRelations } from "@/lib/db";

interface CompletionDialogProps {
  mainTask: TaskWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleteMainTask: () => void;
  onAddMoreSubTasks: () => void;
}

export default function CompletionDialog({
  mainTask,
  isOpen,
  onClose,
  onCompleteMainTask,
  onAddMoreSubTasks,
}: CompletionDialogProps) {
  if (!mainTask) return null;

  const completedSubTasks = mainTask.subtasks?.filter(
    (subtask) => subtask.status === "completed"
  ).length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="completion-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span>All Sub Tasks Completed!</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">
              {mainTask.title}
            </h3>
            <p className="text-green-700 text-sm">
              You've completed all {completedSubTasks} sub tasks for this main task.
              What would you like to do next?
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={onCompleteMainTask}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
              data-testid="button-complete-main-task"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Main Task as Completed
            </Button>

            <Button
              onClick={onAddMoreSubTasks}
              variant="outline"
              className="w-full"
              data-testid="button-add-more-subtasks"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add More Sub Tasks
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full"
              data-testid="button-dismiss"
            >
              Keep as Is
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}