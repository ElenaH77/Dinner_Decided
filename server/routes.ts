import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateChatResponse, generateMealPlan, generateGroceryList } from "./openai";
import { z } from "zod";
import { insertHouseholdSchema, insertMealPlanSchema, insertGroceryListSchema } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

export async function registerRoutes(app: Express): Promise<Server> {
  // Chat routes
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const messageSchema = z.array(z.object({
        id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
        timestamp: z.string()
      }));
      
      const messages = messageSchema.parse(req.body.messages);
      
      // Get response from OpenAI
      const aiResponse = await generateChatResponse(messages);
      
      // Save the message to storage
      if (aiResponse) {
        const newMessage = {
          id: uuidv4(),
          role: "assistant",
          content: aiResponse,
          timestamp: new Date().toISOString()
        };
        
        await storage.saveMessage(newMessage);
        res.json(newMessage);
      } else {
        res.status(500).json({ message: "Failed to generate response" });
      }
    } catch (error) {
      console.error("Error in /api/chat:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Household routes
  app.get("/api/household", async (req, res) => {
    try {
      const household = await storage.getHousehold();
      res.json(household);
    } catch (error) {
      res.status(500).json({ message: "Failed to get household" });
    }
  });

  app.post("/api/household", async (req, res) => {
    try {
      console.log('[HOUSEHOLD] Creating household with data:', JSON.stringify(req.body, null, 2));
      const data = insertHouseholdSchema.parse(req.body);
      const household = await storage.createHousehold(data);
      console.log('[HOUSEHOLD] Created household:', JSON.stringify(household, null, 2));
      res.json(household);
    } catch (error) {
      console.error('[HOUSEHOLD] Error creating household:', error);
      res.status(500).json({ message: "Failed to create household" });
    }
  });

  app.patch("/api/household", async (req, res) => {
    try {
      const household = await storage.updateHousehold(req.body);
      res.json(household);
    } catch (error) {
      res.status(500).json({ message: "Failed to update household" });
    }
  });

  // Meal plan routes
  app.get("/api/meal-plan/current", async (req, res) => {
    try {
      const mealPlan = await storage.getCurrentMealPlan();
      res.json(mealPlan);
    } catch (error) {
      res.status(500).json({ message: "Failed to get current meal plan" });
    }
  });

  app.post("/api/meal-plan/generate", async (req, res) => {
    try {
      console.log('[MEAL PLAN] Generating meal plan with preferences:', JSON.stringify(req.body.preferences || {}, null, 2));
      const household = await storage.getHousehold();
      
      if (!household) {
        console.log('[MEAL PLAN] No household found to generate meal plan');
        return res.status(404).json({ message: "Household not found" });
      }
      
      console.log('[MEAL PLAN] Using household:', JSON.stringify(household, null, 2));
      
      // Get meal plan from OpenAI
      const generatedMeals = await generateMealPlan(household, req.body.preferences || {});
      
      if (!generatedMeals || !generatedMeals.length) {
        console.log('[MEAL PLAN] No meals generated from OpenAI');
        return res.status(500).json({ message: "Failed to generate meal plan" });
      }
      
      console.log('[MEAL PLAN] Generated meals:', JSON.stringify(generatedMeals, null, 2));
      
      // Create meal plan in storage
      const mealPlan = await storage.createMealPlan({
        name: "Weekly Meal Plan",
        householdId: household.id,
        createdAt: new Date().toISOString(),
        isActive: true,
        meals: generatedMeals,
      });
      
      // Generate grocery list from meal plan
      await generateAndSaveGroceryList(mealPlan.id, household.id);
      
      res.json(mealPlan);
    } catch (error) {
      console.error("[MEAL PLAN] Error generating meal plan:", error);
      res.status(500).json({ message: "Failed to generate meal plan" });
    }
  });

  app.post("/api/meal-plan/replace-meal/:mealId", async (req, res) => {
    try {
      const { mealId } = req.params;
      const currentPlan = await storage.getCurrentMealPlan();
      const household = await storage.getHousehold();
      
      if (!currentPlan) {
        return res.status(404).json({ message: "No active meal plan found" });
      }
      
      // Find the meal to replace
      const mealIndex = currentPlan.meals.findIndex(meal => meal.id === mealId);
      
      if (mealIndex === -1) {
        return res.status(404).json({ message: "Meal not found in current plan" });
      }
      
      // Get meal categories to maintain consistency
      const mealToReplace = currentPlan.meals[mealIndex];
      
      // Generate a replacement meal with OpenAI
      const replacementMeals = await generateMealPlan(household, { 
        replaceMeal: true, 
        categories: mealToReplace.categories,
        mealName: mealToReplace.name 
      });
      
      if (!replacementMeals || !replacementMeals.length) {
        return res.status(500).json({ message: "Failed to generate replacement meal" });
      }
      
      // Update the meal plan
      const updatedMeals = [...currentPlan.meals];
      updatedMeals[mealIndex] = replacementMeals[0];
      
      const updatedPlan = await storage.updateMealPlan(currentPlan.id, { 
        ...currentPlan, 
        meals: updatedMeals 
      });
      
      // Update grocery list
      await generateAndSaveGroceryList(currentPlan.id, household.id);
      
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error replacing meal:", error);
      res.status(500).json({ message: "Failed to replace meal" });
    }
  });

  // Grocery list routes
  app.get("/api/grocery-list/current", async (req, res) => {
    try {
      const groceryList = await storage.getCurrentGroceryList();
      res.json(groceryList);
    } catch (error) {
      res.status(500).json({ message: "Failed to get current grocery list" });
    }
  });

  app.post("/api/grocery-list/generate", async (req, res) => {
    try {
      const { mealPlanId } = req.body;
      const mealPlan = await storage.getMealPlan(mealPlanId);
      const household = await storage.getHousehold();
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      // Generate grocery list
      const groceryList = await generateAndSaveGroceryList(mealPlanId, household.id);
      
      res.json(groceryList);
    } catch (error) {
      console.error("Error generating grocery list:", error);
      res.status(500).json({ message: "Failed to generate grocery list" });
    }
  });

  app.post("/api/grocery-list/regenerate", async (req, res) => {
    try {
      const currentPlan = await storage.getCurrentMealPlan();
      const household = await storage.getHousehold();
      
      if (!currentPlan) {
        return res.status(404).json({ message: "No active meal plan found" });
      }
      
      // Generate fresh grocery list
      const groceryList = await generateAndSaveGroceryList(currentPlan.id, household.id);
      
      res.json(groceryList);
    } catch (error) {
      console.error("Error regenerating grocery list:", error);
      res.status(500).json({ message: "Failed to regenerate grocery list" });
    }
  });

  app.post("/api/grocery-list/add-meal", async (req, res) => {
    try {
      const { mealId } = req.body;
      const currentPlan = await storage.getCurrentMealPlan();
      const currentList = await storage.getCurrentGroceryList();
      
      if (!currentPlan || !currentList) {
        return res.status(404).json({ message: "No active meal plan or grocery list found" });
      }
      
      // Find the meal
      const meal = currentPlan.meals.find(m => m.id === mealId);
      
      if (!meal) {
        return res.status(404).json({ message: "Meal not found in current plan" });
      }
      
      // Get current grocery list and ensure the meal's ingredients are included
      // This is a simple implementation - in real application, it would need to update
      // based on specific ingredients
      const groceryList = await storage.ensureMealInGroceryList(currentList.id, meal);
      
      res.json(groceryList);
    } catch (error) {
      console.error("Error adding meal to grocery list:", error);
      res.status(500).json({ message: "Failed to add meal to grocery list" });
    }
  });

  // Helper function to generate and save grocery list
  async function generateAndSaveGroceryList(mealPlanId: number, householdId: number) {
    const mealPlan = await storage.getMealPlan(mealPlanId);
    
    if (!mealPlan) {
      throw new Error("Meal plan not found");
    }
    
    // Generate grocery list with OpenAI
    const generatedList = await generateGroceryList(mealPlan);
    
    // Get existing list or create new one
    let groceryList = await storage.getGroceryListByMealPlanId(mealPlanId);
    
    if (groceryList) {
      // Update existing list
      groceryList = await storage.updateGroceryList(groceryList.id, {
        ...groceryList,
        sections: generatedList
      });
    } else {
      // Create new grocery list
      groceryList = await storage.createGroceryList({
        mealPlanId,
        householdId,
        createdAt: new Date().toISOString(),
        sections: generatedList
      });
    }
    
    return groceryList;
  }

  const httpServer = createServer(app);
  return httpServer;
}
