import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Household schema
export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  householdId: text("household_id").notNull().unique(), // User's unique identifier
  name: text("name").notNull(),
  members: jsonb("members").notNull().$type<{ id: string; name: string; age: string; dietaryRestrictions?: string[] }[]>(),
  cookingSkill: integer("cooking_skill").notNull(),
  preferences: text("preferences"),
  challenges: text("challenges"),
  location: text("location"),
  appliances: jsonb("appliances").notNull().$type<string[]>(),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
});

export const insertHouseholdSchema = createInsertSchema(households);
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type Household = typeof households.$inferSelect;

// Message schema
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  householdId: text("household_id").references(() => households.householdId).notNull(),
});

export const insertMessageSchema = createInsertSchema(messages);
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// MealPlan schema
export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  householdId: text("household_id").references(() => households.householdId).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  meals: jsonb("meals").notNull().$type<{
    id: string;
    name: string;
    description?: string;
    categories: string[];
    prepTime?: number;
    servings?: number;
    imageUrl?: string;
    ingredients?: string[];
  }[]>(),
});

export const insertMealPlanSchema = createInsertSchema(mealPlans);
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

// GroceryList schema
export const groceryLists = pgTable("grocery_lists", {
  id: serial("id").primaryKey(),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id).notNull(),
  householdId: integer("household_id").references(() => households.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sections: jsonb("sections").notNull().$type<{
    name: string;
    items: {
      id: string;
      name: string;
      quantity?: string;
      mealId?: string;
    }[];
  }[]>(),
});

export const insertGroceryListSchema = createInsertSchema(groceryLists);
export type InsertGroceryList = z.infer<typeof insertGroceryListSchema>;
export type GroceryList = typeof groceryLists.$inferSelect;
