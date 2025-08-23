import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TaskCanvas from "@/components/TaskCanvas";
import TaskModal from "@/components/TaskModal";
import MobileControls from "@/components/MobileControls";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TaskWithRelations } from "@shared/schema";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [parentTask, setParentTask] = useState<TaskWithRelations | undefined>(undefined);
  const isMobile = useIsMobile();

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
    </div>
  );
}
