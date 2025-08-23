import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";
import type { TaskWithRelations, InsertTask } from "@shared/schema";
import { cn } from "@/lib/utils";

interface TaskModalProps {
  task: TaskWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  parentTask?: TaskWithRelations;
}

export default function TaskModal({ task, isOpen, onClose, parentTask }: TaskModalProps) {
  const [formData, setFormData] = useState<Partial<InsertTask>>({});
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { toast } = useToast();

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        estimatedHours: task.estimatedHours || undefined,
        isMainTask: task.isMainTask,
        parentTaskId: task.parentTaskId || undefined,
      });
      setDeadline(task.deadline ? new Date(task.deadline) : undefined);
    } else {
      setFormData({
        title: "",
        description: "",
        status: "pending",
        priority: "medium",
        estimatedHours: undefined,
        isMainTask: !parentTask,
        parentTaskId: parentTask?.id,
      });
      setDeadline(undefined);
    }
  }, [task, parentTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title?.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    const taskData: InsertTask = {
      ...formData,
      title: formData.title.trim(),
      deadline: deadline || null,
    } as InsertTask;

    try {
      if (isEditing && task) {
        await updateTask.mutateAsync({ id: task.id, task: taskData });
        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        await createTask.mutateAsync(taskData);
        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save task",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    if (confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      try {
        await deleteTask.mutateAsync(task.id);
        toast({
          title: "Success",
          description: "Task deleted successfully",
        });
        onClose();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete task",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="task-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {isEditing ? "Edit Task" : "Create New Task"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title..."
              data-testid="input-task-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your task..."
              rows={3}
              data-testid="textarea-task-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as any })}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
              >
                <SelectTrigger data-testid="select-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deadline && "text-muted-foreground"
                    )}
                    data-testid="button-deadline"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                value={formData.estimatedHours || ""}
                onChange={(e) => 
                  setFormData({ 
                    ...formData, 
                    estimatedHours: e.target.value ? parseInt(e.target.value) : undefined 
                  })
                }
                placeholder="0"
                min="0"
                data-testid="input-estimated-hours"
              />
            </div>
          </div>

          {!parentTask && (
            <div className="flex items-center space-x-2">
              <Switch
                id="isMainTask"
                checked={formData.isMainTask || false}
                onCheckedChange={(checked) => setFormData({ ...formData, isMainTask: checked })}
                data-testid="switch-main-task"
              />
              <Label htmlFor="isMainTask">Main Task</Label>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteTask.isPending}
                  data-testid="button-delete-task"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTask.isPending || updateTask.isPending}
                data-testid="button-save-task"
              >
                {createTask.isPending || updateTask.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Update Task"
                  : "Create Task"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
