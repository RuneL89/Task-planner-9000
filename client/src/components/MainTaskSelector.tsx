import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTasks } from "@/hooks/use-tasks";

interface MainTaskSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPlanning: (selectedTaskIds: string[]) => void;
}

export default function MainTaskSelector({ isOpen, onClose, onStartPlanning }: MainTaskSelectorProps) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const { data: allTasks = [], isLoading } = useTasks();

  // Filter to show only main tasks with status "in_progress"
  const mainInProgressTasks = allTasks.filter(
    task => task.isMainTask && task.status !== "completed"
  );

  const handleCheckboxChange = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(prev => [...prev, taskId]);
    } else {
      setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleStartPlanning = () => {
    onStartPlanning(selectedTaskIds);
    setSelectedTaskIds([]);
    onClose();
  };

  const handleClose = () => {
    setSelectedTaskIds([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="main-task-selector-modal">
        <DialogHeader>
          <DialogTitle>Select Main Tasks for Planning</DialogTitle>
          <DialogDescription>
            Choose which main tasks you want to start planning. Only tasks currently in progress are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading tasks...</div>
          ) : mainInProgressTasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No main tasks in progress. Create and set main tasks to "In Progress" status to start planning.
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {mainInProgressTasks.map((task) => (
                  <div key={task.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={`checkbox-${task.id}`}
                      checked={selectedTaskIds.includes(task.id)}
                      onCheckedChange={(checked) => handleCheckboxChange(task.id, checked as boolean)}
                      data-testid={`checkbox-${task.id}`}
                    />
                    <Label
                      htmlFor={`checkbox-${task.id}`}
                      className="text-sm font-normal leading-relaxed cursor-pointer"
                    >
                      {task.title}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleStartPlanning}
            disabled={selectedTaskIds.length === 0}
            data-testid="button-start-planning"
          >
            Start Planning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
