import { useState, useEffect } from "react";
import { motion, PanInfo } from "framer-motion";
import { Calendar } from "lucide-react";
import { TaskWithRelations } from "@shared/schema";
import { format } from "date-fns";

interface SwipeCardProps {
  task: TaskWithRelations;
  allTasks: TaskWithRelations[];
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export function SwipeCard({ task, allTasks, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const [deltaX, setDeltaX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const buildBreadcrumbPath = (currentTask: TaskWithRelations): string[] => {
    const path: string[] = [];
    let currentId: string | null | undefined = currentTask.id;
    
    while (currentId) {
      const taskInPath = allTasks.find(t => t.id === currentId);
      if (!taskInPath) break;
      
      path.unshift(taskInPath.title);
      currentId = taskInPath.parentTaskId;
    }
    
    return path;
  };

  const breadcrumbPath = buildBreadcrumbPath(task);

  useEffect(() => {
    setDeltaX(0);
  }, [task.id]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDeltaX(info.offset.x);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    if (info.offset.x > 100) {
      onSwipeRight();
    } else if (info.offset.x < -100) {
      onSwipeLeft();
    } else {
      setDeltaX(0);
    }
  };

  const rotation = deltaX * 0.05;
  const showSchedule = deltaX > 50;
  const showSkip = deltaX < -50;

  const getBackgroundColor = () => {
    if (showSchedule) return "rgba(34, 197, 94, 0.1)";
    if (showSkip) return "rgba(156, 163, 175, 0.1)";
    return "white";
  };

  const getBorderColor = () => {
    if (showSchedule) return "rgb(34, 197, 94)";
    if (showSkip) return "rgb(156, 163, 175)";
    return "rgb(229, 231, 235)";
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] relative">
      {/* Left indicator - Skip */}
      <div
        className="absolute left-8 text-gray-400 font-bold text-xl transition-opacity"
        style={{ opacity: showSkip ? 1 : 0 }}
      >
        Skip
      </div>

      {/* Right indicator - Schedule */}
      <div
        className="absolute right-8 text-green-500 font-bold text-xl transition-opacity"
        style={{ opacity: showSchedule ? 1 : 0 }}
      >
        Schedule
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={1}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{
          x: deltaX,
          rotate: rotation,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className="w-full max-w-md rounded-lg shadow-lg p-6 select-none"
        style={{
          backgroundColor: getBackgroundColor(),
          borderWidth: "2px",
          borderStyle: "solid",
          borderColor: getBorderColor(),
          cursor: isDragging ? "grabbing" : "grab",
        }}
        data-testid="swipe-card"
      >
        {/* Breadcrumb path */}
        <div className="text-sm mb-2 flex flex-wrap items-center gap-1" data-testid="breadcrumb-path">
          {breadcrumbPath.map((segment, index) => {
            const isCurrentTask = index === breadcrumbPath.length - 1;
            return (
              <span key={index} className="flex items-center gap-1">
                <span 
                  className={`truncate max-w-[120px] ${
                    isCurrentTask
                      ? 'font-bold text-gray-900' 
                      : 'text-gray-500'
                  }`}
                  title={segment}
                  data-testid={isCurrentTask ? 'breadcrumb-current' : `breadcrumb-parent-${index}`}
                >
                  {segment}
                </span>
                {index < breadcrumbPath.length - 1 && (
                  <span className="text-gray-400 flex-shrink-0"> &gt; </span>
                )}
              </span>
            );
          })}
        </div>

        {/* Task title */}
        <h2 className="text-2xl font-bold mb-3 text-gray-900" data-testid="task-title">
          {task.title}
        </h2>

        {/* Description */}
        {task.description && (
          <p className="text-gray-600 mb-4 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Deadline */}
        {task.deadline && (
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">
              {format(new Date(task.deadline), "MMM d, yyyy")}
            </span>
          </div>
        )}

        {/* Swipe hint */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Swipe left to skip • Swipe right to schedule
        </div>
      </motion.div>
    </div>
  );
}
