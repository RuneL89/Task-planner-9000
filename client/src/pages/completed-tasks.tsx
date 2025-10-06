import { useState } from "react";
import { Link } from "wouter";
import { useTasks } from "@/hooks/use-tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Clock, ArrowLeft } from "lucide-react";
import { format, parseISO, subDays, isAfter, startOfDay, isBefore } from "date-fns";
import type { TaskWithRelations } from "@shared/schema";

type FilterPeriod = "all" | "1week" | "2weeks" | "3weeks" | "4weeks";
type CompletionStatus = "early" | "on_time" | "late" | null;

export default function CompletedTasks() {
  const { data: allTasks = [], isLoading } = useTasks();
  const [selectedFilter, setSelectedFilter] = useState<FilterPeriod>("all");

  const getCompletionStatus = (task: TaskWithRelations): CompletionStatus => {
    if (!task.deadline || !task.completedAt) return null;
    
    const deadlineDate = startOfDay(parseISO(task.deadline));
    const completedDate = startOfDay(new Date(task.completedAt));
    
    if (isBefore(completedDate, deadlineDate)) {
      return "early";
    } else if (completedDate.getTime() === deadlineDate.getTime()) {
      return "on_time";
    } else {
      return "late";
    }
  };

  const allCompletedTasks = allTasks
    .filter((task) => task.status === "completed" && task.completedAt)
    .sort((a, b) => {
      if (!a.completedAt || !b.completedAt) return 0;
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    });

  const getFilteredTasks = () => {
    if (selectedFilter === "all") {
      return allCompletedTasks;
    }

    const now = new Date();
    let daysToSubtract = 0;
    
    switch (selectedFilter) {
      case "1week":
        daysToSubtract = 7;
        break;
      case "2weeks":
        daysToSubtract = 14;
        break;
      case "3weeks":
        daysToSubtract = 21;
        break;
      case "4weeks":
        daysToSubtract = 28;
        break;
    }

    const cutoffDate = startOfDay(subDays(now, daysToSubtract));

    return allCompletedTasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return isAfter(completedDate, cutoffDate);
    });
  };

  const completedTasks = getFilteredTasks();

  // Helper function to find the root main task for a given task
  const findRootMainTask = (task: TaskWithRelations, allTasks: TaskWithRelations[]): TaskWithRelations | null => {
    // Walk up parentTaskId chain until we find a task with isMainTask=true
    let current = task;
    while (current.parentTaskId) {
      const parent = allTasks.find(t => t.id === current.parentTaskId);
      if (!parent) break;
      if (parent.isMainTask) return parent;
      current = parent;
    }
    // If current task itself is main task, return it
    return current.isMainTask ? current : null;
  };

  const groupedTasks = () => {
    const mainTasksMap = new Map<string, {
      mainTask: TaskWithRelations;
      completedSubtasks: TaskWithRelations[];
    }>();

    completedTasks.forEach((task) => {
      // Find the root main task for this completed task
      const rootMainTask = findRootMainTask(task, allTasks);
      
      if (rootMainTask) {
        // Initialize the map entry if it doesn't exist
        if (!mainTasksMap.has(rootMainTask.id)) {
          mainTasksMap.set(rootMainTask.id, {
            mainTask: rootMainTask,
            completedSubtasks: []
          });
        }
        
        // Add the task as a subtask only if it's not the root main task itself
        if (task.id !== rootMainTask.id) {
          mainTasksMap.get(rootMainTask.id)!.completedSubtasks.push(task);
        }
      }
    });

    return Array.from(mainTasksMap.values());
  };

  const taskGroups = groupedTasks();

  const formatCompletedDate = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "MMMM d, yyyy 'at' h:mm a");
  };

  const formatDeadline = (deadline: string): string => {
    return format(parseISO(deadline), "MMMM d, yyyy");
  };

  const getCompletionBadge = (status: CompletionStatus) => {
    if (!status) return null;
    
    switch (status) {
      case "early":
        return (
          <Badge className="shrink-0 bg-green-100 text-green-700 hover:bg-green-200">
            Completed Early
          </Badge>
        );
      case "on_time":
        return (
          <Badge variant="secondary" className="shrink-0">
            On Time
          </Badge>
        );
      case "late":
        return (
          <Badge variant="destructive" className="shrink-0">
            Completed Late
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8" data-testid="completed-tasks-loading">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" data-testid="page-completed-tasks">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            asChild
            variant="outline"
            className="mb-4"
            data-testid="button-back-to-home"
          >
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tasks
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2" data-testid="heading-completed-tasks">
            <CheckCircle className="w-8 h-8 text-green-600" />
            Completed Tasks ({completedTasks.length})
          </h1>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedFilter === "all" ? "default" : "outline"}
              onClick={() => setSelectedFilter("all")}
              data-testid="button-filter-all"
              className="min-h-[40px]"
            >
              All
            </Button>
            <Button
              variant={selectedFilter === "1week" ? "default" : "outline"}
              onClick={() => setSelectedFilter("1week")}
              data-testid="button-filter-1week"
              className="min-h-[40px]"
            >
              1 Week
            </Button>
            <Button
              variant={selectedFilter === "2weeks" ? "default" : "outline"}
              onClick={() => setSelectedFilter("2weeks")}
              data-testid="button-filter-2weeks"
              className="min-h-[40px]"
            >
              2 Weeks
            </Button>
            <Button
              variant={selectedFilter === "3weeks" ? "default" : "outline"}
              onClick={() => setSelectedFilter("3weeks")}
              data-testid="button-filter-3weeks"
              className="min-h-[40px]"
            >
              3 Weeks
            </Button>
            <Button
              variant={selectedFilter === "4weeks" ? "default" : "outline"}
              onClick={() => setSelectedFilter("4weeks")}
              data-testid="button-filter-4weeks"
              className="min-h-[40px]"
            >
              4 Weeks
            </Button>
          </div>
        </div>

        {taskGroups.length === 0 ? (
          <Card className="p-12" data-testid="empty-state-no-completed-tasks">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {selectedFilter === "all" ? "No Completed Tasks" : "No Tasks Found"}
              </h3>
              <p className="text-slate-600">
                {selectedFilter === "all"
                  ? "Tasks you complete will appear here with their completion details."
                  : `No tasks were completed in the selected time period. Try selecting a different filter.`}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {taskGroups.map(({ mainTask, completedSubtasks }) => (
              <Card 
                key={mainTask.id} 
                className="hover:shadow-md transition-shadow border-2"
                data-testid={`card-main-task-${mainTask.id}`}
              >
                <CardHeader className="pb-3 bg-slate-50">
                  <CardTitle className="text-xl flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span data-testid={`text-main-task-title-${mainTask.id}`}>
                          {mainTask.title}
                        </span>
                        <Badge variant="outline" className="text-xs" data-testid={`badge-main-task-indicator-${mainTask.id}`}>
                          Main Task
                        </Badge>
                      </div>
                      {completedSubtasks.length > 0 && (
                        <span className="text-sm font-normal text-slate-600" data-testid={`text-subtask-count-${mainTask.id}`}>
                          {completedSubtasks.length} completed subtask{completedSubtasks.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {mainTask.status === "completed" && mainTask.completedAt && (
                      <div data-testid={`badge-main-task-status-${mainTask.id}`}>
                        {getCompletionBadge(getCompletionStatus(mainTask))}
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {mainTask.status === "completed" && mainTask.completedAt && (
                    <div className="space-y-3 pb-4 border-b">
                      {mainTask.description && (
                        <p className="text-slate-600 text-sm" data-testid={`text-main-task-description-${mainTask.id}`}>
                          {mainTask.description}
                        </p>
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm">
                        <div className="flex items-center gap-2 text-green-700" data-testid={`text-main-task-completed-date-${mainTask.id}`}>
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">Completed:</span>
                          <span>{formatCompletedDate(mainTask.completedAt)}</span>
                        </div>
                        
                        {mainTask.deadline && (
                          <div className="flex items-center gap-2 text-slate-600" data-testid={`text-main-task-deadline-${mainTask.id}`}>
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Deadline:</span>
                            <span>{formatDeadline(mainTask.deadline)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {completedSubtasks.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-900 text-sm" data-testid={`heading-subtasks-${mainTask.id}`}>
                        Completed Subtasks
                      </h4>
                      <div className="space-y-2">
                        {completedSubtasks.map((subtask) => (
                          <div
                            key={subtask.id}
                            className="border rounded-lg p-3 bg-white hover:bg-slate-50 transition-colors"
                            data-testid={`card-subtask-${subtask.id}`}
                          >
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <span className="font-medium text-slate-900 flex-1" data-testid={`text-subtask-title-${subtask.id}`}>
                                {subtask.title}
                              </span>
                              <div data-testid={`badge-subtask-status-${subtask.id}`}>
                                {getCompletionBadge(getCompletionStatus(subtask))}
                              </div>
                            </div>
                            
                            {subtask.description && (
                              <p className="text-slate-600 text-sm mb-2" data-testid={`text-subtask-description-${subtask.id}`}>
                                {subtask.description}
                              </p>
                            )}

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs">
                              <div className="flex items-center gap-2 text-green-700" data-testid={`text-subtask-completed-date-${subtask.id}`}>
                                <Clock className="w-3 h-3" />
                                <span className="font-medium">Completed:</span>
                                <span>{subtask.completedAt && formatCompletedDate(subtask.completedAt)}</span>
                              </div>
                              
                              {subtask.deadline && (
                                <div className="flex items-center gap-2 text-slate-600" data-testid={`text-subtask-deadline-${subtask.id}`}>
                                  <Calendar className="w-3 h-3" />
                                  <span className="font-medium">Deadline:</span>
                                  <span>{formatDeadline(subtask.deadline)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
