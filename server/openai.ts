import OpenAI from "openai";
import { Message } from "@shared/schema";
import { getWeatherContextForMealPlanning } from "./weather";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. Do not change this unless explicitly requested by the user
// Check if we have a valid API key
const apiKey = process.env.OPENAI_API_KEY;

// Log OpenAI API key status for debugging
console.log('[OPENAI] API key exists:', !!apiKey);
console.log('[OPENAI] API key is empty string:', apiKey === '');
console.log('[OPENAI] API key length:', apiKey ? apiKey.length : 0);

// Warning for empty API key
if (apiKey === '') {
  console.warn('[OPENAI] WARNING: Empty OpenAI API key provided. Using dummy responses.');
}

// Function to check if we have a valid API key
function hasValidApiKey() {
  // Only log detailed validation in development environment
  if (process.env.NODE_ENV === 'development') {
    console.log('[OPENAI VALIDATION] API key exists:', !!apiKey);
    console.log('[OPENAI VALIDATION] API key is empty string:', apiKey === '');
    console.log('[OPENAI VALIDATION] API key starts with sk-:', apiKey?.startsWith('sk-'));
    console.log('[OPENAI VALIDATION] API key length:', apiKey ? apiKey.length : 0);
  }
  
  // Check if key exists, is not empty, and starts with the correct prefix
  const hasValidFormat = !!apiKey && apiKey.trim() !== '' && apiKey.startsWith('sk-');
  
  // Add additional validation for minimum length of a typical OpenAI key
  const hasValidLength = !!apiKey && apiKey.length >= 30;
  
  return hasValidFormat && hasValidLength;
}

// Initialize OpenAI client with the API key (will throw error if invalid)
console.log('[OPENAI INIT] Initializing OpenAI client with key:', apiKey ? `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 4)}` : 'undefined');

const openai = new OpenAI({ 
  apiKey: apiKey || undefined,
  timeout: 120000, // Increase timeout to 2 minutes to handle longer requests
  maxRetries: 5, // Increase retries for more reliability
  defaultQuery: { 
    'request_timeout': '90' // Request 90 second server-side timeout (as string)
  }  
});

// Test if the client can be used by making a small request
(async () => {
  try {
    console.log('[OPENAI INIT] Testing API key with a simple models request');
    const models = await openai.models.list();
    console.log('[OPENAI INIT] API key is valid! Available models count:', models.data.length);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[OPENAI INIT] Error testing API key:', errorMessage);
    console.error('[OPENAI INIT] API key is not valid or has issues');
  }
})();

// Generate a response for the chat conversation
export async function generateChatResponse(messages: Message[], household?: any, imageData?: string): Promise<string> {
  try {
    // For demo purposes with no valid API key, return a canned response
    if (!hasValidApiKey()) {
      console.log('[CHAT] No valid OpenAI API key, using dummy response');
      return generateDummyResponse(messages);
    }
    
    // Map messages to OpenAI format
    const openaiMessages = messages.map(msg => {
      if (imageData && msg.role === 'user') {
        // If this is a user message with image data, format for vision API
        return {
          role: msg.role as 'user' | 'assistant' | 'system',
          content: [
            {
              type: "text",
              text: msg.content || "What can I make with this?"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageData}`
              }
            }
          ]
        };
      } else {
        // Regular text message
        return {
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        };
      }
    });
    
    // Determine if we're in onboarding or chat mode based on household completion status
    console.log('[CHAT] === DEBUGGING ONBOARDING DETECTION ===');
    console.log('[CHAT] Household data received:', JSON.stringify(household, null, 2));
    console.log('[CHAT] Household onboardingComplete:', household?.onboardingComplete);
    const isOnboarding = household && !household.onboardingComplete;
    console.log('[CHAT] Is onboarding mode:', isOnboarding);
    console.log('[CHAT] Will use prompt:', isOnboarding ? 'ONBOARDING' : 'DINNERBOT');
    console.log('[CHAT] =======================================');
    
    // Use different system prompts for onboarding vs. DinnerBot
    if (isOnboarding) {
      // Onboarding system prompt - focus on collecting household information step by step
      openaiMessages.unshift({
        role: "system" as const,
        content: `You are a helpful onboarding assistant for "Dinner, Decided" meal planning service. Your job is to collect basic household information step by step.

        Follow this simple onboarding flow:
        1. Ask "Who are we feeding?" (household size - adults/kids)
        2. Ask "Any food stuff we should know?" (basic dietary restrictions, allergies, picky eaters)
        3. Ask "What's your kitchen like?" (basic appliances they use)
        4. Ask "How do you feel about cooking?" (skill/comfort level)
        5. Ask "Where do you live?" (ZIP code for weather context)
        6. Ask "What makes dinner hard at your house?" (main challenges)

        Keep questions simple and conversational. Don't ask about weekly schedules, meal types, or cooking styles - that comes later. Just focus on basic household setup information.

        After collecting all 6 pieces of info, automatically save their profile and say: "That's all I need to know for now - if you ever want to edit this later, it's all saved under Profile. Ready to plan some meals? Head over to /this-week and let's get started!"

        Make the transition feel effortless and seamless - no permission asking, just smooth progression.`
      });
    } else {
      // DinnerBot system prompt - focus on dinner assistance, NOT meal planning
      openaiMessages.unshift({
        role: "system" as const,
        content: `You are DinnerBot—a friendly, funny, and unflappable dinner assistant. Your job is to help busy families figure out what to cook in a pinch, answer common meal-related questions, and offer creative ideas using limited ingredients. You are always supportive and never judgy.

        You do NOT manage the user's weekly meal plan or grocery list. You are a sidekick, not the planner.
        
        EXCEPTION: If a user asks to "reset my profile", "start over", or "reset onboarding", you CAN help with that - this is the one profile management task you handle.
        
        You always speak in a relaxed, helpful tone—think "fun friend who can cook." Feel free to use emojis or bullet points if they help with clarity, but keep it casual.
        
        When helping users:
        - Prioritize speed and simplicity
        - Assume they're hungry and tired
        - Offer 1–2 good ideas, then ask if they want more
        
        If the user gives you ingredients:
        - Suggest a meal they could make in 15–30 minutes
        - Be honest if it's going to be weird or limited, but try to help
        
        If the user shares a photo or list of fridge contents:
        - Try to identify 1–2 quick recipes or hacks they can do with what's shown
        
        If the user mentions being short on time:
        - Suggest something ultra-fast or using convenience items
        
        If the user mentions prepping ahead:
        - Suggest batchable or freezer-friendly meals
        
        Avoid overly complex recipes, long explanations, or judgmental language. You're here to make dinner easier and more fun.
        
        When in doubt, start by saying: "Let's see what we can throw together…"`
      });
    }
    
    // Log the messages being sent to OpenAI
    console.log('[CHAT] Sending messages to OpenAI:', JSON.stringify(openaiMessages, null, 2));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages as any, // Type assertion to fix TypeScript error
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    return response.choices[0].message.content || "I'm not sure how to respond to that.";
    
  } catch (error) {
    console.error("Error generating chat response:", error);
    
    // Check for specific OpenAI API errors
    if (error && typeof error === 'object') {
      // Handle OpenAI error object types
      if ('error' in error && typeof error.error === 'object' && error.error !== null) {
        const openaiError = error.error as Record<string, unknown>;
        if ('type' in openaiError && typeof openaiError.type === 'string' && openaiError.type === 'insufficient_quota') {
          return "I'm sorry, but your OpenAI API quota has been exceeded. Please update your API key or try again later.";
        }
      }
      
      // Handle status code errors
      if ('code' in error && error.code === 'insufficient_quota') {
        return "I'm sorry, but your OpenAI API quota has been exceeded. Please update your API key or try again later.";
      } else if ('status' in error && error.status === 429) {
        return "I'm experiencing high demand right now. Please try again in a few minutes.";
      } else if ('status' in error && (error.status === 401 || error.status === 403)) {
        return "There's an authentication issue with your AI service. Please check your API key.";
      }
      
      // Also check for error message strings
      if ('message' in error && typeof error.message === 'string') {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('exceeded your current quota')) {
          return "I'm sorry, but your OpenAI API quota has been exceeded. Please update your API key or try again later.";
        } else if (errorMessage.includes('rate limit')) {
          return "I'm experiencing high demand right now. Please try again in a few minutes.";
        } else if (errorMessage.includes('authentication') || errorMessage.includes('invalid api key')) {
          return "There's an authentication issue with your AI service. Please check your API key.";
        }
      }
    }
    
    return "I'm sorry, I'm having trouble connecting to my knowledge base. Please try again later.";
  }
}

// Generate a meal plan based on household profile and preferences
export async function generateMealPlan(household: any, preferences: any = {}, retryCount = 0): Promise<any[]> {
  try {
    // Debug the OpenAI API key issue
    console.log('[MEAL PLAN] API key valid:', hasValidApiKey());
    console.log('[MEAL PLAN] API key length:', apiKey ? apiKey.length : 0);
    console.log('[MEAL PLAN] API key first 3 chars:', apiKey ? apiKey.substring(0, 3) : 'none');
    console.log('[MEAL PLAN] ENV variables available:', Object.keys(process.env).filter(key => !key.includes('SECRET')).join(', '));
    console.log('[MEAL PLAN] Retry count:', retryCount);
    
    // Safety check to prevent infinite recursion
    if (retryCount >= 3) {
      console.warn(`[MEAL PLAN] Maximum retry attempts (${retryCount}) reached. Returning best attempt.`);
      throw new Error("Maximum retry attempts reached. Please try again later.");
    }
    
    // For demo purposes with no valid API key, return canned meal suggestions
    if (!hasValidApiKey()) {
      console.log('[MEAL PLAN] Using mock data due to missing or invalid API key');
      
      // Only log household/preferences in development environments
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MEAL PLAN] Household:', JSON.stringify(household, null, 2));
        console.log('[MEAL PLAN] Preferences:', JSON.stringify(preferences, null, 2));
      }
      
      return generateDummyMeals(preferences);
    }
    
    // Log that we have a valid API key
    console.log('[MEAL PLAN] Found valid OpenAI API key');
    
    // Get weather context if location is available
    let weatherContext = "";
    if (household && household.location) {
      try {
        weatherContext = await getWeatherContextForMealPlanning(household.location);
        console.log(`[MEAL PLAN] Retrieved weather context for ${household.location}`);
      } catch (weatherError) {
        console.error("[MEAL PLAN] Error getting weather context:", weatherError);
        weatherContext = "Weather information is not available.";
      }
    }
    
    // Prepare the prompt
    let promptContent = "";
    
    // Special handling for single meal replacement
    if (preferences.replaceMeal) {
      promptContent = `Generate a single replacement meal for "${preferences.mealName}". The replacement should be in the same category (${preferences.categories.join(", ")}) but different enough to provide variety.`;
    } else if (preferences.mealsByDay && Object.keys(preferences.mealsByDay).length > 0) {
      // Build up a list of meal selections by day for a more structured prompt
      const mealSelections: string[] = [];
      
      // Map meal categories to more user-friendly descriptions
      for (const day in preferences.mealsByDay) {
        if (preferences.mealsByDay.hasOwnProperty(day)) {
          const category = preferences.mealsByDay[day];
          // If we have a valid category, add it to our selections
          if (category) {
            let categoryDescription = category;
            
            // Use predefined descriptions for common categories
            switch (category.toLowerCase()) {
              case 'quick':
                categoryDescription = 'Quick & Easy (15-20 minutes)';
                break;
              case 'weeknight':
                categoryDescription = 'Weeknight Meal (30-40 minutes)';
                break;
              case 'batch':
                categoryDescription = 'Batch Cooking (Make extras for leftovers)';
                break;
              case 'split':
                categoryDescription = 'Split Prep (Prep ahead, cook later - including crockpot meals)';
                break;
              default:
                categoryDescription = preferences.categoryDefinitions?.[category] || category;
            }
            
            mealSelections.push(`- ${day}: ${categoryDescription}`);
          }
        }
      }
      
      // Count total meals requested (one per day)
      const totalMeals = Object.keys(preferences.mealsByDay).length;
      
      promptContent = `Create a personalized meal plan with ${totalMeals} dinner ideas for a family with the following profile:
        - Family size: ${household.members.length} people
        - Family members: ${household.members.map((m: any) => `${m.name} (${m.age || 'Adult'}, ${m.dietaryRestrictions || 'No restrictions'})`).join(', ')}
        - Available kitchen equipment: ${household.appliances?.join(", ") || "Standard kitchen equipment"}
        - Cooking skill level (1-5): ${household.cookingSkill || 3}
        - Preferences: ${household.preferences || "Family-friendly meals"}
        - Location: ${household.location || "Unknown location"}
        ${weatherContext ? `- Current weather: ${weatherContext}` : ''}
        
        Special notes for this week: ${preferences.specialNotes || "No special notes"}
        
        Meal selections by day:
        ${mealSelections.join("\n        ")}
        
        For each meal, please provide:
        1. Name of dish - be specific and descriptive
        2. Brief description of the dish (2-3 sentences)
        3. Appropriate day of the week based on the selections above
        4. Meal category from my selection
        5. Prep time (in minutes)
        6. Serving size (number of people)
        
        FOR INGREDIENTS - THIS IS CRITICAL:
        7. Complete list of ALL ingredients with EXACT measurements for each (like "1 lb ground beef", "2 cloves garlic, minced")
          * Include 10-15 ingredients with specific quantities for each recipe
          * Include all seasonings, oils, and garnishes with specific quantities 
          * Every single ingredient mentioned in the instructions MUST be listed here with quantities
          * Include salt, pepper, oil quantities specifically - never just "salt and pepper to taste"
          * Format as complete phrases (e.g., "1 pound boneless chicken breasts, cut into 1-inch pieces")
        
        8. Step-by-step cooking instructions (EXACTLY 10-12 detailed steps - NO GENERIC STEPS ALLOWED)
          * ABSOLUTELY REQUIRED: Each step must begin with a specific action verb (Heat, Stir, Add, etc.)
          * ABSOLUTELY REQUIRED: Each step must include exact numerical times and temperatures
          * ABSOLUTELY REQUIRED: Steps like "Prepare ingredients" or "Cook according to procedure" are STRICTLY FORBIDDEN
          * ABSOLUTELY REQUIRED: For ALL protein cooking, include exact internal temperature (165°F for chicken, 145°F for fish)
          * Include multiple sensory cues in each step (e.g., "until golden brown and fragrant, about 3-4 minutes")
          * When introducing a cooking technique like "fold" or "deglaze", include a brief explanation in parentheses
          * Each step should be at least 20 words long with specific details for beginner cooks
          * When listing ingredients in steps, always include exact measurements (e.g., "Add 2 tablespoons olive oil" not "Add oil")
          * Mention exactly how long to cook ingredients and what visual/textural changes to look for
          * Explicitly state what the food should look like at each critical stage of cooking
          * FORBIDDEN STEPS: "Prepare all ingredients" or "Combine according to ingredients list" or "Cook until done"
          * Format each instruction as a detailed, specific sentence with measurements, times, and visual cues
        
        9. For "Split Prep" category meals, provide clear instructions for what to prepare ahead of time vs. what to do on the day of cooking
        
        10. IMPORTANT: Add 2-3 personalized rationales for why this meal is a good fit for this specific family (considering their dietary needs, preferences, time constraints, etc.)
        
        Generate a JSON response with an array of meal objects, ensuring that you include the rationales as an array of strings in a "rationales" field for each meal. Every meal MUST have detailed ingredients with quantities.`;
    } else if (preferences.singleMeal) {
      // Special handling for single meal generation
      const mealType = preferences.mealType || "any";
      const additionalPrefs = preferences.additionalPreferences 
        ? `with specific preferences: ${preferences.additionalPreferences}` 
        : "";
      
      promptContent = `Create a single ${mealType} dinner meal for a family with the following profile:
        - Family size: ${household.members.length} people
        - Family members: ${household.members.map((m: any) => `${m.name} (${m.age || 'Adult'}, ${m.dietaryRestrictions || 'No restrictions'})`).join(', ')}
        - Available appliances: ${household.appliances?.join(", ") || "Standard kitchen equipment"}
        - Cooking skill level (1-5): ${household.cookingSkill || 3}
        - Preferences: ${household.preferences || "Family-friendly meals"}
        - Location: ${household.location || "Unknown location"}
        ${weatherContext ? `- Current weather: ${weatherContext}` : ''}
        ${additionalPrefs}
        
        For the meal, please provide:
        1. Name of dish - be specific and descriptive
        2. Description of the dish (2-3 sentences)
        3. Appropriate meal category (e.g., "Quick & Easy", "Weeknight", "Batch Cooking", "Split Prep")
        4. Prep time (in minutes)
        5. Serving size (number of people)
        
        FOR INGREDIENTS - THIS IS CRITICAL:
        6. Complete list of ALL ingredients with EXACT measurements for each (like "1 lb ground beef", "2 cloves garlic, minced")
          * Include 10-15 ingredients with specific quantities for the recipe
          * Include all seasonings, oils, and garnishes with specific quantities 
          * Every single ingredient mentioned in the instructions MUST be listed here with quantities
          * Include salt, pepper, oil quantities specifically - never just "salt and pepper to taste"
          * Format as complete phrases (e.g., "1 pound boneless chicken breasts, cut into 1-inch pieces")
        
        7. Step-by-step cooking instructions (EXACTLY 10-12 detailed steps - NO GENERIC STEPS ALLOWED)
          * ABSOLUTELY REQUIRED: Each step must begin with a specific action verb (Heat, Stir, Add, etc.)
          * ABSOLUTELY REQUIRED: Each step must include exact numerical times and temperatures
          * ABSOLUTELY REQUIRED: Steps like "Prepare ingredients" or "Cook according to procedure" are FORBIDDEN
          * ABSOLUTELY REQUIRED: For ALL protein cooking, include exact internal temperature (165°F for chicken, 145°F for fish)
          * Include multiple sensory cues in each step (e.g., "until golden brown and fragrant, about 3-4 minutes")
          * When introducing a cooking technique like "fold" or "deglaze", include a brief explanation in parentheses
          * Each step should be at least 20 words long with specific details for beginner cooks
          * When listing ingredients in steps, always include exact measurements (e.g., "Add 2 tablespoons olive oil" not "Add oil")
          * Mention exactly how long to cook ingredients and what visual/textural changes to look for
          * Explicitly state what the food should look like at each critical stage of cooking
        
        8. IMPORTANT: Add 2-3 personalized rationales for why this meal is a good fit for this specific family (considering their dietary needs, preferences, time constraints, etc.)
        
        Format the response as a JSON array with a single meal object. Ensure to include the rationales as an array of strings in a "rationales" field. The meal MUST have detailed ingredients with quantities.`;
        
        console.log('[MEAL PLAN] Generating single meal with type:', mealType);
    } else {
      // Standard meal plan request (fallback)
      promptContent = `Create a meal plan with ${preferences.numberOfMeals || 5} dinner ideas for a family with the following profile:
        - Family size: ${household.members.length} people
        - Family members: ${household.members.map((m: any) => `${m.name} (${m.age || 'Adult'}, ${m.dietaryRestrictions || 'No restrictions'})`).join(', ')}
        - Available appliances: ${household.appliances?.join(", ") || "Standard kitchen equipment"}
        - Cooking skill level (1-5): ${household.cookingSkill || 3}
        - Preferences: ${household.preferences || "Family-friendly meals"}
        - Location: ${household.location || "Unknown location"}
        ${weatherContext ? `- Current weather: ${weatherContext}` : ''}
        
        For each meal, please provide:
        1. Name of dish - be specific and descriptive
        2. Description of the dish (2-3 sentences)
        3. Appropriate meal category (e.g., "Quick & Easy", "Weeknight", "Batch Cooking", "Split Prep")
        4. Prep time (in minutes)
        5. Serving size (number of people)
        
        FOR INGREDIENTS - THIS IS CRITICAL:
        6. Complete list of ALL ingredients with EXACT measurements for each (like "1 lb ground beef", "2 cloves garlic, minced")
          * Include 10-15 ingredients with specific quantities for each recipe
          * Include all seasonings, oils, and garnishes with specific quantities 
          * Every single ingredient mentioned in the instructions MUST be listed here with quantities
          * Include salt, pepper, oil quantities specifically - never just "salt and pepper to taste"
          * Format as complete phrases (e.g., "1 pound boneless chicken breasts, cut into 1-inch pieces")
        
        7. Step-by-step cooking instructions (minimum 8-10 detailed steps)
          * CRITICAL: Instructions must be comprehensive enough for a beginner cook to follow without prior knowledge
          * Include precise cooking times, temperatures, and methods for EVERY step (e.g., "sauté over medium heat for 5 minutes" not just "sauté until done")
          * Include exact time and temperature for any oven, slow cooker, or instant pot steps
          * Mention each ingredient specifically when it's used with exact quantities
          * Break complex processes into multiple detailed steps
          * Include specific guidance on how to tell when things are properly cooked
          * NO generic steps like "cook according to standard procedure" - every step must be explicit
          * NEVER assume prior cooking knowledge - explain techniques like "fold in", "deglaze", etc.
          * For mixed dishes, include how to assemble and serve
        
        8. IMPORTANT: Add 2-3 personalized rationales for why this meal is a good fit for this specific family (considering their dietary needs, preferences, time constraints, etc.)
        
        Format the response as a JSON array of meal objects with detailed ingredients and cooking instructions. Ensure to include the rationales as an array of strings in a "rationales" field for each meal. Every meal MUST have detailed ingredients with quantities.`;
    }
    
    console.log('[MEAL PLAN] Generating meal plan with this prompt:', promptContent);
    
    // Calculate exponential backoff delay based on retry count
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const backoffDelay = Math.min(maxDelay, baseDelay * Math.pow(2, retryCount));
    
    if (retryCount > 0) {
      console.log(`[MEAL PLAN] Retry attempt ${retryCount} - Applying backoff delay of ${backoffDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
    
    // Create the request to OpenAI with retry logic
    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
        {
          role: "system",
          content: `You are a helpful meal planning assistant that creates personalized meal plans for busy families.
          
          IMPORTANT: You MUST return your response as a valid JSON object with an array of meal objects in a 'meals' property. Each meal object should have camelCase property names.
          
          Required properties for each meal:
          - name (string): The name of the dish
          - description (string): A brief description of the dish
          - categories (string[]): An array of meal categories (e.g., "quick", "batch cooking")
          - prepTime (number): Total preparation time in minutes
          - servings (number): Number of servings the meal makes
          - ingredients (string[]): Complete list of ALL ingredients with specific quantities - MUST include every single ingredient that appears in the directions
          - instructions (string[]): Step-by-step cooking instructions (8-10 detailed steps) with specific cooking times, temperatures and methods for every stage of cooking
          
          If the meal is assigned to a specific day, include:
          - day (string): The day of the week
          
          If rationales are requested, include:
          - rationales (string[]): Array of reasons why this meal is appropriate for the family
          
          For "split prep" meals, include:
          - prepInstructions (string): Detailed instructions for what to prepare ahead of time
          - cookingInstructions (string): Detailed instructions for the final cooking day
          
          Example response format:
          {
            "meals": [
              {
                "name": "Sheet Pan Chicken Fajitas",
                "description": "A quick and easy Mexican-inspired dinner with colorful bell peppers and tender chicken",
                "categories": ["quick", "mexican"],
                "day": "Monday",
                "prepTime": 25,
                "servings": 4,
                "ingredients": [
                  "1.5 lbs boneless, skinless chicken breast, sliced into strips", 
                  "1 red bell pepper, sliced", 
                  "1 green bell pepper, sliced", 
                  "1 yellow bell pepper, sliced", 
                  "1 large onion, sliced", 
                  "2 tbsp olive oil", 
                  "1 packet (2 tbsp) fajita seasoning", 
                  "1 tsp salt (for seasoning)",
                  "1/2 tsp black pepper (for seasoning)",
                  "1 sheet parchment paper",
                  "8 small flour tortillas", 
                  "1 lime, cut into wedges", 
                  "1/2 cup sour cream for serving", 
                  "1/4 cup chopped fresh cilantro for garnish"
                ],
                "instructions": [
                  "Preheat oven to 425°F (220°C) and position rack in the center. Line a large baking sheet with parchment paper.",
                  "Cut 1.5 lbs chicken breast into 1/4-inch strips. Place in a large bowl.",
                  "Slice 1 red bell pepper, 1 green bell pepper, 1 yellow bell pepper, and 1 large onion into 1/4-inch strips and add to the bowl with chicken.",
                  "Drizzle 2 tbsp olive oil over the mixture, then sprinkle with 2 tbsp fajita seasoning, 1 tsp salt, and 1/2 tsp black pepper.",
                  "Using clean hands or tongs, toss everything until the chicken and vegetables are evenly coated with oil and seasonings.",
                  "Spread the mixture in a single layer on the prepared baking sheet, making sure pieces aren't overlapping.",
                  "Roast in preheated oven for 20-25 minutes, stirring halfway through cooking time, until chicken reaches 165°F internal temperature and vegetables are tender with light charring on edges.",
                  "During the last 5 minutes of cooking, wrap 8 flour tortillas in aluminum foil and place in the oven to warm.",
                  "Cut 1 lime into 8 wedges and chop 1/4 cup fresh cilantro for garnish.",
                  "Serve by allowing each person to build their own fajitas with the roasted chicken mixture, warm tortillas, lime wedges, 1/2 cup sour cream, and cilantro."
                ],
                "rationales": ["Fits your weeknight time constraints", "Uses your family's preferred protein", "One-pan meal means easy cleanup"]
              },
              {...}
            ]
          }`
        },
        {
          role: "user",
          content: promptContent
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });
    } catch (error) {
      console.error("[MEAL PLAN] API call failed:", error instanceof Error ? error.message : 'Unknown error');
      
      // Retry with backoff if we have attempts left
      if (retryCount < 3) {
        console.log(`[MEAL PLAN] Retrying API call (attempt ${retryCount + 1} of 3)`);
        return generateMealPlan(household, preferences, retryCount + 1);
      }
      throw error;
    }
    
    // Parse and process the response
    try {
      const content = response.choices[0].message.content || "[]";
      console.log('[MEAL PLAN] Raw response content:', content);
      
      try {
        // Clean up the response content before parsing
        let cleanContent = content.trim();
        
        // Remove any markdown code blocks if present
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Parse the JSON response - handle partial responses
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(cleanContent);
        } catch (partialError) {
          // If JSON is incomplete, try to fix common issues
          if (cleanContent.includes('[') && !cleanContent.endsWith(']')) {
            // Incomplete array - try adding closing bracket
            try {
              parsedResponse = JSON.parse(cleanContent + ']');
            } catch (fixError) {
              throw partialError;
            }
          } else if (cleanContent.includes('{') && !cleanContent.endsWith('}')) {
            // Incomplete object - try adding closing brace
            try {
              parsedResponse = JSON.parse(cleanContent + '}');
            } catch (fixError) {
              throw partialError;
            }
          } else {
            throw partialError;
          }
        }
        
        // Handle multiple formats that OpenAI might return:
        // 1. Array of meals directly
        // 2. Object with 'meals' property containing an array
        // 3. Single meal object (needs to be wrapped in an array)
        let meals;
        if (Array.isArray(parsedResponse)) {
          // It's already an array of meals
          meals = parsedResponse;
        } else if (parsedResponse.meals && Array.isArray(parsedResponse.meals)) {
          // It has a 'meals' property with an array
          meals = parsedResponse.meals;
        } else if (parsedResponse.name && parsedResponse.ingredients) {
          // It's a single meal object, needs to be wrapped in an array
          console.log('[MEAL PLAN] Detected single meal object, converting to array');
          meals = [parsedResponse];
        } else {
          // Can't identify a valid meal format
          console.log('[MEAL PLAN] Empty meals array from OpenAI');
          meals = null;
        }
        
        if (meals) {
          console.log(`[MEAL PLAN] Successfully parsed ${meals.length} meals from OpenAI response`);
          
          // Mark any special flags based on origin type
          if (preferences.replaceMeal) {
            // This is a replacement meal
            meals = meals.map((meal: any) => ({
              ...meal,
              id: `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              replacedFrom: preferences.mealName
            }));
          }
          
          // Add a unique ID to each meal if it doesn't already have one
          meals = meals.map((meal: any, index: number) => {
            // Add ID if missing
            if (!meal.id) {
              const uniqueTimestamp = Date.now() + index * 100;
              meal.id = `meal-${uniqueTimestamp}-${Math.floor(Math.random() * 1000)}`;
            }
            
            // Normalize property names (directions → instructions) for consistency
            meal = normalizeMeal(meal);
            
            // Add metadata for tracking quality
            meal._qualityIssues = [];
            
            // Validate quality standards for this meal
            const validationResult = validateMealQuality(meal);
            if (!validationResult.isValid) {
              console.log(`[MEAL PLAN] Quality issues detected for ${meal.name}:`, validationResult.issues);
              meal._qualityIssues = validationResult.issues;
              meal._needsRegeneration = true;
              
              // Add detailed regeneration notes
              const issues = validationResult.issues.join("; "); 
              meal.regenerationNotes = `Please fix these issues: ${issues}. Follow all quality requirements exactly.`;
            }
            
            // Improve recipe instructions
            meal = improveRecipeInstructions(meal);
            
            return meal;
          });
          
          return meals;
        } else {
          console.warn('[MEAL PLAN] Warning: Could not determine meal structure in response');
          console.log('[MEAL PLAN] Full response:', content);
          return [];
        }
      } catch (parseError) {
        console.error('[MEAL PLAN] Error parsing OpenAI response:', parseError);
        console.log('[MEAL PLAN] Failed response content (first 1000 chars):', content?.substring(0, 1000));
        console.log('[MEAL PLAN] Full response length:', content?.length);
        console.log('[MEAL PLAN] Response type:', typeof content);
        throw new Error('Failed to parse meal plan response from OpenAI. Please try again.');
      }
    } catch (error) {
      console.error("Error generating meal plan:", error);
      
      // Check for specific OpenAI API errors
      if (error && typeof error === 'object') {
        // Handle OpenAI error object types
        if ('error' in error && typeof error.error === 'object') {
          const openaiError = error.error;
          if (openaiError && 'type' in openaiError && openaiError.type === 'insufficient_quota') {
            throw new Error('OpenAI API quota exceeded. Please update your API key or try again later.');
          }
        }
        
        // Handle status code errors
        if ('code' in error && error.code === 'insufficient_quota') {
          throw new Error('OpenAI API quota exceeded. Please update your API key or try again later.');
        } else if ('status' in error && error.status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please try again in a few minutes.');
        } else if ('status' in error && (error.status === 401 || error.status === 403)) {
          throw new Error('OpenAI API authentication error. Please check your API key.');
        }
        
        // Also check for error message strings
        if ('message' in error && typeof error.message === 'string') {
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('exceeded your current quota')) {
            throw new Error('OpenAI API quota exceeded. Please update your API key or try again later.');
          } else if (errorMessage.includes('rate limit')) {
            throw new Error('OpenAI API rate limit exceeded. Please try again in a few minutes.');
          } else if (errorMessage.includes('authentication') || errorMessage.includes('invalid api key')) {
            throw new Error('OpenAI API authentication error. Please check your API key.');
          }
        }
      }
      
      // For other errors, throw a detailed error instead of using dummy data
      console.error('[MEAL PLAN] OpenAI API error occurred, not falling back to dummy data');
      throw new Error('Error connecting to OpenAI API to generate meal plan. Please check your connection and try again.');
    }
  } catch (outerError) {
    console.error("Unexpected error in generateMealPlan:", outerError);
    // Don't fall back to dummy meals here either
    throw new Error(`Unexpected error occurred during meal plan generation: ${outerError instanceof Error ? outerError.message : 'Unknown error'}`);
  }
}

// Generate a grocery list based on a meal plan
export async function generateGroceryList(mealPlan: any): Promise<any[]> {
  try {
    // For demo purposes with no valid API key, return a canned grocery list
    if (!hasValidApiKey()) {
      console.log('[GROCERY] Using fallback data due to missing or invalid API key');
      return generateDummyGroceryList();
    }
    
    // Extract the most important info from each meal, making sure to use the latest modified data
    const meals = mealPlan.meals.map((meal: any) => {
      // For ingredients, prefer mainIngredients with quantities if available
      const ingredients = meal.ingredients || meal.mainIngredients || [];
      
      return {
        id: meal.id,
        name: meal.name,
        ingredients
      };
    });
    
    // If no meals, return empty list
    if (!meals.length) {
      return [];
    }
    
    // Prepare the prompt for OpenAI to generate the grocery list
    const prompt = `Based on the following meals, generate a comprehensive grocery list.
    
    Meals:
    ${meals.map((meal: any) => 
      `${meal.name}\nIngredients:\n${meal.ingredients.map((ingredient: string) => ` - ${ingredient}`).join('\n')}`
    ).join('\n\n')}
    
    Please create a single consolidated grocery list with all the ingredients needed for these meals. Group similar items together and standardize the quantities when possible (e.g., combine "2 tbsp olive oil" and "1 tbsp olive oil" into "3 tbsp olive oil"), but keep separate if substantially different (e.g., keep "1 red onion" separate from "1 white onion").
    
    Format your response as a JSON array of grocery items, with each item having a 'name' field with the ingredient and quantity (e.g., "2 cups rice") and an 'id' field with a unique identifier.
    
    Example format:
    [
      {
        "id": "item-1",
        "name": "1.5 lbs boneless, skinless chicken breasts",
        "mealIds": ["meal-id-1", "meal-id-3"]
      },
      {
        "id": "item-2",
        "name": "3 tbsp olive oil",
        "mealIds": ["meal-id-1", "meal-id-2"]
      }
    ]
    
    For each ingredient, include a 'mealIds' field that lists the meal IDs this ingredient is used in. This helps with meal-ingredient relationships.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful meal planning assistant that creates organized grocery lists from meal plans.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent formatting
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const content = response.choices[0].message.content || "[]";
    const parsedResponse = JSON.parse(content);
    
    // Handle the case where we get an object with an items property or directly an array
    const groceryItems = Array.isArray(parsedResponse) ? parsedResponse : 
                         (parsedResponse.items && Array.isArray(parsedResponse.items)) ? parsedResponse.items : [];
    
    // Add unique IDs to each item if they don't have one already
    const itemsWithIds = groceryItems.map((item: any, index: number) => {
      if (!item.id) {
        return {
          ...item,
          id: `grocery-${Date.now()}-${index}`
        };
      }
      return item;
    });
    
    console.log(`[GROCERY] Generated ${itemsWithIds.length} grocery items for ${meals.length} meals`);
    
    // Now organize the items into departments using OpenAI
    try {
      const organizedItems = await organizeGroceryItems(itemsWithIds);
      return organizedItems;
    } catch (organizeError) {
      console.error('[GROCERY] Error organizing grocery items:', organizeError);
      // Fall back to a simple organization
      return organizeGroceryItemsSimple(itemsWithIds);
    }
  } catch (error) {
    console.error("Error generating grocery list:", error);
    
    // For API errors, return a structured error message
    if (error instanceof Error) {
      throw new Error(`Failed to generate grocery list: ${error.message}`);
    }
    
    // For other unexpected errors
    throw new Error('Unexpected error generating grocery list');
  }
}

/**
 * Modify a meal based on user requirements
 */
export async function modifyMeal(meal: any, modificationRequest: string, retryCount: number = 0): Promise<any> {
  try {
    // Safety check to prevent infinite recursion
    if (retryCount >= 3) {
      console.warn(`[MODIFY] Maximum retry attempts (${retryCount}) reached for modification. Returning best attempt.`);
      const errorMessage = "Maximum retry attempts reached. Please try a different modification.";
      throw new Error(errorMessage);
    }
    
    // Validate that we have a valid meal to modify
    if (!meal || !meal.name || !meal.ingredients) {
      throw new Error("Invalid meal data provided for modification");
    }
    
    // For demo purposes with no valid API key, simply return the original meal
    if (!hasValidApiKey()) {
      console.log('[MODIFY] No valid OpenAI API key, returning original meal with modification note');
      return {
        ...meal,
        name: `${meal.name} (Modified for ${modificationRequest})`,
        modificationRequest,
        modifiedFrom: meal.name
      };
    }
    
    // Get weather context if location is available
    let weatherContext = "";
    const household = await getHouseholdData();
    if (household && household.location) {
      try {
        weatherContext = await getWeatherContextForMealPlanning(household.location);
        console.log(`[MODIFY] Retrieved weather context for ${household.location}`);
      } catch (weatherError) {
        console.error('[MODIFY] Error getting weather context:', weatherError);
        weatherContext = "Weather information is not available.";
      }
    }
    
    // Prepare the meal data for modification
    const mealToModify = normalizeMeal(meal);
    
    // Add a specific note about the current meal's quality issues if any
    let qualityNotes = "";
    if (mealToModify._qualityIssues && mealToModify._qualityIssues.length > 0) {
      qualityNotes = `IMPORTANT: Fix these quality issues while applying the modification: ${mealToModify._qualityIssues.join('; ')}`;
    }
    
    // Log the modification request for debugging
    console.log(`[MODIFY] Modifying meal "${mealToModify.name}" with request: ${modificationRequest}`);
    console.log(`[MODIFY] Quality notes: ${qualityNotes || 'None'}`);
    
    // Create the request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional chef and recipe writer creating precise, detailed recipes for home cooks.
          Your goal is to modify the provided recipe according to the user's request while keeping the same meal type and similar prep time.
          
          MODIFICATION APPROACH:
          - Maintain the general structure of the meal but accommodate the user's modification requests
          - Create beautiful, detailed recipes in the style of Hello Fresh with clear, step-by-step instructions
          - Keep the same meal category and day assignment as the original
          - Preserve approximately the same prep time (±5 minutes)
          
          Family profile:
          ${household ? `- Family size: ${household.members.length} people
          - Family members: ${household.members.map((m: any) => `${m.name} (${m.age || 'Adult'}, ${m.dietaryRestrictions || 'No restrictions'})`).join(', ')}
          - Available kitchen equipment: ${household.appliances?.join(", ") || "Standard kitchen equipment"}
          - Cooking skill level (1-5): ${household.cookingSkill || 3}
          - Preferences: ${household.preferences || "Family-friendly meals"}
          - Location: ${household.location || "Unknown location"}` : 'Family profile not available.'}
          
          ${weatherContext ? `Current weather and forecast: ${weatherContext}` : ''}
          
          CRITICAL QUALITY REQUIREMENTS - YOUR RECIPE MUST INCLUDE ALL OF THESE:
          1. EXACTLY 10-15 detailed ingredients with specific measurements
          2. EXACTLY 10-12 detailed instructions steps
          3. EVERY step must begin with a specific action verb
          4. EVERY cooking step must include precise times and temperatures
          5. Include specific visual/sensory cues for doneness
          6. NO generic phrases like "cook until done" or "standard procedure"
          7. EVERY cooking technique must include an explanation
          8. Each instruction must be a detailed sentence of 15+ words
          
          OUTPUT FORMAT REQUIREMENTS:
          Every meal MUST include these exact camelCase field names:
          - name: Name of the dish
          - description: Description of the dish (2-3 sentences)
          - day: Day of the week
          - category: Meal category (same as original)
          - categories: Array of meal categories (same as original)
          - prepTime: Preparation time in minutes
          - servings: Number of servings (IMPORTANT: use "servings" not "servingSize")
          
          FOR INGREDIENTS:
          - ingredients: Array of ingredients with quantities
            * THIS IS CRITICAL: Include EXACTLY 10-15 ingredients with EXACT measurements for each (like "1 lb ground beef", "2 cloves garlic, minced")
            * Include all seasonings, oils, and garnishes with specific quantities
            * Every single ingredient mentioned in the instructions MUST be listed here
            * Include salt, pepper, oil quantities specifically - never just "salt and pepper to taste"
            * Format as complete phrases (e.g., "1 pound boneless chicken breasts, cut into 1-inch pieces")
          
          - mainIngredients: Array of ingredients with quantities (same as ingredients, for backward compatibility)
          
          FOR INSTRUCTIONS:
          - instructions: Array of step-by-step instructions (EXACTLY 10-12 detailed steps)
            * EVERY instruction must begin with a strong, specific action verb (e.g., "Heat", "Stir", "Whisk")
            * Include EXACT cooking times, temperatures, and methods for EVERY step with specific numbers (e.g., "Sauté over medium-high heat for exactly 4-5 minutes" not "Sauté until done")
            * Include EXACT time and temperature for any oven, slow cooker, or instant pot steps (e.g., "Bake at 375°F for 25-30 minutes" not "Bake until done")
            * For EVERY ingredient, specify EXACT quantities when used (e.g., "Add 2 tablespoons of olive oil" not "Add oil")
            * EXPLICITLY state minimum internal cooking temperatures (165°F for chicken/poultry, 145°F for fish, 160°F for ground meat)
            * ALWAYS provide multiple sensory cues for doneness (e.g., "until golden brown, crispy on edges, and internal temperature reaches 165°F, about 5-6 minutes")
            * CLEARLY describe what the food should look like at EACH critical stage with visual and textural details (e.g., "the sauce should be glossy and thick enough to coat the back of a spoon")
            * NEVER use generic steps like "cook according to standard procedure" - EVERY step must be explicit and detailed
            * EVERY specialized cooking technique (fold, deglaze, sauté, broil, etc.) MUST include a parenthetical explanation (e.g., "Deglaze the pan (pour liquid into hot pan to loosen browned bits)")
            * For mixed dishes, include SPECIFIC assembly instructions with exact measurements and layering (e.g., "Spread exactly 1 cup of sauce on bottom of dish, layer with 6 lasagna noodles slightly overlapping")
            * Format each instruction as a detailed, specific sentence of at least 15 words with measurements, cooking methods, times, and sensory cues
          
          - rationales: Array of 2-3 reasons why this modification works well
          - modificationRequest: The modification that was requested
          - modifiedFrom: The name of the original meal
          
          WARNING: Your recipe will be strictly validated against all these requirements. If ANY requirement is missing, your recipe will be rejected. The ingredients list must be thorough - every cooking oil, herb, spice and seasoning needs a specific quantity. The instructions must be detailed enough that someone who has never cooked before could successfully follow them.
          IMPORTANT: Make sure every single ingredient mentioned in the instructions is listed in the ingredients array with proper quantities!
          
          Return your response as a single JSON object with these properties.`
        },
        {
          role: "user",
          content: `Please modify this meal according to this request: "${modificationRequest}".
          
          ${qualityNotes}
          
          Original Meal:
          Name: ${mealToModify.name}
          Description: ${mealToModify.description || 'No description provided'}
          Day: ${mealToModify.day || 'Not specified'}
          Category: ${mealToModify.category || 'Not specified'}
          Categories: ${JSON.stringify(mealToModify.categories || [])}
          Prep Time: ${mealToModify.prepTime || 0} minutes
          Servings: ${mealToModify.servings || 4}
          
          Ingredients:
          ${mealToModify.ingredients ? mealToModify.ingredients.map((i: string) => `- ${i}`).join('\n') : 'No ingredients provided'}
          
          Instructions:
          ${mealToModify.instructions ? mealToModify.instructions.map((i: string, idx: number) => `${idx + 1}. ${i}`).join('\n') : 'No instructions provided'}
          
          Rationales:
          ${mealToModify.rationales ? mealToModify.rationales.map((r: string) => `- ${r}`).join('\n') : 'No rationales provided'}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });
    
    try {
      // Parse the response
      const content = response.choices[0].message.content || "{}";
      console.log('[MODIFY] Response received, parsing content');
      
      const modifiedMeal = JSON.parse(content);
      
      // Ensure we have a valid meal object
      if (!modifiedMeal || !modifiedMeal.name || !modifiedMeal.ingredients) {
        console.error('[MODIFY] Invalid response received:', content);
        throw new Error('Invalid response format');
      }
      
      console.log(`[MODIFY] Successfully modified meal: ${modifiedMeal.name}`);
      
      // Preserve the original meal ID for proper UI updates
      modifiedMeal.id = meal.id;
      modifiedMeal.modifiedFrom = meal.name;
      modifiedMeal.originalId = meal.id;
      
      // Normalize property names for consistency
      const normalizedMeal = normalizeMeal(modifiedMeal);
      
      // Validate quality and possibly retry if it fails standards
      const validationResult = validateMealQuality(normalizedMeal);
      if (!validationResult.isValid) {
        console.log(`[MODIFY] Quality issues detected in modified meal: ${validationResult.issues.join(', ')}`);
        
        if (retryCount < 2) { // Allow up to 3 total attempts (0, 1, 2)
          console.log(`[MODIFY] Retrying modification with quality feedback (attempt ${retryCount + 1})`);
          
          // Add quality issues to the meal for feedback in the next attempt
          normalizedMeal._qualityIssues = validationResult.issues;
          
          // Retry with the same parameters plus quality feedback
          return modifyMeal(normalizedMeal, `${modificationRequest} AND fix quality issues: ${validationResult.issues.join('; ')}`, retryCount + 1);
        }
        
        // If we've reached max retries, return the meal but mark it for regeneration
        normalizedMeal._qualityIssues = validationResult.issues;
        normalizedMeal._needsRegeneration = true;
      }
      
      // Improve recipe instructions
      const improvedMeal = improveRecipeInstructions(normalizedMeal);
      
      return improvedMeal;
      
    } catch (error) {
      console.error("[MODIFY] Error parsing modification response:", error);
      
      // If we have retry attempts left, try again
      if (retryCount < 2) {
        console.log(`[MODIFY] Retrying meal modification (attempt ${retryCount + 1})`);
        return modifyMeal(meal, modificationRequest, retryCount + 1);
      }
      
      throw new Error(`Failed to modify meal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error("[MODIFY] Error in meal modification:", error);
    
    // For specific known errors, return clear error message
    if (error instanceof Error) {
      throw new Error(`Error modifying meal: ${error.message}`);
    }
    
    // For other types of errors
    throw new Error('Unexpected error occurred while modifying meal');
  }
}

/**
 * Generate a completely new replacement meal based on the criteria of the original
 */
export async function replaceMeal(meal: any, retryCount: number = 0): Promise<any> {
  try {
    // Validate input
    if (!meal || !meal.name) {
      throw new Error("Invalid meal data provided for replacement");
    }
    
    // Prevent infinite recursion
    if (retryCount >= 3) {
      console.warn(`[REPLACE] Maximum retry attempts (${retryCount}) reached for replacement.`);
      throw new Error("Maximum retry attempts reached. Please try again later.");
    }
    
    // For demo purposes with no valid API key, return a canned meal
    if (!hasValidApiKey()) {
      console.log('[REPLACE] No valid OpenAI API key, using dummy replacement');
      
      // Take a copy of the original meal and modify it slightly
      const dummyMeal = {
        ...meal,
        id: `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: `${meal.name} (Replaced Version)`,
        description: `A variation of ${meal.name} that provides similar nutrition but a different flavor profile.`,
        replacedFrom: meal.name,
        originalId: meal.id
      };
      
      return dummyMeal;
    }
    
    console.log(`[REPLACE] Generating replacement for meal "${meal.name}"`);
    
    // Prepare replacement preferences (using meal's existing categories and other attributes)
    const normalizedMeal = normalizeMeal(meal);
    
    const categories = normalizedMeal.categories || [];
    if (normalizedMeal.category && !categories.includes(normalizedMeal.category)) {
      categories.push(normalizedMeal.category);
    }
    
    const replacementPreferences = {
      replaceMeal: true,
      mealName: normalizedMeal.name,
      categories: categories,
      day: normalizedMeal.day || null,
      prepTime: normalizedMeal.prepTime || 30,
      servings: normalizedMeal.servings || 4
    };
    
    // Get household data for context
    const household = await getHouseholdData();
    
    // Use the standard meal plan generation but with specific replacementPreferences
    let replacementMeals = await generateMealPlan(household, replacementPreferences, retryCount);
    
    // If we got multiple meals (shouldn't happen, but just in case), take the first one
    let replacementMeal = Array.isArray(replacementMeals) && replacementMeals.length > 0 
      ? replacementMeals[0]
      : null;
    
    // Validate we got a useful replacement
    if (!replacementMeal || !replacementMeal.name) {
      console.error('[REPLACE] Failed to generate a valid replacement meal');
      
      if (retryCount < 2) {
        console.log(`[REPLACE] Retrying replacement (attempt ${retryCount + 1})`);
        return replaceMeal(meal, retryCount + 1);
      }
      
      throw new Error('Failed to generate a valid replacement meal');
    }
    
    // Add metadata about the replacement relationship
    replacementMeal.replacedFrom = normalizedMeal.name;
    replacementMeal.originalId = normalizedMeal.id;
    
    // Validate quality standards
    const validationResult = validateMealQuality(replacementMeal);
    if (!validationResult.isValid) {
      console.log(`[REPLACE] Quality issues detected in replacement: ${validationResult.issues.join(', ')}`);
      
      if (retryCount < 2) {
        console.log(`[REPLACE] Retrying replacement with quality feedback (attempt ${retryCount + 1})`);
        
        // Add quality marker to trigger regeneration
        replacementMeal._qualityIssues = validationResult.issues;
        
        // Retry
        return replaceMeal(meal, retryCount + 1);
      }
      
      // If we've reached max retries, return the meal but mark it for regeneration
      replacementMeal._qualityIssues = validationResult.issues;
      replacementMeal._needsRegeneration = true;
    }
    
    // Improve recipe instructions
    const improvedMeal = improveRecipeInstructions(replacementMeal);
    
    console.log(`[REPLACE] Successfully generated replacement: ${improvedMeal.name}`);
    return improvedMeal;
    
  } catch (error) {
    console.error('[REPLACE] Error generating replacement meal:', error);
    
    if (error instanceof Error) {
      throw new Error(`Error replacing meal: ${error.message}`);
    }
    
    throw new Error('Unexpected error occurred while replacing meal');
  }
}

async function getHouseholdData() {
  try {
    // This is a stub - in a real implementation, this would get actual household data from storage
    // For now, we'll return a simple structure
    return {
      members: [
        { name: "Adult", age: 35, dietaryRestrictions: "" },
        { name: "Child", age: 10, dietaryRestrictions: "" }
      ],
      appliances: ["ovenStovetop", "microwave", "slowCooker"],
      cookingSkill: 3,
      preferences: "Family-friendly meals",
      location: "New York, NY"
    };
  } catch (error) {
    console.error("Error retrieving household data:", error);
    return null;
  }
}

/**
 * Improve the quality of a meal's instructions to ensure they're detailed and specific
 * This is a post-processing step to fix common issues
 */
function improveRecipeInstructions(recipe: any): any {
  if (!recipe) return recipe;
  
  // Deep copy to avoid modifying the original
  const improvedRecipe = JSON.parse(JSON.stringify(recipe));
  
  // Convert directions to instructions if needed (backwards compatibility)
  if (improvedRecipe.directions && (!improvedRecipe.instructions || improvedRecipe.instructions.length === 0)) {
    improvedRecipe.instructions = improvedRecipe.directions;
  }
  
  // If we don't have instructions, we can't improve them
  if (!improvedRecipe.instructions || !Array.isArray(improvedRecipe.instructions)) {
    return improvedRecipe;
  }
  
  // Check for generic placeholder instructions
  const genericInstructionPatterns = [
    'according to the ingredients list',
    'as needed for this recipe',
    'following standard procedures',
    'enjoy with your family',
    'standard procedure',
    'preheat your oven or stovetop as needed',
    'cook until all components are thoroughly cooked',
    'combine the ingredients according to'
  ];
  
  const hasGenericInstructions = improvedRecipe.instructions.some((instruction: string) => 
    typeof instruction === 'string' && 
    genericInstructionPatterns.some(pattern => instruction.toLowerCase().includes(pattern))
  );
  
  // Check if we have too few instructions (likely placeholders or incomplete)
  const hasTooFewInstructions = improvedRecipe.instructions.length <= 5;
  
  // If we have placeholder instructions, generate more detailed ones based on the ingredients
  if (hasGenericInstructions || hasTooFewInstructions) {
    console.log(`[IMPROVE RECIPE] Detected ${hasGenericInstructions ? 'generic placeholder instructions' : 'too few instructions'} for ${improvedRecipe.name}`);
    
    // Mark this recipe for regeneration
    improvedRecipe._qualityIssues = improvedRecipe._qualityIssues || [];
    improvedRecipe._qualityIssues.push("Contains generic placeholder instructions that need improvement");
    improvedRecipe._needsRegeneration = true;
    
    // Only attempt to generate detailed instructions if we have ingredients
    if (improvedRecipe.ingredients && Array.isArray(improvedRecipe.ingredients) && improvedRecipe.ingredients.length >= 5) {
      console.log(`[IMPROVE RECIPE] Attempting to create better instructions based on ${improvedRecipe.ingredients.length} ingredients`);
      
      // Categorize ingredients
      const proteins = improvedRecipe.ingredients.filter((ing: string) => {
        const lower = ing.toLowerCase();
        return lower.includes('chicken') || lower.includes('beef') || 
               lower.includes('pork') || lower.includes('fish') || 
               lower.includes('tofu') || lower.includes('shrimp') ||
               lower.includes('salmon') || lower.includes('turkey');
      });
      
      const vegetables = improvedRecipe.ingredients.filter((ing: string) => {
        const lower = ing.toLowerCase();
        return lower.includes('onion') || lower.includes('carrot') || 
               lower.includes('pepper') || lower.includes('broccoli') || 
               lower.includes('zucchini') || lower.includes('tomato') ||
               lower.includes('spinach') || lower.includes('kale');
      });
      
      const starches = improvedRecipe.ingredients.filter((ing: string) => {
        const lower = ing.toLowerCase();
        return lower.includes('rice') || lower.includes('pasta') || 
               lower.includes('potato') || lower.includes('bread') || 
               lower.includes('noodle') || lower.includes('quinoa');
      });
      
      const sauces = improvedRecipe.ingredients.filter((ing: string) => {
        const lower = ing.toLowerCase();
        return lower.includes('sauce') || lower.includes('stock') || 
               lower.includes('broth') || lower.includes('olive oil') || 
               lower.includes('vinegar') || lower.includes('soy sauce');
      });
      
      const herbs = improvedRecipe.ingredients.filter((ing: string) => {
        const lower = ing.toLowerCase();
        return lower.includes('cilantro') || lower.includes('parsley') || 
               lower.includes('basil') || lower.includes('thyme') || 
               lower.includes('oregano') || lower.includes('rosemary');
      });
      
      // Determine recipe type based on name and ingredients
      const isStirFry = improvedRecipe.name.toLowerCase().includes('stir') || 
                        improvedRecipe.name.toLowerCase().includes('asian') ||
                        improvedRecipe.name.toLowerCase().includes('teriyaki');
      
      const isTaco = improvedRecipe.name.toLowerCase().includes('taco') ||
                     improvedRecipe.ingredients.some((ing: string) => ing.toLowerCase().includes('tortilla'));
      
      const isPasta = improvedRecipe.name.toLowerCase().includes('pasta') || 
                      improvedRecipe.name.toLowerCase().includes('alfredo') ||
                      improvedRecipe.ingredients.some((ing: string) => ing.toLowerCase().includes('pasta'));
      
      const isInstantPot = improvedRecipe.name.toLowerCase().includes('instant pot') ||
                           improvedRecipe.name.toLowerCase().includes('pressure cooker');
      
      const isSlowCooker = improvedRecipe.name.toLowerCase().includes('slow cooker') ||
                           improvedRecipe.name.toLowerCase().includes('crock pot');
                           
      // Generate appropriate instructions based on recipe type
      const newInstructions = [];
      
      // Step 1: Prep ingredients (all recipe types)
      newInstructions.push(`Prepare all ingredients by washing, chopping, and measuring according to the ingredients list: thoroughly rinse all produce, chop vegetables into uniform pieces, and organize ingredients in separate bowls for easy access during cooking.`);
      
      // Step 2: Initial cooking setup
      if (isInstantPot) {
        newInstructions.push(`Set the Instant Pot to sauté mode and add 2 tablespoons of oil, allowing it to heat for approximately 1 minute until the display shows "Hot" and the oil shimmers slightly.`);
      } else if (isSlowCooker) {
        newInstructions.push(`Lightly coat the slow cooker insert with 1 tablespoon of oil or cooking spray, ensuring even coverage to prevent sticking during the long cooking process.`);
      } else {
        newInstructions.push(`Heat a large skillet or sauté pan over medium-high heat and add 2 tablespoons of oil, allowing it to heat for 30 seconds until it shimmers but doesn't smoke.`);
      }
      
      // Step 3-4: Protein cooking (recipe specific)
      if (proteins.length > 0) {
        const protein = proteins[0].replace(/^\d+\s+(tablespoons?|teaspoons?|cups?|pounds?|ounces?|grams?)\s+/i, '');
        newInstructions.push(`Season ${protein} with 1/2 teaspoon salt and 1/4 teaspoon black pepper, ensuring even coverage on all sides for balanced flavor throughout the dish.`);
        
        if (isStirFry) {
          newInstructions.push(`Cook ${protein} in the hot oil for 3-4 minutes per side until golden brown on the outside and no longer pink inside, with an internal temperature of 165°F for poultry or 145°F for beef, working in batches if necessary to avoid overcrowding the pan.`);
        } else if (isTaco) {
          newInstructions.push(`Cook ${protein} over medium-high heat for 5-6 minutes, breaking larger pieces apart with a wooden spoon, until completely browned with no pink remaining and the internal temperature reaches the appropriate safety level (165°F for poultry, 160°F for ground meat).`);
        } else if (isPasta) {
          newInstructions.push(`Sauté ${protein} in the hot pan for 5-7 minutes until browned and cooked through to an internal temperature of 165°F, then remove to a clean plate and set aside while keeping warm.`);
        } else if (isInstantPot) {
          newInstructions.push(`Brown ${protein} in the Instant Pot on sauté mode for 4-5 minutes until golden on all sides but not fully cooked through, working in batches if necessary to avoid steaming instead of browning.`);
        } else if (isSlowCooker) {
          newInstructions.push(`Place the seasoned ${protein} in an even layer at the bottom of the slow cooker, arranging pieces to ensure even cooking throughout the long cooking process.`);
        } else {
          newInstructions.push(`Cook ${protein} for 5-6 minutes, turning occasionally, until browned on all sides and cooked to the proper internal temperature (165°F for chicken, 145°F for fish, 160°F for ground meat), then transfer to a clean plate.`);
        }
      }
      
      // Step 5-6: Vegetable cooking
      if (vegetables.length > 0) {
        const firstTwoVegetables = vegetables.slice(0, 2).map(v => v.replace(/^\d+\s+(tablespoons?|teaspoons?|cups?|pounds?|ounces?|grams?)\s+/i, '')).join(' and ');
        
        if (isStirFry) {
          newInstructions.push(`Add ${firstTwoVegetables} to the same pan and stir-fry for 3-4 minutes over high heat, tossing frequently until vegetables are bright in color and crisp-tender but not fully soft.`);
        } else if (isInstantPot || isSlowCooker) {
          newInstructions.push(`Layer ${firstTwoVegetables} on top of the protein in the ${isInstantPot ? 'Instant Pot' : 'slow cooker'}, distributing evenly across the cooking surface.`);
        } else {
          newInstructions.push(`Add ${firstTwoVegetables} to the pan and sauté for 4-5 minutes over medium heat, stirring occasionally until softened but still maintaining some firmness and bright color.`);
        }
        
        // More vegetables if available
        if (vegetables.length > 2) {
          const remainingVegetables = vegetables.slice(2, 4).map(v => v.replace(/^\d+\s+(tablespoons?|teaspoons?|cups?|pounds?|ounces?|grams?)\s+/i, '')).join(' and ');
          
          if (!isInstantPot && !isSlowCooker) {
            newInstructions.push(`Add ${remainingVegetables} to the pan and continue cooking for an additional 2-3 minutes, stirring frequently until all vegetables are tender-crisp and aromatic.`);
          }
        }
      }
      
      // Step 7-8: Sauce/liquid addition
      if (sauces.length > 0) {
        const sauce = sauces[0].replace(/^\d+\s+(tablespoons?|teaspoons?|cups?|pounds?|ounces?|grams?)\s+/i, '');
        
        if (isStirFry) {
          newInstructions.push(`Pour ${sauce} over the vegetables and bring to a simmer, then return the cooked protein to the pan and toss everything together for 1-2 minutes until the sauce thickens slightly and coats all ingredients evenly.`);
        } else if (isInstantPot) {
          newInstructions.push(`Pour ${sauce} over all ingredients in the Instant Pot, secure the lid ensuring the valve is set to "sealing" position, and program to cook on high pressure for 8 minutes followed by a 10-minute natural pressure release.`);
        } else if (isSlowCooker) {
          newInstructions.push(`Pour ${sauce} over all ingredients in the slow cooker, place the lid securely on top, and cook on low heat for 6-8 hours or high heat for 3-4 hours until the protein is fork-tender and fully cooked through.`);
        } else if (isPasta) {
          newInstructions.push(`Reduce heat to medium-low and pour ${sauce} into the pan, stirring constantly to incorporate any browned bits from the bottom of the pan (deglazing), then simmer for 3-4 minutes until the sauce begins to thicken slightly.`);
        } else {
          newInstructions.push(`Add ${sauce} to the pan and bring to a gentle simmer, then return any reserved protein to the pan, reduce heat to medium-low, and cook for 5-7 minutes until sauce thickens slightly and all ingredients are heated through.`);
        }
      }
      
      // Step 9: Starch addition if available
      if (starches.length > 0) {
        const starch = starches[0].replace(/^\d+\s+(tablespoons?|teaspoons?|cups?|pounds?|ounces?|grams?)\s+/i, '');
        
        if (isPasta && starch.toLowerCase().includes('pasta')) {
          newInstructions.push(`While the sauce simmers, cook ${starch} in a separate large pot of salted boiling water according to package directions until al dente (tender but still firm when bitten), about 8-10 minutes, then drain well but do not rinse.`);
          newInstructions.push(`Add the drained ${starch} directly to the sauce, gently tossing with tongs or a pasta fork to coat every strand evenly, then cook together for 1-2 minutes allowing the pasta to absorb some of the sauce's flavor.`);
        } else if (starch.toLowerCase().includes('rice') || starch.toLowerCase().includes('quinoa')) {
          newInstructions.push(`Serve the finished dish over hot cooked ${starch}, spooning the protein, vegetables, and sauce generously over the base for an attractive presentation.`);
        } else if (isTaco && starch.toLowerCase().includes('tortilla')) {
          newInstructions.push(`Warm ${starch} according to package directions until soft and pliable: either wrap in foil and heat in a 350°F oven for 5-7 minutes, or place directly over a gas flame for 10-15 seconds per side until lightly charred in spots.`);
        }
      }
      
      // Step 10: Herb/garnish addition
      if (herbs.length > 0) {
        const herb = herbs[0].replace(/^\d+\s+(tablespoons?|teaspoons?|cups?|pounds?|ounces?|grams?)\s+/i, '');
        newInstructions.push(`Sprinkle ${herb} over the finished dish just before serving, distributing evenly for a fresh flavor boost and attractive color contrast against the other ingredients.`);
      } else {
        newInstructions.push(`Taste the finished dish and adjust seasoning if necessary, adding up to 1/4 teaspoon more salt and a pinch of black pepper if needed to enhance the flavors.`);
      }
      
      // Step 11: Final plating/serving
      if (isTaco) {
        newInstructions.push(`Assemble tacos by placing a generous portion of the filling in the center of each warmed tortilla, then top with your favorite garnishes such as diced tomatoes, shredded lettuce, cheese, or sour cream.`);
      } else if (isStirFry) {
        newInstructions.push(`Transfer the stir-fry to a large serving platter or individual plates, ensuring a good mixture of protein, vegetables, and sauce in each portion for balanced flavor and appearance.`);
      } else if (isPasta) {
        newInstructions.push(`Serve the pasta immediately in warmed bowls, twirling long pasta shapes into a neat mound or arranging shorter shapes in an even layer, then sprinkle with additional cheese or herbs if desired.`);
      } else if (isInstantPot || isSlowCooker) {
        newInstructions.push(`Carefully transfer the finished dish to a large serving bowl using a slotted spoon to drain excess liquid, arranging larger pieces of protein on top for an attractive presentation.`);
      } else {
        newInstructions.push(`Plate the finished dish attractively, dividing the components evenly among warmed plates and spooning sauce on top, ensuring each portion has a good balance of protein, vegetables, and accompaniments.`);
      }
      
      // Step 12: Enjoy!
      newInstructions.push(`Serve immediately while hot, garnishing with any remaining fresh ingredients or a squeeze of citrus if available to brighten the flavors, and enjoy within 15-20 minutes of cooking for the best taste and texture.`);
      
      // Only use our generated instructions if we have enough of them
      if (newInstructions.length >= 10) {
        // Mark the recipe with a note about the regenerated instructions
        improvedRecipe._regeneratedInstructions = true;
        improvedRecipe.instructions = newInstructions;
        
        // Also update directions for backward compatibility
        if (improvedRecipe.directions) {
          improvedRecipe.directions = newInstructions;
        }
        
        console.log(`[IMPROVE RECIPE] Successfully generated ${newInstructions.length} detailed instructions for ${improvedRecipe.name}`);
      }
    }
    
    return improvedRecipe;
  }
  
  // Define common generic instructions that need improvement
  const genericPhraseReplacements = [
    { pattern: /cook until done/i, replacement: "cook until golden brown and internal temperature reaches the safe point (165°F for poultry, 145°F for fish, 160°F for ground meat), about 10-12 minutes" },
    { pattern: /salt and pepper to taste/i, replacement: "add 1/2 teaspoon salt and 1/4 teaspoon freshly ground black pepper, adjusting according to your preference" },
    { pattern: /season to taste/i, replacement: "season with 1/2 teaspoon salt and 1/4 teaspoon black pepper, adjusting to your preference after tasting" },
    { pattern: /set aside/i, replacement: "transfer to a clean plate or bowl and set aside, keeping warm by covering loosely with aluminum foil" },
    { pattern: /serve immediately/i, replacement: "serve immediately while hot, garnishing with fresh herbs if desired for added color and flavor" },
    { pattern: /enjoy/i, replacement: "enjoy while hot, with your favorite beverage on the side for a complete dining experience" },
    { pattern: /prepare all ingredients/i, replacement: "measure and prepare all ingredients according to the list: wash and chop vegetables, measure spices, and organize your cooking station" },
    { pattern: /preheat your oven/i, replacement: "preheat your oven to 375°F (190°C) and position the rack in the center of the oven for even cooking" },
    { pattern: /cook following standard procedures/i, replacement: "cook over medium-high heat for 6-8 minutes, stirring occasionally, until golden brown and cooked through to a safe internal temperature" },
    { pattern: /mix well/i, replacement: "mix thoroughly with a wooden spoon or silicone spatula, ensuring all ingredients are well incorporated for even flavor distribution" },
    { pattern: /combine the ingredients/i, replacement: "combine all prepared ingredients in the bowl, gently folding together with a spatula until everything is evenly distributed" }
  ];
  
  // Fix common issues in instructions
  improvedRecipe.instructions = improvedRecipe.instructions.map((instruction: string) => {
    // Ensure string type
    if (typeof instruction !== 'string') return instruction;
    
    let improved = instruction;
    
    // Replace generic phrases with more specific ones
    for (const { pattern, replacement } of genericPhraseReplacements) {
      if (pattern.test(improved)) {
        improved = improved.replace(pattern, replacement);
      }
    }
    
    // Break down overly long instructions
    if (improved.length > 200 && improved.includes(', then')) {
      const parts = improved.split(', then');
      if (parts.length >= 2) {
        // Only use the first part with proper capitalization and punctuation
        improved = parts[0].trim();
        if (!improved.endsWith('.')) {
          improved += '.';
        }
      }
    }
    
    // Expand abbreviated measurements
    improved = improved.replace(/(\d+)\s+tbsp/gi, '$1 tablespoons');
    improved = improved.replace(/(\d+)\s+tsp/gi, '$1 teaspoons');
    
    // No longer forcing action verbs at the beginning of each step
    // Removed the automatic action verb prefixing to allow for more natural instructions
    
    // If instruction is still too short, add more detail
    if (improved.length < 25) {
      // Flag the meal for regeneration
      improvedRecipe._qualityIssues = improvedRecipe._qualityIssues || [];
      if (!improvedRecipe._qualityIssues.includes("Contains short instructions that need more detail")) {
        improvedRecipe._qualityIssues.push("Contains short instructions that need more detail");
      }
      improvedRecipe._needsRegeneration = true;
      
      // Try to expand it anyway
      if (improved.toLowerCase().includes('stir')) {
        improved += ' using a wooden spoon or silicone spatula, ensuring all ingredients are well distributed for even cooking and flavor';
      } else if (improved.toLowerCase().includes('heat') || improved.toLowerCase().includes('cook')) {
        improved += ' at medium-high temperature for 4-5 minutes, monitoring closely to prevent burning while ensuring thorough cooking';
      } else if (improved.toLowerCase().includes('season')) {
        improved += ' evenly on all sides, using your fingers to gently rub the spices into the surface for maximum flavor penetration';
      }
    }
    
    return improved;
  });
  
  return improvedRecipe;
}

/**
 * Validate a meal to ensure it meets quality standards
 * Returns an object with a boolean indicating if the meal is valid and any error messages
 */
export function validateMealQuality(meal: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Validate meal has all required fields
  if (!meal.name) issues.push("Missing meal name");
  if (!meal.description) issues.push("Missing meal description");
  if (!meal.prepTime) issues.push("Missing prep time");
  if (!meal.servings) issues.push("Missing servings");
  
  // Validate ingredients
  if (!meal.ingredients || !Array.isArray(meal.ingredients)) {
    issues.push("Missing ingredients array");
  }
  
  // Validate instructions - using simplified criteria
  if (!meal.instructions || !Array.isArray(meal.instructions)) {
    issues.push("Missing instructions array");
  } else {
    // 1. Check for minimum steps (at least 5)
    if (meal.instructions.length < 5) {
      issues.push(`Too few instruction steps (${meal.instructions.length}). Need at least 5 steps.`);
    }
    
    // Check temperature/timing information across all instructions
    let stepsWithTempOrTime = 0;
    let bannedPhraseFound = false;
    
    // 2 & 3. Check for banned phrases and temperature/timing
    meal.instructions.forEach((instruction: string) => {
      if (typeof instruction !== 'string') return;
      
      // Check for truly unhelpful banned phrases
      const bannedPhrases = [
        "cook until done",
        "follow package directions",
        "cook according to instructions",
        "standard procedure",
        "cook following standard procedures"
      ];
      
      for (const phrase of bannedPhrases) {
        if (instruction.toLowerCase().includes(phrase.toLowerCase())) {
          issues.push(`Recipe contains unhelpful phrase: "${phrase}"`);
          bannedPhraseFound = true;
          break;
        }
      }
      
      // Check for temperature or timing information
      const hasTemperatureOrTime = /(\d+\s*°[fc]|\d+\s*(minutes?|mins?|hours?|hrs?|seconds?|secs?))/i.test(instruction);
      if (hasTemperatureOrTime) {
        stepsWithTempOrTime++;
      }
    });
    
    // Ensure at least 2 steps have temperature or timing info
    if (stepsWithTempOrTime < 2 && !bannedPhraseFound) {
      issues.push(`Recipe should include specific temperature or timing information in at least 2 steps (found in ${stepsWithTempOrTime}).`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues: issues
  };
}

/**
 * Normalize meal object field names for consistency
 * This function ensures backward compatibility with older meal formats
 * by normalizing field names to the current standard
 */
export function normalizeMeal(meal: any): any {
  if (!meal) return meal;
  
  // Create a copy to avoid modifying the original
  const normalizedMeal = { ...meal };
  
  // Convert directions/steps to instructions if needed (backwards compatibility)
  if (normalizedMeal.directions && (!normalizedMeal.instructions || normalizedMeal.instructions.length === 0)) {
    console.log(`[MEAL NORMALIZE] Converted directions → instructions for meal: ${normalizedMeal.name}`);
    normalizedMeal.instructions = normalizedMeal.directions;
  }
  if (normalizedMeal.steps && (!normalizedMeal.instructions || normalizedMeal.instructions.length === 0)) {
    console.log(`[MEAL NORMALIZE] Converted steps → instructions for meal: ${normalizedMeal.name}`);
    normalizedMeal.instructions = normalizedMeal.steps;
  }
  
  // Ensure we have both mainIngredients and ingredients fields
  if (normalizedMeal.mainIngredients && 
      (!normalizedMeal.ingredients || normalizedMeal.ingredients.length === 0)) {
    normalizedMeal.ingredients = normalizedMeal.mainIngredients;
  } else if (normalizedMeal.ingredients && 
             (!normalizedMeal.mainIngredients || normalizedMeal.mainIngredients.length === 0)) {
    normalizedMeal.mainIngredients = normalizedMeal.ingredients;
  }
  
  // Handle case where mainIngredients might have details that ingredients doesn't
  if (normalizedMeal.ingredients && normalizedMeal.mainIngredients && 
      JSON.stringify(normalizedMeal.ingredients) !== JSON.stringify(normalizedMeal.mainIngredients)) {
    // Prefer the longer list of ingredients
    if (normalizedMeal.mainIngredients.length > normalizedMeal.ingredients.length) {
      console.log(`[MEAL NORMALIZE] Merged mainIngredients into ingredients for meal: ${normalizedMeal.name} (${normalizedMeal.mainIngredients.length} total ingredients)`);
      normalizedMeal.ingredients = normalizedMeal.mainIngredients;
    } else {
      console.log(`[MEAL NORMALIZE] Merged mainIngredients into ingredients for meal: ${normalizedMeal.name} (${normalizedMeal.ingredients.length} total ingredients)`);
      normalizedMeal.mainIngredients = normalizedMeal.ingredients;
    }
  }
  
  // Ensure servings is a number
  if (normalizedMeal.servings && typeof normalizedMeal.servings === 'string') {
    normalizedMeal.servings = parseInt(normalizedMeal.servings, 10) || 4;
  }
  
  // Ensure prepTime is a number
  if (normalizedMeal.prepTime && typeof normalizedMeal.prepTime === 'string') {
    normalizedMeal.prepTime = parseInt(normalizedMeal.prepTime, 10) || 30;
  }
  
  // Ensure categories is an array
  if (!normalizedMeal.categories && normalizedMeal.category) {
    normalizedMeal.categories = [normalizedMeal.category];
  } else if (!normalizedMeal.categories) {
    normalizedMeal.categories = [];
  }
  
  // Log normalized properties for debugging
  const properties = Object.keys(normalizedMeal);
  console.log(`[MEAL NORMALIZE] Normalized meal properties for ${normalizedMeal.name}: ${properties.join(', ')}`);
  
  return normalizedMeal;
}

function generateDummyResponse(messages: Message[]): string {
  // Look for keywords in the latest user message to generate context-aware responses
  const lastUserMessage = messages.findLast(m => m.role === 'user')?.content || '';
  
  if (lastUserMessage.toLowerCase().includes('hello') || lastUserMessage.toLowerCase().includes('hi')) {
    return "Hello! I'm your meal planning assistant. How can I help you today? I can suggest recipes, create meal plans for the week, or help with your cooking questions.";
  }
  
  if (lastUserMessage.toLowerCase().includes('meal plan') || lastUserMessage.toLowerCase().includes('dinner ideas')) {
    return "I'd be happy to help with meal planning! Some dinner ideas for this week could include: \n\n• Sheet Pan Chicken Fajitas - quick and great for busy weeknights\n• Pasta Primavera - vegetable-packed and versatile\n• Slow Cooker Beef Stew - perfect comfort food that cooks while you're away\n• Teriyaki Salmon - healthy with a touch of sweetness\n• Homemade Pizza Night - fun for the whole family to customize\n\nWould you like more details about any of these meals?";
  }
  
  if (lastUserMessage.toLowerCase().includes('reset') || lastUserMessage.toLowerCase().includes('clear') || lastUserMessage.toLowerCase().includes('start over')) {
    return "I've reset our conversation! How can I help you with meal planning today?";
  }
  
  if (lastUserMessage.toLowerCase().includes('recipe') || lastUserMessage.toLowerCase().includes('how to make') || lastUserMessage.toLowerCase().includes('how do i cook')) {
    return "I'd be happy to help with recipe suggestions! To give you the best recommendations, could you share a bit more about what ingredients you have on hand, any dietary preferences, and how much time you have to cook?";
  }
  
  // Default response for any other queries
  return "I'm your friendly meal planning assistant. I can help suggest recipes based on your preferences, create weekly meal plans, or answer cooking questions. What would you like help with today?";
}

function generateDummyMeals(preferences: any): any[] {
  // Basic template for dummy meals
  const dummyMeals = [
    {
      id: `meal-${Date.now()}-1`,
      name: "Sheet Pan Chicken Fajitas",
      description: "A quick and easy Mexican-inspired dinner with colorful bell peppers and tender chicken, all roasted on a single sheet pan for minimal cleanup.",
      day: "Monday",
      category: "Quick & Easy",
      categories: ["quick", "mexican"],
      prepTime: 25,
      servings: 4,
      ingredients: [
        "1.5 lbs boneless, skinless chicken breast, sliced into strips", 
        "1 red bell pepper, sliced", 
        "1 green bell pepper, sliced", 
        "1 yellow bell pepper, sliced", 
        "1 large onion, sliced", 
        "2 tbsp olive oil", 
        "1 packet (2 tbsp) fajita seasoning", 
        "1 tsp salt",
        "1/2 tsp black pepper",
        "8 small flour tortillas", 
        "1 lime, cut into wedges", 
        "1/2 cup sour cream for serving", 
        "1/4 cup chopped fresh cilantro for garnish"
      ],
      directions: [
        "Preheat oven to 425°F (220°C) and line a large baking sheet with parchment paper.",
        "In a large bowl, toss the chicken strips, sliced bell peppers, and onion with olive oil, fajita seasoning, salt, and pepper until evenly coated.",
        "Spread the mixture in a single layer on the prepared baking sheet.",
        "Roast in the preheated oven for 20-25 minutes, stirring halfway through, until chicken is cooked through and vegetables are tender with light charring on edges.",
        "During the last 5 minutes of cooking, wrap tortillas in aluminum foil and place in the oven to warm.",
        "Serve the fajita mixture with warm tortillas, lime wedges, sour cream, and fresh cilantro."
      ],
      rationales: ["Fits your weeknight time constraints", "Uses your family's preferred protein", "One-pan meal means easy cleanup"]
    },
    {
      id: `meal-${Date.now()}-2`,
      name: "Slow Cooker Beef Stew",
      description: "A hearty, comforting beef stew that simmers all day in the slow cooker, creating tender meat and vegetables in a rich, flavorful broth.",
      day: "Tuesday",
      category: "Slow Cooker",
      categories: ["slow cooker", "beef"],
      prepTime: 15,
      servings: 6,
      ingredients: [
        "2 lbs beef stew meat, cut into 1-inch cubes",
        "1/4 cup all-purpose flour",
        "1 tsp salt",
        "1/2 tsp black pepper",
        "2 tbsp olive oil",
        "1 large onion, diced",
        "3 cloves garlic, minced",
        "4 carrots, peeled and sliced",
        "3 celery stalks, sliced",
        "1 lb potatoes, cut into 1-inch pieces",
        "2 cups beef broth",
        "1 tbsp tomato paste",
        "1 tsp dried thyme",
        "1 bay leaf",
        "1 cup frozen peas (added near end of cooking)"
      ],
      directions: [
        "In a large bowl, toss beef with flour, salt, and pepper until evenly coated.",
        "Heat olive oil in a large skillet over medium-high heat. Brown the meat in batches, transferring to slow cooker as you go.",
        "In the same skillet, sauté onion and garlic for 2-3 minutes until softened, then add to slow cooker.",
        "Add carrots, celery, potatoes, beef broth, tomato paste, thyme, and bay leaf to the slow cooker.",
        "Cover and cook on low for 8 hours or on high for 4 hours, until beef is tender.",
        "In the last 30 minutes of cooking, stir in frozen peas.",
        "Remove bay leaf before serving. Adjust seasoning if needed."
      ],
      rationales: ["Perfect for busy days - just set it and forget it", "Provides abundant leftovers for lunch the next day", "Balanced complete meal with protein and vegetables"]
    },
    {
      id: `meal-${Date.now()}-3`,
      name: "Mediterranean Baked Salmon",
      description: "Flaky salmon fillets topped with a flavorful mixture of cherry tomatoes, olives, and feta cheese, all baked to perfection for a healthy, protein-rich dinner.",
      day: "Wednesday",
      category: "Weeknight",
      categories: ["seafood", "mediterranean", "healthy"],
      prepTime: 35,
      servings: 4,
      ingredients: [
        "4 salmon fillets (6 oz each)",
        "2 tbsp olive oil, divided",
        "1 tsp dried oregano",
        "1/2 tsp salt",
        "1/4 tsp black pepper",
        "2 cups cherry tomatoes, halved",
        "1/2 cup Kalamata olives, pitted and halved",
        "1/4 cup red onion, thinly sliced",
        "2 cloves garlic, minced",
        "1 lemon, juiced and zested",
        "1/4 cup crumbled feta cheese",
        "2 tbsp fresh parsley, chopped",
        "1 tbsp fresh dill, chopped"
      ],
      directions: [
        "Preheat oven to 375°F (190°C) and line a baking sheet with parchment paper.",
        "Place salmon fillets on the prepared baking sheet and brush with 1 tbsp olive oil.",
        "Season salmon with dried oregano, salt, and pepper.",
        "In a bowl, combine cherry tomatoes, olives, red onion, garlic, lemon zest, and remaining 1 tbsp olive oil.",
        "Spoon the tomato mixture around and partly on top of the salmon fillets.",
        "Bake for 15-18 minutes, until salmon is cooked through and flakes easily with a fork.",
        "Sprinkle with crumbled feta cheese, fresh parsley, dill, and lemon juice before serving."
      ],
      rationales: ["Provides heart-healthy omega-3 fatty acids", "Light yet satisfying option for mid-week meals", "Quick preparation with minimal cleanup"]
    },
    {
      id: `meal-${Date.now()}-4`,
      name: "Creamy Chicken and Vegetable Pasta",
      description: "A comforting pasta dish with tender chicken, colorful vegetables, and a creamy parmesan sauce that's sure to please the whole family.",
      day: "Thursday",
      category: "Weeknight",
      categories: ["pasta", "chicken"],
      prepTime: 30,
      servings: 4,
      ingredients: [
        "8 oz fettuccine pasta",
        "1 lb boneless, skinless chicken breast, cut into bite-sized pieces",
        "1 tsp salt, divided",
        "1/2 tsp black pepper, divided",
        "2 tbsp olive oil",
        "1 tbsp butter",
        "1 small onion, diced",
        "2 cloves garlic, minced",
        "1 red bell pepper, sliced",
        "2 cups broccoli florets",
        "1 cup cherry tomatoes, halved",
        "1 cup heavy cream",
        "1/2 cup chicken broth",
        "3/4 cup grated Parmesan cheese",
        "2 tbsp fresh basil, chopped"
      ],
      directions: [
        "Cook pasta according to package instructions. Reserve 1/2 cup pasta water before draining.",
        "Season chicken pieces with 1/2 tsp salt and 1/4 tsp pepper.",
        "Heat olive oil in a large skillet over medium-high heat. Add chicken and cook for 5-6 minutes until golden and cooked through. Remove to a plate.",
        "In the same skillet, melt butter. Add onion and garlic, cooking for 2 minutes until softened.",
        "Add bell pepper and broccoli, cooking for 3-4 minutes until vegetables begin to soften.",
        "Pour in chicken broth, scraping up any browned bits from the bottom of the pan.",
        "Reduce heat to medium-low and add heavy cream. Simmer for 3 minutes until slightly thickened.",
        "Stir in Parmesan cheese until melted and smooth.",
        "Return chicken to the skillet and add cherry tomatoes and drained pasta, tossing to coat everything in the sauce. If needed, add some reserved pasta water to thin the sauce.",
        "Season with remaining salt and pepper, and garnish with fresh basil before serving."
      ],
      rationales: ["Balanced one-pot meal with protein, vegetables and carbs", "Kid-friendly without being overly simple", "Versatile - can easily substitute vegetables based on what's available"]
    }
  ];
  
  // If specific days were requested, match those days
  if (preferences && preferences.mealsByDay) {
    const days = Object.keys(preferences.mealsByDay);
    dummyMeals.forEach((meal, index) => {
      if (index < days.length) {
        meal.day = days[index];
      }
    });
  }
  
  return dummyMeals;
}

function generateDummyGroceryList(): any[] {
  // Return a mock grocery list
  return [
    { id: "grocery-1", name: "1.5 lbs boneless, skinless chicken breast", department: "Meat & Seafood", mealIds: ["meal-1"] },
    { id: "grocery-2", name: "2 lbs beef stew meat", department: "Meat & Seafood", mealIds: ["meal-2"] },
    { id: "grocery-3", name: "4 salmon fillets (6 oz each)", department: "Meat & Seafood", mealIds: ["meal-3"] },
    { id: "grocery-4", name: "1 red bell pepper", department: "Produce", mealIds: ["meal-1", "meal-4"] },
    { id: "grocery-5", name: "1 green bell pepper", department: "Produce", mealIds: ["meal-1"] },
    { id: "grocery-6", name: "1 yellow bell pepper", department: "Produce", mealIds: ["meal-1"] },
    { id: "grocery-7", name: "2 large onions", department: "Produce", mealIds: ["meal-1", "meal-2", "meal-4"] },
    { id: "grocery-8", name: "5 cloves garlic", department: "Produce", mealIds: ["meal-2", "meal-3", "meal-4"] },
    { id: "grocery-9", name: "4 carrots", department: "Produce", mealIds: ["meal-2"] },
    { id: "grocery-10", name: "3 celery stalks", department: "Produce", mealIds: ["meal-2"] },
    { id: "grocery-11", name: "1 lb potatoes", department: "Produce", mealIds: ["meal-2"] },
    { id: "grocery-12", name: "1 cup frozen peas", department: "Frozen", mealIds: ["meal-2"] },
    { id: "grocery-13", name: "2 cups cherry tomatoes", department: "Produce", mealIds: ["meal-3", "meal-4"] },
    { id: "grocery-14", name: "2 cups broccoli florets", department: "Produce", mealIds: ["meal-4"] },
    { id: "grocery-15", name: "8 oz fettuccine pasta", department: "Dry Goods", mealIds: ["meal-4"] },
    { id: "grocery-16", name: "1 packet fajita seasoning", department: "Spices & Seasonings", mealIds: ["meal-1"] },
    { id: "grocery-17", name: "1/2 cup Kalamata olives", department: "Canned & Jarred", mealIds: ["meal-3"] },
    { id: "grocery-18", name: "1/4 cup crumbled feta cheese", department: "Dairy", mealIds: ["meal-3"] },
    { id: "grocery-19", name: "1 cup heavy cream", department: "Dairy", mealIds: ["meal-4"] },
    { id: "grocery-20", name: "3/4 cup grated Parmesan cheese", department: "Dairy", mealIds: ["meal-4"] },
    { id: "grocery-21", name: "1/2 cup sour cream", department: "Dairy", mealIds: ["meal-1"] },
    { id: "grocery-22", name: "8 small flour tortillas", department: "Bread & Bakery", mealIds: ["meal-1"] },
    { id: "grocery-23", name: "2 cups beef broth", department: "Canned & Jarred", mealIds: ["meal-2"] },
    { id: "grocery-24", name: "1 tbsp tomato paste", department: "Canned & Jarred", mealIds: ["meal-2"] },
    { id: "grocery-25", name: "Olive oil", department: "Oils & Vinegars", mealIds: ["meal-1", "meal-2", "meal-3", "meal-4"] },
    { id: "grocery-26", name: "Salt", department: "Spices & Seasonings", mealIds: ["meal-1", "meal-2", "meal-3", "meal-4"] },
    { id: "grocery-27", name: "Black pepper", department: "Spices & Seasonings", mealIds: ["meal-1", "meal-2", "meal-3", "meal-4"] },
    { id: "grocery-28", name: "Dried thyme", department: "Spices & Seasonings", mealIds: ["meal-2"] },
    { id: "grocery-29", name: "Dried oregano", department: "Spices & Seasonings", mealIds: ["meal-3"] },
    { id: "grocery-30", name: "2 lemons", department: "Produce", mealIds: ["meal-3"] },
    { id: "grocery-31", name: "1 lime", department: "Produce", mealIds: ["meal-1"] },
    { id: "grocery-32", name: "Fresh herbs (parsley, basil, dill, cilantro)", department: "Produce", mealIds: ["meal-1", "meal-3", "meal-4"] },
    { id: "grocery-33", name: "1/4 cup all-purpose flour", department: "Baking", mealIds: ["meal-2"] },
    { id: "grocery-34", name: "1 tbsp butter", department: "Dairy", mealIds: ["meal-4"] },
    { id: "grocery-35", name: "1/2 cup chicken broth", department: "Canned & Jarred", mealIds: ["meal-4"] }
  ];
}

/**
 * Use OpenAI to organize grocery items into departments
 */
export async function organizeGroceryItems(items: any[]): Promise<Record<string, any[]>> {
  // If no valid API key, use simple organization
  if (!hasValidApiKey()) {
    return organizeGroceryItemsSimple(items);
  }
  
  try {
    // Call OpenAI API to generate the organized items
    const itemNames = items.map(item => item.name);
    
    const prompt = `Organize these grocery items into logical store departments:
    
    ${itemNames.join('\n')}
    
    Please group them into common supermarket departments like "Produce", "Meat & Seafood", "Dairy", "Bakery", etc. 
    Return your results as a JSON object where keys are department names and values are arrays of the item indexes (0-based) that belong in that department.
    
    For example:
    {
      "Produce": [0, 2, 5],
      "Dairy": [1, 4],
      "Spices & Herbs": [3, 6, 7]
    }
    
    Use the following department categories:
    - Produce
    - Meat & Seafood
    - Dairy
    - Bread & Bakery
    - Canned & Jarred
    - Dry Goods
    - Baking
    - Frozen
    - Spices & Herbs
    - Oils & Vinegars
    - Snacks
    - Beverages
    - Other
    
    Every item must be assigned to exactly one department. Don't create any new departments beyond this list.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that organizes grocery lists into logical departments."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    try {
      const organizedItems = JSON.parse(response.choices[0].message.content);
      
      // Convert indexes back to actual items
      const result: Record<string, any[]> = {};
      
      // Initialize result with all categories
      [
        "Produce", "Meat & Seafood", "Dairy", "Bread & Bakery",
        "Canned & Jarred", "Dry Goods", "Baking", "Frozen",
        "Spices & Herbs", "Oils & Vinegars", "Snacks", "Beverages", "Other"
      ].forEach(department => {
        result[department] = [];
      });
      
      // Fill with organized items
      for (const [department, indexes] of Object.entries(organizedItems)) {
        if (Array.isArray(indexes)) {
          for (const index of indexes) {
            if (index >= 0 && index < items.length) {
              const item = items[index];
              // Add department to item
              item.department = department;
              
              // Ensure department exists
              if (!result[department]) {
                result[department] = [];
              }
              
              result[department].push(item);
            }
          }
        }
      }
      
      // Check for unassigned items and add them to "Other"
      const assignedItems = Object.values(result).flat();
      const assignedIds = assignedItems.map(item => item.id);
      
      for (const item of items) {
        if (!assignedIds.includes(item.id)) {
          item.department = "Other";
          result["Other"].push(item);
        }
      }
      
      // Remove empty departments
      for (const [department, departmentItems] of Object.entries(result)) {
        if (departmentItems.length === 0) {
          delete result[department];
        }
      }
      
      return result;
    } catch (parseError) {
      console.error("Error parsing department organization:", parseError);
      return organizeGroceryItemsSimple(items);
    }
  } catch (error) {
    console.error("Error organizing grocery items:", error);
    return organizeGroceryItemsSimple(items);
  }
}

/**
 * Simple fallback function to organize grocery items by basic keywords
 */
export function organizeGroceryItemsSimple(items: any[]): Record<string, any[]> {
  const departments: Record<string, any[]> = {
    "Produce": [],
    "Meat & Seafood": [],
    "Dairy": [],
    "Bread & Bakery": [],
    "Canned & Jarred": [],
    "Dry Goods": [],
    "Frozen": [],
    "Spices & Herbs": [],
    "Oils & Vinegars": [],
    "Other": []
  };
  
  // Simple keyword matching for departments
  const departmentKeywords: Record<string, string[]> = {
    "Produce": ["vegetable", "fruit", "onion", "garlic", "pepper", "tomato", "lettuce", "carrot", "celery", "potato", "lemon", "lime", "herb", "fresh", "greens", "broccoli", "spinach", "cilantro", "parsley", "mint", "basil", "dill", "green onion", "scallion", "avocado", "cucumber", "zucchini", "squash", "mushroom"],
    "Meat & Seafood": ["meat", "beef", "chicken", "pork", "fish", "seafood", "meat", "steak", "ground", "turkey", "salmon", "shrimp"],
    "Bakery": ["bread", "roll", "bun", "bagel", "pastry", "cake", "tortilla"],
    "Frozen": ["frozen", "ice", "pizza"],
    "Dairy": ["milk", "cheese", "yogurt", "cream", "butter", "egg", "feta", "parmesan", "cheddar", "sour", "half and half"],
    "Spices & Herbs": ["spice", "herb", "seasoning", "salt", "pepper", "paprika", "cumin", "cinnamon", "cayenne", "oregano", "thyme", "sage", "rosemary", "garlic powder", "onion powder", "curry", "nutmeg", "clove", "bay leaf", "vanilla"],
    "Canned & Jarred": ["can", "jar", "sauce", "soup", "beans", "tomato", "salsa", "olive", "pickle", "preserves", "jam", "jelly", "paste", "broth", "stock"],
    "Oils & Vinegars": ["oil", "vinegar", "cooking spray", "olive oil", "vegetable oil", "canola oil", "balsamic", "shortening"],
    "Dry Goods": ["pasta", "rice", "grain", "cereal", "oat", "flour", "sugar", "chips", "cracker", "cookie", "biscuit", "dried", "bean", "lentil", "pea", "noodle", "macaroni"]
  };
  
  // Process each item
  for (const item of items) {
    if (!item.name) {
      departments["Other"].push(item);
      continue;
    }
    
    const itemName = item.name.toLowerCase();
    let matched = false;
    
    // Check if the item name contains any department keywords
    for (const [department, keywords] of Object.entries(departmentKeywords)) {
      if (keywords.some(keyword => itemName.includes(keyword))) {
        // Map to proper department name if needed
        let actualDepartment = department;
        if (department === "Bakery") actualDepartment = "Bread & Bakery";
        
        if (departments[actualDepartment]) {
          departments[actualDepartment].push({
            ...item,
            department: actualDepartment
          });
          matched = true;
          break;
        }
      }
    }
    
    // If no match, add to Other
    if (!matched) {
      departments["Other"].push({
        ...item,
        department: "Other"
      });
    }
  }
  
  // Remove empty departments
  for (const [department, departmentItems] of Object.entries(departments)) {
    if (departmentItems.length === 0) {
      delete departments[department];
    }
  }
  
  return departments;
}