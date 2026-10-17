import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === Reminders ===
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  dueTime: timestamp("due_time"),
  isCompleted: boolean("is_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
});

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;

// === Smart Devices ===
export const smartDevices = pgTable("smart_devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'light', 'thermostat', 'switch'
  status: boolean("status").default(false).notNull(), // true = on, false = off
  value: integer("value"), // for temperature, brightness, etc.
  location: text("location"),
});

export const insertSmartDeviceSchema = createInsertSchema(smartDevices).omit({
  id: true,
});

export type SmartDevice = typeof smartDevices.$inferSelect;
export type InsertSmartDevice = z.infer<typeof insertSmartDeviceSchema>;

// === Chat (Re-exporting/Defining here for consistency) ===
// We can link to the blueprint's models or redefine simple ones here.
// For simplicity and unified schema access, defining them here.
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// === Request/Response Types ===
export type CreateReminderRequest = InsertReminder;
export type UpdateReminderRequest = Partial<InsertReminder>;
export type CreateSmartDeviceRequest = InsertSmartDevice;
export type UpdateSmartDeviceRequest = Partial<InsertSmartDevice>;
