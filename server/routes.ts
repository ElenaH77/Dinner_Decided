import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateChatResponse, generateMealPlan, generateGroceryList, modifyMeal, replaceMeal } from "./openai";
import { z } from "zod";
import { insertHouseholdSchema, insertMealPlanSchema, insertGroceryListSchema } from "@shared/schema";
import settingsRouter from "./api/settings";
import { v4 as uuidv4 } from "uuid";
import { getWeatherContextForMealPlanning } from "./weather";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register API sub-routes
  app.use('/api/settings', settingsRouter);
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
      
      // Get household ID for message association
      const household = await storage.getHousehold();
      if (!household) {
        return res.status(404).json({ message: "No household found" });
      }
      
      // Save the user's message first
      const userMessage = messages.find(m => m.role === "user");
      if (userMessage) {
        const messageToSave = {
          ...userMessage,
          householdId: household.id,
          timestamp: new Date(userMessage.timestamp)
        };
        await storage.saveMessage(messageToSave);
      }
      
      // Get response from OpenAI
      const aiResponse = await generateChatResponse(messages);
      
      // Save the AI response message
      if (aiResponse) {
        const newMessage = {
          id: uuidv4(),
          role: "assistant",
          content: aiResponse,
          timestamp: new Date(),
          householdId: household.id
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
  
  // Household member routes
  app.post("/api/household-members", async (req, res) => {
    try {
      console.log('[HOUSEHOLD] Adding new member:', JSON.stringify(req.body, null, 2));
      
      const household = await storage.getHousehold();
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      
      // Add the new member to the household
      const newMember = req.body;
      
      // Ensure member has an ID
      if (!newMember.id) {
        newMember.id = Date.now();
      }
      
      const members = Array.isArray(household.members) ? [...household.members] : [];
      console.log('[HOUSEHOLD] Current members:', JSON.stringify(members, null, 2));
      
      members.push(newMember);
      console.log('[HOUSEHOLD] Updated members array:', JSON.stringify(members, null, 2));
      
      // Update the household with the new member
      const updatedHousehold = await storage.updateHousehold({
        ...household,
        members
      });
      
      console.log('[HOUSEHOLD] Updated household:', JSON.stringify(updatedHousehold, null, 2));
      
      res.json(newMember);
    } catch (error) {
      console.error('[HOUSEHOLD] Error adding member:', error);
      res.status(500).json({ message: "Failed to add household member" });
    }
  });
  
  app.put("/api/household-members/:id", async (req, res) => {
    try {
      // Support both numeric and string IDs
      const rawMemberId = req.params.id;
      const household = await storage.getHousehold();
      
      if (!household || !household.members) {
        return res.status(404).json({ message: "Household or members not found" });
      }
      
      // Find the member to update, comparing as string to handle all ID formats
      const memberIndex = household.members.findIndex(
        member => String(member.id) === String(rawMemberId)
      );
      
      if (memberIndex === -1) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      // Update the member
      const updatedMember = req.body;
      const updatedMembers = [...household.members];
      updatedMembers[memberIndex] = updatedMember;
      
      // Update the household with the updated member
      const updatedHousehold = await storage.updateHousehold({
        ...household,
        members: updatedMembers
      });
      
      res.json(updatedMember);
    } catch (error) {
      console.error('[HOUSEHOLD] Error updating member:', error);
      res.status(500).json({ message: "Failed to update household member" });
    }
  });
  
  app.delete("/api/household-members/:id", async (req, res) => {
    try {
      // Support both numeric and string IDs
      const rawMemberId = req.params.id;
      const household = await storage.getHousehold();
      
      if (!household || !household.members) {
        return res.status(404).json({ message: "Household or members not found" });
      }
      
      // Filter out the member to be removed, comparing as string to handle all ID formats
      const updatedMembers = household.members.filter(
        member => String(member.id) !== String(rawMemberId)
      );
      
      // Update the household without this member
      const updatedHousehold = await storage.updateHousehold({
        ...household,
        members: updatedMembers
      });
      
      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error('[HOUSEHOLD] Error removing member:', error);
      res.status(500).json({ message: "Failed to remove household member" });
    }
  });

  // User meals endpoints
  app.get("/api/users/:userId/meals", async (req, res) => {
    try {
      // Get all meals from storage
      const allMeals = await storage.getAllMeals();
      console.log(`[MEALS] Get all meals: found ${allMeals.length} meals`);
      
      // Return all meals for the user
      // The client will filter these based on the meal plan
      res.json(allMeals);
    } catch (error) {
      console.error('[MEALS] Error getting user meals:', error);
      res.status(500).json({ message: "Failed to get user meals" });
    }
  });

  // User meal plans endpoint
  app.get("/api/users/:userId/meal-plans/current", async (req, res) => {
    try {
      // Get the current meal plan
      const mealPlan = await storage.getCurrentMealPlan();
      console.log(`[MEAL PLAN] Get current meal plan for user ${req.params.userId}`);
      
      res.json(mealPlan);
    } catch (error) {
      console.error('[MEAL PLAN] Error getting current meal plan:', error);
      res.status(500).json({ message: "Failed to get current meal plan" });
    }
  });

  // Meal plan routes
  app.get("/api/meal-plan/current", async (req, res) => {
    try {
      let mealPlan = await storage.getCurrentMealPlan();
      
      // If no meal plan exists, return 404
      if (!mealPlan) {
        return res.status(404).json({ message: "No active meal plan found" });
      }
      
      // Ensure the plan has a meals array even if it's empty
      if (!mealPlan.meals) {
        mealPlan.meals = [];
      }
      
      // Ensure each meal has an ID to prevent reference issues
      if (Array.isArray(mealPlan.meals)) {
        mealPlan.meals = mealPlan.meals.map(meal => {
          if (!meal.id) {
            meal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            console.log(`[API] Added missing ID to meal in response: ${meal.id}`);
          }
          return meal;
        });
      }
      
      res.json(mealPlan);
    } catch (error) {
      console.error("Error fetching current meal plan:", error);
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
      
      // Extract the detailed preferences
      const { specialNotes, mealsByDay, mealCategories, numberOfMeals } = req.body.preferences || {};
      
      // Enhance the preferences with additional context
      const enhancedPreferences = {
        specialNotes: specialNotes || "",
        mealsByDay: mealsByDay || {},
        mealCategories: mealCategories || {},
        numberOfMeals: numberOfMeals || 5,
        weekStartDate: req.body.weekStartDate,
        weekEndDate: req.body.weekEndDate,
        // Add meal category details for the AI to understand the types
        categoryDefinitions: {
          quick: "Quick & Easy (15 minutes or less - rotisserie chicken magic, simple assembly meals)",
          weeknight: "Weeknight Meals (About 30 minutes, kid-friendly, standard dinner fare)",
          batch: "Batch Cooking (Larger meals meant to create leftovers for multiple meals)",
          split: "Split Prep (Meals that allow you to do prep the night before or morning of)"
        }
      };
      
      // Get meal plan from OpenAI
      const generatedMeals = await generateMealPlan(household, enhancedPreferences);
      
      if (!generatedMeals || !generatedMeals.length) {
        console.log('[MEAL PLAN] No meals generated from OpenAI');
        return res.status(500).json({ message: "Failed to generate meal plan" });
      }
      
      console.log('[MEAL PLAN] Generated meals:', JSON.stringify(generatedMeals, null, 2));
      
      // Add unique stable IDs to each meal if they don't have them
      const mealsWithIds = generatedMeals.map((meal, index) => {
        if (!meal.id) {
          // Create a stable ID that includes timestamp and index
          meal.id = `meal-${Date.now()}-${index}`;
        }
        return meal;
      });
      
      console.log('[MEAL PLAN] Added stable IDs to meals');
      
      // Create meal plan in storage
      const mealPlan = await storage.createMealPlan({
        name: "Weekly Meal Plan",
        householdId: household.id,
        createdAt: new Date(),
        isActive: true,
        specialNotes: specialNotes || "",
        meals: mealsWithIds,
      });
      
      // Generate grocery list from meal plan
      await generateAndSaveGroceryList(mealPlan.id, household.id);
      
      res.json(mealPlan);
    } catch (error) {
      console.error("[MEAL PLAN] Error generating meal plan:", error);
      
      // Check for specific error messages that should be shown to the user
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        if (error.message.includes('OpenAI API quota exceeded')) {
          // Quota exceeded error
          res.status(500).json({ 
            message: error.message,
            helpText: "You need to upgrade your OpenAI API plan or wait until your quota refreshes."
          });
        } else if (error.message.includes('API rate limit exceeded')) {
          // Rate limit error
          res.status(500).json({ 
            message: error.message,
            helpText: "Please wait a few minutes before trying again."
          });
        } else if (error.message.includes('API authentication error') || error.message.includes('invalid api key')) {
          // Authentication error
          res.status(500).json({ 
            message: "OpenAI API authentication error. Please check your API key.",
            helpText: "You need to provide a valid OpenAI API key in the environment variables."
          });
        } else {
          // Pass the OpenAI-specific error message to the client
          res.status(500).json({ message: error.message });
        }
      } else {
        // Generic error message for other issues
        res.status(500).json({ message: "Failed to generate meal plan" });
      }
    }
  });

  // Remove meal from meal plan
  app.delete("/api/meal-plan/remove-meal/:mealId", async (req, res) => {
    try {
      const { mealId } = req.params;
      console.log('Removing meal with ID:', mealId); 
      
      const currentPlan = await storage.getCurrentMealPlan();
      
      if (!currentPlan) {
        return res.status(404).json({ message: "No active meal plan found" });
      }
      
      console.log('Current plan meals:', currentPlan.meals);
      
      // Ensure all meals have IDs before removal
      const mealsWithIds = currentPlan.meals.map((meal, index) => {
        if (!meal.id) {
          meal.id = `meal-${Date.now()}-${index}`;
        }
        return meal;
      });
      
      // Find the meal to remove
      const mealIndex = mealsWithIds.findIndex(meal => meal.id === mealId);
      
      if (mealIndex === -1) {
        return res.status(404).json({ message: "Meal not found in current plan" });
      }
      
      // Update the meal plan by filtering out the removed meal
      const updatedMeals = mealsWithIds.filter(meal => meal.id !== mealId);
      
      const updatedPlan = await storage.updateMealPlan(currentPlan.id, { 
        ...currentPlan, 
        meals: updatedMeals 
      });
      
      // Update grocery list
      const household = await storage.getHousehold();
      if (household) {
        await generateAndSaveGroceryList(currentPlan.id, household.id);
      }
      
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error removing meal:", error);
      res.status(500).json({ message: "Failed to remove meal" });
    }
  });

  // Add a single meal to meal plan
  app.post("/api/meal-plan/add-meal", async (req, res) => {
    try {
      const { mealType, preferences } = req.body;
      const currentPlan = await storage.getCurrentMealPlan();
      const household = await storage.getHousehold();
      
      if (!currentPlan) {
        return res.status(404).json({ message: "No active meal plan found" });
      }
      
      // Generate a single meal with OpenAI
      const newMeals = await generateMealPlan(household, { 
        singleMeal: true, 
        mealType,
        additionalPreferences: preferences 
      });
      
      if (!newMeals || !newMeals.length) {
        return res.status(500).json({ message: "Failed to generate new meal" });
      }
      
      // Assign ID to the new meal
      const newMeal = newMeals[0];
      if (!newMeal.id) {
        newMeal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      
      console.log('Generated new meal with ID:', newMeal.id);
      
      // Add the new meal to the plan
      const updatedMeals = [...currentPlan.meals, newMeal];
      
      const updatedPlan = await storage.updateMealPlan(currentPlan.id, { 
        ...currentPlan, 
        meals: updatedMeals 
      });
      
      // Update grocery list
      if (household) {
        await generateAndSaveGroceryList(currentPlan.id, household.id);
      }
      
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error adding meal:", error);
      res.status(500).json({ message: "Failed to add meal" });
    }
  });

  app.post("/api/meal-plan/replace-meal/:mealId", async (req, res) => {
    try {
      const { mealId } = req.params;
      console.log('Replacing meal with ID:', mealId);
      
      const currentPlan = await storage.getCurrentMealPlan();
      const household = await storage.getHousehold();
      
      if (!currentPlan) {
        return res.status(404).json({ message: "No active meal plan found" });
      }
      
      // Ensure all meals have IDs first
      const mealsWithIds = currentPlan.meals.map((meal, index) => {
        if (!meal.id) {
          meal.id = `meal-${Date.now()}-${index}`;
        }
        return meal;
      });
      
      // Find the meal to replace
      const mealIndex = mealsWithIds.findIndex(meal => meal.id === mealId);
      
      if (mealIndex === -1) {
        return res.status(404).json({ message: "Meal not found in current plan" });
      }
      
      // Get meal categories to maintain consistency
      const mealToReplace = mealsWithIds[mealIndex];
      
      // Generate a replacement meal with OpenAI
      const replacementMeals = await generateMealPlan(household, { 
        replaceMeal: true, 
        categories: mealToReplace.categories,
        mealName: mealToReplace.name 
      });
      
      if (!replacementMeals || !replacementMeals.length) {
        return res.status(500).json({ message: "Failed to generate replacement meal" });
      }
      
      // Ensure replacement meal has an ID - keep original ID for continuity
      const replacementMeal = replacementMeals[0];
      replacementMeal.id = mealId;
      
      console.log('Generated replacement meal with ID:', replacementMeal.id);
      
      // Update the meal plan
      const updatedMeals = [...mealsWithIds];
      updatedMeals[mealIndex] = replacementMeal;
      
      const updatedPlan = await storage.updateMealPlan(currentPlan.id, { 
        ...currentPlan, 
        meals: updatedMeals 
      });
      
      // Update grocery list
      if (household) {
        await generateAndSaveGroceryList(currentPlan.id, household.id);
      }
      
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error replacing meal:", error);
      res.status(500).json({ message: "Failed to replace meal" });
    }
  });

  // Cooking preferences routes
  app.post("/api/cooking-preferences", async (req, res) => {
    try {
      const household = await storage.getHousehold();
      
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      
      // Update the household with the new preferences
      const updatedHousehold = await storage.updateHousehold({
        ...household,
        cookingSkill: req.body.confidenceLevel,
        preferences: JSON.stringify({
          weekdayCookingTime: req.body.weekdayCookingTime,
          weekendCookingStyle: req.body.weekendCookingStyle,
          preferredCuisines: req.body.preferredCuisines,
          location: req.body.location
        })
      });
      
      // Return a mock preferences object for now
      res.json({
        id: 1,
        userId: 1,
        confidenceLevel: req.body.confidenceLevel,
        weekdayCookingTime: req.body.weekdayCookingTime,
        weekendCookingStyle: req.body.weekendCookingStyle,
        preferredCuisines: req.body.preferredCuisines,
        location: req.body.location
      });
    } catch (error) {
      console.error("Error saving household profile:", error);
      res.status(500).json({ message: "Failed to save household profile" });
    }
  });
  
  app.put("/api/cooking-preferences/:id", async (req, res) => {
    try {
      const household = await storage.getHousehold();
      
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      
      // Update the household with the new preferences
      const updatedHousehold = await storage.updateHousehold({
        ...household,
        cookingSkill: req.body.confidenceLevel,
        preferences: JSON.stringify({
          weekdayCookingTime: req.body.weekdayCookingTime,
          weekendCookingStyle: req.body.weekendCookingStyle,
          preferredCuisines: req.body.preferredCuisines,
          location: req.body.location
        })
      });
      
      // Return a mock preferences object
      res.json({
        id: parseInt(req.params.id),
        userId: 1,
        confidenceLevel: req.body.confidenceLevel,
        weekdayCookingTime: req.body.weekdayCookingTime,
        weekendCookingStyle: req.body.weekendCookingStyle,
        preferredCuisines: req.body.preferredCuisines,
        location: req.body.location
      });
    } catch (error) {
      console.error("Error updating cooking preferences:", error);
      res.status(500).json({ message: "Failed to update cooking preferences" });
    }
  });

  // Weather routes
  app.get("/api/weather/context", async (req, res) => {
    try {
      const household = await storage.getHousehold();
      
      if (!household || !household.location) {
        return res.status(400).json({ 
          message: "Location not set. Please set your location in the settings.",
          weatherContext: "Weather information not available. Location not set."
        });
      }
      
      const location = household.location;
      console.log(`[WEATHER] Generating weather context for location: ${location}`);
      
      const weatherContext = await getWeatherContextForMealPlanning(location);
      res.json({ 
        location, 
        weatherContext 
      });
    } catch (error) {
      console.error("[WEATHER] Error generating weather context:", error);
      res.status(500).json({ 
        message: "Failed to get weather context", 
        weatherContext: "Weather information is temporarily unavailable."
      });
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
  
  app.get("/api/grocery-list/by-meal-plan/:mealPlanId", async (req, res) => {
    try {
      const mealPlanId = parseInt(req.params.mealPlanId, 10);
      if (isNaN(mealPlanId)) {
        return res.status(400).json({ message: "Invalid meal plan ID" });
      }
      
      const groceryList = await storage.getGroceryListByMealPlanId(mealPlanId);
      if (!groceryList) {
        return res.status(404).json({ message: "Grocery list not found for this meal plan" });
      }
      
      res.json(groceryList);
    } catch (error) {
      console.error("Error getting grocery list by meal plan ID:", error);
      res.status(500).json({ message: "Failed to get grocery list" });
    }
  });

  app.post("/api/grocery-list/generate", async (req, res) => {
    try {
      const { mealPlanId, empty } = req.body;
      const mealPlan = await storage.getMealPlan(mealPlanId);
      const household = await storage.getHousehold();
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      if (empty) {
        // Clear the grocery list
        // Check if a list already exists
        let groceryList = await storage.getGroceryListByMealPlanId(mealPlanId);
        
        if (groceryList) {
          // Update with empty sections
          groceryList = await storage.updateGroceryList(groceryList.id, {
            ...groceryList,
            sections: []
          });
        } else {
          // Create a new empty list
          groceryList = await storage.createGroceryList({
            mealPlanId,
            householdId: household.id,
            createdAt: new Date(),
            sections: []
          });
        }
        
        return res.json(groceryList);
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

  // New endpoint to generate grocery list from current UI meals
  app.post("/api/grocery-list/generate-from-meals", async (req, res) => {
    try {
      const { meals, mealPlanId, empty } = req.body;
      
      if (!meals || !Array.isArray(meals) || meals.length === 0) {
        return res.status(400).json({ message: "Valid meals array is required" });
      }
      
      const household = await storage.getHousehold();
      
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      
      console.log(`[GROCERY] Generating grocery list from ${meals.length} UI-provided meals`);
      console.log(`[GROCERY] Meals: ${meals.map(meal => meal.name).join(', ')}`);
      
      // Get or create the current meal plan
      let currentPlan: any;
      
      if (mealPlanId) {
        currentPlan = await storage.getMealPlan(mealPlanId);
        if (!currentPlan) {
          return res.status(404).json({ message: "Specified meal plan not found" });
        }
      } else {
        currentPlan = await storage.getCurrentMealPlan();
        if (!currentPlan) {
          return res.status(404).json({ message: "No active meal plan found" });
        }
      }
      
      // Update with the UI meals without deep copying which causes Date conversion issues
      const updatedPlan = await storage.updateMealPlan(currentPlan.id, {
        ...currentPlan,
        meals: meals // Use the direct meals array without JSON stringification
      });
      
      console.log(`[GROCERY] Updated meal plan ${updatedPlan.id} with current UI meals`);
      console.log(`[GROCERY] Updated meal plan contains ${updatedPlan.meals.length} meals:`, 
        updatedPlan.meals.map((meal: any) => meal.name).join(', '));
      
      // If empty parameter is true, just return an empty grocery list
      if (empty) {
        // Get existing list or create a new empty one
        let groceryList = await storage.getGroceryListByMealPlanId(updatedPlan.id);
        
        if (groceryList) {
          // Update to empty sections
          groceryList = await storage.updateGroceryList(groceryList.id, {
            ...groceryList,
            sections: []
          });
        } else {
          // Create new empty grocery list
          groceryList = await storage.createGroceryList({
            mealPlanId: updatedPlan.id,
            householdId: household.id,
            createdAt: new Date(),
            sections: []
          });
        }
        
        console.log(`[GROCERY] Created empty grocery list for meal plan ${updatedPlan.id}`);
        return res.json(groceryList);
      }
      
      // Instead of using generateAndSaveGroceryList, directly call OpenAI with the UI meals
      // This ensures we're using exactly the data from the UI
      console.log(`[GROCERY] Directly generating grocery list from UI-provided meals`);
      
      // Create a meal plan with the UI-provided meals for OpenAI
      // Make sure each meal has a unique reference to prevent duplication
      const mealPlanForOpenAI = {
        ...updatedPlan,
        meals: meals.map((meal: any, index: number) => ({
          ...meal,
          // Add a unique index property to ensure each meal is treated as distinct
          uniqueIndex: index
        }))
      };
      
      // Check for potential duplicate meals (this should be rare with UI-provided meals)
      const mealNames = mealPlanForOpenAI.meals.map((m: any) => m.name);
      const uniqueMealNames = [...new Set(mealNames)];
      
      if (uniqueMealNames.length < mealPlanForOpenAI.meals.length) {
        console.warn(`[GROCERY] WARNING: Duplicate meal names detected in UI meals! Using indexed meals to prevent duplicates.`);
        console.warn(`[GROCERY] Unique meal names: ${uniqueMealNames.join(', ')}`);
      }
      
      console.log(`[GROCERY] Generating grocery list with ${mealPlanForOpenAI.meals.length} indexed meals`);
      
      // Directly call OpenAI to generate the list
      const sections = await generateGroceryList(mealPlanForOpenAI);
      
      // Save the generated sections to the grocery list
      let groceryList = await storage.getGroceryListByMealPlanId(updatedPlan.id);
      
      if (groceryList) {
        // Update existing list
        groceryList = await storage.updateGroceryList(groceryList.id, {
          ...groceryList,
          sections: sections
        });
      } else {
        // Create new grocery list - using proper Date object
        groceryList = await storage.createGroceryList({
          mealPlanId: updatedPlan.id,
          householdId: household.id,
          createdAt: new Date(), // Make sure this is a proper Date object
          sections: sections
        });
      }
      
      console.log(`[GROCERY] Successfully generated grocery list with ${sections.length} sections`);
      
      res.json(groceryList);
    } catch (error) {
      console.error("Error generating grocery list from meals:", error);
      res.status(500).json({ message: "Failed to generate grocery list from meals" });
    }
  });

  app.post("/api/grocery-list/add-meal", async (req, res) => {
    try {
      // Allow both approaches: sending mealId or the complete meal object
      const { mealId, meal: mealData } = req.body;
      const currentPlan = await storage.getCurrentMealPlan();
      const currentList = await storage.getCurrentGroceryList();
      
      if (!currentList) {
        return res.status(404).json({ message: "No active grocery list found" });
      }

      let meal;
      
      if (mealData) {
        // Use the provided meal data directly
        meal = mealData;
      } else if (mealId && currentPlan) {
        // Find the meal by ID in the current plan
        meal = currentPlan.meals.find(m => m.id === mealId);
        
        if (!meal) {
          return res.status(404).json({ message: "Meal not found in current plan" });
        }
      } else {
        return res.status(400).json({ message: "Either mealId or meal data is required" });
      }
      
      // Get current grocery list and ensure the meal's ingredients are included
      const groceryList = await storage.ensureMealInGroceryList(currentList.id, meal);
      
      res.json(groceryList);
    } catch (error) {
      console.error("Error adding meal to grocery list:", error);
      res.status(500).json({ message: "Failed to add meal to grocery list" });
    }
  });
  
  // Clear grocery list
  app.post("/api/grocery-list/clear", async (req, res) => {
    try {
      const currentList = await storage.getCurrentGroceryList();
      
      if (!currentList) {
        return res.status(404).json({ message: "No active grocery list found" });
      }
      
      // Update with empty sections
      const updatedList = await storage.updateGroceryList(currentList.id, {
        ...currentList,
        sections: []
      });
      
      res.json(updatedList);
    } catch (error) {
      console.error("Error clearing grocery list:", error);
      res.status(500).json({ message: "Failed to clear grocery list" });
    }
  });
  
  // Update grocery list (for adding items manually)
  app.patch("/api/meal-plan/current", async (req, res) => {
    try {
      const { meals, updatedPlanData } = req.body;
      const currentPlan = await storage.getCurrentMealPlan();
      
      if (!currentPlan) {
        return res.status(404).json({ message: "No active meal plan found" });
      }
      
      // Log the incoming request in detail
      console.log(`[DEBUG] Meal plan update request with ${meals ? meals.length : 0} meals or ${updatedPlanData ? 'updatedPlanData provided' : 'no updatedPlanData'}`);
      console.log(`[DEBUG] Current plan has ${currentPlan.meals ? currentPlan.meals.length : 0} meals`);
      
      // Log a snapshot of the current meals to help troubleshoot
      if (currentPlan.meals && currentPlan.meals.length > 0) {
        console.log('[DEBUG] Current meals before update:', 
                  currentPlan.meals.map((m: any) => ({ id: m.id, name: m.name })));
      }
      
      if (meals && meals.length > 0) {
        console.log('[DEBUG] New meals in request:', 
                  meals.map((m: any) => ({ id: m.id, name: m.name })));
      }
      
      // Build update data - either use explicit meals array or use the updatedPlanData
      const updateData = {
        ...currentPlan,
        ...(updatedPlanData || {}),
        meals: meals || (updatedPlanData?.meals || currentPlan.meals)
      };
      
      // Handle date format issues
      if (updateData.createdAt && typeof updateData.createdAt === 'string') {
        try {
          // Convert string date back to Date object for database
          updateData.createdAt = new Date(updateData.createdAt);
        } catch (err) {
          console.warn('Failed to parse createdAt date:', updateData.createdAt);
          // Use current date as fallback to avoid TypeErrors
          updateData.createdAt = new Date();
        }
      }
      
      // IMPORTANT: Force the meals to have unique IDs and deduplicate meals with same ID
      if (updateData.meals && Array.isArray(updateData.meals)) {
        // Deduplicate by ID
        const uniqueMeals: any[] = [];
        const seenIds = new Set<string>();

        for (const meal of updateData.meals) {
          // If meal already has an ID, check for duplicates
          if (meal.id) {
            if (!seenIds.has(meal.id)) {
              seenIds.add(meal.id);
              uniqueMeals.push({...meal}); // Use a new copy to avoid reference issues
            } else {
              console.log(`[DEBUG] Removing duplicate meal with ID: ${meal.id}, name: ${meal.name}`);
            }
          } else {
            // If no ID, generate one
            meal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            console.log(`[DEBUG] Added missing ID to meal in storage: ${meal.id}`);
            uniqueMeals.push({...meal});
          }
        }
        
        if (updateData.meals.length !== uniqueMeals.length) {
          console.log(`[DEBUG] Removed ${updateData.meals.length - uniqueMeals.length} duplicate meals`);
        }
        
        updateData.meals = uniqueMeals;
      }
      
      // Perform database update with complete update data
      const updatedPlan = await storage.updateMealPlan(currentPlan.id, updateData);
      
      console.log(`[DEBUG] After update, plan has ${updatedPlan.meals ? updatedPlan.meals.length : 0} meals`);
      
      // Update grocery list if needed
      const household = await storage.getHousehold();
      if (household) {
        await generateAndSaveGroceryList(currentPlan.id, household.id);
      }
      
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error updating meal plan:", error);
      res.status(500).json({ message: "Failed to update meal plan" });
    }
  });

  app.patch("/api/grocery-list/current", async (req, res) => {
    try {
      const { sections } = req.body;
      const currentList = await storage.getCurrentGroceryList();
      
      if (!currentList) {
        return res.status(404).json({ message: "No active grocery list found" });
      }
      
      // Update with the provided sections
      const updatedList = await storage.updateGroceryList(currentList.id, {
        ...currentList,
        sections: sections || currentList.sections
      });
      
      res.json(updatedList);
    } catch (error) {
      console.error("Error updating grocery list:", error);
      res.status(500).json({ message: "Failed to update grocery list" });
    }
  });

  // Helper function to generate and save grocery list
  async function generateAndSaveGroceryList(mealPlanId: number, householdId: number) {
    // Get meal plan from storage
    const mealPlan = await storage.getMealPlan(mealPlanId);
    
    if (!mealPlan) {
      throw new Error("Meal plan not found");
    }
    
    // Check for duplicate meals which indicate a reference problem
    const mealNames = mealPlan.meals.map((meal: any) => meal.name);
    const uniqueMealNames = [...new Set(mealNames)];
    
    // Log information about the meal plan
    console.log(`[GROCERY] Generating list for meal plan ID ${mealPlanId}, name: ${mealPlan.name}`);
    console.log(`[GROCERY] Meal plan contains ${mealPlan.meals.length} meals:`, 
      mealPlan.meals.map((meal: any) => meal.name).join(', '));
    
    // Create a safer meal plan to avoid all meals becoming the same
    const fixedMealPlan = {
      ...mealPlan,
      meals: mealPlan.meals.map((meal: any, index: number) => {
        // Make a new copy of each meal to avoid shared references
        return {
          ...meal,
          // Add an index suffix to the ID to ensure uniqueness
          uniqueIndex: index
        };
      })
    };
    
    if (uniqueMealNames.length < mealPlan.meals.length) {
      console.warn(`[GROCERY] WARNING: Duplicate meals detected! Using fixed meal plan to prevent duplicates.`);
    }
    
    // Generate grocery list with OpenAI using our fixed meal plan
    const generatedList = await generateGroceryList(fixedMealPlan);
    
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
        createdAt: new Date(),
        sections: generatedList
      });
    }
    
    return groceryList;
  }
  
  // AI-powered meal modification endpoints
  // GET endpoint for meal modification (redirects to processing endpoint)
  app.get("/api/meal/modify", async (req, res) => {
    console.log("Modification request received with query params:", req.query);
    const mealId = req.query.id as string;
    const modificationRequest = req.query.request as string;
    
    if (!mealId) {
      return res.status(400).json({ error: 'Missing meal ID' });
    }
    
    if (!modificationRequest) {
      return res.status(400).json({ error: 'Missing modification request' });
    }
    
    try {
      // Get the meal from storage
      const allMeals = await storage.getAllMeals();
      const meal = allMeals.find(m => m.id === mealId);
      
      if (!meal) {
        return res.status(404).json({ error: 'Meal not found' });
      }
      
      // Redirect to the processing endpoint
      res.redirect(`/api/meal/modify/process?id=${mealId}&request=${encodeURIComponent(modificationRequest)}`);
    } catch (error) {
      console.error('Error in meal modification GET route:', error);
      res.status(500).json({ error: 'Failed to process meal modification request' });
    }
  });
  
  // Process endpoint that redirects back to UI after modification
  app.get("/api/meal/modify/process", async (req, res) => {
    const mealId = req.query.id as string;
    const modificationRequest = req.query.request as string;
    
    if (!mealId || !modificationRequest) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    try {
      // Get the meal from storage
      const allMeals = await storage.getAllMeals();
      const meal = allMeals.find(m => m.id === mealId);
      
      if (!meal) {
        return res.status(404).json({ error: 'Meal not found' });
      }
      
      // Modify the meal
      const modifiedMeal = await modifyMeal(meal, modificationRequest);
      modifiedMeal.id = meal.id;
      
      // Update the meal in the database
      await storage.updateMeal(mealId, modifiedMeal);
      
      // Redirect back to the meal plan page
      res.redirect('/this-week?updated=true');
    } catch (error) {
      console.error('Error processing meal modification:', error);
      res.redirect('/this-week?error=modification');
    }
  });

  app.post("/api/meal/modify", async (req, res) => {
    try {
      const { meal, modificationRequest, mealPlanId, currentMeals } = req.body;
      
      if (!meal || !modificationRequest) {
        return res.status(400).json({ error: 'Meal data and modification request are required' });
      }
      
      console.log(`[MEAL] Modifying meal: ${meal.name} with request: ${modificationRequest}`);
      
      // Use OpenAI to modify the meal
      const modifiedMeal = await modifyMeal(meal, modificationRequest);
      
      // Update the grocery list if we have a meal plan ID
      if (mealPlanId) {
        try {
          // Get the household ID for the grocery list
          const household = await storage.getHousehold();
          
          if (household) {
            console.log(`[MEAL] Updating meal plan and grocery list after meal modification`);
            
            // Get the current meal plan
            const mealPlan = await storage.getMealPlan(mealPlanId);
            
            if (mealPlan) {
              let updatedMeals;
              
              // If currentMeals is provided by the client, use that as the source of truth
              if (currentMeals && Array.isArray(currentMeals)) {
                console.log(`[MEAL] Using ${currentMeals.length} client-provided meals for update`);
                
                // Replace the meal with the modified version
                updatedMeals = currentMeals.map(m => 
                  m.id === modifiedMeal.id ? modifiedMeal : m
                );
              } else {
                // Otherwise, update the meal in the existing plan
                console.log(`[MEAL] Using existing meal plan meals for update`);
                updatedMeals = Array.isArray(mealPlan.meals) 
                  ? mealPlan.meals.map(m => 
                      m.id === modifiedMeal.id ? modifiedMeal : m
                    )
                  : [modifiedMeal];
              }
              
              // Update the meal plan with the modified meal - don't use deep copy to avoid Date issues
              const updatedPlan = await storage.updateMealPlan(mealPlanId, {
                ...mealPlan,
                meals: updatedMeals
              });
              
              console.log(`[MEAL] Updated meal plan with modified meal`);
              
              // Check if a grocery list already exists for this meal plan
              const existingList = await storage.getGroceryListByMealPlanId(mealPlanId);
              
              if (existingList) {
                // We have an existing list, so regenerate it with the modified meal
                await generateAndSaveGroceryList(mealPlanId, household.id);
                console.log(`[MEAL] Successfully regenerated grocery list for meal plan ${mealPlanId}`);
              }
            }
          }
        } catch (groceryError) {
          // Log but don't fail the whole request if grocery list regeneration fails
          console.error('Error updating meal plan or grocery list after meal modification:', groceryError);
        }
      }
      
      res.status(200).json(modifiedMeal);
    } catch (error) {
      console.error('Error modifying meal:', error);
      
      // Handle specific OpenAI errors
      if (error.message && typeof error.message === 'string') {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('api key') || errorMsg.includes('authentication')) {
          res.status(500).json({ 
            error: 'Authentication error', 
            message: 'OpenAI API authentication error. Please check your API key.' 
          });
        } else {
          res.status(500).json({ error: 'Failed to modify meal', message: error.message });
        }
      } else {
        res.status(500).json({ error: 'Failed to modify meal' });
      }
    }
  });

  // AI-powered meal replacement endpoint
  // GET endpoint for meal replacement (redirects to POST)
  app.get("/api/meal/replace", async (req, res) => {
    console.log("Replacement request received with query params:", req.query);
    const mealId = req.query.id as string;
    if (!mealId) {
      console.error('Missing meal ID in replacement request');
      return res.status(400).json({ error: 'Missing meal ID' });
    }
    
    try {
      // Get the meal from storage
      console.log(`[MEAL REPLACEMENT] Looking for meal with ID: ${mealId}`);
      const allMeals = await storage.getAllMeals();
      console.log(`[MEAL REPLACEMENT] Available meals:`, allMeals.map(m => ({ id: m.id, name: m.name })));
      
      const meal = allMeals.find(m => m.id === mealId);
      
      if (!meal) {
        console.error(`[MEAL REPLACEMENT] Meal not found with ID: ${mealId}`);
        return res.status(404).json({ error: 'Meal not found' });
      }
      
      console.log(`[MEAL REPLACEMENT] Found meal to replace: ${meal.name} (ID: ${meal.id})`);
      
      // Forward to the POST endpoint
      req.body = { mealId };
      
      // Redirect to the meal plan page after replacement is done
      res.redirect(`/api/meal/replace/process?id=${mealId}`);
    } catch (error) {
      console.error('Error in meal replacement GET route:', error);
      res.status(500).json({ error: 'Failed to process meal replacement request' });
    }
  });
  
  // Process endpoint that redirects back to UI after replacement
  app.get("/api/meal/replace/process", async (req, res) => {
    const mealId = req.query.id as string;
    if (!mealId) {
      console.error('[MEAL REPLACEMENT PROCESS] Missing meal ID in process request');
      return res.status(400).json({ error: 'Missing meal ID' });
    }
    
    try {
      // Get the meal from storage
      console.log(`[MEAL REPLACEMENT PROCESS] Looking for meal with ID: ${mealId}`);
      const allMeals = await storage.getAllMeals();
      console.log(`[MEAL REPLACEMENT PROCESS] Found ${allMeals.length} meals in storage`);
      
      const meal = allMeals.find(m => m.id === mealId);
      
      if (!meal) {
        console.error(`[MEAL REPLACEMENT PROCESS] Meal not found with ID: ${mealId}`);
        console.log('Available meal IDs:', allMeals.map(m => m.id));
        return res.status(404).json({ error: 'Meal not found' });
      }
      
      console.log(`[MEAL REPLACEMENT PROCESS] Found meal to replace: ${meal.name} (ID: ${meal.id})`);
      
      // Replace the meal
      console.log(`[MEAL REPLACEMENT PROCESS] Generating replacement for '${meal.name}'`);
      const replacementMeal = await replaceMeal(meal);
      replacementMeal.id = meal.id; // Preserve the original ID
      
      console.log(`[MEAL REPLACEMENT PROCESS] Generated replacement: '${replacementMeal.name}'`);
      
      // Update the meal in the database
      console.log(`[MEAL REPLACEMENT PROCESS] Updating meal in storage`);
      await storage.updateMeal(mealId, replacementMeal);
      
      // Redirect back to the meal plan page
      console.log(`[MEAL REPLACEMENT PROCESS] Successfully replaced meal, redirecting to meal plan page`);
      res.redirect('/this-week?updated=true');
    } catch (error) {
      console.error('[MEAL REPLACEMENT PROCESS] Error processing meal replacement:', error);
      res.redirect('/this-week?error=replacement');
    }
  });
  
  app.post("/api/meal/replace", async (req, res) => {
    try {
      const { meal, mealPlanId, currentMeals } = req.body;
      
      if (!meal) {
        return res.status(400).json({ error: 'Meal data is required' });
      }
      
      console.log(`[MEAL] Replacing meal: ${meal.name || 'unknown'} with ID: ${meal.id || 'unknown'}`);
      
      try {
        // Use OpenAI to generate a replacement meal
        const replacementMeal = await replaceMeal(meal);
        console.log(`[MEAL] Replacement meal generated:`, { id: replacementMeal.id, name: replacementMeal.name });
        
        // Always make sure ID is preserved
        replacementMeal.id = meal.id;
        
        // Always update the meal in storage first
        if (meal.id) {
          await storage.updateMeal(meal.id, replacementMeal);
          console.log(`[MEAL] Updated meal in storage with ID: ${meal.id}`);
        }
        
        // Update the grocery list if we have a meal plan ID
        if (mealPlanId) {
          try {
            // Get the household ID for the grocery list
            const household = await storage.getHousehold();
            
            if (household) {
              console.log(`[MEAL] Updating meal plan and grocery list after meal replacement`);
              
              // Get the current meal plan
              const mealPlan = await storage.getMealPlan(mealPlanId);
              
              if (mealPlan) {
                let updatedMeals;
                
                // If currentMeals is provided by the client, use that as the source of truth
                if (currentMeals && Array.isArray(currentMeals)) {
                  console.log(`[MEAL] Using ${currentMeals.length} client-provided meals for update`);
                  
                  // Replace the meal with the replacement version
                  updatedMeals = currentMeals.map(m => 
                    m.id === replacementMeal.id ? replacementMeal : m
                  );
                } else {
                  // Otherwise, update the meal in the existing plan
                  console.log(`[MEAL] Using existing meal plan meals for update`);
                  updatedMeals = Array.isArray(mealPlan.meals) 
                    ? mealPlan.meals.map(m => 
                        m.id === replacementMeal.id ? replacementMeal : m
                      )
                    : [replacementMeal];
                }
                
                // Update the meal plan with the replaced meal
                const updatedPlan = await storage.updateMealPlan(mealPlanId, {
                  ...mealPlan,
                  meals: updatedMeals,
                  lastUpdated: new Date().toISOString()
                });
                
                console.log(`[MEAL] Updated meal plan with replacement meal`);
                
                // Check if a grocery list already exists for this meal plan
                const existingList = await storage.getGroceryListByMealPlanId(mealPlanId);
                
                if (existingList) {
                  // We have an existing list, so regenerate it with the replaced meal
                  await generateAndSaveGroceryList(mealPlanId, household.id);
                  console.log(`[MEAL] Successfully regenerated grocery list for meal plan ${mealPlanId}`);
                }
              }
            }
          } catch (groceryError) {
            // Log but don't fail the whole request if grocery list regeneration fails
            console.error('Error updating meal plan or grocery list after meal replacement:', groceryError);
          }
        }
        
        res.status(200).json(replacementMeal);
      } catch (replacementError) {
        console.error('Error during meal replacement:', replacementError);
        throw replacementError;
      }
    } catch (error) {
      console.error('Error replacing meal:', error);
      
      // Handle specific OpenAI errors
      if (error.message && typeof error.message === 'string') {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('api key') || errorMsg.includes('authentication')) {
          res.status(500).json({ 
            error: 'Authentication error', 
            message: 'OpenAI API authentication error. Please check your API key.' 
          });
        } else {
          res.status(500).json({ error: 'Failed to replace meal', message: error.message });
        }
      } else {
        res.status(500).json({ error: 'Failed to replace meal' });
      }
    }
  });

  // Update a specific meal in a meal plan
  app.patch('/api/meal-plan/:planId', async (req, res) => {
    try {
      const { planId } = req.params;
      const { updatedMeal, mealId } = req.body;
      
      if (!updatedMeal || !mealId) {
        return res.status(400).json({ message: "Missing required fields: updatedMeal and mealId" });
      }
      
      console.log(`[API] Updating meal ${mealId} in plan ${planId}`);
      
      // Get the current meal plan
      const mealPlan = await storage.getMealPlan(Number(planId));
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      // Make sure there are meals to update
      if (!mealPlan.meals || !Array.isArray(mealPlan.meals)) {
        return res.status(400).json({ message: "Meal plan has no meals to update" });
      }
      
      // Find the meal to update
      const mealIndex = mealPlan.meals.findIndex(meal => meal.id === mealId);
      
      if (mealIndex === -1) {
        return res.status(404).json({ message: "Meal not found in plan" });
      }
      
      // Create a deep clone of the meal plan to avoid mutation issues
      const updatedMeals = JSON.parse(JSON.stringify(mealPlan.meals));
      
      // Ensure ID consistency
      updatedMeal.id = mealId;
      
      // Replace the meal at the found index
      updatedMeals[mealIndex] = updatedMeal;
      
      // Update the meal plan
      const updatedPlan = await storage.updateMealPlan(Number(planId), {
        ...mealPlan,
        meals: updatedMeals
      });
      
      console.log(`[API] Successfully updated meal in plan, now has ${updatedPlan.meals ? updatedPlan.meals.length : 0} meals`);
      
      // Update grocery list if needed
      const household = await storage.getHousehold();
      if (household) {
        await generateAndSaveGroceryList(Number(planId), household.id);
      }
      
      res.json(updatedMeal);
    } catch (error) {
      console.error("Error updating meal in plan:", error);
      res.status(500).json({ message: "Failed to update meal in plan" });
    }
  });
  
  // Debug endpoint to inspect request body
  app.post('/api/debug-request', (req, res) => {
    console.log('[DEBUG] Received request body:', JSON.stringify(req.body, null, 2));
    console.log('[DEBUG] Content-Type:', req.headers['content-type']);
    res.json({ success: true, received: req.body });
  });
  
  // Test routes for error handling - for development only
  app.get("/api/test/errors/:errorType", (req, res) => {
    const { errorType } = req.params;
    
    // Log the request
    console.log(`Test error route hit: ${errorType}`);
    
    // Always send a 500 error status for this test endpoint
    switch(errorType) {
      case 'quota':
        return res.status(500).json({ 
          error: true,
          message: "OpenAI API quota exceeded. Please update your API key or try again later.",
          helpText: "You need to upgrade your OpenAI API plan or wait until your quota refreshes."
        });
      case 'ratelimit':
        return res.status(500).json({ 
          error: true,
          message: "OpenAI API rate limit exceeded. Please try again in a few minutes.",
          helpText: "Please wait a few minutes before trying again."
        });
      case 'auth':
        return res.status(500).json({ 
          error: true,
          message: "OpenAI API authentication error. Please check your API key.",
          helpText: "You need to provide a valid OpenAI API key in the environment variables."
        });
      default:
        return res.status(500).json({ 
          error: true,
          message: "Generic error message"
        });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
