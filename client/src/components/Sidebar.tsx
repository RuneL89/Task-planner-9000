import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChartGantt,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  Settings,
  Download,
  Moon,
  X,
  Menu,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useTasksNested, useTaskStats } from "@/hooks/use-tasks";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TaskWithRelations } from "@shared/schema";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onCreateTask: () => void;
  onEditTask: (task: TaskWithRelations) => void;
  onFocusTask: (task: TaskWithRelations) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ onCreateTask, onEditTask, onFocusTask, isOpen, onToggle }: SidebarProps) {
  const { data: tasks = [] } = useTasksNested();
  const { data: stats } = useTaskStats();
  const isMobile = useIsMobile();

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    overdue: false,
    upcoming: false,
    noDeadline: false,
    completed: false,
  });

  // Flatten all tasks (main and subtasks) into a single array without duplicates
  const allTasks = useMemo(() => {
    const flattenedTasksMap = new Map<string, TaskWithRelations>();
    
    const flattenTasks = (taskList: TaskWithRelations[]): void => {
      for (const task of taskList) {
        // Only add if not already added (prevents duplicates)
        if (!flattenedTasksMap.has(task.id)) {
          flattenedTasksMap.set(task.id, task);
        }
        
        if (task.subtasks?.length) {
          flattenTasks(task.subtasks);
        }
      }
    };
    
    flattenTasks(tasks);
    return Array.from(flattenedTasksMap.values());
  }, [tasks]);

  // Categorize tasks by deadline status
  const categorizedTasks = useMemo(() => {
    const now = new Date();
    
    const overdue = allTasks
      .filter(task => 
        task.deadline && 
        new Date(task.deadline) < now && 
        task.status !== "completed"
      )
      .sort((a, b) => {
        // Most overdue first (earliest deadline)
        return new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime();
      });
    
    const upcoming = allTasks
      .filter(task => 
        task.deadline && 
        new Date(task.deadline) >= now && 
        task.status !== "completed"
      )
      .sort((a, b) => {
        // Soonest deadline first
        return new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime();
      });
    
    const noDeadline = allTasks
      .filter(task => !task.deadline && task.status !== "completed");
    
    const completed = allTasks
      .filter(task => task.status === "completed")
      .sort((a, b) => {
        // Most recently completed first
        if (!a.updatedAt || !b.updatedAt) return 0;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    
    return { overdue, upcoming, noDeadline, completed };
  }, [allTasks]);

  const getTaskStatusColor = (task: TaskWithRelations) => {
    if (task.deadline) {
      const now = new Date();
      const deadline = new Date(task.deadline);
      if (deadline < now && task.status !== "completed") {
        return "bg-red-500";
      }
    }
    
    switch (task.status) {
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

  const getTaskIcon = (task: TaskWithRelations) => {
    if (task.deadline) {
      const now = new Date();
      const deadline = new Date(task.deadline);
      if (deadline < now && task.status !== "completed") {
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      }
      const diffTime = deadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 1 && task.status !== "completed") {
        return <Clock className="w-4 h-4 text-yellow-600" />;
      }
    }
    return null;
  };


  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="outline"
          size="sm"
          className="fixed top-4 left-4 z-50 bg-white shadow-lg"
          onClick={onToggle}
          data-testid="button-mobile-menu"
        >
          <Menu className="w-4 h-4" />
        </Button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "w-80 bg-white shadow-xl border-r border-slate-200 flex flex-col transition-all duration-300 h-full",
          isMobile
            ? `fixed z-40 ${isOpen ? "translate-x-0" : "-translate-x-full"}`
            : "relative"
        )}
        data-testid="sidebar"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <ChartGantt className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Task Planner</h1>
                <p className="text-sm text-slate-500">Visual Task Management</p>
              </div>
            </div>
            {isMobile && (
              <Button variant="ghost" size="sm" onClick={onToggle} data-testid="button-close-sidebar">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-6 border-b border-slate-200">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-slate-50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-500" data-testid="stat-total-tasks">
                  {stats?.totalTasks || 0}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Total Tasks</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500" data-testid="stat-completed-tasks">
                  {stats?.completedTasks || 0}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Completed</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Task Controls */}
        <div className="p-6 border-b border-slate-200">
          <Button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            onClick={onCreateTask}
            data-testid="button-create-new-task"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Task</span>
          </Button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6 pb-6">
            <div className="space-y-4">
              {allTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No tasks yet</p>
                  <p className="text-xs mt-1">Create your first task to get started</p>
                </div>
              ) : (
                <>
                  {/* Overdue Tasks */}
                  <div>
                    <button
                      className="flex items-center space-x-2 w-full text-left p-2 hover:bg-slate-50 rounded-lg transition-colors"
                      onClick={() => setCollapsedSections(prev => ({ ...prev, overdue: !prev.overdue }))}
                      data-testid="button-toggle-overdue"
                    >
                      {collapsedSections.overdue ? (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                      <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide">
                        Overdue
                      </h3>
                    </button>
                    {!collapsedSections.overdue && (
                      <div className="ml-6 space-y-2 mt-2">
                        {categorizedTasks.overdue.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
                            onClick={() => {
                              onFocusTask(task);
                              onEditTask(task);
                            }}
                            data-testid={`task-item-${task.id}`}
                          >
                            <div className={cn("w-3 h-3 rounded-full", getTaskStatusColor(task))} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-800 truncate" data-testid={`task-title-${task.id}`}>
                                {task.title}
                              </div>
                              <div className="text-sm text-slate-500 flex items-center space-x-2">
                                <span>{task.subtasks?.length || 0} subtasks</span>
                                {task.deadline && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {new Date(task.deadline).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {getTaskIcon(task)}
                            </div>
                          </div>
                        ))}
                        {categorizedTasks.overdue.length === 0 && (
                          <p className="text-xs text-slate-400 italic pl-2">No overdue tasks</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Upcoming Deadlines */}
                  <div>
                    <button
                      className="flex items-center space-x-2 w-full text-left p-2 hover:bg-slate-50 rounded-lg transition-colors"
                      onClick={() => setCollapsedSections(prev => ({ ...prev, upcoming: !prev.upcoming }))}
                      data-testid="button-toggle-upcoming"
                    >
                      {collapsedSections.upcoming ? (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                      <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                        Upcoming Deadlines
                      </h3>
                    </button>
                    {!collapsedSections.upcoming && (
                      <div className="ml-6 space-y-2 mt-2">
                        {categorizedTasks.upcoming.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
                            onClick={() => {
                              onFocusTask(task);
                              onEditTask(task);
                            }}
                            data-testid={`task-item-${task.id}`}
                          >
                            <div className={cn("w-3 h-3 rounded-full", getTaskStatusColor(task))} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-800 truncate" data-testid={`task-title-${task.id}`}>
                                {task.title}
                              </div>
                              <div className="text-sm text-slate-500 flex items-center space-x-2">
                                <span>{task.subtasks?.length || 0} subtasks</span>
                                {task.deadline && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {new Date(task.deadline).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {getTaskIcon(task)}
                            </div>
                          </div>
                        ))}
                        {categorizedTasks.upcoming.length === 0 && (
                          <p className="text-xs text-slate-400 italic pl-2">No upcoming deadlines</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* No Deadline Tasks */}
                  <div>
                    <button
                      className="flex items-center space-x-2 w-full text-left p-2 hover:bg-slate-50 rounded-lg transition-colors"
                      onClick={() => setCollapsedSections(prev => ({ ...prev, noDeadline: !prev.noDeadline }))}
                      data-testid="button-toggle-no-deadline"
                    >
                      {collapsedSections.noDeadline ? (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                      <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                        No Deadline
                      </h3>
                    </button>
                    {!collapsedSections.noDeadline && (
                      <div className="ml-6 space-y-2 mt-2">
                        {categorizedTasks.noDeadline.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
                            onClick={() => {
                              onFocusTask(task);
                              onEditTask(task);
                            }}
                            data-testid={`task-item-${task.id}`}
                          >
                            <div className={cn("w-3 h-3 rounded-full", getTaskStatusColor(task))} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-800 truncate" data-testid={`task-title-${task.id}`}>
                                {task.title}
                              </div>
                              <div className="text-sm text-slate-500">
                                {task.subtasks?.length || 0} subtasks
                              </div>
                            </div>
                          </div>
                        ))}
                        {categorizedTasks.noDeadline.length === 0 && (
                          <p className="text-xs text-slate-400 italic pl-2">No tasks without deadlines</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Completed Tasks */}
                  <div>
                    <button
                      className="flex items-center space-x-2 w-full text-left p-2 hover:bg-slate-50 rounded-lg transition-colors"
                      onClick={() => setCollapsedSections(prev => ({ ...prev, completed: !prev.completed }))}
                      data-testid="button-toggle-completed"
                    >
                      {collapsedSections.completed ? (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                      <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wide">
                        Completed
                      </h3>
                    </button>
                    {!collapsedSections.completed && (
                      <div className="ml-6 space-y-2 mt-2">
                        {categorizedTasks.completed.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
                            onClick={() => {
                              onFocusTask(task);
                              onEditTask(task);
                            }}
                            data-testid={`task-item-${task.id}`}
                          >
                            <div className={cn("w-3 h-3 rounded-full", getTaskStatusColor(task))} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-800 truncate" data-testid={`task-title-${task.id}`}>
                                {task.title}
                              </div>
                              <div className="text-sm text-slate-500 flex items-center space-x-2">
                                <span>{task.subtasks?.length || 0} subtasks</span>
                                {task.deadline && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {new Date(task.deadline).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {categorizedTasks.completed.length === 0 && (
                          <p className="text-xs text-slate-400 italic pl-2">No completed tasks</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>

      </div>
    </>
  );
}
