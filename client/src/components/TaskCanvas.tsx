import { useCallback, useMemo, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Plus, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import TaskNode, { TaskNodeData } from "./TaskNode";
import { useTasks, useTaskConnections, useCreateTaskConnection, useUpdateTask, useToggleTaskCollapse } from "@/hooks/use-tasks";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TaskWithRelations, InsertTaskConnection } from "@shared/schema";

const nodeTypes = {
  taskNode: TaskNode,
};

interface TaskCanvasProps {
  onCreateTask: () => void;
  onEditTask: (task: TaskWithRelations) => void;
}

const TaskCanvasContent = ({ onCreateTask, onEditTask }: TaskCanvasProps) => {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: connections = [] } = useTaskConnections();
  const createConnection = useCreateTaskConnection();
  const updateTask = useUpdateTask();
  const toggleCollapse = useToggleTaskCollapse();
  const isMobile = useIsMobile();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Helper function to get all collapsed subtasks of a main task
  const getCollapsedSubtasks = useCallback((mainTask: TaskWithRelations): TaskWithRelations[] => {
    if (!mainTask.isCollapsed || !mainTask.subtasks?.length) return [];
    
    const collapsed: TaskWithRelations[] = [];
    const collectSubtasks = (subtasks: TaskWithRelations[]) => {
      subtasks.forEach(subtask => {
        collapsed.push(subtask);
        if (subtask.subtasks?.length) {
          collectSubtasks(subtask.subtasks);
        }
      });
    };
    
    collectSubtasks(mainTask.subtasks);
    return collapsed;
  }, []);

  // Helper function to check if a task should be hidden (is collapsed subtask)
  const isTaskHidden = useCallback((task: TaskWithRelations): boolean => {
    // Find the main task for this task
    const mainTask = tasks.find(t => t.isMainTask && t.isCollapsed && (
      (t as TaskWithRelations).subtasks?.some(st => st.id === task.id) ||
      (t as TaskWithRelations).subtasks?.some(st => (st as TaskWithRelations).subtasks?.some((sst: TaskWithRelations) => sst.id === task.id))
    ));
    
    return !!mainTask;
  }, [tasks]);

  // Convert tasks to nodes
  const initialNodes: Node<TaskNodeData>[] = useMemo(() => {
    // Filter out collapsed subtasks
    const visibleTasks = tasks.filter(task => !isTaskHidden(task));
    
    return visibleTasks.map((task, index) => {
      // Position main tasks in the center, subtasks around them
      let x = task.positionX || 0;
      let y = task.positionY || 0;

      // If no position is set, calculate a default position
      if (x === 0 && y === 0) {
        if (task.isMainTask) {
          x = 400; // Center
          y = 300;
        } else {
          // Position subtasks in a circle around main task
          const angle = (index * 60) * (Math.PI / 180);
          const radius = 200;
          x = 400 + radius * Math.cos(angle);
          y = 300 + radius * Math.sin(angle);
        }
      }

      return {
        id: task.id,
        type: "taskNode",
        position: { x, y },
        data: {
          task,
          onEdit: onEditTask,
          onToggleCollapse: (taskId: string, isCollapsed: boolean) => {
            toggleCollapse.mutate({ id: taskId, isCollapsed });
          },
        },
      };
    });
  }, [tasks, onEditTask, isTaskHidden, toggleCollapse]);

  // Convert connections to edges
  const initialEdges: Edge[] = useMemo(() => {
    const manualConnections = connections.map((connection) => ({
      id: connection.id,
      source: connection.sourceTaskId,
      target: connection.targetTaskId,
      type: "smoothstep",
      style: { stroke: "#64748b", strokeWidth: 2 },
      animated: true,
    }));

    // Add automatic parent-child edges
    const parentChildEdges = tasks
      .filter(task => task.parentTaskId)
      .map((task) => ({
        id: `parent-${task.parentTaskId}-${task.id}`,
        source: task.parentTaskId!,
        target: task.id,
        type: "smoothstep",
        style: { stroke: "#3b82f6", strokeWidth: 3 },
        animated: false,
        className: "parent-child-edge",
      }));

    return [...manualConnections, ...parentChildEdges];
  }, [connections, tasks]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when tasks change
  useEffect(() => {
    if (tasks.length !== nodes.length || tasks.some((task, index) => task.id !== nodes[index]?.id)) {
      setNodes(initialNodes);
    }
  }, [tasks, initialNodes, nodes.length]);

  // Update edges when connections change
  useEffect(() => {
    if (connections.length !== edges.length) {
      setEdges(initialEdges);
    }
  }, [connections, initialEdges, edges.length]);

  // Handle node position changes (auto-save)
  const onNodeDragStop = useCallback(
    (_event: any, node: Node) => {
      const task = tasks.find((t) => t.id === node.id);
      if (task) {
        // Update the dragged task position
        updateTask.mutate({
          id: task.id,
          task: {
            positionX: node.position.x,
            positionY: node.position.y,
          },
        });

        // If this is a main task with collapsed subtasks, move them too
        if (task.isMainTask && task.isCollapsed) {
          const collapsedSubtasks = getCollapsedSubtasks(task);
          collapsedSubtasks.forEach((subtask, index) => {
            // Position collapsed subtasks behind the main task (slightly offset)
            const offsetX = node.position.x - 5 - (index * 2);
            const offsetY = node.position.y + 5 + (index * 2);
            
            updateTask.mutate({
              id: subtask.id,
              task: {
                positionX: offsetX,
                positionY: offsetY,
              },
            });
          });
        }
      }
    },
    [tasks, updateTask, getCollapsedSubtasks]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        const newConnection: InsertTaskConnection = {
          sourceTaskId: connection.source,
          targetTaskId: connection.target,
        };
        createConnection.mutate(newConnection);
      }
      setEdges((eds) => addEdge(connection, eds));
    },
    [createConnection, setEdges]
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative" ref={reactFlowWrapper} data-testid="task-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        panOnDrag={!isMobile}
        panOnScroll={!isMobile}
        zoomOnScroll={!isMobile}
        zoomOnPinch={isMobile}
        zoomOnDoubleClick={false}
        connectOnClick={false}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Meta", "Ctrl"]}
        className="bg-gradient-to-br from-slate-50 to-slate-100"
      >
        <Background variant={"dots" as any} gap={50} size={1} />
        
        {!isMobile && (
          <Controls
            className="bg-white border border-gray-200 rounded-lg shadow-lg"
            showZoom={true}
            showFitView={true}
            showInteractive={false}
          />
        )}
        
        <MiniMap
          nodeColor="#3b82f6"
          className="bg-white border border-gray-200 rounded-lg"
          position="bottom-right"
          pannable
          zoomable
        />

        {/* Mobile Controls */}
        {isMobile && (
          <Panel position="bottom-left" className="flex flex-col space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-12 h-12 rounded-full bg-white shadow-lg"
              data-testid="button-zoom-in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-12 h-12 rounded-full bg-white shadow-lg"
              data-testid="button-zoom-out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-12 h-12 rounded-full bg-white shadow-lg"
              data-testid="button-fit-view"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </Panel>
        )}

        {/* Floating Action Button */}
        <Panel position="bottom-right" className="mb-16 mr-4">
          <Button
            className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={onCreateTask}
            data-testid="button-create-task"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default function TaskCanvas(props: TaskCanvasProps) {
  return (
    <ReactFlowProvider>
      <TaskCanvasContent {...props} />
    </ReactFlowProvider>
  );
}
