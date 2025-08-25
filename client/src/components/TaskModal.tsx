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
import { useCreateTask, useUpdateTask, useDeleteTask, useTasks, useTaskConnections, useCreateTaskConnection } from "@/hooks/use-tasks";
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
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createConnection = useCreateTaskConnection();
  const { data: allTasks = [] } = useTasks();
  const { data: connections = [] } = useTaskConnections();
  const { toast } = useToast();

  // Get available tasks for linking (both main tasks and subtasks)
  const availableParentTasks = allTasks.filter(t => t.id !== task?.id && t.id !== parentTask?.id);
  const mainTasks = availableParentTasks.filter(t => t.isMainTask);
  const subtasks = availableParentTasks.filter(t => !t.isMainTask);

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
    setSelectedConnections([]);
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
      deadline: deadline ? deadline.toISOString().split('T')[0] : undefined,
    } as InsertTask;

    try {
      let taskId: string;
      if (isEditing && task) {
        await updateTask.mutateAsync({ id: task.id, task: taskData });
        taskId = task.id;
        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        const newTask = await createTask.mutateAsync(taskData);
        taskId = newTask.id;
        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }

      // Create additional connections for subtasks
      if (selectedConnections.length > 0) {
        for (const connectionTaskId of selectedConnections) {
          await createConnection.mutateAsync({
            sourceTaskId: taskId,
            targetTaskId: connectionTaskId,
          });
        }
        toast({ 
          title: "Success", 
          description: `Created ${selectedConnections.length} additional connection(s)!` 
        });
      }

      // Add a small delay to allow cache invalidation to complete
      setTimeout(() => {
        onClose();
      }, 100);
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Task Type</Label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={formData.isMainTask ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, isMainTask: true, parentTaskId: undefined })}
                    className="flex-1"
                    data-testid="button-main-task"
                  >
                    Main Task
                  </Button>
                  <Button
                    type="button"
                    variant={!formData.isMainTask ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, isMainTask: false })}
                    className="flex-1"
                    data-testid="button-sub-task"
                  >
                    Sub Task
                  </Button>
                </div>
              </div>

              {!formData.isMainTask && availableParentTasks.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="parentTask">Link to Parent Task (Optional)</Label>
                  <Select
                    value={formData.parentTaskId || "none"}
                    onValueChange={(value) => setFormData({ ...formData, parentTaskId: value === "none" ? undefined : value })}
                  >
                    <SelectTrigger data-testid="select-parent-task">
                      <SelectValue placeholder="Select a parent task to link to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No parent task</SelectItem>
                      {mainTasks.length > 0 && (
                        <>
                          <SelectItem value="main-tasks-header" disabled>
                            --- Main Tasks ---
                          </SelectItem>
                          {mainTasks.map((mainTask) => (
                            <SelectItem key={mainTask.id} value={mainTask.id}>
                              {mainTask.title}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {subtasks.length > 0 && (
                        <>
                          <SelectItem value="sub-tasks-header" disabled>
                            --- Sub Tasks ---
                          </SelectItem>
                          {subtasks.map((subtask) => (
                            <SelectItem key={subtask.id} value={subtask.id}>
                              {subtask.title}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Additional Connections for non-main tasks */}
              {!formData.isMainTask && isEditing && (
                <div className="space-y-2">
                  <Label>Additional Connections</Label>
                  <p className="text-sm text-gray-600">Connect this task to other tasks to show relationships</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {availableParentTasks.map((otherTask) => {
                      const isConnected = connections.some(
                        conn => (conn.sourceTaskId === task?.id && conn.targetTaskId === otherTask.id) ||
                               (conn.targetTaskId === task?.id && conn.sourceTaskId === otherTask.id)
                      );
                      
                      return (
                        <div key={otherTask.id} className="flex items-center space-x-2">
                          <Switch
                            id={`connection-${otherTask.id}`}
                            checked={isConnected || selectedConnections.includes(otherTask.id)}
                            onCheckedChange={(checked) => {
                              if (isConnected) {
                                // Remove existing connection
                                const existingConnection = connections.find(
                                  conn => (conn.sourceTaskId === task?.id && conn.targetTaskId === otherTask.id) ||
                                         (conn.targetTaskId === task?.id && conn.sourceTaskId === otherTask.id)
                                );
                                if (existingConnection) {
                                  // TODO: Add delete connection functionality
                                  toast({ title: "Connection removal not implemented yet", variant: "destructive" });
                                }
                              } else {
                                // Toggle new connection
                                if (checked) {
                                  setSelectedConnections(prev => [...prev, otherTask.id]);
                                } else {
                                  setSelectedConnections(prev => prev.filter(id => id !== otherTask.id));
                                }
                              }
                            }}
                          />
                          <Label htmlFor={`connection-${otherTask.id}`} className="text-sm">
                            {otherTask.title} {otherTask.isMainTask ? "(Main)" : "(Sub)"}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
