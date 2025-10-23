import { memo, useCallback, useRef, useMemo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronUp, ChevronDown, Plus } from "lucide-react";
import type { TaskWithRelations } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { addDays, differenceInDays } from "date-fns";

export interface TaskNodeData extends Record<string, unknown> {
  task: TaskWithRelations;
  allTasks: TaskWithRelations[];
  onEdit: (task: TaskWithRelations) => void;
  onToggleCollapse?: (taskId: string, isCollapsed: boolean) => void;
  onCreateSubtask?: (parentTask: TaskWithRelations) => void;
}

// Helper function to check if task and all descendants are completed
const isFullyCompletedBranch = (task: TaskWithRelations): boolean => {
  if (task.status !== "completed" || !task.completedAt) {
    return false;
  }
  
  if (task.subtasks && task.subtasks.length > 0) {
    return task.subtasks.every(subtask => isFullyCompletedBranch(subtask));
  }
  
  return true;
};

// Helper function to find parent main task
const findParentMainTask = (task: TaskWithRelations, allTasks: TaskWithRelations[]): TaskWithRelations | null => {
  if (!task.parentTaskId) return null;
  
  // Walk up the task tree using parentTaskId and searching the tasks array
  let currentId: string | null = task.parentTaskId;
  
  while (currentId) {
    // Find the current task in the array
    const currentTask = allTasks.find(t => t.id === currentId);
    
    // If task not found, we can't continue
    if (!currentTask) return null;
    
    // Check if this is a main task
    if (currentTask.isMainTask) {
      return currentTask;
    }
    
    // Move up to the parent
    currentId = currentTask.parentTaskId || null;
  }
  
  return null;
};

const TaskNode = memo(({ data, selected }: NodeProps) => {
  const { task, allTasks, onEdit, onToggleCollapse, onCreateSubtask } = data as TaskNodeData;
  const isMobile = useIsMobile();
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const pressStartTime = useRef<number>(0);

  const handlePressStart = useCallback(() => {
    pressStartTime.current = Date.now();
    pressTimer.current = setTimeout(() => {
      onEdit(task);
    }, 500); // 500ms for long press
  }, [onEdit, task]);

  const handlePressEnd = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handlePressStart();
  }, [handlePressStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handlePressStart();
  }, [handlePressStart]);

  const handleCreateSubtask = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreateSubtask) {
      onCreateSubtask(task);
    }
  }, [onCreateSubtask, task]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500 animate-pulse";
      case "on_hold":
        return "bg-yellow-500";
      case "overdue":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "on_hold":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatTimeSpent = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    
    const now = new Date();
    const deadlineDate = new Date(deadline + 'T00:00:00');
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} days`, color: "text-red-500" };
    } else if (diffDays === 0) {
      return { text: "Due today", color: "text-yellow-600" };
    } else if (diffDays === 1) {
      return { text: "Due tomorrow", color: "text-yellow-600" };
    } else {
      return { text: `Due in ${diffDays} days`, color: "text-gray-600" };
    }
  };

  const deadlineInfo = formatDeadline(task.deadline);

  const formatDeadlineCompact = (deadline: string | null) => {
    if (!deadline) return "";
    const date = new Date(deadline + 'T00:00:00');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `(${day}/${month})`;
  };

  const getSubtaskStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "on_hold":
        return "bg-yellow-500";
      default:
        return "bg-gray-400";
    }
  };

  // Get all descendants (full hierarchy) for display (first 5 non-completed, ordered by deadline ascending)
  const { sortedSubtasks, subtaskCounts } = useMemo(() => {
    if (!task.subtasks) return { sortedSubtasks: [], subtaskCounts: { total: 0, nonCompleted: 0 } };
    
    // Recursively collect all descendants
    const collectAllDescendants = (tasks: any[]): any[] => {
      let allDescendants: any[] = [];
      
      for (const subtask of tasks) {
        allDescendants.push(subtask);
        
        // Recursively add subtasks of this subtask
        if (subtask.subtasks?.length > 0) {
          allDescendants = allDescendants.concat(collectAllDescendants(subtask.subtasks));
        }
      }
      
      return allDescendants;
    };
    
    const allDescendants = collectAllDescendants(task.subtasks);
    const total = allDescendants.length;
    
    // Filter out completed tasks
    const nonCompletedDescendants = allDescendants.filter(subtask => subtask.status !== "completed");
    const nonCompleted = nonCompletedDescendants.length;
    
    const sortedNonCompleted = nonCompletedDescendants
      .sort((a, b) => {
        // Sort by deadline ascending (tasks with deadlines first, null deadlines last)
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      })
      .slice(0, 5);
    
    return {
      sortedSubtasks: sortedNonCompleted,
      subtaskCounts: { total, nonCompleted }
    };
  }, [task.isMainTask, task.subtasks]);

  // Calculate completion progress for main tasks (including all descendants)
  const getCompletionProgress = () => {
    if (!task.isMainTask || !task.subtasks?.length) return null;
    
    // Recursive function to count all descendants
    const countAllSubtasks = (tasks: any[]): { total: number; completed: number } => {
      let total = 0;
      let completed = 0;
      
      for (const subtask of tasks) {
        total += 1;
        if (subtask.status === "completed") {
          completed += 1;
        }
        
        // Recursively count subtasks of this subtask
        if (subtask.subtasks?.length > 0) {
          const subCounts = countAllSubtasks(subtask.subtasks);
          total += subCounts.total;
          completed += subCounts.completed;
        }
      }
      
      return { total, completed };
    };
    
    const { total, completed } = countAllSubtasks(task.subtasks);
    
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const progress = getCompletionProgress();

  // Calculate cleanup info for eligible subtasks
  const cleanupInfo = useMemo(() => {
    // Guard: check if allTasks is available
    if (!allTasks || allTasks.length === 0) return null;
    
    // Only calculate for non-main tasks
    if (task.isMainTask) return null;
    
    // Check if task is completed
    if (task.status !== "completed" || !task.completedAt) return null;
    
    // Check if all descendants are completed
    if (!isFullyCompletedBranch(task)) return null;
    
    // Find parent main task
    const parentMainTask = findParentMainTask(task, allTasks);
    if (!parentMainTask) return null;
    
    // Check if auto cleanup is enabled
    if (!parentMainTask.autoCleanupEnabled || parentMainTask.autoCleanupPeriod === "off") {
      return null;
    }
    
    // Calculate deletion date
    const completedDate = new Date(task.completedAt);
    let deletionDate: Date;
    
    switch (parentMainTask.autoCleanupPeriod) {
      case "1day":
        deletionDate = addDays(completedDate, 1);
        break;
      case "1week":
        deletionDate = addDays(completedDate, 7);
        break;
      case "1month":
        deletionDate = addDays(completedDate, 30);
        break;
      default:
        return null;
    }
    
    // Calculate days remaining
    const today = new Date();
    const daysRemaining = differenceInDays(deletionDate, today);
    
    // Only show if cleanup is scheduled (positive days or 0)
    if (daysRemaining < 0) return null;
    
    return {
      daysRemaining,
      deletionDate
    };
  }, [task, allTasks]);

  return (
    <div className="relative">
      {/* Connection handles with unique IDs for source and target */}
      <Handle
        type="source"
        id="top-source"
        position={Position.Top}
        className={cn("w-4 h-4 bg-gray-400 hover:bg-gray-600 border-2 border-white transition-colors", isMobile && "w-6 h-6")}
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      />
      <Handle
        type="target"
        id="top-target"
        position={Position.Top}
        className={cn("w-4 h-4 bg-gray-400 hover:bg-gray-600 border-2 border-white transition-colors", isMobile && "w-6 h-6")}
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      />
      
      <Handle
        type="source"
        id="bottom-source"
        position={Position.Bottom}
        className={cn("w-4 h-4 bg-blue-500 hover:bg-blue-600 border-2 border-white transition-colors", isMobile && "w-6 h-6")}
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      />
      <Handle
        type="target"
        id="bottom-target"
        position={Position.Bottom}
        className={cn("w-4 h-4 bg-blue-500 hover:bg-blue-600 border-2 border-white transition-colors", isMobile && "w-6 h-6")}
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      />
      
      <Handle
        type="source"
        id="left-source"
        position={Position.Left}
        className={cn("w-4 h-4 bg-blue-500 hover:bg-blue-600 border-2 border-white transition-colors", isMobile && "w-6 h-6")}
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
      <Handle
        type="target"
        id="left-target"
        position={Position.Left}
        className={cn("w-4 h-4 bg-blue-500 hover:bg-blue-600 border-2 border-white transition-colors", isMobile && "w-6 h-6")}
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
      
      <Handle
        type="source"
        id="right-source"
        position={Position.Right}
        className={cn("w-4 h-4 bg-blue-500 hover:bg-blue-600 border-2 border-white transition-colors", isMobile && "w-6 h-6")}
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
      <Handle
        type="target"
        id="right-target"
        position={Position.Right}
        className={cn("w-4 h-4 bg-blue-500 hover:bg-blue-600 border-2 border-white transition-colors", isMobile && "w-6 h-6")}
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />

      <Card
        className={cn(
          "min-w-48 max-w-64 cursor-pointer transition-all duration-200 hover:shadow-lg relative",
          task.isMainTask ? "min-w-64 border-2 border-blue-500" : "border border-gray-200",
          selected && "ring-2 ring-blue-300"
        )}
        data-testid={`task-node-${task.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(task);
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handlePressEnd}
      >
        {/* Add Subtask Button */}
        {onCreateSubtask && (
          <button
            className={cn("absolute bottom-2 right-2 w-6 h-6 bg-gray-300 hover:bg-gray-400 rounded-full flex items-center justify-center transition-colors z-10", isMobile && "w-10 h-10")}
            onClick={handleCreateSubtask}
            data-testid={`button-add-subtask-${task.id}`}
          >
            <Plus className={cn("w-3 h-3 text-black", isMobile && "w-4 h-4")} />
          </button>
        )}
        
        <CardContent className={cn("p-4", isMobile && "p-6")}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={cn("w-3 h-3 rounded-full", getStatusColor(task.status))} />
              {task.isMainTask && (
                <Badge variant="outline" className="text-xs">
                  MAIN TASK
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={cn("opacity-0 group-hover:opacity-100 h-6 w-6 p-0", isMobile && "h-8 w-8")}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              data-testid={`button-edit-task-${task.id}`}
            >
              ✏️
            </Button>
          </div>

          <h3
            className={cn(
              "font-semibold mb-1 line-clamp-2",
              task.isMainTask ? "text-lg" : "text-sm"
            )}
            data-testid={`text-task-title-${task.id}`}
          >
            {task.title}
          </h3>

          {task.description && (
            <p className="text-gray-600 text-xs mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Badge variant={getStatusBadgeVariant(task.status)} className="text-xs">
                {task.status.replace("_", " ").toUpperCase()}
              </Badge>
              {task.priority && (
                <Badge
                  variant={task.priority === "high" ? "destructive" : "outline"}
                  className="text-xs"
                >
                  {task.priority.toUpperCase()}
                </Badge>
              )}
            </div>

            {deadlineInfo && (
              <div className={cn("flex items-center space-x-1 text-xs text-gray-500", deadlineInfo.color)}>
                <Calendar className="w-3 h-3" />
                <span data-testid={`text-deadline-${task.id}`}>{deadlineInfo.text}</span>
              </div>
            )}

            {/* Cleanup indicator for eligible subtasks */}
            {cleanupInfo && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <span data-testid={`cleanup-indicator-${task.id}`}>
                  🗑️ {cleanupInfo.daysRemaining === 0 ? "Cleans up today" : `Cleans up in ${cleanupInfo.daysRemaining} days`}
                </span>
              </div>
            )}

            {/* Progress bar for main tasks */}
            {progress && (
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span data-testid={`progress-text-${task.id}`}>
                    {progress.completed}/{progress.total} completed
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                    data-testid={`progress-bar-${task.id}`}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-center">
                <span className="text-xs text-gray-500">
                  {subtaskCounts.total > 0 
                    ? `${subtaskCounts.nonCompleted} of ${subtaskCounts.total} subtasks` 
                    : `${task.subtasks?.length || 0} subtasks`}
                </span>
              </div>
              {/* Collapse button for any task with subtasks */}
              {(task.subtasks?.length || 0) > 0 && onToggleCollapse && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-6 px-2 text-xs", isMobile && "h-8")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCollapse(task.id, !task.isCollapsed);
                    }}
                    data-testid={`button-collapse-${task.id}`}
                  >
                    {task.isCollapsed ? (
                      <>
                        <ChevronDown className={cn("w-3 h-3 mr-1", isMobile && "w-4 h-4")} />
                        Show
                      </>
                    ) : (
                      <>
                        <ChevronUp className={cn("w-3 h-3 mr-1", isMobile && "w-4 h-4")} />
                        Hide
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Subtask overview for main tasks */}
            {task.isMainTask && subtaskCounts.total > 0 && (
              <div className="mt-2 space-y-1">
                {sortedSubtasks.length > 0 && (
                  <>
                    {sortedSubtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center space-x-2 text-xs">
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getSubtaskStatusColor(subtask.status))} />
                        <span className="text-gray-700 truncate flex-1">
                          {subtask.title}
                          {subtask.deadline && (
                            <span className="text-gray-500 ml-1">
                              {formatDeadlineCompact(subtask.deadline)}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                    {subtaskCounts.nonCompleted > 5 && (
                      <div className="text-xs text-gray-400 italic">
                        +{subtaskCounts.nonCompleted - 5} more subtasks...
                      </div>
                    )}
                  </>
                )}
                {sortedSubtasks.length === 0 && subtaskCounts.total > 0 && (
                  <div className="text-xs text-gray-500 italic">
                    All subtasks completed
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

TaskNode.displayName = "TaskNode";

export default TaskNode;
