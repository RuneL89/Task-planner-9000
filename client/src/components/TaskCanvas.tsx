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
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import TaskNode, { TaskNodeData } from "./TaskNode";
import { useTasks, useTaskConnections, useCreateTaskConnection, useUpdateTask, useToggleTaskCollapse } from "@/hooks/use-tasks";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TaskWithRelations, InsertTaskConnection } from "@shared/schema";

const nodeTypes = {
  taskNode: TaskNode,
} as const;

interface TaskCanvasProps {
  onCreateTask: () => void;
  onEditTask: (task: TaskWithRelations) => void;
  onCreateSubtask: (parentTask: TaskWithRelations) => void;
  onFocusTaskReady?: (focusFunction: (taskId: string) => void) => void;
}

const TaskCanvasContent = ({ onCreateTask, onEditTask, onCreateSubtask, onFocusTaskReady }: TaskCanvasProps) => {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: connections = [] } = useTaskConnections();
  const createConnection = useCreateTaskConnection();
  const updateTask = useUpdateTask();
  const toggleCollapse = useToggleTaskCollapse();
  const isMobile = useIsMobile();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  // Helper function to check if a task should be hidden (is collapsed subtask)
  const isTaskHidden = useCallback((task: TaskWithRelations): boolean => {
    // Main tasks are NEVER hidden (they should always be visible)
    if (task.isMainTask) return false;
    
    // For non-main tasks, walk up the parent chain to check if any ancestor is collapsed
    let currentTask = task;
    while (currentTask.parentTaskId) {
      const parent = tasks.find(t => t.id === currentTask.parentTaskId);
      if (!parent) break;
      
      // If we find ANY collapsed ancestor (not just main tasks), hide this task
      if (parent.isCollapsed) {
        return true;
      }
      
      currentTask = parent;
    }
    
    return false;
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
          // Position subtasks directly below their parent task
          const parentTask = tasks.find(t => t.id === task.parentTaskId);
          if (parentTask) {
            x = parentTask.positionX || 400;
            y = (parentTask.positionY || 300) + 150; // 150px below parent
          } else {
            // Fallback if parent not found
            const angle = (index * 60) * (Math.PI / 180);
            const radius = 200;
            x = 400 + radius * Math.cos(angle);
            y = 300 + radius * Math.sin(angle);
          }
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
          onCreateSubtask,
        },
      };
    });
  }, [tasks, onEditTask, isTaskHidden, toggleCollapse, onCreateSubtask]);

  // Convert connections to edges
  const initialEdges: Edge[] = useMemo(() => {
    // Get visible task IDs for validation  
    const visibleTasks = tasks.filter(task => !isTaskHidden(task));
    const visibleTaskIds = new Set(visibleTasks.map(t => t.id));
    
    // Filter manual connections to only include edges between visible nodes
    const manualConnections = connections
      .filter((connection) => 
        visibleTaskIds.has(connection.sourceTaskId) && 
        visibleTaskIds.has(connection.targetTaskId)
      )
      .map((connection) => ({
        id: connection.id,
        source: connection.sourceTaskId,
        target: connection.targetTaskId,
        sourceHandle: "right-source",
        targetHandle: "left-target",
        type: "smoothstep",
        style: { stroke: "#64748b", strokeWidth: 2 },
        animated: true,
      }));
    
    // Add automatic parent-child edges with smart handle selection
    const parentChildEdges = tasks
      .filter(task => task.parentTaskId)
      .filter(task => {
        // Only create edges for visible nodes (not hidden by collapse)
        const parentTask = tasks.find(t => t.id === task.parentTaskId);
        // Ensure both parent and child are in the visible nodes list
        return !isTaskHidden(task) && parentTask && !isTaskHidden(parentTask) &&
               visibleTaskIds.has(task.id) && task.parentTaskId && visibleTaskIds.has(task.parentTaskId);
      })
      .map((task) => {
        // Find the parent task to get its position
        const parentTask = tasks.find(t => t.id === task.parentTaskId);
        
        // Default handles (bottom to top)
        let sourceHandle = "bottom-source";
        let targetHandle = "top-target";
        
        if (parentTask) {
          const parentX = parentTask.positionX || 0;
          const parentY = parentTask.positionY || 0;
          const childX = task.positionX || 0;
          const childY = task.positionY || 0;
          
          // Calculate differences
          const deltaX = childX - parentX;
          const deltaY = childY - parentY;
          
          // Threshold for horizontal routing (if horizontal distance is large enough)
          const horizontalThreshold = 100;
          
          // Determine handle based on relative position
          // Prioritize vertical routing if vertical distance is significant
          if (Math.abs(deltaY) > Math.abs(deltaX)) {
            // Vertical routing
            if (deltaY > 0) {
              // Child is below parent
              sourceHandle = "bottom-source";
              targetHandle = "top-target";
            } else {
              // Child is above parent
              sourceHandle = "top-source";
              targetHandle = "bottom-target";
            }
          } else if (Math.abs(deltaX) > horizontalThreshold) {
            // Horizontal routing (only if horizontal distance exceeds threshold)
            if (deltaX > 0) {
              // Child is to the right
              sourceHandle = "right-source";
              targetHandle = "left-target";
            } else {
              // Child is to the left
              sourceHandle = "left-source";
              targetHandle = "right-target";
            }
          }
          // If distances are roughly equal and below threshold, use default (bottom to top)
        }
        
        return {
          id: `parent-${task.parentTaskId}-${task.id}`,
          source: task.parentTaskId!,
          target: task.id,
          sourceHandle,
          targetHandle,
          type: "smoothstep",
          style: { stroke: "#3b82f6", strokeWidth: 3 },
          animated: false,
          className: "parent-child-edge",
        };
      });

    return [...manualConnections, ...parentChildEdges];
  }, [connections, tasks, isTaskHidden]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when initialNodes change (but prevent infinite loops)
  const initialNodesRef = useRef(initialNodes);
  useEffect(() => {
    // Only update if the actual array content changed (not just reference)
    if (JSON.stringify(initialNodesRef.current) !== JSON.stringify(initialNodes)) {
      initialNodesRef.current = initialNodes;
      setNodes(initialNodes);
    }
  }, [initialNodes, setNodes]);

  // Update edges when initialEdges change  
  const initialEdgesRef = useRef(initialEdges);
  useEffect(() => {
    if (JSON.stringify(initialEdgesRef.current) !== JSON.stringify(initialEdges)) {
      initialEdgesRef.current = initialEdges;
      setEdges(initialEdges);
    }
  }, [initialEdges, setEdges]);

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
      }
    },
    [tasks, updateTask]
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

  // Focus task function - zooms to a task and expands its main task hierarchy
  const focusTask = useCallback(
    async (taskId: string) => {
      // Find the clicked task
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Get the stored coordinates from the task data
      const positionX = task.positionX || 0;
      const positionY = task.positionY || 0;

      // Immediately zoom to the stored coordinates with smooth animation
      reactFlowInstance.setCenter(positionX, positionY, { zoom: 1.0, duration: 800 });

      // Walk up to find all ancestors from target to root main task
      const ancestorsToExpand: string[] = [];
      let currentId = taskId;
      while (currentId) {
        const currentTask = tasks.find(t => t.id === currentId);
        if (!currentTask) break;
        
        if (currentTask.parentTaskId) {
          ancestorsToExpand.push(currentTask.parentTaskId);
          currentId = currentTask.parentTaskId;
        } else {
          break;
        }
      }

      // Find the root main task (the last ancestor in the chain)
      const rootMainTaskId = ancestorsToExpand.length > 0 ? ancestorsToExpand[ancestorsToExpand.length - 1] : taskId;

      // Collect all mutation promises
      const mutationPromises: Promise<any>[] = [];

      // Collapse all main tasks except the root main task
      const mainTasks = tasks.filter((t) => t.isMainTask);
      mainTasks.forEach((mainTask) => {
        if (mainTask.id !== rootMainTaskId && mainTask.isCollapsed !== true) {
          mutationPromises.push(
            toggleCollapse.mutateAsync({ id: mainTask.id, isCollapsed: true })
          );
        }
      });

      // Expand ALL ancestors in the chain (not just the root main task)
      ancestorsToExpand.forEach((ancestorId) => {
        const ancestor = tasks.find(t => t.id === ancestorId);
        if (ancestor && ancestor.isCollapsed) {
          mutationPromises.push(
            toggleCollapse.mutateAsync({ id: ancestorId, isCollapsed: false })
          );
        }
      });

      // Also expand the clicked task itself if it's collapsed (e.g., clicking a collapsed main task)
      if (task.isCollapsed) {
        mutationPromises.push(
          toggleCollapse.mutateAsync({ id: taskId, isCollapsed: false })
        );
      }

      // Wait for all mutations to complete (happens in parallel with zoom animation)
      await Promise.all(mutationPromises);
    },
    [tasks, toggleCollapse, reactFlowInstance]
  );

  // Provide the focus function to the parent component
  useEffect(() => {
    if (onFocusTaskReady) {
      onFocusTaskReady(focusTask);
    }
  }, [onFocusTaskReady, focusTask]);

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
        panOnDrag={true}
        panOnScroll={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        minZoom={0.2}
        maxZoom={3}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
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
