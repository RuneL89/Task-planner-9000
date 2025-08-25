import { memo, useCallback, useRef, useMemo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronUp, ChevronDown } from "lucide-react";
import type { TaskWithRelations } from "@shared/schema";
import { cn } from "@/lib/utils";

export interface TaskNodeData extends Record<string, unknown> {
  task: TaskWithRelations;
  onEdit: (task: TaskWithRelations) => void;
  onToggleCollapse?: (taskId: string, isCollapsed: boolean) => void;
}

const TaskNode = memo(({ data, selected }: NodeProps) => {
  const { task, onEdit, onToggleCollapse } = data as TaskNodeData;
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
    const deadlineDate = new Date(deadline);
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
    const date = new Date(deadline);
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `(${day}/${year})`;
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

  // Get sorted subtasks for display (first 5, ordered by deadline ascending)
  const sortedSubtasks = useMemo(() => {
    if (!task.isMainTask || !task.subtasks) return [];
    
    return [...task.subtasks]
      .sort((a, b) => {
        // Sort by deadline ascending (tasks with deadlines first, null deadlines last)
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      })
      .slice(0, 5);
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

  return (
    <div className="relative">
      {/* Multiple connection handles for flexible visualization */}
      {/* Top handle */}
      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="w-4 h-4 bg-gray-400 hover:bg-gray-600 border-2 border-white transition-colors"
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      />
      
      {/* Bottom handle */}
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="w-4 h-4 bg-blue-500 hover:bg-blue-600 border-2 border-white transition-colors"
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      />
      
      {/* Left handle */}
      <Handle
        type="source"
        id="left"
        position={Position.Left}
        className="w-4 h-4 bg-blue-500 hover:bg-blue-600 border-2 border-white transition-colors"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
      
      {/* Right handle */}
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="w-4 h-4 bg-blue-500 hover:bg-blue-600 border-2 border-white transition-colors"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />

      <Card
        className={cn(
          "min-w-48 max-w-64 cursor-pointer transition-all duration-200 hover:shadow-lg",
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
        <CardContent className="p-4">
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
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
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

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {task.isMainTask && progress ? `${progress.total} subtasks` : `${task.subtasks?.length || 0} subtasks`}
              </span>
              <div className="flex items-center space-x-1">
                {/* Collapse button for main tasks with subtasks */}
                {task.isMainTask && (progress?.total || 0) > 0 && onToggleCollapse && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCollapse(task.id, !task.isCollapsed);
                    }}
                    data-testid={`button-collapse-${task.id}`}
                  >
                    {task.isCollapsed ? (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Show
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Hide
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Subtask overview for main tasks */}
            {task.isMainTask && sortedSubtasks.length > 0 && (
              <div className="mt-2 space-y-1">
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
                {task.subtasks && task.subtasks.length > 5 && (
                  <div className="text-xs text-gray-400 italic">
                    +{task.subtasks.length - 5} more subtasks...
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
