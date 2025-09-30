import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertTaskConnectionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Task routes
  app.get("/api/tasks", async (_req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const taskData = insertTaskSchema.partial().parse(req.body);
      
      // Handle completedAt timestamp based on status changes
      if (taskData.status !== undefined) {
        const currentTask = await storage.getTask(req.params.id);
        if (!currentTask) {
          return res.status(404).json({ message: "Task not found" });
        }
        
        // Set completedAt to current timestamp when status changes to "completed"
        if (taskData.status === "completed" && currentTask.status !== "completed") {
          (taskData as any).completedAt = new Date();
        }
        // Set completedAt to null when status changes from "completed" to any other status
        else if (taskData.status !== "completed" && currentTask.status === "completed") {
          (taskData as any).completedAt = null;
        }
      }
      
      const task = await storage.updateTask(req.params.id, taskData);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.get("/api/tasks/:id/deletion-info", async (req, res) => {
    try {
      const info = await storage.getTaskDeletionCount(req.params.id);
      res.json(info);
    } catch (error) {
      res.status(500).json({ message: "Failed to get deletion info" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });


  // Task connection routes
  app.get("/api/task-connections", async (_req, res) => {
    try {
      const connections = await storage.getTaskConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task connections" });
    }
  });

  app.post("/api/task-connections", async (req, res) => {
    try {
      const connectionData = insertTaskConnectionSchema.parse(req.body);
      const connection = await storage.createTaskConnection(connectionData);
      res.status(201).json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid connection data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task connection" });
    }
  });

  app.delete("/api/task-connections/:id", async (req, res) => {
    try {
      await storage.deleteTaskConnection(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task connection" });
    }
  });

  // Stats route
  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getTaskStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
