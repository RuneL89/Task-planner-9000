import { useState } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Clock } from "lucide-react";
import { format, parseISO, subDays, isAfter, startOfDay } from "date-fns";
import type { TaskWithRelations } from "@shared/schema";

type FilterPeriod = "all" | "1week" | "2weeks" | "3weeks" | "4weeks";

export default function CompletedTasks() {
  const { data: allTasks = [], isLoading } = useTasks();
  const [selectedFilter, setSelectedFilter] = useState<FilterPeriod>("all");

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

  const isCompletedLate = (task: TaskWithRelations): boolean => {
    if (!task.deadline || !task.completedAt) return false;
    const deadline = parseISO(task.deadline);
    const completedDate = new Date(task.completedAt);
    return completedDate.getTime() >= deadline.getTime();
  };

  const formatCompletedDate = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "MMMM d, yyyy 'at' h:mm a");
  };

  const formatDeadline = (deadline: string): string => {
    return format(parseISO(deadline), "MMMM d, yyyy");
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

        {completedTasks.length === 0 ? (
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
          <div className="space-y-4">
            {completedTasks.map((task) => (
              <Card 
                key={task.id} 
                className="hover:shadow-md transition-shadow"
                data-testid={`card-completed-task-${task.id}`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-start justify-between gap-4">
                    <span className="flex-1" data-testid={`text-task-title-${task.id}`}>
                      {task.title}
                    </span>
                    <Badge
                      variant={isCompletedLate(task) ? "destructive" : "secondary"}
                      className="shrink-0"
                      data-testid={`badge-completion-status-${task.id}`}
                    >
                      {isCompletedLate(task) ? "Completed Late" : "On Time"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {task.description && (
                    <p className="text-slate-600 text-sm" data-testid={`text-description-${task.id}`}>
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm">
                    <div className="flex items-center gap-2 text-green-700" data-testid={`text-completed-date-${task.id}`}>
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Completed:</span>
                      <span>{task.completedAt && formatCompletedDate(task.completedAt)}</span>
                    </div>
                    
                    {task.deadline && (
                      <div className="flex items-center gap-2 text-slate-600" data-testid={`text-deadline-${task.id}`}>
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Deadline:</span>
                        <span>{formatDeadline(task.deadline)}</span>
                      </div>
                    )}
                  </div>

                  {task.isMainTask && (
                    <Badge variant="outline" className="w-fit" data-testid={`badge-main-task-${task.id}`}>
                      Main Task
                    </Badge>
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
