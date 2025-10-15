import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Layers } from "lucide-react";
import { useTasksNested } from "@/hooks/use-tasks";
import type { TaskWithRelations } from "@shared/schema";
import { cn } from "@/lib/utils";

interface MainTasksDropdownProps {
  onFocusTask: (task: TaskWithRelations) => void;
}

export default function MainTasksDropdown({ onFocusTask }: MainTasksDropdownProps) {
  const { data: tasks = [] } = useTasksNested();

  // Get main tasks ordered by updatedAt DESC (most recently updated first)
  const mainTasks = useMemo(() => {
    return tasks
      .filter(task => task.isMainTask)
      .sort((a, b) => {
        if (!a.updatedAt || !b.updatedAt) return 0;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [tasks]);

  const getStatusColor = (status: string) => {
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

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return "No deadline";
    return new Date(deadline).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          data-testid="button-main-tasks-dropdown"
        >
          <Layers className="w-4 h-4" />
          <span className="hidden sm:inline">Main Tasks</span>
          <Badge variant="secondary" className="ml-1">
            {mainTasks.length}
          </Badge>
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[400px] p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-2">
            {mainTasks.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No main tasks yet
              </div>
            ) : (
              mainTasks.map((task) => (
                <DropdownMenuItem
                  key={task.id}
                  onClick={() => onFocusTask(task)}
                  className="cursor-pointer p-3 rounded-lg mb-1 hover:bg-slate-50 transition-colors"
                  data-testid={`main-task-item-${task.id}`}
                >
                  <div className="flex items-start gap-3 w-full">
                    {/* Status Dot */}
                    <div className={cn("w-3 h-3 rounded-full mt-1 flex-shrink-0", getStatusColor(task.status))} />
                    
                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate mb-1" data-testid={`main-task-title-${task.id}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          📅 {formatDeadline(task.deadline)}
                        </span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {task.subtasks?.length || 0} subtasks
                        </Badge>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
