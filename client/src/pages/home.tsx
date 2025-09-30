import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import TaskCanvas from "@/components/TaskCanvas";
import TaskModal from "@/components/TaskModal";
import CompletionDialog from "@/components/CompletionDialog";
import MobileControls from "@/components/MobileControls";
import MainTaskSelector from "@/components/MainTaskSelector";
import { WeeklyPlanner } from "@/components/WeeklyPlanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTasks, useUpdateTask } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import type { TaskWithRelations } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function Home() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [parentTask, setParentTask] = useState<TaskWithRelations | undefined>(undefined);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [completedMainTask, setCompletedMainTask] = useState<TaskWithRelations | null>(null);
  const [dismissedCompletionTasks, setDismissedCompletionTasks] = useState<Set<string>>(new Set());
  const [mainTaskSelectorOpen, setMainTaskSelectorOpen] = useState(false);
  const [weeklyPlannerOpen, setWeeklyPlannerOpen] = useState(false);
  const [selectedMainTaskIds, setSelectedMainTaskIds] = useState<string[]>([]);
  
  const { data: tasks = [] } = useTasks();
  const updateTask = useUpdateTask();
  const { toast } = useToast();

  const isFirstRender = useRef(true);
  const prevIsMobileRef = useRef(isMobile);

  // Sync sidebar state with mobile/desktop viewport changes
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      // On first render, immediately sync with isMobile BEFORE paint
      setSidebarOpen(!isMobile);
      isFirstRender.current = false;
      prevIsMobileRef.current = isMobile;
    } else if (prevIsMobileRef.current !== isMobile) {
      // On subsequent renders, only update if isMobile actually changed
      setSidebarOpen(!isMobile);
      prevIsMobileRef.current = isMobile;
    }
  }, [isMobile]);

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

      <div 
        className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          !isMobile && sidebarOpen ? "ml-80" : "ml-0"
        )}
      >
        {/* Top Navigation */}
        <div className="bg-white border-b border-slate-200 p-4">
          <Button
            onClick={() => setMainTaskSelectorOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-plan-week"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Plan the next 7 days
          </Button>
        </div>

        <TaskCanvas onCreateTask={() => handleCreateTask()} onEditTask={handleEditTask} onCreateSubtask={handleCreateTask} />
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

      <MainTaskSelector
        isOpen={mainTaskSelectorOpen}
        onClose={() => setMainTaskSelectorOpen(false)}
        onStartPlanning={(selectedTaskIds) => {
          setSelectedMainTaskIds(selectedTaskIds);
          setMainTaskSelectorOpen(false);
          setWeeklyPlannerOpen(true);
        }}
      />

      <WeeklyPlanner
        isOpen={weeklyPlannerOpen}
        onClose={() => setWeeklyPlannerOpen(false)}
        selectedMainTaskIds={selectedMainTaskIds}
      />
    </div>
  );
}
