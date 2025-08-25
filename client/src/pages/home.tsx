import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TaskCanvas from "@/components/TaskCanvas";
import TaskModal from "@/components/TaskModal";
import CompletionDialog from "@/components/CompletionDialog";
import MobileControls from "@/components/MobileControls";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTasks, useUpdateTask } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";
import type { TaskWithRelations } from "@shared/schema";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [parentTask, setParentTask] = useState<TaskWithRelations | undefined>(undefined);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [completedMainTask, setCompletedMainTask] = useState<TaskWithRelations | null>(null);
  const [dismissedCompletionTasks, setDismissedCompletionTasks] = useState<Set<string>>(new Set());
  
  const isMobile = useIsMobile();
  const { data: tasks = [] } = useTasks();
  const updateTask = useUpdateTask();
  const { toast } = useToast();

  // Check for completed main tasks and auto-update main task status
  useEffect(() => {
    tasks.forEach((task) => {
      if (
        task.isMainTask &&
        task.subtasks &&
        task.subtasks.length > 0
      ) {
        // Recursively check all descendants in the full hierarchy
        const checkAllDescendantsCompleted = (tasks: TaskWithRelations[]): boolean => {
          return tasks.every(subtask => {
            if (subtask.status !== "completed") return false;
            if (subtask.subtasks && subtask.subtasks.length > 0) {
              return checkAllDescendantsCompleted(subtask.subtasks);
            }
            return true;
          });
        };
        
        // Check if any descendants are not completed
        const hasIncompleteDescendants = (tasks: TaskWithRelations[]): boolean => {
          return tasks.some(subtask => {
            if (subtask.status !== "completed") return true;
            if (subtask.subtasks && subtask.subtasks.length > 0) {
              return hasIncompleteDescendants(subtask.subtasks);
            }
            return false;
          });
        };
        
        const allSubTasksCompleted = checkAllDescendantsCompleted(task.subtasks);
        const hasIncompleteSubtasks = hasIncompleteDescendants(task.subtasks);
        
        // Auto-complete main task prompt when all subtasks are done
        if (allSubTasksCompleted && task.status !== "completed" && !completionDialogOpen && !dismissedCompletionTasks.has(task.id)) {
          setCompletedMainTask(task);
          setCompletionDialogOpen(true);
        }
        
        // Auto-set main task to "in_progress" when subtasks become incomplete
        if (hasIncompleteSubtasks && task.status === "completed") {
          updateTask.mutate({
            id: task.id,
            task: { status: "in_progress" },
          });
          // Clear from dismissed list when subtasks become incomplete again
          setDismissedCompletionTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(task.id);
            return newSet;
          });
        }
      }
    });
  }, [tasks]); // Removed completionDialogOpen from dependencies to prevent loop!

  const handleCompleteMainTask = async () => {
    if (completedMainTask) {
      try {
        await updateTask.mutateAsync({
          id: completedMainTask.id,
          task: { status: "completed" },
        });
        toast({
          title: "Success",
          description: `Main task "${completedMainTask.title}" has been completed!`,
        });
        // Clear from dismissed list when actually completed
        setDismissedCompletionTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(completedMainTask.id);
          return newSet;
        });
        setCompletionDialogOpen(false);
        setCompletedMainTask(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to complete main task",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddMoreSubTasks = () => {
    if (completedMainTask) {
      // Mark this task as dismissed to prevent dialog from reopening
      setDismissedCompletionTasks(prev => new Set([...prev, completedMainTask.id]));
      handleCreateTask(completedMainTask);
    }
    setCompletionDialogOpen(false);
    setCompletedMainTask(null);
  };

  const handleCloseCompletionDialog = () => {
    if (completedMainTask) {
      // Mark this task as dismissed to prevent dialog from reopening
      setDismissedCompletionTasks(prev => new Set([...prev, completedMainTask.id]));
    }
    setCompletionDialogOpen(false);
    setCompletedMainTask(null);
  };

  const handleCreateTask = (parent?: TaskWithRelations) => {
    setSelectedTask(null);
    setParentTask(parent);
    setTaskModalOpen(true);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleEditTask = (task: TaskWithRelations) => {
    setSelectedTask(task);
    setParentTask(undefined);
    setTaskModalOpen(true);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleFocusTask = (task: TaskWithRelations) => {
    // This will be used to focus the task on the canvas
    // For now, we'll implement this as a placeholder
    // The actual implementation would need to communicate with the TaskCanvas
    console.log("Focusing task:", task.title);
  };

  const handleCloseModal = () => {
    setTaskModalOpen(false);
    setSelectedTask(null);
    setParentTask(undefined);
  };

  return (
    <div className="flex h-screen bg-slate-50" data-testid="home-page">
      <Sidebar
        onCreateTask={() => handleCreateTask()}
        onEditTask={handleEditTask}
        onFocusTask={handleFocusTask}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-semibold text-slate-800" data-testid="page-title">
                Project Web View
              </h2>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span data-testid="auto-save-status">Auto-saved</span>
              </div>
            </div>
          </div>
        </div>

        <TaskCanvas onCreateTask={() => handleCreateTask()} onEditTask={handleEditTask} />
      </div>

      {isMobile && (
        <MobileControls
          onZoomIn={() => {}}
          onZoomOut={() => {}}
          onFitView={() => {}}
          onCreateTask={() => handleCreateTask()}
        />
      )}

      <TaskModal
        task={selectedTask}
        isOpen={taskModalOpen}
        onClose={handleCloseModal}
        parentTask={parentTask}
      />

      <CompletionDialog
        mainTask={completedMainTask}
        isOpen={completionDialogOpen}
        onClose={handleCloseCompletionDialog}
        onCompleteMainTask={handleCompleteMainTask}
        onAddMoreSubTasks={handleAddMoreSubTasks}
      />
    </div>
  );
}
