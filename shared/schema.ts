import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Household members schema
export const householdMembers = pgTable("household_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  dietaryRestrictions: text("dietary_restrictions"),
  isMainUser: boolean("is_main_user").default(false),
});

export const insertHouseholdMemberSchema = createInsertSchema(householdMembers).pick({
  userId: true,
  name: true,
  dietaryRestrictions: true,
  isMainUser: true,
});

// Kitchen equipment schema
export const kitchenEquipment = pgTable("kitchen_equipment", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  isOwned: boolean("is_owned").default(true),
});

export const insertKitchenEquipmentSchema = createInsertSchema(kitchenEquipment).pick({
  userId: true,
  name: true,
  isOwned: true,
});

// Cooking preferences schema
export const cookingPreferences = pgTable("cooking_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  confidenceLevel: integer("confidence_level").default(3),
  weekdayCookingTime: text("weekday_cooking_time").default("30-45 minutes"),
  weekendCookingStyle: text("weekend_cooking_style").default("More time for special meals"),
  preferredCuisines: text("preferred_cuisines").array(),
  location: text("location"),
});

export const insertCookingPreferencesSchema = createInsertSchema(cookingPreferences).pick({
  userId: true,
  confidenceLevel: true,
  weekdayCookingTime: true,
  weekendCookingStyle: true,
  preferredCuisines: true,
  location: true,
});

// Meals schema
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  prepTime: text("prep_time"),
  tags: text("tags").array(),
  rationales: text("rationales").array(),
  ingredients: text("ingredients").array(),
});

export const insertMealSchema = createInsertSchema(meals).pick({
  userId: true,
  name: true,
  description: true,
  imageUrl: true,
  prepTime: true,
  tags: true,
  rationales: true,
  ingredients: true,
});

// Meal plans schema
export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date").notNull(),
  numberOfMeals: integer("number_of_meals").default(5),
  mealIds: integer("meal_ids").array(),
  specialNotes: text("special_notes"),
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).pick({
  userId: true,
  weekStartDate: true,
  weekEndDate: true,
  numberOfMeals: true,
  mealIds: true,
  specialNotes: true,
});

// Grocery items schema
export const groceryItems = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  mealPlanId: integer("meal_plan_id").notNull().references(() => mealPlans.id),
  name: text("name").notNull(),
  department: text("department").notNull(),
  isChecked: boolean("is_checked").default(false),
  relatedMealId: integer("related_meal_id").references(() => meals.id),
});

export const insertGroceryItemSchema = createInsertSchema(groceryItems).pick({
  mealPlanId: true,
  name: true,
  department: true,
  isChecked: true,
  relatedMealId: true,
});

// Chat messages schema
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  content: true,
  role: true,
  timestamp: true,
  mealPlanId: true,
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type HouseholdMember = typeof householdMembers.$inferSelect;
export type InsertHouseholdMember = z.infer<typeof insertHouseholdMemberSchema>;

export type KitchenEquipment = typeof kitchenEquipment.$inferSelect;
export type InsertKitchenEquipment = z.infer<typeof insertKitchenEquipmentSchema>;

export type CookingPreference = typeof cookingPreferences.$inferSelect;
export type InsertCookingPreference = z.infer<typeof insertCookingPreferencesSchema>;

export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;

export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;

export type GroceryItem = typeof groceryItems.$inferSelect;
export type InsertGroceryItem = z.infer<typeof insertGroceryItemSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
