import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateMealSuggestions, generateGroceryList, handleMealPlanningQuery } from "./openai";
import { 
  insertUserSchema, 
  insertHouseholdMemberSchema, 
  insertKitchenEquipmentSchema,
  insertCookingPreferencesSchema,
  insertMealPlanSchema,
  insertChatMessageSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // ----- User Routes -----
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json({ id: user.id, username: user.username });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ----- Household Member Routes -----
  app.get("/api/users/:userId/household-members", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const members = await storage.getHouseholdMembers(userId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch household members" });
    }
  });

  app.post("/api/household-members", async (req: Request, res: Response) => {
    try {
      const memberData = insertHouseholdMemberSchema.parse(req.body);
      const member = await storage.createHouseholdMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid member data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create household member" });
    }
  });

  app.put("/api/household-members/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const memberData = insertHouseholdMemberSchema.partial().parse(req.body);
      const member = await storage.updateHouseholdMember(id, memberData);
      
      if (!member) {
        return res.status(404).json({ message: "Household member not found" });
      }
      
      res.json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid member data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update household member" });
    }
  });

  app.delete("/api/household-members/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteHouseholdMember(id);
      
      if (!success) {
        return res.status(404).json({ message: "Household member not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete household member" });
    }
  });

  // ----- Kitchen Equipment Routes -----
  app.get("/api/users/:userId/kitchen-equipment", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const equipment = await storage.getKitchenEquipment(userId);
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch kitchen equipment" });
    }
  });

  app.post("/api/kitchen-equipment", async (req: Request, res: Response) => {
    try {
      const equipmentData = insertKitchenEquipmentSchema.parse(req.body);
      const equipment = await storage.createKitchenEquipment(equipmentData);
      res.status(201).json(equipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid equipment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create kitchen equipment" });
    }
  });

  app.put("/api/kitchen-equipment/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const equipmentData = insertKitchenEquipmentSchema.partial().parse(req.body);
      const equipment = await storage.updateKitchenEquipment(id, equipmentData);
      
      if (!equipment) {
        return res.status(404).json({ message: "Kitchen equipment not found" });
      }
      
      res.json(equipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid equipment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update kitchen equipment" });
    }
  });

  app.delete("/api/kitchen-equipment/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteKitchenEquipment(id);
      
      if (!success) {
        return res.status(404).json({ message: "Kitchen equipment not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete kitchen equipment" });
    }
  });

  // ----- Cooking Preferences Routes -----
  app.get("/api/users/:userId/cooking-preferences", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const preferences = await storage.getCookingPreferences(userId);
      
      if (!preferences) {
        return res.status(404).json({ message: "Cooking preferences not found" });
      }
      
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cooking preferences" });
    }
  });

  app.post("/api/cooking-preferences", async (req: Request, res: Response) => {
    try {
      const preferencesData = insertCookingPreferencesSchema.parse(req.body);
      const preferences = await storage.createCookingPreferences(preferencesData);
      res.status(201).json(preferences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid preferences data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create cooking preferences" });
    }
  });

  app.put("/api/cooking-preferences/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const preferencesData = insertCookingPreferencesSchema.partial().parse(req.body);
      const preferences = await storage.updateCookingPreferences(id, preferencesData);
      
      if (!preferences) {
        return res.status(404).json({ message: "Cooking preferences not found" });
      }
      
      res.json(preferences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid preferences data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update cooking preferences" });
    }
  });

  // ----- Meal Routes -----
  app.get("/api/users/:userId/meals", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const meals = await storage.getMeals(userId);
      res.json(meals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });

  app.get("/api/meals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const meal = await storage.getMeal(id);
      
      if (!meal) {
        return res.status(404).json({ message: "Meal not found" });
      }
      
      res.json(meal);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meal" });
    }
  });

  // ----- Meal Plan Routes -----
  app.get("/api/users/:userId/meal-plans", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const mealPlans = await storage.getMealPlans(userId);
      res.json(mealPlans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  app.get("/api/users/:userId/meal-plans/current", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const currentPlan = await storage.getCurrentMealPlan(userId);
      
      if (!currentPlan) {
        return res.status(404).json({ message: "No current meal plan found" });
      }
      
      res.json(currentPlan);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current meal plan" });
    }
  });

  app.post("/api/meal-plans", async (req: Request, res: Response) => {
    try {
      const mealPlanData = insertMealPlanSchema.parse(req.body);
      const mealPlan = await storage.createMealPlan(mealPlanData);
      res.status(201).json(mealPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid meal plan data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create meal plan" });
    }
  });

  app.put("/api/meal-plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const mealPlanData = insertMealPlanSchema.partial().parse(req.body);
      const mealPlan = await storage.updateMealPlan(id, mealPlanData);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      res.json(mealPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid meal plan data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update meal plan" });
    }
  });

  // ----- Grocery Item Routes -----
  app.get("/api/meal-plans/:mealPlanId/grocery-items", async (req: Request, res: Response) => {
    try {
      const mealPlanId = parseInt(req.params.mealPlanId);
      const groceryItems = await storage.getGroceryItems(mealPlanId);
      res.json(groceryItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch grocery items" });
    }
  });

  app.put("/api/grocery-items/:id/toggle", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.toggleGroceryItem(id);
      
      if (!item) {
        return res.status(404).json({ message: "Grocery item not found" });
      }
      
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle grocery item" });
    }
  });

  // ----- Chat Message Routes -----
  app.get("/api/users/:userId/chat-messages", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const mealPlanId = req.query.mealPlanId ? parseInt(req.query.mealPlanId as string) : undefined;
      const messages = await storage.getChatMessages(userId, mealPlanId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat-messages", async (req: Request, res: Response) => {
    try {
      const messageData = insertChatMessageSchema.parse(req.body);
      const message = await storage.createChatMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create chat message" });
    }
  });

  // ----- AI Generation Routes -----
  app.post("/api/generate-meals", async (req: Request, res: Response) => {
    try {
      const { 
        numberOfMeals, 
        specialRequests, 
        dietaryRestrictions, 
        cookingEquipment,
        confidenceLevel,
        cookingTime,
        preferredCuisines
      } = req.body;
      
      const meals = await generateMealSuggestions(
        numberOfMeals,
        specialRequests,
        dietaryRestrictions,
        cookingEquipment,
        confidenceLevel,
        cookingTime,
        preferredCuisines
      );
      
      res.json({ meals });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate meal suggestions" });
    }
  });

  app.post("/api/generate-grocery-list", async (req: Request, res: Response) => {
    try {
      const { meals } = req.body;
      const groceryList = await generateGroceryList(meals);
      res.json({ groceryItems: groceryList });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate grocery list" });
    }
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { query, chatHistory, currentMeals } = req.body;
      const response = await handleMealPlanningQuery(query, chatHistory, currentMeals);
      res.json({ response });
    } catch (error) {
      res.status(500).json({ message: "Failed to process chat query" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
