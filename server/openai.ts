import OpenAI from "openai";
import { Message } from "@shared/schema";
import { getWeatherContextForMealPlanning } from "./weather";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. Do not change this unless explicitly requested by the user
// Check if we have a valid API key
const apiKey = process.env.OPENAI_API_KEY;
if (apiKey && apiKey.trim() === '') {
  console.warn('WARNING: Empty OpenAI API key provided. Using dummy responses.');
}

// Only use the API key if it's actually provided and not empty
const openai = new OpenAI({ 
  apiKey: apiKey && apiKey.trim() !== '' ? apiKey : 'dummy_api_key' 
});

// Generate a response for the chat conversation
export async function generateChatResponse(messages: Message[]): Promise<string> {
  try {
    // For demo purposes with no API key, return a canned response
    if (!process.env.OPENAI_API_KEY) {
      return generateDummyResponse(messages);
    }
    
    // Map messages to OpenAI format
    const openaiMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));
    
    // Add system message to give context
    openaiMessages.unshift({
      role: "system" as const,
      content: `You are a helpful meal planning assistant called "Dinner, Decided" that creates personalized meal plans for busy families.
      Your goal is to understand the family's needs, preferences, and constraints, and then provide personalized meal suggestions with rationales.
      Always be warm, encouraging, and practical. Suggest accessible recipes that match the family's cooking skill level.
      Assume picky kids and use simple Hello Fresh-style recipes unless instructed otherwise.
      Treat food allergies and appliance limitations as inviolable restrictions.
      If the conversation suggests the user wants a meal plan, provide 3-5 meal suggestions that fit their needs.
      For each meal, include 2 bullet points on why it fits the family (based on meal notes, weather, or overall profile).
      Include details about why each meal is a good fit (e.g., "uses up the ingredients you mentioned", "quick for your busy Wednesday").
      Don't assign meals to specific days unless the user asks for that structure.`
    });
    
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
export async function generateMealPlan(household: any, preferences: any = {}): Promise<any[]> {
  try {
    // For demo purposes with no API key, return canned meal suggestions
    if (!process.env.OPENAI_API_KEY) {
      console.log('[MEAL PLAN] Using mock data due to missing API key');
      console.log('[MEAL PLAN] Household:', JSON.stringify(household, null, 2));
      console.log('[MEAL PLAN] Preferences:', JSON.stringify(preferences, null, 2));
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
        - Family members: ${household.members.map(m => `${m.name} (${m.age || 'Adult'}, ${m.dietaryRestrictions || 'No restrictions'})`).join(', ')}
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
        
        8. Step-by-step cooking instructions (minimum 8-10 detailed steps)
          * CRITICAL: Instructions must be comprehensive enough for a beginner cook to follow without prior knowledge
          * Include precise cooking times, temperatures, and methods for EVERY step (e.g., "sauté over medium heat for 5 minutes" not just "sauté until done")
          * Include exact time and temperature for any oven, slow cooker, or instant pot steps
          * Mention each ingredient specifically when it's used with exact quantities
          * Break complex processes into multiple detailed steps
          * Include specific guidance on how to tell when things are properly cooked
          * NO generic steps like "cook according to standard procedure" - every step must be explicit
          * NEVER assume prior cooking knowledge - explain techniques like "fold in", "deglaze", etc.
          * For mixed dishes, include how to assemble and serve
        
        9. For "Split Prep" category meals, provide clear instructions for what to prepare ahead of time vs. what to do on the day of cooking
        
        10. IMPORTANT: Add 2-3 personalized rationales for why this meal is a good fit for this specific family (considering their dietary needs, preferences, time constraints, etc.)
        
        Generate a JSON response with an array of meal objects, ensuring that you include the rationales as an array of strings in a "rationales" field for each meal. Every meal MUST have detailed ingredients with quantities.`;
    } else {
      // Standard meal plan request (fallback)
      promptContent = `Create a meal plan with ${preferences.numberOfMeals || 5} dinner ideas for a family with the following profile:
        - Family size: ${household.members.length} people
        - Family members: ${household.members.map(m => `${m.name} (${m.age || 'Adult'}, ${m.dietaryRestrictions || 'No restrictions'})`).join(', ')}
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
        
        8. 2-3 specific reasons why this meal is a good fit for this family based on their preferences and needs
        
        Format the response as a JSON array of meal objects with detailed ingredients and cooking instructions. Every meal MUST have detailed ingredients with quantities.`;
    }
    
    console.log('[MEAL PLAN] Generating meal plan with this prompt:', promptContent);
    
    // Create the request to OpenAI
    const response = await openai.chat.completions.create({
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
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });
    
    // Parse and process the response
    try {
      const content = response.choices[0].message.content || "[]";
      console.log('[MEAL PLAN] Raw response content:', content);
      
      try {
        // Parse the JSON response
        let parsedResponse = JSON.parse(content);
        
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
            if (meal.directions && Array.isArray(meal.directions) && !meal.instructions) {
              meal.instructions = meal.directions;
              console.log(`[MEAL PLAN] Normalized directions → instructions for meal: ${meal.name}`);
            }
            
            // Normalize ingredient lists
            if (meal.mainIngredients && Array.isArray(meal.mainIngredients) && !meal.ingredients) {
              meal.ingredients = meal.mainIngredients;
              console.log(`[MEAL PLAN] Normalized mainIngredients → ingredients for meal: ${meal.name}`);
            }
            
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
        console.log('[MEAL PLAN] Failed response content:', content);
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
      
      // For other errors, use backup data
      console.log('[MEAL PLAN] Using fallback data due to OpenAI API error');
      return generateDummyMeals(preferences);
    }
  } catch (outerError) {
    console.error("Unexpected error in generateMealPlan:", outerError);
    return generateDummyMeals(preferences);
  }
}

// Generate a grocery list based on a meal plan
export async function generateGroceryList(mealPlan: any): Promise<any[]> {
  try {
    // For demo purposes with no API key, return a canned grocery list
    if (!process.env.OPENAI_API_KEY) {
      return generateDummyGroceryList();
    }
    
    // Extract the most important info from each meal, making sure to use the latest modified data
    const meals = mealPlan.meals.map((meal: any) => {
      // For ingredients, prefer mainIngredients with quantities if available
      // These should have been generated from our updated OpenAI functions
      const ingredients = meal.mainIngredients || meal.ingredients || [];
      
      // If we have instructions or directions, we might have detailed ingredients with quantities in there
      if ((meal.instructions && Array.isArray(meal.instructions) && meal.instructions.length > 0) ||
          (meal.directions && Array.isArray(meal.directions) && meal.directions.length > 0)) {
        console.log('[GROCERY] Meal has detailed instructions, using full recipe details');
      }
      
      // Include modification details in name if available
      const mealName = meal.modifiedFrom ? 
        `${meal.name} (modified from ${meal.modifiedFrom})` : 
        meal.name;
      
      // Log what we're using for this meal
      console.log(`[GROCERY] Processing meal "${meal.name}" with ${ingredients.length} ingredients`);
      
      return {
        id: meal.id,
        name: mealName,
        ingredients: ingredients,
        // Include modification request if available
        modificationRequest: meal.modificationRequest || '',
        // Include replaced info if available
        replacedFrom: meal.replacedFrom || ''
      };
    });
    
    // Log grocery list generation - check for duplicate meals
    const mealNames = meals.map((m: any) => m.name);
    const uniqueMealNames = [...new Set(mealNames)] as string[];
    
    console.log(`[GROCERY] Generating grocery list with ${meals.length} meals, ${uniqueMealNames.length} unique meal types`);
    if (uniqueMealNames.length < meals.length) {
      console.warn(`[GROCERY] WARNING: Duplicate meals detected! This will cause ingredient quantities to be multiplied incorrectly`);
      console.warn(`[GROCERY] Unique meal names: ${uniqueMealNames.join(', ')}`);
    }
    
    // Only log detailed meal info if we need troubleshooting data
    // console.log('[GROCERY] Generating grocery list for meals:', JSON.stringify(meals, null, 2));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system" as const,
          content: `You are a helpful meal planning assistant that creates organized grocery lists based on meal plans.
          
          IMPORTANT INSTRUCTIONS:
          1. Pay careful attention to meal modifications and use the ingredients listed in each meal's 'ingredients' field.
          2. If a meal has been modified (contains modifiedFrom or replacedFrom), make sure to use the NEW ingredients, not the original ones.
          3. For example, if "Ground Chicken Tacos" was modified from "Rotisserie Chicken Tacos", use ground chicken in the grocery list, not rotisserie chicken.
          4. For EVERY grocery item, include specific quantities (e.g., "1 lb ground turkey", "2 cups rice", "3 cloves garlic").
          5. If ingredient quantities are already included in the ingredients list, KEEP those exact quantities in the grocery list.
          6. Consolidate duplicate ingredients across meals and add up their quantities.`
        },
        {
          role: "user" as const,
          content: `Create a grocery list for the following meals: ${JSON.stringify(meals)}. 
          
          Important instructions:
          1. Pay special attention to any modified or replaced recipes - always use the ingredients from the CURRENT version.
          2. When a meal has a modificationRequest like "use ground chicken instead of rotisserie chicken", make sure to ONLY include ground chicken in the grocery list, not rotisserie chicken.
          3. For meals with replacedFrom field, these are completely different recipes, so you should ONLY use the current ingredients.
          4. For EVERY grocery item, you MUST include specific quantities (e.g., "1 lb ground turkey", "2 cups rice", "3 cloves garlic").
          5. If an ingredient already includes a quantity (like "1 lb ground turkey"), preserve that exact quantity.
          6. Consolidate duplicate ingredients across meals and add up their quantities.
          
          Organize items by store section (Produce, Meat & Seafood, Dairy, etc.).
          Return the list as a JSON object with sections array, where each section has a name and items array.
          Each item should have an id, name (including quantity), and optional mealId (to track which meal it's for).`
        }
      ] as any, // Type assertion to fix TypeScript error
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Extract sections from the result
    return result.sections || [];
    
  } catch (error) {
    console.error("Error generating grocery list:", error);
    
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
    
    console.log('[GROCERY] Using fallback data due to OpenAI API error');
    return generateDummyGroceryList();
  }
}

/**
 * Modify a meal based on user requirements
 */
export async function modifyMeal(meal: any, modificationRequest: string): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is required for this operation");
  }

  try {
    // Get household data
    const household = await getHouseholdData();
    
    // Get weather context if location is available
    let weatherContext = "";
    if (household && household.location) {
      try {
        weatherContext = await getWeatherContextForMealPlanning(household.location);
        console.log(`[MEAL MODIFICATION] Retrieved weather context for ${household.location}`);
      } catch (weatherError) {
        console.error("[MEAL MODIFICATION] Error getting weather context:", weatherError);
        weatherContext = "Weather information is not available.";
      }
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful meal planning assistant tasked with modifying recipes.
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
          
          IMPORTANT OUTPUT FORMAT:
          Every meal MUST include camelCase field names exactly as specified:
          - name: Name of the dish
          - description: Description of the dish (2-3 sentences)
          - day: Day of the week
          - category: Meal category (same as original)
          - categories: Array of meal categories (same as original)
          - prepTime: Preparation time in minutes
          - servings: Number of servings (IMPORTANT: use "servings" not "servingSize")
          
          FOR INGREDIENTS:
          - ingredients: Array of ingredients with quantities
            * THIS IS CRITICAL: Include 10-15 ingredients with EXACT measurements for each (like "1 lb ground beef", "2 cloves garlic, minced")
            * Include all seasonings, oils, and garnishes with specific quantities
            * Every single ingredient mentioned in the instructions MUST be listed here
            * Include salt, pepper, oil quantities specifically - never just "salt and pepper to taste"
            * Format as complete phrases (e.g., "1 pound boneless chicken breasts, cut into 1-inch pieces")
          
          - mainIngredients: Array of ingredients with quantities (same as ingredients, for backward compatibility)
          
          - instructions: Array of step-by-step instructions (minimum 8-10 detailed steps)
            * CRITICAL: Instructions must be comprehensive enough for a beginner cook to follow without prior knowledge
            * Include precise cooking times, temperatures, and methods for EVERY step (e.g., "sauté over medium heat for 5 minutes" not just "sauté until done")
            * Include exact time and temperature for any oven, slow cooker, or instant pot steps
            * Mention each ingredient specifically when it's used with exact quantities
            * Break complex processes into multiple detailed steps
            * Include specific guidance on how to tell when things are properly cooked
            * NO generic steps like "cook according to standard procedure" - every step must be explicit
            * NEVER assume prior cooking knowledge - explain techniques like "fold in", "deglaze", etc.
            * For mixed dishes, include how to assemble and serve
          
          - rationales: Array of 2-3 reasons why this modification works well
          - modificationRequest: The modification that was requested
          - modifiedFrom: The name of the original meal
          
          ATTENTION: Your response must be complete with ALL the details above. The ingredients list should be thorough and comprehensive - every cooking oil, herb, spice and seasoning needs a specific quantity. The instructions must be detailed enough that someone who has never cooked before could successfully follow them.
          IMPORTANT: Make sure every single ingredient mentioned in the instructions is listed in the ingredients array with proper quantities!
          
          Return your response as a single JSON object with these properties.`
        },
        {
          role: "user",
          content: `I need to modify this meal: ${JSON.stringify(meal)}.
          
          Please modify it according to this request: "${modificationRequest}"
          
          The modified meal should include detailed ingredients with quantities and step-by-step instructions.
          Return your response as a single JSON object with the properties specified in the system message.`
        }
      ],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });
    
    try {
      const content = response.choices[0].message.content || "{}";
      console.log('[MEAL MODIFICATION] Raw response content:', content);
      
      // Parse the JSON response
      let modifiedMeal = JSON.parse(content);
      
      // Process the modified meal data
      // Add the original meal's ID if not present
      if (!modifiedMeal.id && meal.id) {
        modifiedMeal.id = meal.id;
      }
      
      // Set modification metadata
      modifiedMeal.modificationRequest = modificationRequest;
      modifiedMeal.modifiedFrom = meal.name;
      
      // Ensure we have the necessary fields from the original if they're missing
      if (!modifiedMeal.categories && meal.categories) {
        modifiedMeal.categories = meal.categories;
      }
      
      // Normalize property names for consistency
      if (modifiedMeal.directions && Array.isArray(modifiedMeal.directions) && !modifiedMeal.instructions) {
        modifiedMeal.instructions = modifiedMeal.directions;
        console.log(`[MEAL MODIFICATION] Normalized directions → instructions for modified meal: ${modifiedMeal.name}`);
      }
      
      // Normalize ingredient lists
      if (modifiedMeal.mainIngredients && Array.isArray(modifiedMeal.mainIngredients) && !modifiedMeal.ingredients) {
        modifiedMeal.ingredients = modifiedMeal.mainIngredients;
        console.log(`[MEAL MODIFICATION] Normalized mainIngredients → ingredients for modified meal: ${modifiedMeal.name}`);
      }
      
      console.log(`[MEAL MODIFICATION] Successfully modified "${meal.name}" to "${modifiedMeal.name}"`);
      return modifiedMeal;
      
    } catch (parseError) {
      console.error('[MEAL MODIFICATION] Error parsing OpenAI response:', parseError);
      throw new Error('Failed to parse modified meal response from OpenAI. Please try again.');
    }
  } catch (error) {
    console.error("Error modifying meal:", error);
    if (error instanceof Error) {
      throw error; // Re-throw the error with its original message
    }
    throw new Error('Failed to modify meal. Please try again.');
  }
}

/**
 * Generate a completely new replacement meal based on the criteria of the original
 */
export async function replaceMeal(meal: any): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is required for this operation");
  }

  try {
    // Get household data for context
    const household = await getHouseholdData();
    
    // Get weather context if location is available
    let weatherContext = "";
    if (household && household.location) {
      try {
        weatherContext = await getWeatherContextForMealPlanning(household.location);
        console.log(`[MEAL REPLACEMENT] Retrieved weather context for ${household.location}`);
      } catch (weatherError) {
        console.error("[MEAL REPLACEMENT] Error getting weather context:", weatherError);
        weatherContext = "Weather information is not available.";
      }
    }
    
    // Create the request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful meal planning assistant that creates new recipe suggestions.
          Your goal is to generate a completely new meal that fulfills the same role as the original but provides variety.
          
          REPLACEMENT APPROACH:
          - Generate a completely new meal in the same category as the original
          - Use a similar cooking method but with different ingredients
          - Maintain approximately the same prep time (±5 minutes)
          - Create beautiful, detailed recipes in the style of Hello Fresh with clear, step-by-step instructions
          
          Family profile:
          ${household ? `- Family size: ${household.members.length} people
          - Family members: ${household.members.map((m: any) => `${m.name} (${m.age || 'Adult'}, ${m.dietaryRestrictions || 'No restrictions'})`).join(', ')}
          - Available kitchen equipment: ${household.appliances?.join(", ") || "Standard kitchen equipment"}
          - Cooking skill level (1-5): ${household.cookingSkill || 3}
          - Preferences: ${household.preferences || "Family-friendly meals"}
          - Location: ${household.location || "Unknown location"}` : 'Family profile not available.'}
          
          ${weatherContext ? `Current weather and forecast: ${weatherContext}` : ''}
          
          IMPORTANT OUTPUT FORMAT:
          Every meal MUST include camelCase field names exactly as specified:
          - name: Name of the dish
          - description: Description of the dish (2-3 sentences)
          - day: Day of the week (same as original)
          - categories: Array of meal categories (same as original)
          - prepTime: Preparation time in minutes
          - servings: Number of servings

          FOR INGREDIENTS:
          - ingredients: Array of ingredients with quantities
            * THIS IS CRITICAL: Include 10-15 ingredients with EXACT measurements for each (like "1 lb ground beef", "2 cloves garlic, minced")
            * Include all seasonings, oils, and garnishes with specific quantities
            * Every single ingredient mentioned in the instructions MUST be listed here
            * Include salt, pepper, oil quantities specifically - never just "salt and pepper to taste"
            * Format as complete phrases (e.g., "1 pound boneless chicken breasts, cut into 1-inch pieces")
          
          - instructions: Array of step-by-step instructions (minimum 8-10 detailed steps)
            * CRITICAL: Instructions must be comprehensive enough for a beginner cook to follow without prior knowledge
            * Include precise cooking times, temperatures, and methods for EVERY step (e.g., "sauté over medium heat for 5 minutes" not just "sauté until done")
            * Include exact time and temperature for any oven, slow cooker, or instant pot steps
            * Mention each ingredient specifically when it's used with exact quantities
            * Break complex processes into multiple detailed steps
            * Include specific guidance on how to tell when things are properly cooked
            * NO generic steps like "cook according to standard procedure" - every step must be explicit
            * NEVER assume prior cooking knowledge - explain techniques like "fold in", "deglaze", etc.
            * For mixed dishes, include how to assemble and serve
          
          - rationales: Array of 2-3 reasons why this replacement works well
          - replacedFrom: The name of the original meal

          ATTENTION: Your response must be complete with ALL the details above. The ingredients list should be thorough and comprehensive - every cooking oil, herb, spice and seasoning needs a specific quantity. The instructions must be detailed enough that someone who has never cooked before could successfully follow them.
          
          Return your response as a single JSON object with these properties.`
        },
        {
          role: "user",
          content: `I need to replace this meal with something completely different but in the same category: ${JSON.stringify(meal)}.
          
          Generate a new meal that:
          - Uses the same cooking methods (e.g., if original used a slow cooker, new one should too)
          - Has similar prep and cook time
          - Is in the same meal category
          - Uses different primary ingredients for variety
          
          The new meal should include detailed ingredients with quantities and step-by-step instructions.
          Return your response as a single JSON object with the properties specified in the system message.`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });
    
    try {
      const content = response.choices[0].message.content || "{}";
      console.log('[MEAL REPLACEMENT] Raw response content:', content);
      
      // Parse the JSON response
      let replacementMeal = JSON.parse(content);
      
      // Generate a new ID for the replacement meal
      replacementMeal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Set replacement metadata
      replacementMeal.replacedFrom = meal.name;
      
      // Ensure we have the day from the original if it's missing
      if (!replacementMeal.day && meal.day) {
        replacementMeal.day = meal.day;
      }
      
      // Ensure categories is an array
      if (!Array.isArray(replacementMeal.categories)) {
        // If categories exists but isn't an array, convert it
        if (replacementMeal.categories) {
          replacementMeal.categories = [replacementMeal.categories];
        } 
        // If no categories, use the original meal's categories
        else if (meal.categories) {
          replacementMeal.categories = meal.categories;
        }
        // Fallback to a default category
        else {
          replacementMeal.categories = ["dinner"];
        }
      }
      
      // Normalize property names for consistency
      if (replacementMeal.directions && Array.isArray(replacementMeal.directions) && !replacementMeal.instructions) {
        replacementMeal.instructions = replacementMeal.directions;
        console.log(`[MEAL REPLACEMENT] Normalized directions → instructions for replacement meal: ${replacementMeal.name}`);
      }
      
      // Normalize ingredient lists
      if (replacementMeal.mainIngredients && Array.isArray(replacementMeal.mainIngredients) && !replacementMeal.ingredients) {
        replacementMeal.ingredients = replacementMeal.mainIngredients;
        console.log(`[MEAL REPLACEMENT] Normalized mainIngredients → ingredients for replacement meal: ${replacementMeal.name}`);
      }
      
      console.log(`[MEAL REPLACEMENT] Successfully replaced "${meal.name}" with "${replacementMeal.name}"`);
      return replacementMeal;
      
    } catch (parseError) {
      console.error('[MEAL REPLACEMENT] Error parsing OpenAI response:', parseError);
      throw new Error('Failed to parse replacement meal response from OpenAI. Please try again.');
    }
  } catch (error) {
    console.error("Error replacing meal:", error);
    if (error instanceof Error) {
      throw error; // Re-throw the error with its original message
    }
    throw new Error('Failed to generate replacement meal. Please try again.');
  }
}

// Helper function to get household data
async function getHouseholdData() {
  try {
    // Import the storage from the current module context
    const { storage } = await import('./storage');
    return await storage.getHousehold();
  } catch (error) {
    console.error('Error getting household data:', error);
    return null;
  }
}

/**
 * Normalize meal object field names for consistency
 * This function ensures backward compatibility with older meal formats
 * by normalizing field names to the current standard
 */
export function normalizeMeal(meal: any): any {
  if (!meal) return meal;
  
  // Create a deep copy to avoid modifying the original object
  const normalizedMeal = JSON.parse(JSON.stringify(meal));
  
  // Normalize directions → instructions (always use instructions field name)
  if (normalizedMeal.directions && Array.isArray(normalizedMeal.directions)) {
    normalizedMeal.instructions = normalizedMeal.directions;
    console.log(`[MEAL NORMALIZE] Converted directions → instructions for meal: ${normalizedMeal.name || 'unnamed'}`);
    // Keep both properties for backward compatibility, but instructions is the standard
  }
  
  // Handle the case when we have main_ingredients instead of mainIngredients (underscore vs camelCase)
  if (normalizedMeal.main_ingredients && Array.isArray(normalizedMeal.main_ingredients)) {
    if (!normalizedMeal.mainIngredients) {
      normalizedMeal.mainIngredients = [...normalizedMeal.main_ingredients];
      console.log(`[MEAL NORMALIZE] Converted main_ingredients → mainIngredients for meal: ${normalizedMeal.name || 'unnamed'}`);
    }
  }
  
  // Normalize mainIngredients + ingredients - MERGE them instead of replacing
  // If both exist, we want a complete set of ingredients
  if (normalizedMeal.mainIngredients && Array.isArray(normalizedMeal.mainIngredients)) {
    if (!normalizedMeal.ingredients) {
      normalizedMeal.ingredients = [...normalizedMeal.mainIngredients];
      console.log(`[MEAL NORMALIZE] Copied mainIngredients → ingredients for meal: ${normalizedMeal.name || 'unnamed'}`);
    } else if (Array.isArray(normalizedMeal.ingredients)) {
      // If both exist, merge them and remove duplicates
      const combinedIngredients = [...normalizedMeal.ingredients, ...normalizedMeal.mainIngredients];
      // Remove exact duplicates by converting to a Map and back to an array
      // This avoids TypeScript errors with Set iteration
      normalizedMeal.ingredients = combinedIngredients.filter((item, index) => {
        return combinedIngredients.indexOf(item) === index;
      });
      console.log(`[MEAL NORMALIZE] Merged mainIngredients into ingredients for meal: ${normalizedMeal.name || 'unnamed'} (${normalizedMeal.ingredients.length} total ingredients)`);
    }
    // Keep both properties for backward compatibility, but ingredients is the standard
  } else if (normalizedMeal.ingredients && Array.isArray(normalizedMeal.ingredients)) {
    // Make sure mainIngredients exists too for backward compatibility
    normalizedMeal.mainIngredients = [...normalizedMeal.ingredients];
    console.log(`[MEAL NORMALIZE] Copied ingredients → mainIngredients for meal: ${normalizedMeal.name || 'unnamed'}`);
  }
  
  // Check if we have a detailed mainIngredients but minimal ingredients
  // This happens with some recipe types due to the prompt structure
  if (normalizedMeal.ingredients && 
      normalizedMeal.mainIngredients && 
      Array.isArray(normalizedMeal.ingredients) && 
      Array.isArray(normalizedMeal.mainIngredients)) {
    
    // If ingredients is very minimal (2-3 items) but mainIngredients has more items,
    // replace ingredients with mainIngredients
    if (normalizedMeal.ingredients.length <= 3 && normalizedMeal.mainIngredients.length > 3) {
      console.log(`[MEAL NORMALIZE] Replacing minimal ingredients (${normalizedMeal.ingredients.length}) with more complete mainIngredients (${normalizedMeal.mainIngredients.length}) for meal: ${normalizedMeal.name || 'unnamed'}`);
      normalizedMeal.ingredients = [...normalizedMeal.mainIngredients];
    }
  }
  
  // Ensure servings is servings (not servingSize)
  if (normalizedMeal.servingSize && !normalizedMeal.servings) {
    normalizedMeal.servings = normalizedMeal.servingSize;
    console.log(`[MEAL NORMALIZE] Converted servingSize → servings for meal: ${normalizedMeal.name || 'unnamed'}`);
  }
  
  // Also handle serving_size (underscore version)
  if (normalizedMeal.serving_size && !normalizedMeal.servings) {
    normalizedMeal.servings = normalizedMeal.serving_size;
    console.log(`[MEAL NORMALIZE] Converted serving_size → servings for meal: ${normalizedMeal.name || 'unnamed'}`);
  }
  
  // Ensure prepTime is consistent (handle prep_time format)
  if (normalizedMeal.prep_time && !normalizedMeal.prepTime) {
    normalizedMeal.prepTime = normalizedMeal.prep_time;
    console.log(`[MEAL NORMALIZE] Converted prep_time → prepTime for meal: ${normalizedMeal.name || 'unnamed'}`);
  }
  
  // Ensure categories is an array
  if (normalizedMeal.category && !normalizedMeal.categories) {
    normalizedMeal.categories = Array.isArray(normalizedMeal.category) ? 
      normalizedMeal.category : [normalizedMeal.category];
    console.log(`[MEAL NORMALIZE] Converted category → categories array for meal: ${normalizedMeal.name || 'unnamed'}`);
  }
  
  // Ensure ID is always present
  if (!normalizedMeal.id) {
    normalizedMeal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log(`[MEAL NORMALIZE] Added missing ID for meal: ${normalizedMeal.name || 'unnamed'}`);
  }
  
  // Debug log to check all properties
  console.log(`[MEAL NORMALIZE] Normalized meal properties for ${normalizedMeal.name || 'unnamed'}: ${Object.keys(normalizedMeal).join(', ')}`);
  
  return normalizedMeal;
}

// Dummy responses for when no API key is available
function generateDummyResponse(messages: Message[]): string {
  const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";
  
  if (lastUserMessage.toLowerCase().includes("how many")) {
    return "Thanks for sharing! A family of 3 is a great size for meal planning. What kitchen appliances do you have available? (e.g., Instant Pot, slow cooker, air fryer, etc.)";
  }
  
  if (lastUserMessage.toLowerCase().includes("appliance") || lastUserMessage.toLowerCase().includes("kitchen")) {
    return "Perfect! Having a slow cooker, Instant Pot, and regular oven/stovetop gives us lots of flexibility. How would you rate your cooking confidence on a scale from 1 to 5? (1 being beginner, 5 being very experienced)";
  }
  
  if (lastUserMessage.includes("3")) {
    return "Thanks! And what's your typical weekly rhythm? How many dinners do you usually cook at home, and are there particular days when you need quick meals vs. having more time to cook?";
  }
  
  if (lastUserMessage.toLowerCase().includes("cook") && lastUserMessage.toLowerCase().includes("home")) {
    return "Got it! This is all so helpful for personalizing your meal plans. One last thing - any dietary preferences, restrictions, or foods your family particularly loves or dislikes?";
  }
  
  if (lastUserMessage.toLowerCase().includes("vegetarian") || lastUserMessage.toLowerCase().includes("pasta")) {
    return "Perfect! Based on everything you've shared, I've created a customized meal plan for your family. It includes several vegetarian options and pasta dishes, with a mix of quick weeknight meals and a few more involved weekend cooking ideas. Each meal has been selected to match your cooking confidence and available time. Would you like to see the meal plan now?";
  }
  
  if (lastUserMessage.toLowerCase().includes("yes") && lastUserMessage.length < 10) {
    return "Great! Here's your personalized meal plan:\n\n1. Quick Veggie Stir Fry with Rice\n• Perfect for your busy Tuesday night\n• Uses your wok and can be customized for picky eaters\n\n2. One-Pot Pasta Primavera\n• Matches your family's love of pasta\n• Only dirties one pot for easy cleanup\n\n3. Sheet Pan Chicken Fajitas\n• Great for Monday when you have a bit more time\n• Everyone can customize their own toppings\n\n4. Slow Cooker Vegetable Curry\n• Set it up in the morning for your hectic Thursday\n• Vegetarian as requested and full of flavor\n\n5. Breakfast for Dinner (Pancakes & Fruit)\n• Kids' favorite for Friday fun\n• Quick and uses simple pantry ingredients\n\nWould you like me to generate a grocery list for these meals?";
  }
  
  if (lastUserMessage.toLowerCase().includes("grocery")) {
    return "Here's your grocery list organized by store section:\n\nProduce:\n• Bell peppers (3)\n• Onions (2)\n• Garlic (1 head)\n• Broccoli (1 bunch)\n• Carrots (1 lb)\n• Mixed vegetables for curry (1 bag)\n• Berries for pancakes (1 pint)\n• Bananas (1 bunch)\n\nDairy:\n• Milk (1/2 gallon)\n• Butter (1 small pack)\n• Sour cream (1 small container)\n• Cheese for fajitas (8 oz)\n\nGrains:\n• Rice (if needed)\n• Pasta (1 lb box)\n• Pancake mix (1 box)\n• Tortillas for fajitas (1 pack)\n\nProtein:\n• Chicken breast (1.5 lbs)\n• Eggs (1 dozen)\n\nPantry:\n• Vegetable oil\n• Curry paste\n• Coconut milk (1 can)\n• Fajita seasoning (1 packet)\n• Maple syrup for pancakes\n\nIs there anything you'd like to add or change to this meal plan?";
  }
  
  return "I'd be happy to help with your meal planning! To create a personalized plan, I need to know a bit about your household. How many people are you cooking for, and are there any dietary preferences or restrictions I should know about?";
}

function generateDummyMeals(preferences: any): any[] {
  if (preferences.replaceMeal) {
    return [{
      id: `meal-${Date.now()}`,
      name: preferences.mealName === "Instant Pot Beef Stew" 
        ? "Instant Pot Chicken and Vegetable Soup" 
        : "Mediterranean Chickpea Bowl",
      description: "A fresh alternative that still uses your favorite appliances and fits your family's taste preferences.",
      categories: preferences.categories || ["quick", "kid-friendly"],
      prepTime: 30,
      servings: 4,
      ingredients: [
        "Main protein (chicken or chickpeas)",
        "Mixed vegetables",
        "Broth or sauce base",
        "Seasoning blend",
        "Grain component (rice, pasta, or quinoa)"
      ]
    }];
  }
  
  // If we have mealsByDay structure, create meals based on that
  if (preferences.mealsByDay && Object.keys(preferences.mealsByDay).length > 0) {
    const dummyMeals = [];
    const days = Object.keys(preferences.mealsByDay);
    
    // Create a dummy meal for each day with selected categories
    for (const day of days) {
      // Fix: MealsByDay contains day:category key-value pairs, not arrays
      const category = preferences.mealsByDay[day];
      
      // Only process if we have a valid category
      if (category) {
        // Generate a unique timestamp with a small delay to ensure unique IDs
        const uniqueTimestamp = Date.now() + dummyMeals.length * 100;
        
        let meal: any = {
          id: `meal-${uniqueTimestamp}-${Math.floor(Math.random() * 1000)}`,
          day: day
        };
        
        // Customize the meal based on the category
        const genericMealNames = [
          "Family-Style Pasta Bake",
          "Sheet Pan Chicken & Vegetables",
          "Slow Cooker Beef Tacos",
          "One-Pot Lentil Curry",
          "Quick Stir-Fry with Rice"
        ];
        
        const mealIndex = Math.floor(Math.random() * genericMealNames.length);
        meal.name = genericMealNames[mealIndex];
            
        // Create more descriptive content
        meal.description = `A balanced family-friendly meal that's easy to prepare and great for busy weeknights.`;
        meal.prepTime = 20 + Math.floor(Math.random() * 20); // 20-40 minutes
        
        // More specific ingredients
        meal.ingredients = [
          ["Chicken", "Beef", "Pork", "Tofu", "Fish"][Math.floor(Math.random() * 5)],
          ["Broccoli", "Carrots", "Mixed Vegetables", "Green Beans", "Spinach"][Math.floor(Math.random() * 5)],
          ["Rice", "Pasta", "Potatoes", "Quinoa", "Couscous"][Math.floor(Math.random() * 5)],
          ["Garlic & Herbs", "Italian Seasoning", "Taco Seasoning", "Lemon Pepper", "Cajun Spices"][Math.floor(Math.random() * 5)]
        ];
        
        // Set appropriate category
        meal.categories = [category];
        
        // Set servings based on family size if available
        if (preferences.familySize) {
          meal.servings = preferences.familySize;
        } else {
          meal.servings = 4; // Default serving size
        }
        
        // Add rationales for the meal
        meal.rationales = [
          "Fits your family's schedule and preferences",
          "Uses ingredients that are likely already in your pantry",
          "Can be customized based on your family's tastes"
        ];
        
        dummyMeals.push(meal);
      }
    }
    
    return dummyMeals;
  }
  
  // Standard response for other cases
  // Generate unique timestamps for each meal
  const baseTimestamp = Date.now();
  const meals = [
    {
      id: `meal-${baseTimestamp}-${Math.floor(Math.random() * 1000)}`,
      name: "Sheet Pan Chicken Fajitas",
      description: "Perfect for a busy weeknight. Mexican-inspired, as your family enjoys, and can be prepared quickly on a sheet pan.",
      categories: ["quick", "mexican", "kid-friendly"],
      prepTime: 25,
      servings: 4,
      ingredients: [
        "1.5 lbs chicken breast, sliced",
        "2 bell peppers (red and green), sliced",
        "1 large onion, sliced",
        "2 tbsp olive oil",
        "1 packet fajita seasoning",
        "8 flour tortillas",
        "Toppings: sour cream, avocado, salsa"
      ]
    },
    {
      id: `meal-${baseTimestamp + 100}-${Math.floor(Math.random() * 1000)}`,
      name: "Creamy Vegetable Pasta",
      description: "A vegetarian pasta dish that satisfies your family's love for pasta while incorporating seasonal vegetables.",
      categories: ["vegetarian", "family favorite"],
      prepTime: 30,
      servings: 4,
      ingredients: [
        "1 lb pasta (penne or fusilli)",
        "2 cups mixed vegetables (broccoli, carrots, peas)",
        "1 cup heavy cream",
        "1/2 cup grated parmesan cheese",
        "2 cloves garlic, minced",
        "2 tbsp olive oil",
        "Salt and pepper to taste"
      ]
    },
    {
      id: `meal-${baseTimestamp + 200}-${Math.floor(Math.random() * 1000)}`,
      name: "Instant Pot Beef Stew",
      description: "Perfect for a busy day - quick to prepare in the Instant Pot. Mild flavor for the kids.",
      categories: ["instantPot", "make ahead"],
      prepTime: 45,
      servings: 6,
      ingredients: [
        "1.5 lbs beef stew meat",
        "4 carrots, chopped",
        "2 potatoes, diced",
        "1 onion, diced",
        "2 cloves garlic, minced",
        "2 cups beef broth",
        "2 tbsp tomato paste",
        "1 tsp thyme",
        "Salt and pepper to taste"
      ]
    },
    {
      id: `meal-${baseTimestamp + 300}-${Math.floor(Math.random() * 1000)}`,
      name: "Black Bean & Sweet Potato Enchiladas",
      description: "These enchiladas combine your family's love for Mexican food with your goal of vegetarian meals. The sweet potatoes add a nutritious twist.",
      categories: ["vegetarian", "mexican"],
      prepTime: 40,
      servings: 4,
      ingredients: [
        "1 large sweet potato, diced",
        "1 can black beans, drained",
        "1 bell pepper, diced",
        "1 small onion, diced",
        "2 cloves garlic, minced",
        "1 tsp cumin",
        "1/2 tsp mild chili powder",
        "8 flour tortillas",
        "2 cups enchilada sauce",
        "1 cup shredded cheese"
      ]
    },
    {
      id: `meal-${baseTimestamp + 400}-${Math.floor(Math.random() * 1000)}`,
      name: "Slow Cooker Pulled Chicken Sandwiches",
      description: "An easy meal that can simmer all day in the slow cooker. Kid-friendly and allows for individual customization.",
      categories: ["slowCooker", "kid-friendly"],
      prepTime: 15,
      servings: 4,
      ingredients: [
        "2 lbs boneless chicken thighs",
        "1 cup BBQ sauce",
        "1/4 cup brown sugar",
        "1 tbsp Worcestershire sauce",
        "1 tsp garlic powder",
        "1 tsp onion powder",
        "Hamburger buns",
        "Coleslaw (optional)"
      ]
    }
  ];
  
  return meals;
}

function generateDummyGroceryList(): any[] {
  return [
    {
      name: "Produce",
      items: [
        { id: "item1", name: "Bell peppers (red and green)", quantity: "4" },
        { id: "item2", name: "Onions, yellow", quantity: "3" },
        { id: "item3", name: "Carrots", quantity: "1 lb" },
        { id: "item4", name: "Sweet potato", quantity: "1 large" },
        { id: "item5", name: "Potatoes", quantity: "2 large" },
        { id: "item6", name: "Garlic", quantity: "1 head" }
      ]
    },
    {
      name: "Meat & Seafood",
      items: [
        { id: "item7", name: "Chicken breast", quantity: "1.5 lbs", mealId: "meal-1" },
        { id: "item8", name: "Beef stew meat", quantity: "1.5 lbs", mealId: "meal-3" },
        { id: "item9", name: "Chicken thighs, boneless", quantity: "2 lbs", mealId: "meal-5" }
      ]
    },
    {
      name: "Dairy & Eggs",
      items: [
        { id: "item10", name: "Heavy cream", quantity: "1 cup", mealId: "meal-2" },
        { id: "item11", name: "Parmesan cheese", quantity: "8 oz", mealId: "meal-2" },
        { id: "item12", name: "Sour cream", quantity: "8 oz", mealId: "meal-1" },
        { id: "item13", name: "Shredded cheese", quantity: "8 oz", mealId: "meal-4" }
      ]
    },
    {
      name: "Pantry Staples",
      items: [
        { id: "item14", name: "Pasta (penne or fusilli)", quantity: "1 lb", mealId: "meal-2" },
        { id: "item15", name: "Olive oil", quantity: "1 bottle" },
        { id: "item16", name: "Fajita seasoning", quantity: "1 packet", mealId: "meal-1" },
        { id: "item17", name: "Tortillas, flour", quantity: "16 count", mealId: "meal-1" },
        { id: "item18", name: "Black beans, canned", quantity: "1 can", mealId: "meal-4" },
        { id: "item19", name: "Enchilada sauce", quantity: "2 cups", mealId: "meal-4" },
        { id: "item20", name: "Beef broth", quantity: "2 cups", mealId: "meal-3" },
        { id: "item21", name: "Tomato paste", quantity: "1 small can", mealId: "meal-3" },
        { id: "item22", name: "BBQ sauce", quantity: "1 cup", mealId: "meal-5" },
        { id: "item23", name: "Brown sugar", quantity: "1/4 cup", mealId: "meal-5" },
        { id: "item24", name: "Worcestershire sauce", quantity: "1 tbsp", mealId: "meal-5" },
        { id: "item25", name: "Hamburger buns", quantity: "1 pack", mealId: "meal-5" }
      ]
    },
    {
      name: "Spices & Seasonings",
      items: [
        { id: "item26", name: "Cumin", quantity: "1 tsp", mealId: "meal-4" },
        { id: "item27", name: "Chili powder", quantity: "1/2 tsp", mealId: "meal-4" },
        { id: "item28", name: "Thyme", quantity: "1 tsp", mealId: "meal-3" },
        { id: "item29", name: "Garlic powder", quantity: "1 tsp", mealId: "meal-5" },
        { id: "item30", name: "Onion powder", quantity: "1 tsp", mealId: "meal-5" },
        { id: "item31", name: "Salt and pepper", quantity: "to taste" }
      ]
    }
  ];
}