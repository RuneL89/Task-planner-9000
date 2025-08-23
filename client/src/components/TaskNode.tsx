import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Play, Square } from "lucide-react";
import type { TaskWithRelations } from "@shared/schema";
import { useTimer } from "@/hooks/use-timer";
import { cn } from "@/lib/utils";

export interface TaskNodeData extends Record<string, unknown> {
  task: TaskWithRelations;
  onEdit: (task: TaskWithRelations) => void;
}

const TaskNode = memo(({ data, selected }: NodeProps) => {
  const { task, onEdit } = data as TaskNodeData;
  const { isRunning, formattedTime, startTimer, stopTimer } = useTimer(task.id);

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

  const formatDeadline = (deadline: Date | null) => {
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

  return (
    <div className="relative">
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />

      <Card
        className={cn(
          "min-w-48 max-w-64 cursor-pointer transition-all duration-200 hover:shadow-lg",
          task.isMainTask ? "min-w-64 border-2 border-blue-500" : "border border-gray-200",
          selected && "ring-2 ring-blue-300"
        )}
        data-testid={`task-node-${task.id}`}
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

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span data-testid={`text-time-spent-${task.id}`}>
                  {isRunning ? formattedTime : formatTimeSpent(task.timeSpent || 0)}
                </span>
              </div>
              {deadlineInfo && (
                <div className={cn("flex items-center space-x-1", deadlineInfo.color)}>
                  <Calendar className="w-3 h-3" />
                  <span data-testid={`text-deadline-${task.id}`}>{deadlineInfo.text}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {task.subtasks?.length || 0} subtasks
              </span>
              <Button
                variant={isRunning ? "destructive" : "default"}
                size="sm"
                className="h-6 w-6 p-0 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  isRunning ? stopTimer() : startTimer();
                }}
                data-testid={`button-timer-${task.id}`}
              >
                {isRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

TaskNode.displayName = "TaskNode";

export default TaskNode;
