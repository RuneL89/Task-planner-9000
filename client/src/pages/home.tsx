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
  
  const isMobile = useIsMobile();
  const { data: tasks = [] } = useTasks();
  const updateTask = useUpdateTask();
  const { toast } = useToast();

  // Check for completed main tasks when subtasks change
  useEffect(() => {
    tasks.forEach((task) => {
      if (
        task.isMainTask &&
        task.subtasks &&
        task.subtasks.length > 0 &&
        task.status !== "completed"
      ) {
        const allSubTasksCompleted = task.subtasks.every(
          (subtask) => subtask.status === "completed"
        );
        
        if (allSubTasksCompleted && !completionDialogOpen) {
          setCompletedMainTask(task);
          setCompletionDialogOpen(true);
        }
      }
    });
  }, [tasks, completionDialogOpen]);

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
    setCompletionDialogOpen(false);
    if (completedMainTask) {
      handleCreateTask(completedMainTask);
    }
    setCompletedMainTask(null);
  };

  const handleCloseCompletionDialog = () => {
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
