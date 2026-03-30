import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, unique, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  phone: true,
  password: true,
  name: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).pick({
  phone: true,
  code: true,
  type: true,
  expiresAt: true,
});

export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;

// Imam Volunteer Sign-Up table
export const imamSignups = pgTable("imam_signups", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  salah: varchar("salah", { length: 20 }).notNull(), // Fajr, Dhuhr, Asr, Maghrib, Isha
  volunteerName: text("volunteer_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueDateSalah: unique().on(table.date, table.salah),
}));

export const insertImamSignupSchema = createInsertSchema(imamSignups).pick({
  date: true,
  salah: true,
  volunteerName: true,
});

export type InsertImamSignup = z.infer<typeof insertImamSignupSchema>;
export type ImamSignup = typeof imamSignups.$inferSelect;

// Valid salah names
export const SALAH_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type SalahName = typeof SALAH_NAMES[number];

// Event RSVP table
export const eventRsvps = pgTable("event_rsvps", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  eventDate: varchar("event_date", { length: 20 }).notNull(), // e.g., "2026-02-21"
  eventName: varchar("event_name", { length: 100 }).notNull(), // e.g., "Community Iftaar"
  attendeeName: text("attendee_name").notNull(),
  guestCount: integer("guest_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventRsvpSchema = createInsertSchema(eventRsvps).pick({
  eventDate: true,
  eventName: true,
  attendeeName: true,
  guestCount: true,
});

export type InsertEventRsvp = z.infer<typeof insertEventRsvpSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;

// Push notification tokens table
export const pushTokens = pgTable("push_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  token: text("token").notNull().unique(),
  platform: varchar("platform", { length: 20 }).notNull(), // ios, android, web
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPushTokenSchema = createInsertSchema(pushTokens).pick({
  userId: true,
  token: true,
  platform: true,
});

export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type PushToken = typeof pushTokens.$inferSelect;

// Notification preferences table
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  pushToken: text("push_token").notNull().unique(),
  prayerReminders: boolean("prayer_reminders").default(true).notNull(),
  eventReminders: boolean("event_reminders").default(true).notNull(),
  communityAnnouncements: boolean("community_announcements").default(true).notNull(),
  ramadanReminders: boolean("ramadan_reminders").default(true).notNull(),
  donationCampaigns: boolean("donation_campaigns").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).pick({
  pushToken: true,
  prayerReminders: true,
  eventReminders: true,
  communityAnnouncements: true,
  ramadanReminders: true,
  donationCampaigns: true,
});

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

// Ramadan Timetable table
export const ramadanTimetable = pgTable("ramadan_timetable", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  day: integer("day").notNull().unique(),
  date: varchar("date", { length: 20 }).notNull(),
  dayName: varchar("day_name", { length: 20 }).notNull(),
  fajrIqama: varchar("fajr_iqama", { length: 50 }).notNull(),
  ishaIqama: varchar("isha_iqama", { length: 50 }).notNull(),
  isSaturday: boolean("is_saturday").default(false).notNull(),
  isDaylightChange: boolean("is_daylight_change").default(false).notNull(),
});

export type RamadanTimetableDay = typeof ramadanTimetable.$inferSelect;

// Events table
export const events = pgTable("events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  time: varchar("time", { length: 50 }).notNull(),
  location: varchar("location", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  signupEnabled: boolean("signup_enabled").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  recurrence: varchar("recurrence", { length: 20 }).default("none").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEventSchema = createInsertSchema(events).pick({
  title: true,
  description: true,
  date: true,
  time: true,
  location: true,
  category: true,
  signupEnabled: true,
  isActive: true,
  sortOrder: true,
  recurrence: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const EVENT_CATEGORIES = [
  "Islamic Studies",
  "Health & Wellness",
  "Social Event",
  "Charity Event",
  "Youth Program",
  "Sisters Program",
  "Community",
] as const;

// Community Iftaar dates table
export const communityIftaarDates = pgTable("community_iftaar_dates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  date: varchar("date", { length: 10 }).notNull().unique(),
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CommunityIftaarDate = typeof communityIftaarDates.$inferSelect;

// Notification types for the app
export const NOTIFICATION_TYPES = [
  "prayer_reminders",
  "event_reminders", 
  "community_announcements",
  "ramadan_reminders",
  "donation_campaigns",
] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];
