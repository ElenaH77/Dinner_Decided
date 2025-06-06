import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateChatResponse, generateMealPlan, generateGroceryList, modifyMeal, replaceMeal } from "./openai";
import { regenerateRecipeInstructions } from "./recipe-generator";
import { z } from "zod";
import { insertHouseholdSchema, insertMealPlanSchema, insertGroceryListSchema } from "@shared/schema";
import settingsRouter from "./api/settings";
import { v4 as uuidv4 } from "uuid";
import { getWeatherContextForMealPlanning } from "./weather";

// Extract household information from onboarding chat conversation
function extractHouseholdInfoFromChat(messages: any[]) {
  const householdInfo: any = {};
  
  // Get all user messages for analysis
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.trim());
  const assistantMessages = messages.filter(m => m.role === 'assistant').map(m => m.content.trim());
  
  console.log("[EXTRACTION] Analyzing conversation with", userMessages.length, "user messages");
  console.log("[EXTRACTION] User messages:", userMessages);
  
  // The onboarding follows a specific sequence - map responses to questions
  // 1. "Who are we feeding?" -> household size
  // 2. "Any food stuff we should know?" -> dietary preferences  
  // 3. "What's your kitchen like?" -> appliances
  // 4. "How do you feel about cooking?" -> cooking skill
  // 5. "Where do you live?" -> location
  // 6. "What makes dinner hard?" -> challenges
  
  // Map user responses to onboarding questions based on sequence
  // Pattern matching based on your original conversation:
  // "3" -> household size
  // "3" (repeated responses) -> dietary preferences 
  // "3" -> appliances
  // "3" -> cooking skill
  // "3" -> location
  // "mental load!!!" -> challenges
  
  // For your original onboarding, all responses were "3" except the final "mental load!!!"
  // Let's extract by matching against the conversation context
  
  // Extract household size from conversation context or first user response
  const fullConversation = messages.map(m => `${m.role}: ${m.content}`).join(' | ');
  const householdSizeMatch = fullConversation.match(/household of (\w+)|three people|(\d+) people/i);
  if (householdSizeMatch) {
    const number = householdSizeMatch[1] === 'three' ? '3' : (householdSizeMatch[1] || householdSizeMatch[2]);
    householdInfo.members = [`${number} people`];
    console.log("[EXTRACTION] Found household size from conversation:", householdInfo.members);
  } else if (userMessages.length > 0 && /^\d+$/.test(userMessages[0].trim())) {
    // If first user response is just a number, assume it's household size
    householdInfo.members = [`${userMessages[0].trim()} people`];
    console.log("[EXTRACTION] Found household size from first response:", householdInfo.members);
  }
  
  // Extract based on the assistant's question that prompted each user response
  // We need to find the assistant message that comes RIGHT BEFORE each user response
  for (let i = 0; i < userMessages.length; i++) {
    const userResponse = userMessages[i];
    
    // Find the assistant message that prompted this user response by looking at the full conversation
    let assistantPrompt = '';
    
    // Find the user message in the original conversation and get the assistant message before it
    const userMessageIndex = messages.findIndex(m => m.role === 'user' && m.content === userResponse);
    if (userMessageIndex > 0) {
      // Look backwards for the most recent assistant message
      for (let j = userMessageIndex - 1; j >= 0; j--) {
        if (messages[j].role === 'assistant') {
          assistantPrompt = messages[j].content;
          break;
        }
      }
    }
    
    console.log(`[EXTRACTION] User response ${i}: "${userResponse}"`);
    console.log(`[EXTRACTION] Assistant prompt: "${assistantPrompt}"`);
    
    // Match responses to the correct fields based on assistant's question
    if (assistantPrompt.toLowerCase().includes('household') || 
        assistantPrompt.toLowerCase().includes('feeding') ||
        assistantPrompt.toLowerCase().includes('cooking for')) {
      // First question about household size
      if (/^\d+$/.test(userResponse.trim())) {
        householdInfo.members = [`${userResponse.trim()} people`];
        console.log("[EXTRACTION] Found household size:", householdInfo.members);
      }
    }
    else if (assistantPrompt.toLowerCase().includes('food stuff') || 
             assistantPrompt.toLowerCase().includes('dietary') ||
             assistantPrompt.toLowerCase().includes('allergies')) {
      householdInfo.preferences = userResponse;
      console.log("[EXTRACTION] Found dietary preferences:", userResponse);
    }
    else if (assistantPrompt.toLowerCase().includes('kitchen') || 
             assistantPrompt.toLowerCase().includes('appliances')) {
      const appliances = [];
      const lower = userResponse.toLowerCase();
      
      // Handle specific appliances mentioned
      if (lower.includes('slow cooker') || lower.includes('crockpot')) appliances.push('slowCooker');
      if (lower.includes('instant pot') || lower.includes('pressure cooker')) appliances.push('instantPot');
      if (lower.includes('air fryer')) appliances.push('airFryer');
      if (lower.includes('grill')) appliances.push('grill');
      if (lower.includes('oven') || lower.includes('stovetop') || lower.includes('basic')) appliances.push('ovenStovetop');
      if (lower.includes('microwave')) appliances.push('microwave');
      if (lower.includes('blender')) appliances.push('blender');
      
      // Handle descriptive responses like "fully stocked" or "well equipped"
      if (lower.includes('fully stocked') || lower.includes('well equipped') || 
          lower.includes('everything') || lower.includes('all appliances')) {
        appliances.push('ovenStovetop', 'slowCooker', 'instantPot', 'airFryer', 'grill', 'microwave', 'blender');
      }
      
      // Remove duplicates and ensure at least basic appliances
      const uniqueAppliances = [...new Set(appliances)];
      householdInfo.appliances = uniqueAppliances.length > 0 ? uniqueAppliances : ['ovenStovetop'];
      console.log("[EXTRACTION] Found appliances:", householdInfo.appliances);
    }
    else if (assistantPrompt.toLowerCase().includes('cooking') && 
             (assistantPrompt.toLowerCase().includes('feel') || assistantPrompt.toLowerCase().includes('comfortable'))) {
      const lower = userResponse.toLowerCase();
      if (lower.includes('beginner') || lower.includes('basic') || lower.includes('1')) {
        householdInfo.cookingSkill = 1;
      } else if (lower.includes('intermediate') || lower.includes('comfortable') || lower.includes('2')) {
        householdInfo.cookingSkill = 2;
      } else if (lower.includes('advanced') || lower.includes('confident') || lower.includes('3')) {
        householdInfo.cookingSkill = 3;
      } else {
        householdInfo.cookingSkill = 2; // default
      }
      console.log("[EXTRACTION] Found cooking skill:", householdInfo.cookingSkill);
    }
    else if (assistantPrompt.toLowerCase().includes('live') || 
             assistantPrompt.toLowerCase().includes('zip')) {
      // Handle both actual ZIP codes and simple numeric responses
      const zipMatch = userResponse.match(/\b\d{5}\b/);
      if (zipMatch) {
        householdInfo.location = zipMatch[0];
        console.log("[EXTRACTION] Found ZIP code location:", householdInfo.location);
      } else if (/^\d+$/.test(userResponse.trim())) {
        householdInfo.location = userResponse.trim();
        console.log("[EXTRACTION] Found numeric location placeholder:", householdInfo.location);
      }
    }
    else if (assistantPrompt.toLowerCase().includes('dinner hard') || 
             assistantPrompt.toLowerCase().includes('challenges') ||
             assistantPrompt.toLowerCase().includes('pain points')) {
      householdInfo.challenges = userResponse;
      console.log("[EXTRACTION] Found challenges:", userResponse);
    }
  }
  
  console.log("[EXTRACTION] Final extracted info:", householdInfo);
  return householdInfo;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Register API sub-routes
  app.use('/api/settings', settingsRouter);
  
  // General purpose OpenAI generation endpoint
  app.post('/api/openai/generate', async (req, res) => {
    try {
      const { prompt, model, temperature, max_tokens } = req.body;
      
      // Call the OpenAI API via our service
      const result = await generateChatResponse([
        { role: "user", content: prompt }
      ]);
      
      res.json({ success: true, result: result.split('\n').filter(line => line.trim().length > 0) });
    } catch (error) {
      console.error('Error generating content with OpenAI:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate content' 
      });
    }
  });
  
  // Dedicated recipe instruction regeneration endpoint
  app.post('/api/regenerate-recipe-instructions', async (req, res) => {
    try {
      const { title, ingredients } = req.body;
      
      if (!title || !ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid request: title and ingredients array are required' 
        });
      }
      
      console.log(`[RECIPE API] Regenerating instructions for: ${title} with ${ingredients.length} ingredients`);
      
      // Call the OpenAI-powered recipe generator (now returns null if it fails)
      const instructions = await regenerateRecipeInstructions({ 
        title, 
        ingredients 
      });
      
      // Handle case where instructions could not be generated
      if (!instructions) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate valid instructions for this recipe',
          message: 'The AI could not generate appropriate instructions'
        });
      }
      
      return res.json({ 
        success: true,
        instructions 
      });
    } catch (error) {
      console.error('Error regenerating recipe instructions:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to regenerate recipe instructions',
        message: error.message 
      });
    }
  });
  
  // Chat routes
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // POST route for DinnerBot chat messages
  app.post("/api/chat/messages", async (req, res) => {
    console.log("[CHAT MESSAGES DEBUG] POST /api/chat/messages called with body:", JSON.stringify(req.body, null, 2));
    console.log("[RESET DEBUG] Checking for reset in DinnerBot route...");
    try {
      const messageData = req.body;
      
      // Check for reset command FIRST, before any other processing
      if (messageData.role === "user" && messageData.content) {
        const userContent = messageData.content.toLowerCase();
        console.log("[DEBUG] User message content:", JSON.stringify(userContent));
        console.log("[DEBUG] Checking for reset commands...");
        
        // Check for reset commands and handle immediately
        if (userContent.includes('reset my profile') || 
            userContent.includes('start over') || 
            userContent.includes('reset onboarding') ||
            userContent.includes('restart my profile') ||
            userContent.includes('reset profile')) {
          
          console.log("[RESET] User requested profile reset, clearing onboarding data...");
          
          // Get household to reset
          let household = await storage.getHousehold();
          if (household) {
            // Reset the household to onboarding state
            await storage.updateHousehold({
              onboardingComplete: false,
              members: [],
              preferences: "",
              challenges: null,
              location: null,
              appliances: [],
              cookingSkill: 1
            });
            
            // Clear all chat messages
            await storage.clearMessages();
          }
          
          console.log("[RESET] Profile reset complete, onboarding will restart");
          
          return res.json({ 
            id: uuidv4(),
            role: "assistant",
            content: "Perfect! I've reset your profile completely. Let's start fresh - who are we feeding?",
            timestamp: new Date().toISOString()
          });
        }
      }

      // Normal message processing - save the user message and generate AI response
      const userMessage = {
        id: uuidv4(),
        ...messageData,
        householdId: 1, // Default household ID
        timestamp: new Date()
      };
      
      await storage.saveMessage(userMessage);
      
      // Generate AI response (simplified for DinnerBot)
      const aiResponse = await generateChatResponse([{
        role: messageData.role,
        content: messageData.content
      }]);
      
      const assistantMessage = {
        id: uuidv4(),
        role: "assistant",
        content: aiResponse,
        householdId: 1,
        timestamp: new Date()
      };
      
      await storage.saveMessage(assistantMessage);
      res.json(assistantMessage);
      
    } catch (error) {
      console.error("Error in /api/chat/messages POST:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });
  
  // Complete reset endpoint - clears database and tells frontend to clear cache
  app.post("/api/reset-all", async (req, res) => {
    try {
      // Clear all data
      await storage.clearMessages();
      
      res.json({ 
        success: true,
        clearCache: true,
        message: "Complete reset - database and cache cleared"
      });
    } catch (error) {
      console.error("Error in complete reset:", error);
      res.status(500).json({ message: "Failed to reset" });
    }
  });

  // Reset chat endpoint
  app.post("/api/chat/reset", async (req, res) => {
    try {
      // Clear all messages
      await storage.clearMessages();
      
      // Return simple success - no household needed for fresh start
      res.json({ 
        success: true,
        clearCache: true, // Signal frontend to clear localStorage
        message: "Reset complete - ready for fresh start"
      });
    } catch (error) {
      console.error("Error in /api/chat/reset:", error);
      res.status(500).json({ message: "Failed to reset chat" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    console.log("[CHAT DEBUG] POST /api/chat called with body:", JSON.stringify(req.body, null, 2));
    try {
      // Support both direct message submissions and array of messages (legacy support)
      if (req.body.message) {
        // Handle string message format (convert to user message object)
        let singleMessage;
        if (typeof req.body.message === 'string') {
          singleMessage = {
            role: "user" as const,
            content: req.body.message
          };
        } else {
          // Object format
          const messageSchema = z.object({
            role: z.enum(["user", "assistant", "system"]),
            content: z.string()
          });
          singleMessage = messageSchema.parse(req.body.message);
        }
        const analysisContext = req.body.analysisContext || "";
        
        // Check for reset command FIRST, before any other processing
        if (singleMessage.role === "user") {
          const userContent = singleMessage.content.toLowerCase();
          console.log("[DEBUG] User message content:", JSON.stringify(userContent));
          console.log("[DEBUG] Checking for reset commands...");
          
          // Check for reset commands and handle immediately
          if (userContent.includes('reset my profile') || 
              userContent.includes('start over') || 
              userContent.includes('reset onboarding') ||
              userContent.includes('restart my profile')) {
            
            console.log("[RESET] User requested profile reset, clearing onboarding data...");
            
            // Get household to reset
            let household = await storage.getHousehold();
            if (household) {
              // Reset the household to onboarding state
              await storage.updateHousehold({
                onboardingComplete: false,
                members: [],
                preferences: "",
                challenges: null,
                location: null,
                appliances: [],
                cookingSkill: 1
              });
              
              // Clear all chat messages
              await storage.clearMessages();
            }
            
            console.log("[RESET] Profile reset complete, onboarding will restart");
            
            return res.json({ 
              id: uuidv4(),
              role: "assistant",
              content: "Perfect! I've reset your profile completely. Let's start fresh - who are we feeding?",
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Get household ID for message association - create one if needed for onboarding
        let household = await storage.getHousehold();
        if (!household) {
          // Create a basic household for onboarding
          household = await storage.createHousehold({
            name: "New Household",
            members: [],
            cookingSkill: 1,
            preferences: "",
            challenges: null,
            location: null,
            appliances: []
          });
        }
        
        // Get previous messages for context
        const previousMessages = await storage.getMessages();
        const recentMessages = previousMessages.slice(-10);
        
        // Check onboarding status to determine which system prompt to use
        const isOnboardingComplete = household.onboardingComplete;
        
        // Format messages for OpenAI with appropriate system prompt
        const formattedMessages = [
          ...recentMessages.map(m => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content
          })),
          singleMessage,
        ];
        
        if (analysisContext) {
          formattedMessages.unshift({
            role: "system",
            content: analysisContext
          });
        } else if (!isOnboardingComplete) {
          // If onboarding not complete, direct user to profile setup instead of chat onboarding
          formattedMessages.unshift({
            role: "system",
            content: `You are a helpful assistant for "Dinner, Decided" - a meal planning service. The user hasn't completed their profile setup yet. 

Instead of asking onboarding questions, politely direct them to complete their profile first by visiting the Profile page where they can enter their household information, dietary preferences, kitchen equipment, and location.

Keep your response brief and friendly, explaining that they need to set up their profile before you can help with meal planning. Don't ask onboarding questions - just direct them to the profile setup.`
          });
        }
        
        // Save the user message first
        const userMessage = {
          id: uuidv4(),
          role: singleMessage.role,
          content: singleMessage.content,
          householdId: household.id,
          timestamp: new Date()
        };
        await storage.saveMessage(userMessage);
        
        // Get response from OpenAI
        const aiResponse = await generateChatResponse(formattedMessages, household);
        
        // Check if onboarding should be marked complete
        if (!isOnboardingComplete && aiResponse && aiResponse.includes("That's all I need to know for now")) {
          console.log("[ONBOARDING] Onboarding complete detected, extracting household info...");
          
          // Get all messages including the ones we just processed
          const allMessages = await storage.getMessages();
          console.log("[ONBOARDING] Full conversation:", allMessages.map(m => `${m.role}: ${m.content}`));
          
          // Extract onboarding information from the conversation
          const householdInfo = extractHouseholdInfoFromChat(allMessages);
          console.log("[ONBOARDING] Extracted household info:", householdInfo);
          
          await storage.updateHousehold({ 
            onboardingComplete: true,
            ...householdInfo
          });
          console.log("[ONBOARDING] Household updated with extracted info");
        }
        
        // Create a response message
        const responseId = uuidv4();
        const responseMessage = {
          id: responseId,
          role: "assistant",
          content: aiResponse,
          householdId: household.id,
          timestamp: new Date()
        };
        
        // Save the AI response
        await storage.saveMessage(responseMessage);
        
        // Return the formatted response
        return res.json({
          id: responseId,
          role: "assistant",
          content: aiResponse,
          timestamp: new Date().toISOString()
        });
      } else if (req.body.messages) {
        // Legacy format handling with messages array
        const messageSchema = z.array(z.object({
          id: z.string(),
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
          timestamp: z.string()
        }));
        
        const messages = messageSchema.parse(req.body.messages);
        
        // Check for reset command FIRST, before any other processing
        const userMessage = messages.find(m => m.role === "user");
        if (userMessage) {
          const userContent = userMessage.content.toLowerCase();
          console.log("[DEBUG] User message content:", JSON.stringify(userContent));
          console.log("[DEBUG] Checking for reset commands...");
          
          // Check for reset commands and handle immediately
          if (userContent.includes('reset my profile') || 
              userContent.includes('start over') || 
              userContent.includes('reset onboarding') ||
              userContent.includes('restart my profile')) {
            
            console.log("[RESET] User requested profile reset, clearing onboarding data...");
            
            // Get household to reset
            let household = await storage.getHousehold();
            if (household) {
              // Reset the household to onboarding state
              await storage.updateHousehold({
                onboardingComplete: false,
                members: [],
                preferences: "",
                challenges: null,
                location: null,
                appliances: [],
                cookingSkill: 1
              });
              
              // Clear all chat messages
              await storage.clearMessages();
            }
            
            console.log("[RESET] Profile reset complete, onboarding will restart");
            
            return res.json({ 
              id: uuidv4(),
              role: "assistant",
              content: "Perfect! I've reset your profile completely. Let's start fresh - who are we feeding?",
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Get household ID for message association - create one if needed for onboarding
        let household = await storage.getHousehold();
        if (!household) {
          // Create a basic household for onboarding
          household = await storage.createHousehold({
            name: "New Household",
            members: [],
            cookingSkill: 1,
            preferences: "",
            challenges: null,
            location: null,
            appliances: []
          });
        }
        
        // Save user message (after reset check)
        if (userMessage) {
          const messageToSave = {
            ...userMessage,
            // Generate a new unique ID for each user message to prevent duplicates
            id: uuidv4(),
            householdId: household.id,
            timestamp: new Date(userMessage.timestamp)
          };
          await storage.saveMessage(messageToSave);
        }
        
        // Check onboarding status and use appropriate system prompt
        const isOnboardingComplete = household.onboardingComplete;
        
        // Add onboarding system prompt if not yet complete
        if (!isOnboardingComplete) {
          messages.unshift({
            role: "system",
            content: `You are an onboarding assistant for "Dinner, Decided" - a meal planning service. Your job is to collect essential information about the user's household to create their personalized meal plan profile.

Follow this exact sequence of questions and only ask ONE question at a time:

1. "How many people are you cooking for?" (collect household size)
2. "Any food stuff we should know about?" (collect dietary restrictions, allergies, dislikes)
3. "What's your kitchen like?" (collect appliances, equipment, cooking setup)
4. "How do you feel about cooking?" (collect skill level, confidence, time availability)
5. "Where do you live?" (collect location/ZIP code for local preferences)
6. "What makes dinner hard at your house?" (collect challenges, pain points)

IMPORTANT RULES:
- Only ask ONE question at a time
- Wait for their answer before moving to the next question
- Keep responses brief and conversational
- Don't explain the whole process upfront
- After the final question, say: "That's all I need to know for now - if you ever want to edit this later, it's all saved under Profile. Ready to plan some meals?"

Be warm, efficient, and focused. Don't ask follow-up questions unless absolutely necessary.`
          });
        }

        // Get response from OpenAI
        const aiResponse = await generateChatResponse(messages, household);
      
        // Check if onboarding should be marked complete
        if (!isOnboardingComplete && aiResponse && aiResponse.includes("That's all I need to know for now")) {
          console.log("[ONBOARDING] Onboarding complete detected, extracting household info...");
          
          // Get the complete conversation history from storage (including the current message)
          const allMessages = await storage.getMessages();
          console.log("[ONBOARDING] Retrieved", allMessages.length, "messages from storage");
          console.log("[ONBOARDING] Full conversation:", allMessages.map(m => `${m.role}: ${m.content}`).join(' | '));
          
          // Extract onboarding information from the complete conversation
          const householdInfo = extractHouseholdInfoFromChat(allMessages);
          console.log("[ONBOARDING] Extracted household info:", householdInfo);
          await storage.updateHousehold({ 
            onboardingComplete: true,
            ...householdInfo
          });
          console.log("[ONBOARDING] Household updated with extracted info");
        }
      
        // Save the AI response message
        if (aiResponse) {
          const newMessage = {
            id: uuidv4(),
            role: "assistant", 
            content: aiResponse,
            householdId: household.id,
            timestamp: new Date()
          };
        
          await storage.saveMessage(newMessage);
          res.json(newMessage);
        } else {
          res.status(500).json({ message: "Failed to generate AI response" });
        }
      } else {
        // No valid message format provided
        return res.status(400).json({ message: "Invalid message format. Expected 'message' string or 'messages' array." });
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
      console.log('[API GET CURRENT] Fetching current meal plan');
      const allPlans = await storage.getAllMealPlans();
      console.log(`[API GET CURRENT] Available meal plans: ${allPlans.length > 0 ? allPlans.map(p => p.id).join(', ') : 'none'}`);
      
      // Get current active plan from storage
      let mealPlan = await storage.getCurrentMealPlan();
      
      // If no meal plan exists, return 404
      if (!mealPlan) {
        console.log('[API GET CURRENT] No active meal plan found');
        return res.status(404).json({ message: "No active meal plan found" });
      }
      
      console.log(`[API GET CURRENT] Found active meal plan with ID: ${mealPlan.id}`);
      
      // Ensure the plan has a meals array even if it's empty
      if (!mealPlan.meals) {
        console.log('[API GET CURRENT] No meals array found, initializing empty array');
        mealPlan.meals = [];
      }
      
      // Log meal count
      console.log(`[API GET CURRENT] Meal plan has ${Array.isArray(mealPlan.meals) ? mealPlan.meals.length : 0} meals`);
      
      // Import the normalizeMeal function
      const { normalizeMeal } = await import('./openai');
      
      // Ensure each meal has an ID and consistent field names
      if (Array.isArray(mealPlan.meals)) {
        mealPlan.meals = mealPlan.meals.map(meal => {
          // First check for missing ID
          if (!meal.id) {
            meal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            console.log(`[API] Added missing ID to meal in response: ${meal.id}`);
          }
          
          // Then normalize field names for consistency
          return normalizeMeal(meal);
        });
      }
      
      console.log(`[API GET CURRENT] Returning meal plan ${mealPlan.id} with ${Array.isArray(mealPlan.meals) ? mealPlan.meals.length : 0} meals`);
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
      
      // Add extra validation and fallback for the returned meals
      if (!generatedMeals) {
        console.log('[MEAL PLAN] No meals returned from OpenAI');
        return res.status(500).json({ message: "Failed to generate meal plan - no response from AI" });
      }
      
      if (!Array.isArray(generatedMeals)) {
        console.log('[MEAL PLAN] Non-array response from OpenAI:', typeof generatedMeals);
        return res.status(500).json({ message: "Failed to generate meal plan - invalid response format" });
      }
      
      if (generatedMeals.length === 0) {
        console.log('[MEAL PLAN] Empty meals array from OpenAI');
        return res.status(500).json({ message: "Failed to generate meal plan - no meals returned" });
      }
      
      // Verify each meal has critical fields
      for (const meal of generatedMeals) {
        if (!meal.name || typeof meal.name !== 'string') {
          console.log('[MEAL PLAN] Invalid meal without name:', meal);
          return res.status(500).json({ message: "Failed to generate meal plan - invalid meal format" });
        }
      }
      
      console.log(`[MEAL PLAN] Successfully generated ${generatedMeals.length} meals`);
      
      console.log('[MEAL PLAN] Generated meals:', JSON.stringify(generatedMeals, null, 2));
      
      // Import the normalizeMeal function
      const { normalizeMeal } = await import('./openai');

      // Add unique stable IDs to each meal and normalize field names
      const mealsWithIds = generatedMeals.map((meal, index) => {
        // First assign ID if missing
        if (!meal.id) {
          meal.id = `meal-${Date.now()}-${index}`;
        }
        
        // Then normalize all field names for consistency
        return normalizeMeal(meal);
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
      
      // Add extra validation and fallback for the returned meals
      if (!newMeals) {
        console.log('[SINGLE MEAL] No meals returned from OpenAI');
        return res.status(500).json({ message: "Failed to generate new meal - no response from AI" });
      }
      
      if (!Array.isArray(newMeals)) {
        console.log('[SINGLE MEAL] Non-array response from OpenAI:', typeof newMeals);
        return res.status(500).json({ message: "Failed to generate new meal - invalid response format" });
      }
      
      if (newMeals.length === 0) {
        console.log('[SINGLE MEAL] Empty meals array from OpenAI');
        return res.status(500).json({ message: "Failed to generate new meal - no meals returned" });
      }
      
      // Verify meal has critical fields
      if (!newMeals[0].name || typeof newMeals[0].name !== 'string') {
        console.log('[SINGLE MEAL] Invalid meal without name:', newMeals[0]);
        return res.status(500).json({ message: "Failed to generate new meal - invalid meal format" });
      }
      
      // Import normalizeMeal for field name consistency
      const { normalizeMeal } = await import('./openai');
      
      // Get the meal, assign ID if needed, and normalize field names
      let newMeal = newMeals[0];
      if (!newMeal.id) {
        newMeal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      
      // Normalize field names for consistency
      newMeal = normalizeMeal(newMeal);
      
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
      
      // Add extra validation and fallback for the returned replacement meal
      if (!replacementMeals) {
        console.log('[REPLACE MEAL] No meals returned from OpenAI');
        return res.status(500).json({ message: "Failed to generate replacement meal - no response from AI" });
      }
      
      if (!Array.isArray(replacementMeals)) {
        console.log('[REPLACE MEAL] Non-array response from OpenAI:', typeof replacementMeals);
        return res.status(500).json({ message: "Failed to generate replacement meal - invalid response format" });
      }
      
      if (replacementMeals.length === 0) {
        console.log('[REPLACE MEAL] Empty meals array from OpenAI');
        return res.status(500).json({ message: "Failed to generate replacement meal - no meals returned" });
      }
      
      // Verify replacement meal has critical fields
      if (!replacementMeals[0].name || typeof replacementMeals[0].name !== 'string') {
        console.log('[REPLACE MEAL] Invalid meal without name:', replacementMeals[0]);
        return res.status(500).json({ message: "Failed to generate replacement meal - invalid meal format" });
      }
      
      // Import normalizeMeal for field name consistency
      const { normalizeMeal } = await import('./openai');
      
      // Ensure replacement meal has an ID - keep original ID for continuity
      let replacementMeal = replacementMeals[0];
      replacementMeal.id = mealId;
      
      // Normalize field names for consistency
      replacementMeal = normalizeMeal(replacementMeal);
      
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
      
      // Normalize the grocery list sections to ensure it's always an array
      if (groceryList) {
        // Make sure sections is always an array
        if (!groceryList.sections || !Array.isArray(groceryList.sections)) {
          console.log('[API] Normalizing sections to empty array in grocery list GET response');
          groceryList.sections = [];
        }
        
        // Ensure each section has a properly initialized items array
        if (Array.isArray(groceryList.sections)) {
          groceryList.sections = groceryList.sections.map(section => {
            if (!section.items || !Array.isArray(section.items)) {
              return { ...section, items: [] };
            }
            return section;
          });
        }
      }
      
      res.json(groceryList);
    } catch (error) {
      console.error("Error getting current grocery list:", error);
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
      
      // Normalize the grocery list sections to ensure it's always an array
      // Make sure sections is always an array
      if (!groceryList.sections || !Array.isArray(groceryList.sections)) {
        console.log('[API] Normalizing sections to empty array in grocery list GET by-meal-plan response');
        groceryList.sections = [];
      }
      
      // Ensure each section has a properly initialized items array
      if (Array.isArray(groceryList.sections)) {
        groceryList.sections = groceryList.sections.map(section => {
          if (!section.items || !Array.isArray(section.items)) {
            return { ...section, items: [] };
          }
          return section;
        });
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
      // First, get the current meal plan and log details for debugging
      const currentPlan = await storage.getCurrentMealPlan();
      const household = await storage.getHousehold();
      
      if (!currentPlan) {
        return res.status(404).json({ message: "No active meal plan found" });
      }
      
      // Log details about the current plan for debugging
      console.log(`[GROCERY REGEN] Regenerating grocery list for meal plan ID: ${currentPlan.id}`);
      console.log(`[GROCERY REGEN] Meal plan has ${currentPlan.meals?.length || 0} meals`);
      
      // Log meal names and IDs for tracking
      if (Array.isArray(currentPlan.meals)) {
        currentPlan.meals.forEach(meal => {
          console.log(`[GROCERY REGEN] - ${meal.name} (${meal.id}) with ${meal.ingredients?.length || 0} ingredients`);
        });
      }
      
      // Generate fresh grocery list
      const groceryList = await generateAndSaveGroceryList(currentPlan.id, household.id);
      
      console.log(`[GROCERY REGEN] Successfully generated grocery list with ${groceryList.sections?.length || 0} sections`);
      
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

  app.post("/api/grocery-list/add-item", async (req, res) => {
    try {
      const { name, quantity, section } = req.body;
      
      // Validate input
      if (!name) {
        return res.status(400).json({ message: "Item name is required" });
      }
      
      console.log(`[GROCERY] Adding manual item: ${name}, quantity: ${quantity || 'none'}, section: ${section || 'Other'}`);
      
      // Get current grocery list
      const currentList = await storage.getCurrentGroceryList();
      
      if (!currentList) {
        console.log('[GROCERY] No active grocery list found');
        return res.status(404).json({ message: "No active grocery list found" });
      }
      
      // Create new item with unique ID
      const newItem = {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        quantity: quantity || undefined,
        mealId: undefined // Manual items don't have a meal association
      };
      
      // Find or create the target section
      const targetSectionName = section || 'Other';
      
      // Make sure we have a valid sections array, even if it's empty
      if (!currentList.sections || !Array.isArray(currentList.sections)) {
        currentList.sections = [];
      }
      
      let updatedSections = [...currentList.sections];
      
      // Look for the section
      let targetSectionIndex = updatedSections.findIndex(s => s.name === targetSectionName);
      
      if (targetSectionIndex >= 0) {
        // Section exists, add item to it
        // Make sure the items array exists
        if (!updatedSections[targetSectionIndex].items || !Array.isArray(updatedSections[targetSectionIndex].items)) {
          updatedSections[targetSectionIndex].items = [];
        }
        
        updatedSections[targetSectionIndex] = {
          ...updatedSections[targetSectionIndex],
          items: [...updatedSections[targetSectionIndex].items, newItem]
        };
      } else {
        // Section doesn't exist, create it
        updatedSections.push({
          name: targetSectionName,
          items: [newItem]
        });
      }
      
      // Update the grocery list
      const updatedList = await storage.updateGroceryList(currentList.id, {
        ...currentList,
        sections: updatedSections
      });
      
      console.log(`[GROCERY] Successfully added item "${name}" to section "${targetSectionName}"`);
      
      res.json(updatedList);
    } catch (error) {
      console.error("Error adding item to grocery list:", error);
      res.status(500).json({ message: "Failed to add item to grocery list" });
    }
  });

  app.post("/api/grocery-list/add-meal", async (req, res) => {
    try {
      // Allow both approaches: sending mealId or the complete meal object
      const { mealId, meal: mealData } = req.body;
      console.log('[GROCERY] Add meal request - mealId:', mealId);
      console.log('[GROCERY] Add meal request - has meal data:', !!mealData);
      
      if (mealData) {
        console.log('[GROCERY] Meal name:', mealData.name);
        console.log('[GROCERY] Meal has ingredients:', Array.isArray(mealData.ingredients), 
                   mealData.ingredients ? mealData.ingredients.length : 0);
      }
      
      const currentPlan = await storage.getCurrentMealPlan();
      const currentList = await storage.getCurrentGroceryList();
      
      if (!currentList) {
        console.log('[GROCERY] No active grocery list found');
        return res.status(404).json({ message: "No active grocery list found" });
      }
      
      console.log('[GROCERY] Current list ID:', currentList.id);

      let meal;
      
      if (mealData) {
        // Use the provided meal data directly
        meal = mealData;
        console.log('[GROCERY] Using provided meal data directly');
      } else if (mealId && currentPlan) {
        // Find the meal by ID in the current plan
        meal = currentPlan.meals.find(m => m.id === mealId);
        console.log('[GROCERY] Found meal by ID in current plan:', !!meal);
        
        if (!meal) {
          console.log('[GROCERY] Meal not found in current plan with ID:', mealId);
          return res.status(404).json({ message: "Meal not found in current plan" });
        }
      } else {
        console.log('[GROCERY] Missing required data - mealId or meal data');
        return res.status(400).json({ message: "Either mealId or meal data is required" });
      }
      
      // Log the meal's key properties
      console.log('[GROCERY] Processing meal for grocery list:');
      console.log('[GROCERY] - ID:', meal.id);
      console.log('[GROCERY] - Name:', meal.name);
      console.log('[GROCERY] - Has ingredients:', Array.isArray(meal.ingredients), 
                 meal.ingredients ? meal.ingredients.length : 0);
      
      if (!meal.ingredients || !Array.isArray(meal.ingredients) || meal.ingredients.length === 0) {
        console.log('[GROCERY] WARNING: Meal has no ingredients, checking for mainIngredients');
        
        // Check if the meal has mainIngredients instead
        if (meal.mainIngredients && Array.isArray(meal.mainIngredients) && meal.mainIngredients.length > 0) {
          console.log('[GROCERY] Using mainIngredients instead:', meal.mainIngredients.length, 'items');
          meal.ingredients = meal.mainIngredients;
        } else {
          console.log('[GROCERY] No ingredients found in meal');
        }
      }
      
      // Get current grocery list and ensure the meal's ingredients are included
      const groceryList = await storage.ensureMealInGroceryList(currentList.id, meal);
      console.log('[GROCERY] Successfully added meal to grocery list');
      
      res.json(groceryList);
    } catch (error) {
      console.error("Error adding meal to grocery list:", error);
      res.status(500).json({ message: "Failed to add meal to grocery list" });
    }
  });
  
  // Organize grocery list by department
  app.post("/api/grocery-list/organize", async (req, res) => {
    try {
      const excludeCheckedItems = req.body.excludeCheckedItems === true;
      console.log('[GROCERY] Organizing grocery list', excludeCheckedItems ? '(excluding checked items)' : '');
      
      // Get current grocery list
      const currentList = await storage.getCurrentGroceryList();
      
      if (!currentList) {
        console.log('[GROCERY] No current grocery list found');
        return res.status(404).json({ message: "No current grocery list found" });
      }
      
      if (!currentList.sections || currentList.sections.length === 0) {
        console.log('[GROCERY] Grocery list has no sections to organize');
        return res.status(400).json({ message: "Grocery list has no items to organize" });
      }
      
      // Collect all items from all sections
      let allItems = [];
      const checkedItemIds = req.body.checkedItems || {}; // Get checked items if provided
      
      currentList.sections.forEach(section => {
        section.items.forEach(item => {
          // If we're excluding checked items and this item is checked, skip it
          if (excludeCheckedItems && checkedItemIds[item.id]) {
            return;
          }
          
          allItems.push(item);
        });
      });
      
      console.log(`[GROCERY] Collected ${allItems.length} items for organization`);
      
      // Simple categorization function (directly defined here)
      const organizeItems = (items) => {
        // Define some simple department matchers
        const departments = {
          "Produce": ["fruit", "vegetable", "tomato", "onion", "garlic", "potato", "apple", "banana", "lettuce", "carrot", "cucumber", "lemon", "lime"],
          "Dairy": ["milk", "cheese", "yogurt", "butter", "cream", "egg"],
          "Meat & Seafood": ["beef", "chicken", "pork", "fish", "seafood", "meat", "steak", "ground", "turkey", "salmon", "shrimp"],
          "Bakery": ["bread", "roll", "bun", "bagel", "pastry", "cake", "tortilla"],
          "Frozen": ["frozen", "ice", "pizza"],
          "Canned Goods": ["can", "canned", "soup", "beans"],
          "Dry Goods": ["pasta", "rice", "cereal", "flour", "sugar", "oil"],
          "Condiments": ["sauce", "ketchup", "mustard", "mayonnaise", "dressing", "vinegar", "oil", "spice", "herb"],
          "Beverages": ["drink", "water", "juice", "soda", "tea", "coffee"]
        };
        
        const result = {};
        
        // Initialize departments with empty arrays
        Object.keys(departments).forEach(dept => {
          result[dept] = [];
        });
        result["Other"] = [];
        
        // Assign items to departments
        items.forEach(item => {
          const itemName = item.name.toLowerCase();
          let assigned = false;
          
          for (const [dept, keywords] of Object.entries(departments)) {
            if (keywords.some(keyword => itemName.includes(keyword))) {
              result[dept].push(item);
              assigned = true;
              break;
            }
          }
          
          if (!assigned) {
            result["Other"].push(item);
          }
        });
        
        // Remove empty departments
        Object.keys(result).forEach(dept => {
          if (result[dept].length === 0) {
            delete result[dept];
          }
        });
        
        return result;
      };
      
      // Organize the items using the simple function
      const organizedItems = organizeItems(allItems);
      
      // Create new sections based on organized items
      const newSections = Object.entries(organizedItems).map(([department, items]) => ({
        name: department,
        items: items
      })).filter(section => section.items.length > 0);
      
      // Add back any checked items to an "Other" section if we're excluding them
      if (excludeCheckedItems) {
        const checkedItems = [];
        currentList.sections.forEach(section => {
          section.items.forEach(item => {
            if (checkedItemIds[item.id]) {
              checkedItems.push(item);
            }
          });
        });
        
        if (checkedItems.length > 0) {
          // Find if we already have an "Other" section
          let otherSection = newSections.find(s => s.name === "Other");
          
          if (otherSection) {
            // Add checked items to existing Other section
            otherSection.items = [...otherSection.items, ...checkedItems];
          } else {
            // Create a new Other section for checked items
            newSections.push({
              name: "Other",
              items: checkedItems
            });
          }
        }
      }
      
      // Update the grocery list with new organized sections
      const updatedList = await storage.updateGroceryList(currentList.id, {
        ...currentList,
        sections: newSections
      });
      
      console.log(`[GROCERY] Successfully organized grocery list into ${newSections.length} departments`);
      res.json(updatedList);
    } catch (error) {
      console.error("Error organizing grocery list:", error);
      res.status(500).json({ message: "Failed to organize grocery list" });
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
      
      // IMPORTANT: Only regenerate the grocery list if explicitly requested
      // This prevents the meal plan refresh from clearing existing grocery items
      if (req.body.regenerateGroceryList === true) {
        const household = await storage.getHousehold();
        if (household) {
          console.log('[MEAL PLAN] Explicitly regenerating grocery list as requested');
          await generateAndSaveGroceryList(currentPlan.id, household.id);
        }
      } else {
        console.log('[MEAL PLAN] Skipping grocery list generation to preserve existing items');
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
  async function generateAndSaveGroceryList(mealPlanId: number, householdId: number, preserveExistingItems: boolean = true) {
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
    
    // Get existing list if any
    let groceryList = await storage.getGroceryListByMealPlanId(mealPlanId);
    
    // If we're just refreshing the meal plan (not explicitly generating a new list)
    // and there's an existing grocery list with items, we should preserve those items
    if (preserveExistingItems && groceryList && groceryList.sections && 
        Array.isArray(groceryList.sections) && groceryList.sections.length > 0) {
      
      console.log(`[GROCERY] Preserving existing grocery list with ${groceryList.sections.length} sections`);
      
      // Process each meal and add its ingredients to the existing list without replacing it
      if (Array.isArray(mealPlan.meals) && mealPlan.meals.length > 0) {
        for (const meal of mealPlan.meals) {
          if (meal && meal.id) {
            // This adds the meal's ingredients to the grocery list without replacing existing items
            groceryList = await storage.ensureMealInGroceryList(groceryList.id, meal);
          }
        }
      }
      
      return groceryList;
    }
    
    // If preserveExistingItems is false or there's no existing list, generate a new one
    console.log(`[GROCERY] Generating brand new grocery list`);
    const generatedList = await generateGroceryList(fixedMealPlan);
    
    if (groceryList) {
      // Update existing list with all new sections (replaces existing)
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
      console.log('[DEBUG PATCH] Raw request body received:', req.body);
      console.log('[DEBUG PATCH] Request body keys:', Object.keys(req.body || {}));
      console.log('[DEBUG PATCH] Headers:', JSON.stringify(req.headers));
      console.log('[DEBUG PATCH] Content-Type:', req.headers['content-type']);
      
      const { planId } = req.params;
      
      // Handle two different formats:
      // 1. {updatedMeal, mealId} - The direct format we expect
      // 2. {id, meals, ...other} - Full meal plan object
      
      let updatedMeal, mealId, fullMealPlan;
      
      // Check if this is the direct format (specific meal update)
      if (req.body?.updatedMeal && req.body?.mealId) {
        console.log('[PATCH] Using direct updatedMeal/mealId format');
        // Import normalizeMeal to ensure field consistency
        const { normalizeMeal } = await import('./openai');
        updatedMeal = normalizeMeal(req.body.updatedMeal);
        mealId = req.body.mealId;
      } 
      // Check if this is a full meal plan update
      else if (req.body?.id && req.body?.meals && Array.isArray(req.body.meals)) {
        console.log('[PATCH] Detected full meal plan format, extracting meals array');
        
        // Normalize each meal in the meal plan for consistency
        const { normalizeMeal } = await import('./openai');
        const normalizedMeals = req.body.meals.map((meal: any) => normalizeMeal(meal));
        
        // Use the full meal plan with normalized meals
        fullMealPlan = {
          ...req.body,
          meals: normalizedMeals
        };
        
        // If we've received a full plan, we can simply update the entire plan
        try {
          // Validate that the plan ID in the body matches the URL
          if (Number(fullMealPlan.id) !== Number(planId)) {
            return res.status(400).json({ 
              message: `Plan ID mismatch: URL ID ${planId} doesn't match body ID ${fullMealPlan.id}` 
            });
          }
          
          // Update the entire meal plan
          const updatedPlan = await storage.updateMealPlan(Number(planId), fullMealPlan);
          console.log(`[API] Successfully updated full meal plan, has ${updatedPlan.meals?.length || 0} meals`);
          
          // Don't auto-generate grocery list on every full plan update to avoid rate limits
          // Comment: We're intentionally skipping grocery list generation to avoid OpenAI rate limiting
          console.log('[PATCH] Skipping automatic grocery list generation for full plan update to avoid rate limiting');
          
          return res.json(updatedPlan);
        } catch (error) {
          console.error("Error updating full meal plan:", error);
          return res.status(500).json({ message: "Failed to update full meal plan" });
        }
      } 
      // Neither format is valid
      else {
        return res.status(400).json({ message: "Invalid request format. Expected either {updatedMeal, mealId} or a full meal plan object with meals array." });
      }
      
      // If we reach here, we're handling the individual meal update case
      console.log(`[API] Updating individual meal ${mealId} in plan ${planId}`);
      
      // Get the current meal plan
      const existingMealPlan = await storage.getMealPlan(Number(planId));
      
      if (!existingMealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      // Make sure there are meals to update
      if (!existingMealPlan.meals || !Array.isArray(existingMealPlan.meals)) {
        return res.status(400).json({ message: "Meal plan has no meals to update" });
      }
      
      // Find the meal to update
      const mealIndex = existingMealPlan.meals.findIndex(meal => meal.id === mealId);
      
      if (mealIndex === -1) {
        return res.status(404).json({ message: "Meal not found in plan" });
      }
      
      // Create a deep clone of the meal plan to avoid mutation issues
      const updatedMeals = JSON.parse(JSON.stringify(existingMealPlan.meals));
      
      // Ensure ID consistency
      updatedMeal.id = mealId;
      
      // Replace the meal at the found index
      updatedMeals[mealIndex] = updatedMeal;
      
      // Update the meal plan
      const updatedPlan = await storage.updateMealPlan(Number(planId), {
        ...existingMealPlan,
        meals: updatedMeals
      });
      
      console.log(`[API] Successfully updated meal in plan, now has ${updatedPlan.meals ? updatedPlan.meals.length : 0} meals`);
      
      // Don't auto-generate grocery list on every meal update to avoid rate limits
      // Comment: We're skipping grocery list generation during meal updates
      // to prevent OpenAI rate limit errors
      console.log('[PATCH] Skipping automatic grocery list generation to avoid rate limiting');
      
      res.json(updatedMeal);
    } catch (error) {
      console.error("Error updating meal in plan:", error);
      res.status(500).json({ message: "Failed to update meal in plan" });
    }
  });
  
  // Simple test endpoint for meal updates
  app.post('/api/test-meal-update', (req, res) => {
    try {
      console.log('[TEST] Received test meal update. Body type:', typeof req.body);
      console.log('[TEST] Raw body:', req.body);
      console.log('[TEST] Headers:', req.headers);
      console.log('[TEST] Content-Type:', req.headers['content-type']);
      
      // Try to extract the fields directly
      const updatedMeal = req.body?.updatedMeal;
      const mealId = req.body?.mealId;
      
      console.log('[TEST] updatedMeal:', updatedMeal ? 'exists' : 'missing');
      console.log('[TEST] mealId:', mealId);
      
      // Send the result back with success status
      res.json({
        success: !!(updatedMeal && mealId),
        receivedMealId: mealId,
        receivedMeal: updatedMeal ? 'valid' : 'invalid'
      });
    } catch (error) {
      console.error('[TEST] Error in test endpoint:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  
  // Debug endpoint to inspect request body
  app.post('/api/debug-request', (req, res) => {
    console.log('[DEBUG] Received request body:', JSON.stringify(req.body, null, 2));
    console.log('[DEBUG] Content-Type:', req.headers['content-type']);
    res.json({ success: true, received: req.body });
  });
  
  // Reset a meal plan completely - for recovery from data corruption
  // Set a meal plan as active endpoint
  app.put("/api/meal-plan/:planId/set-active", async (req, res) => {
    try {
      const { planId } = req.params;
      console.log(`[API] Setting meal plan ${planId} as active`);
      
      // Get the specified meal plan
      const existingPlan = await storage.getMealPlan(Number(planId));
      
      if (!existingPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      // First, deactivate all meal plans
      const allPlans = await storage.getAllMealPlans();
      for (const plan of allPlans) {
        if (plan.id !== Number(planId) && plan.isActive) {
          console.log(`[API] Deactivating plan ${plan.id}`);
          await storage.updateMealPlan(plan.id, { ...plan, isActive: false });
        }
      }
      
      // Then, set the target plan as active
      const updatedPlan = await storage.updateMealPlan(Number(planId), { ...existingPlan, isActive: true });
      
      console.log(`[API] Successfully set meal plan ${planId} as active`);
      return res.json(updatedPlan);
    } catch (error) {
      console.error('[API] Error setting active meal plan:', error);
      return res.status(500).json({
        message: "Failed to set meal plan as active",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/meal-plan/:planId/reset", async (req, res) => {
    try {
      const { planId } = req.params;
      console.log(`[RESET] Attempting to reset meal plan with ID: ${planId}`);
      
      // 1. Get the current meal plan to verify it exists
      const existingPlan = await storage.getMealPlan(Number(planId));
      
      if (!existingPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      // 2. Create a clean reset version - preserve basic metadata but remove all meals
      const resetPlan = {
        ...existingPlan,
        meals: [], // Reset to empty meals array
        lastUpdated: new Date().toISOString(),
        isActive: true // Ensure this plan is marked as active
      };
      
      // 2.1 Deactivate all other meal plans to ensure only one active plan
      try {
        const allPlans = await storage.getAllMealPlans();
        for (const plan of allPlans) {
          if (plan.id !== Number(planId) && plan.isActive) {
            console.log(`[RESET] Deactivating other active plan: ${plan.id}`);
            await storage.updateMealPlan(plan.id, { ...plan, isActive: false });
          }
        }
      } catch (deactivateError) {
        console.error('[RESET] Error while deactivating other plans:', deactivateError);
        // Continue with the reset even if deactivation fails
      }
      
      // 3. Update the plan with the reset version
      const updatedPlan = await storage.updateMealPlan(Number(planId), resetPlan);
      
      console.log(`[RESET] Successfully reset meal plan ${planId}`);
      return res.json({ 
        success: true,
        message: "Meal plan reset successfully",
        plan: updatedPlan
      });
      
    } catch (error) {
      console.error("[RESET] Error resetting meal plan:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to reset meal plan",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
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
