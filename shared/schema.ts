import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, on_hold
  priority: text("priority").notNull().default("medium"), // low, medium, high
  deadline: timestamp("deadline"),
  estimatedHours: integer("estimated_hours"),
  timeSpent: integer("time_spent").default(0), // in minutes
  isMainTask: boolean("is_main_task").default(false),
  parentTaskId: varchar("parent_task_id"),
  positionX: real("position_x").default(0),
  positionY: real("position_y").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in minutes
  description: text("description"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const taskConnections = pgTable("task_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceTaskId: varchar("source_task_id").notNull(),
  targetTaskId: varchar("target_task_id").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const tasksRelations = relations(tasks, ({ many, one }) => ({
  subtasks: many(tasks, { relationName: "parent_subtasks" }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: "parent_subtasks",
  }),
  timeEntries: many(timeEntries),
  sourceConnections: many(taskConnections, { relationName: "source_connections" }),
  targetConnections: many(taskConnections, { relationName: "target_connections" }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  task: one(tasks, {
    fields: [timeEntries.taskId],
    references: [tasks.id],
  }),
}));

export const taskConnectionsRelations = relations(taskConnections, ({ one }) => ({
  sourceTask: one(tasks, {
    fields: [taskConnections.sourceTaskId],
    references: [tasks.id],
    relationName: "source_connections",
  }),
  targetTask: one(tasks, {
    fields: [taskConnections.targetTaskId],
    references: [tasks.id],
    relationName: "target_connections",
  }),
}));

// Schemas
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  deadline: z.string().datetime().nullable().optional(),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
});

export const insertTaskConnectionSchema = createInsertSchema(taskConnections).omit({
  id: true,
  createdAt: true,
});

// Types
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TaskConnection = typeof taskConnections.$inferSelect;
export type InsertTaskConnection = z.infer<typeof insertTaskConnectionSchema>;

// Extended types for frontend
export type TaskWithRelations = Task & {
  subtasks?: Task[];
  parentTask?: Task;
  timeEntries?: TimeEntry[];
  sourceConnections?: TaskConnection[];
  targetConnections?: TaskConnection[];
};
