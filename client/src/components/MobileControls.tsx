import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onCreateTask: () => void;
}

export default function MobileControls({
  onZoomIn,
  onZoomOut,
  onFitView,
  onCreateTask,
}: MobileControlsProps) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <>
      {/* Zoom Controls */}
      <div className="fixed bottom-20 left-4 flex flex-col space-y-2 z-30">
        <Button
          variant="outline"
          size="sm"
          className="w-12 h-12 bg-white shadow-lg rounded-full"
          onClick={onZoomIn}
          data-testid="mobile-zoom-in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-12 h-12 bg-white shadow-lg rounded-full"
          onClick={onZoomOut}
          data-testid="mobile-zoom-out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-12 h-12 bg-white shadow-lg rounded-full"
          onClick={onFitView}
          data-testid="mobile-fit-view"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-30"
        onClick={onCreateTask}
        data-testid="mobile-create-task"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </>
  );
}
