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
      temperature: 0.4,
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
          - ingredients (string[]): Complete list of ALL ingredients with specific quantities - MUST include every single ingredient that appears in the instructions
          - instructions (string[]): Step-by-step cooking instructions meeting these MANDATORY requirements:
              * EXACTLY 8-10 detailed, numbered steps (e.g., "1. Preheat the oven...")
              * Each step MUST begin with a strong action verb (e.g., Dice, Sauté, Whisk, Simmer)
              * Include SPECIFIC ingredient names AND EXACT measurements in EACH step
              * Include EXACT cooking times and temperatures (e.g., "sauté for 5 minutes", "bake at 375°F for 20 minutes")
              * AVOID all vague phrases like "cook thoroughly", "until done", "combine everything", "standard procedures"
              * Instructions MUST be written with the assumption the cook has NO prior knowledge
              * Each step should focus on ONE specific cooking action/technique
          
          If the meal is assigned to a specific day, include:
          - day (string): The day of the week
          
          If rationales are requested, include:
          - rationales (string[]): Array of reasons why this meal is appropriate for the family
          
          For "split prep" meals, include:
          - prepInstructions (string): Detailed instructions for what to prepare ahead of time
          - cookingInstructions (string): Detailed instructions for the final cooking day
          
          CRITICAL INSTRUCTION REQUIREMENTS:
          1. NEVER use generic cooking instructions or phrases like "cook according to standard procedures" or "prepare according to ingredients list"
          2. ALWAYS include specific cooking times (e.g., "sauté for 5-7 minutes")
          3. ALWAYS include specific cooking temperatures (e.g., "preheat oven to 375°F")
          4. ALWAYS describe exactly how to prepare each ingredient
          5. ALWAYS include how to tell when food is properly cooked (e.g., "until chicken reaches internal temperature of 165°F")
          
          BANNED PHRASES - DO NOT USE ANY OF THESE IN YOUR INSTRUCTIONS:
          - "Prepare all ingredients according to the ingredients list"
          - "Wash, chop, and measure everything before starting"
          - "Preheat your oven or stovetop as needed for this recipe"
          - "Combine the ingredients according to the main ingredients list"
          - "Cook following standard procedures for this type of dish"
          - "Cook until all components are thoroughly cooked"
          - "Serve hot and enjoy with your family"
          
          BAD EXAMPLE (DO NOT FOLLOW THIS PATTERN):
          "instructions": [
            "Prepare all ingredients according to the ingredients list - wash, chop, and measure everything before starting.",
            "Preheat your oven or stovetop as needed for this recipe.",
            "Combine the ingredients according to the main ingredients list.",
            "Cook following standard procedures for this type of dish until all components are thoroughly cooked.",
            "Serve hot and enjoy with your family!"
          ]
          
          GOOD EXAMPLE (FOLLOW THIS PATTERN):
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
              }
            ]
          }`
        },
        {
          role: "user",
          content: promptContent
        }
      ],
      temperature: 0.4,
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
            
            // Apply post-processing to fix common issues (like generic cooking instructions)
            meal = improveRecipeInstructions(meal);
            
            // Validate meal quality after improvements
            const validationResult = validateMealQuality(meal);
            if (!validationResult.isValid) {
              console.warn(`[MEAL PLAN] Quality validation failed for meal "${meal.name}":`, validationResult.issues);
              
              // Store quality issues for debugging
              meal._qualityIssues = validationResult.issues;
              
              // For initial meal plan, we won't regenerate individual meals as that would be too expensive
              // But we'll mark them for potential future regeneration
              meal._needsRegeneration = true;
            } else {
              console.log(`[MEAL PLAN] Meal "${meal.name}" passed quality validation`);
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
    const uniqueMealNames = Array.from(new Set(mealNames)) as string[];
    
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
export async function modifyMeal(meal: any, modificationRequest: string, retryCount: number = 0): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is required for this operation");
  }
  
  // Safety check to prevent infinite recursion
  if (retryCount >= 3) {
    console.warn(`[MEAL MODIFICATION] Maximum retry attempts (${retryCount}) reached for modifying "${meal.name}". Returning best attempt.`);
    // Return the meal anyway, even with quality issues
    return meal;
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
          - Create beautiful, detailed recipes with clear, step-by-step instructions
          - Keep the same meal category and day assignment as the original
          - Preserve approximately the same prep time (±5 minutes)
          
          INSTRUCTION REQUIREMENTS - MANDATORY:
          - Include EXACTLY 8-10 detailed, numbered steps (e.g., "1. Preheat the oven...")
          - Each step MUST begin with a strong action verb (e.g., Dice, Sauté, Whisk, Simmer)
          - Include SPECIFIC ingredient names AND EXACT measurements in EACH step
          - Include EXACT cooking times and temperatures (e.g., "sauté for 5 minutes", "bake at 375°F for 20 minutes")
          - AVOID all vague phrases like "cook thoroughly", "until done", "combine everything"
          - Instructions MUST be written for a beginner with NO prior cooking knowledge
          
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
          
          CRITICAL INSTRUCTION REQUIREMENTS:
          1. NEVER use generic cooking instructions or phrases like "cook according to standard procedures" or "prepare according to ingredients list"
          2. ALWAYS include specific cooking times (e.g., "sauté for 5-7 minutes")
          3. ALWAYS include specific cooking temperatures (e.g., "preheat oven to 375°F")
          4. ALWAYS describe exactly how to prepare each ingredient
          5. ALWAYS include how to tell when food is properly cooked (e.g., "until chicken reaches internal temperature of 165°F")
          
          BANNED PHRASES - DO NOT USE ANY OF THESE IN YOUR INSTRUCTIONS:
          - "Prepare all ingredients according to the ingredients list"
          - "Wash, chop, and measure everything before starting"
          - "Preheat your oven or stovetop as needed for this recipe"
          - "Combine the ingredients according to the main ingredients list"
          - "Cook following standard procedures for this type of dish"
          - "Cook until all components are thoroughly cooked"
          - "Serve hot and enjoy with your family"
          
          BAD EXAMPLE (DO NOT FOLLOW THIS PATTERN):
          "instructions": [
            "Prepare all ingredients according to the ingredients list - wash, chop, and measure everything before starting.",
            "Preheat your oven or stovetop as needed for this recipe.",
            "Combine the ingredients according to the main ingredients list.",
            "Cook following standard procedures for this type of dish until all components are thoroughly cooked.",
            "Serve hot and enjoy with your family!"
          ]
          
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
      temperature: 0.3,
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
      
      // Validate the meal quality
      const validationResult = validateMealQuality(modifiedMeal);
      if (!validationResult.isValid) {
        console.warn(`[MEAL MODIFICATION] Quality validation failed for modified meal "${modifiedMeal.name}":`, validationResult.issues);
        
        // Store issues for reference
        modifiedMeal._qualityIssues = validationResult.issues;
        
        // Check if we should retry based on severity of issues
        const criticalIssues = validationResult.issues.filter(issue => 
          issue.includes("Insufficient instructions") || 
          issue.includes("Insufficient ingredients") ||
          issue.includes("generic instruction")
        );
        
        if (criticalIssues.length > 0 && retryCount < 2) {
          console.log(`[MEAL MODIFICATION] Critical quality issues detected. Attempting to regenerate meal (attempt ${retryCount + 1})...`);
          
          // Create a more specific prompt for regeneration based on issues
          const improvementPrompt = {
            ...meal,
            name: modifiedMeal.name, // Keep the modified name but improve the quality
            regenerationNotes: `Please improve this recipe to fix the following issues: ${criticalIssues.join(", ")}. 
            The modification request was: "${modificationRequest}".
            Ensure there are at least 8 ingredients with specific measurements and at least 7 detailed instruction steps.
            Include specific cooking times and temperatures.`
          };
          
          // Retry with the improved prompt and same modification request
          return await modifyMeal(improvementPrompt, modificationRequest, retryCount + 1);
        }
        
        console.log(`[MEAL MODIFICATION] Proceeding with meal despite quality issues (${retryCount} retries attempted)`);
      } else {
        console.log(`[MEAL MODIFICATION] Meal "${modifiedMeal.name}" passed quality validation`);
      }
      
      // Improve instructions quality post-generation
      const improvedMeal = improveRecipeInstructions(modifiedMeal);
      
      console.log(`[MEAL MODIFICATION] Successfully modified "${meal.name}" to "${improvedMeal.name}"`);
      return improvedMeal;
      
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
export async function replaceMeal(meal: any, retryCount: number = 0): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is required for this operation");
  }

  // Safety check to prevent infinite recursion
  if (retryCount >= 3) {
    console.warn(`[MEAL REPLACEMENT] Maximum retry attempts (${retryCount}) reached for replacing "${meal.name}". Returning best attempt.`);
    // Return the meal anyway, even with quality issues
    return meal;
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
          content: `You are Chef GPT, a professional recipe creator with 20+ years of experience creating exceptional recipes for home cooks. You are known for writing extremely clear, detailed recipes that anyone can follow successfully, regardless of cooking experience.
          
          You're creating a replacement recipe that will maintain the same meal category and approximate prep time as the original, but with completely different ingredients and flavors to provide variety.
          
          REPLACEMENT APPROACH:
          - Generate a completely new meal in the same category as the original
          - Use a similar cooking method but with different ingredients
          - Maintain approximately the same prep time (±5 minutes)
          - Create beautiful, detailed recipes with clear, step-by-step instructions
          
          INSTRUCTION REQUIREMENTS - MANDATORY:
          - Include EXACTLY 8-10 detailed, numbered steps (e.g., "1. Preheat the oven to 375°F.")
          - Begin EVERY step with a specific action verb (e.g., "Sauté", "Whisk", "Add")
          - Include SPECIFIC ingredient names AND EXACT measurements in EACH step
          - Include EXACT cooking times and temperatures for ALL cooking steps
          - Provide visual or tactile cues for doneness in addition to timing
          - NEVER use vague phrases like "cook until done" or "as needed"
          - Instructions MUST be written for a beginner with NO prior cooking knowledge
          
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
      temperature: 0.4,
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
      
      // Validate the meal quality
      const validationResult = validateMealQuality(replacementMeal);
      if (!validationResult.isValid) {
        console.warn(`[MEAL REPLACEMENT] Quality validation failed for replacement meal "${replacementMeal.name}":`, validationResult.issues);
        
        // Store issues for reference
        replacementMeal._qualityIssues = validationResult.issues;
        
        // Check if we should retry based on severity of issues
        const criticalIssues = validationResult.issues.filter(issue => 
          issue.includes("Insufficient instructions") || 
          issue.includes("Insufficient ingredients") ||
          issue.includes("generic instruction")
        );
        
        if (criticalIssues.length > 0 && retryCount < 2) {
          console.log(`[MEAL REPLACEMENT] Critical quality issues detected. Attempting to regenerate meal (attempt ${retryCount + 1})...`);
          
          // Create a more specific prompt for regeneration based on issues
          const improvementPrompt = {
            ...meal,
            regenerationNotes: `Please improve this recipe to fix the following issues: ${criticalIssues.join(", ")}. 
            Ensure there are at least 8 ingredients with specific measurements and at least 7 detailed instruction steps.
            Include specific cooking times and temperatures.`
          };
          
          // Retry with the improved prompt
          return await replaceMeal(improvementPrompt, retryCount + 1);
        }
        
        console.log(`[MEAL REPLACEMENT] Proceeding with meal despite quality issues (${retryCount} retries attempted)`);
      } else {
        console.log(`[MEAL REPLACEMENT] Meal "${replacementMeal.name}" passed quality validation`);
      }
      
      // Improve instructions quality post-generation
      const improvedMeal = improveRecipeInstructions(replacementMeal);
      
      console.log(`[MEAL REPLACEMENT] Successfully replaced "${meal.name}" with "${improvedMeal.name}"`);
      return improvedMeal;
      
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
 * Improve the quality of a meal's instructions to ensure they're detailed and specific
 * This is a post-processing step to fix common issues
 */
export function improveRecipeInstructions(recipe: any): any {
  if (!recipe || !recipe.instructions || !Array.isArray(recipe.instructions)) {
    return recipe;
  }
  
  // Deep clone to avoid modifying the original
  const improvedRecipe = JSON.parse(JSON.stringify(recipe));
  let modified = false;

  // List of banned generic phrases
  const bannedPhrases = [
    'prepare all ingredients according to the ingredients list',
    'wash, chop, and measure everything',
    'preheat your oven or stovetop as needed',
    'combine the ingredients according to the main ingredients list',
    'cook following standard procedures',
    'cook until all components are thoroughly cooked',
    'cook thoroughly',
    'combine everything',
    'until done',
    'serve hot and enjoy with your family',
    'enjoy with your family',
    'serve and enjoy'
  ];
  
  // Check if instructions contain any banned phrases
  let containsBannedPhrases = false;
  
  // Count instances of banned phrases
  let bannedPhraseCount = 0;
  for (const step of improvedRecipe.instructions) {
    if (typeof step !== 'string') continue;
    
    const stepLower = step.toLowerCase();
    for (const phrase of bannedPhrases) {
      if (stepLower.includes(phrase)) {
        bannedPhraseCount++;
        break;
      }
    }
  }
  
  // Check if the instructions lack numbered steps or have too few steps
  const hasNumberedSteps = improvedRecipe.instructions.some((step: string) => 
    typeof step === 'string' && /^(\d+\.|Step \d+:)/.test(step.trim()));
  const hasTooFewSteps = improvedRecipe.instructions.length < 7; // Increased from 5 to 7
  
  // Check for good format with numbering at the beginning of each step
  const allStepsNumbered = improvedRecipe.instructions.every((step: string) =>
    typeof step === 'string' && /^(\d+\.|Step \d+:)/.test(step.trim()));
  
  // If multiple banned phrases found or lacks numbered steps with too few steps, consider it a generic template
  if (bannedPhraseCount >= 2 || 
      (improvedRecipe.instructions.length <= 6 && bannedPhraseCount >= 1) || // More strict: any banned phrase in short instructions is bad
      (!hasNumberedSteps && hasTooFewSteps) ||
      (improvedRecipe.instructions.length < 8)) { // Too few steps, needs replacement regardless
    console.log(`[RECIPE IMPROVE] Detected ${bannedPhraseCount} generic steps in recipe: ${recipe.name}`);
    console.log(`[RECIPE IMPROVE] Original instructions: ${JSON.stringify(improvedRecipe.instructions)}`);
    containsBannedPhrases = true;
  }
  
  // Check if we have the exact template pattern
  const hasGenericTemplate = checkForGenericTemplate(improvedRecipe.instructions);
  
  // Additional check for actionable steps
  const lacksActionVerbs = checkForMissingActionVerbs(improvedRecipe.instructions);
  
  // If it's a generic template or contains several banned phrases or lacks proper formatting, completely replace instructions
  if (hasGenericTemplate || containsBannedPhrases || lacksActionVerbs || !allStepsNumbered || hasTooFewSteps) {
    console.log(`[RECIPE IMPROVE] Replacing generic instructions in recipe: ${recipe.name}`);
    modified = true;
    
    // Replace the entire instructions with a more specific set based on the recipe type and ingredients
    improvedRecipe.instructions = generateDetailedInstructions(improvedRecipe);
    
    // Add a note for debugging purposes
    improvedRecipe._instructionsImproved = true;
    
    console.log(`[RECIPE IMPROVE] Replaced generic instructions with ${improvedRecipe.instructions.length} detailed steps`);
    return improvedRecipe;
  }
  
  // Otherwise check individual steps and fix "standard procedures" instructions
  improvedRecipe.instructions = improvedRecipe.instructions.map((step: string, index: number) => {
    if (typeof step !== 'string') return step;
    
    // Add numbering if missing (only if not already numbered)
    if (!hasNumberedSteps) {
      step = `${index + 1}. ${step}`;
    }
    
    // Fix prep step
    if (step.toLowerCase().includes('according to the ingredients list') || 
        step.toLowerCase().includes('wash, chop, and measure')) {
      modified = true;
      const stepNumber = hasNumberedSteps ? "" : `${index + 1}. `;
      return `${stepNumber}Prep: Wash and peel all vegetables. Dice onions into 1/4-inch pieces, mince garlic finely, and slice other vegetables into even-sized pieces as specified in the ingredients. Measure all spices and liquids into separate small bowls for easy access (mise en place).`;
    }
    
    // Fix preheat step
    if (step.toLowerCase().includes('preheat your oven or stovetop as needed')) {
      modified = true;
      const stepNumber = hasNumberedSteps ? "" : `${index + 1}. `;
      
      if (recipe.name.toLowerCase().includes('bake') || 
          recipe.description?.toLowerCase().includes('bake') ||
          recipe.name.toLowerCase().includes('roast') || 
          recipe.description?.toLowerCase().includes('roast')) {
        return `${stepNumber}Preheat the oven to 375°F (190°C) and position the rack in the center. Line a baking sheet with parchment paper or aluminum foil for easy cleanup.`;
      }
      
      return `${stepNumber}Heat a large skillet over medium-high heat for 2 minutes until hot. Add 1 tablespoon of oil and swirl to coat the entire cooking surface.`;
    }
    
    // Fix combine step
    if (step.toLowerCase().includes('combine the ingredients according to the main')) {
      modified = true;
      const stepNumber = hasNumberedSteps ? "" : `${index + 1}. `;
      
      if (recipe.name.toLowerCase().includes('salad') || 
          recipe.description?.toLowerCase().includes('salad')) {
        return `${stepNumber}In a large mixing bowl, combine all prepared vegetables. Add 2 tablespoons of olive oil, 1 tablespoon of vinegar, 1/2 teaspoon salt, and 1/4 teaspoon black pepper. Toss gently using tongs or two large spoons until all ingredients are evenly coated with dressing.`;
      }
      
      if (recipe.name.toLowerCase().includes('soup') || 
          recipe.description?.toLowerCase().includes('soup')) {
        return `${stepNumber}Heat 2 tablespoons of oil in a large pot over medium heat. Add onions and garlic, and sauté for 3-4 minutes until softened and fragrant. Add carrots and celery (if using) and cook for another 2-3 minutes. Pour in broth and bring to a simmer.`;
      }
      
      return `${stepNumber}Heat 2 tablespoons oil in the pan. Add diced onions and minced garlic, and sauté for 2-3 minutes until translucent and fragrant. Add longer-cooking vegetables (carrots, potatoes) first and cook for 4-5 minutes, then add quicker-cooking items (bell peppers, zucchini) and cook for 2-3 minutes more.`;
    }
    
    // Fix stir-fry or standard procedures step
    if (step.toLowerCase().includes('standard procedure') || 
        step.toLowerCase().includes('standard procedures') ||
        step.toLowerCase().includes('cook following') ||
        (step.toLowerCase().includes('cook') && step.toLowerCase().includes('for this type of dish'))) {
      
      modified = true;
      const stepNumber = hasNumberedSteps ? "" : `${index + 1}. `;
      
      if (recipe.name.toLowerCase().includes('stir fry') || 
          recipe.description?.toLowerCase().includes('stir-fry') || 
          recipe.description?.toLowerCase().includes('stir fry')) {
        return `${stepNumber}Heat a wok or large skillet over high heat for 1 minute until very hot. Add 1 tablespoon oil and swirl to coat the pan. Add protein (chicken/beef/tofu) in a single layer and stir-fry for 4-5 minutes until golden brown and cooked through (165°F for chicken). Remove protein to a clean plate. Add another 1/2 tablespoon oil to the same pan and add vegetables, starting with the firmest ones (carrots, broccoli) and stir-fry for 2 minutes, then add softer vegetables (bell peppers, snow peas) for 1-2 minutes more until crisp-tender. Return protein to the pan, pour sauce over everything, and stir-fry for 1 minute until everything is well-coated and heated through.`;
      }
      
      if (recipe.name.toLowerCase().includes('soup') || 
          recipe.description?.toLowerCase().includes('soup')) {
        return `${stepNumber}Bring the soup mixture to a boil over medium-high heat. Once rapidly boiling, reduce heat to medium-low, cover the pot with a lid, and simmer for 20-25 minutes, stirring occasionally every 5 minutes. Check that vegetables are tender by piercing with a fork. Season with additional salt and pepper to taste (start with 1/4 teaspoon of each).`;
      }
      
      if (recipe.name.toLowerCase().includes('pasta') || 
          recipe.description?.toLowerCase().includes('pasta')) {
        return `${stepNumber}Bring a large pot of water (4 quarts) to a rolling boil over high heat. Add 1 tablespoon salt to the water, then add pasta and cook according to package instructions until al dente (usually 8-10 minutes, but taste test 1-2 minutes before the suggested time). Meanwhile, in a large skillet, heat 2 tablespoons oil over medium heat and add garlic and onions, cooking for 2 minutes until fragrant. Add other sauce ingredients and simmer for 5-7 minutes. Drain pasta in a colander, reserving 1/4 cup pasta water, then add pasta directly to the sauce. Toss for 1-2 minutes to coat evenly. If sauce is too thick, add reserved pasta water 1 tablespoon at a time until desired consistency is reached.`;
      }
      
      if (recipe.name.toLowerCase().includes('instant pot') || 
          recipe.description?.toLowerCase().includes('instant pot')) {
        return `${stepNumber}Secure the Instant Pot lid and ensure the pressure valve is set to 'Sealing' position. Select 'Pressure Cook' or 'Manual' setting and set timer for 20 minutes at high pressure. Once cooking completes and timer beeps, allow for 10 minutes of natural pressure release (don't touch anything). After 10 minutes, carefully turn the valve to 'Venting' position using a wooden spoon or oven mitt to release remaining pressure. When the float valve drops completely, carefully open the lid away from your face and body.`;
      }
      
      if (recipe.name.toLowerCase().includes('slow cooker') || 
          recipe.description?.toLowerCase().includes('slow cooker') ||
          recipe.name.toLowerCase().includes('crockpot') || 
          recipe.description?.toLowerCase().includes('crockpot')) {
        return `${stepNumber}Cover the slow cooker with its lid and set to LOW for 7-8 hours or HIGH for 3-4 hours. The meat is done when it reaches 205°F internal temperature or easily pulls apart with a fork. Avoid opening the lid during cooking as each peek adds 15-20 minutes to cooking time. If adding vegetables, place them on top of the meat during the last 1-2 hours of cooking.`;
      }
      
      // General replacement for other dishes
      return `${stepNumber}Cook the mixture over medium-high heat for 6-8 minutes, stirring every 1-2 minutes with a wooden spoon to prevent sticking. Continue cooking until food is completely cooked through and reaches appropriate internal temperature (165°F for chicken, 145°F for fish, or 160°F for ground meat) - check with an instant-read thermometer. Add any reserved ingredients (fresh herbs, cheese, pre-cooked items) in the last minute of cooking and mix until evenly incorporated.`;
    }
    
    // Fix serve step
    if (step.toLowerCase().includes('serve hot and enjoy') || 
        step.toLowerCase().includes('enjoy with your family') ||
        step.toLowerCase().includes('serve and enjoy')) {
      modified = true;
      const stepNumber = hasNumberedSteps ? "" : `${index + 1}. `;
      return `${stepNumber}Transfer the finished dish to serving plates or bowls while still hot. Garnish with 1 tablespoon of fresh chopped herbs (parsley, cilantro, or basil), a sprinkle of grated cheese, or a drizzle of olive oil as appropriate. Serve immediately alongside suggested side dishes (rice, bread, or salad).`;
    }
    
    // If step doesn't have any of the specific bad phrases but still seems generic
    // and doesn't start with an action verb, try to enhance it
    if (!step.match(/^(\d+\.|Step \d+:)?\s*[A-Z][a-z]+/) && !containsBannedPhrases) {
      modified = true;
      const stepNumber = hasNumberedSteps ? "" : `${index + 1}. `;
      // Create a more specific step with action verb
      const actionVerbs = ["Mix", "Stir", "Cook", "Heat", "Add", "Combine", "Prepare", "Chop"];
      const randomVerb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
      return `${stepNumber}${randomVerb} the ingredients thoroughly, ensuring even distribution and proper cooking. Monitor temperature and timing carefully for best results.`;
    }
    
    // If step already has numbering but we're adding it, remove the existing numbering to avoid duplication
    if (!hasNumberedSteps && /^(\d+\.|Step \d+:)/.test(step.trim())) {
      step = step.replace(/^(\d+\.|Step \d+:)\s*/, '');
      return `${index + 1}. ${step}`;
    }
    
    // If no changes needed and we're adding numbering
    if (!hasNumberedSteps) {
      return `${index + 1}. ${step}`;
    }
    
    return step;
  });
  
  if (modified) {
    console.log(`[RECIPE IMPROVE] Fixed generic cooking instructions in recipe: ${recipe.name}`);
  }
  
  return improvedRecipe;
}

/**
 * Check if the instructions match the common generic template pattern
 */
function checkForGenericTemplate(instructions: string[]): boolean {
  if (!Array.isArray(instructions)) {
    return false;
  }
  
  // Generic instruction patterns
  const prepStepPattern = /prepare all ingredients|wash, chop, and measure|according to the ingredients list/i;
  const preheatStepPattern = /preheat your oven or stovetop as needed|as needed for this recipe/i;
  const combineStepPattern = /combine the ingredients according to|add ingredients in order/i;
  const cookStepPattern = /cook following standard procedures|for this type of dish|until all components are thoroughly cooked|cook until done/i;
  const serveStepPattern = /serve hot and enjoy|enjoy with your family|serve and enjoy/i;
  
  // If instructions is exactly 5 steps matching the template pattern, that's definitely generic
  if (instructions.length === 5) {
    const exactTemplateMatch = (
      prepStepPattern.test(instructions[0]) &&
      preheatStepPattern.test(instructions[1]) &&
      combineStepPattern.test(instructions[2]) &&
      cookStepPattern.test(instructions[3]) &&
      serveStepPattern.test(instructions[4])
    );
    
    if (exactTemplateMatch) {
      return true;
    }
  }
  
  // Check for generic patterns in any order if we have a small number of steps
  if (instructions.length <= 6) {
    let genericPatternCount = 0;
    
    for (const step of instructions) {
      if (typeof step !== 'string') continue;
      const stepLower = step.toLowerCase();
      
      if (prepStepPattern.test(stepLower) || 
          preheatStepPattern.test(stepLower) || 
          combineStepPattern.test(stepLower) || 
          cookStepPattern.test(stepLower) || 
          serveStepPattern.test(stepLower)) {
        genericPatternCount++;
      }
    }
    
    // If at least half of the steps match generic patterns, consider it a template
    return genericPatternCount >= Math.ceil(instructions.length / 2);
  }
  
  return false;
}

/**
 * Check if the instructions lack proper action verbs at the beginning of steps
 * Also checks for vague or generic instructions without specific measurements or details
 */
function checkForMissingActionVerbs(instructions: string[]): boolean {
  if (!Array.isArray(instructions) || instructions.length < 3) {
    return false;
  }
  
  // Define common cooking action verbs - strong, precise cooking verbs
  const actionVerbs = [
    'add', 'adjust', 'arrange', 'assemble', 'bake', 'beat', 'blend', 'boil', 'braise', 'break', 'broil', 'brown', 
    'brush', 'caramelize', 'carve', 'char', 'check', 'chop', 'clean', 'coat', 'combine', 'cool', 'core', 'cover', 'crackle', 'cream',
    'crimp', 'crumble', 'crush', 'cube', 'cut', 'decorate', 'deglaze', 'dice', 'dip', 'dissolve', 'divide', 'dot', 'drain', 'dress',
    'drizzle', 'drop', 'dry', 'dust', 'emulsify', 'ferment', 'fillet', 'filter', 'flambe', 'flatten', 'flip', 'fold', 'form', 'fry', 
    'garnish', 'glaze', 'grate', 'grease', 'grill', 'grind', 'heat', 'infuse', 'inject', 'insert', 'julienne', 'knead', 'ladle', 'layer', 
    'let', 'line', 'macerate', 'marinate', 'mash', 'massage', 'measure', 'melt', 'microwave', 'mince', 'mix', 'mold', 'monitor', 
    'nestle', 'pat', 'peel', 'pickle', 'pierce', 'pipe', 'pit', 'place', 'poach', 'pour', 'press', 'prick',
    'preheat', 'prepare', 'process', 'puree', 'quarter', 'reduce', 'refrigerate', 'reheat', 'remove', 'render', 'reserve', 
    'rest', 'rinse', 'roast', 'roll', 'rub', 'salt', 'sauté', 'scatter', 'scoop', 'score', 'scrape', 'sear', 'season', 
    'separate', 'serve', 'set', 'sift', 'simmer', 'skim', 'slice', 'slide', 'smash', 'soak', 'spatchcock', 'spoon', 'spread', 'sprinkle', 
    'squeeze', 'steam', 'steep', 'stir', 'strain', 'stretch', 'stuff', 'taste', 'tear', 'temper', 'test', 'thicken', 'thin', 'toast',
    'toss', 'transfer', 'trim', 'turn', 'use', 'wait', 'warm', 'wash', 'weigh', 'whip', 'whisk', 'wrap', 'zest'
  ];
  
  // Banned phrases and patterns that indicate generic, vague instructions
  const bannedPhraseStarts = [
    'prepare all', 'wash, chop', 'preheat your', 'combine the', 'cook following', 
    'serve hot', 'enjoy with', 'according to', 'as needed'
  ];
  
  const genericPatterns = [
    /prepare ingredients/i,
    /wash and prep/i,
    /follow package/i,
    /cook according/i,
    /cook until done/i,
    /depending on your/i,
    /cook to your/i,
    /to taste$/i,
    /as necessary/i,
    /^enjoy!?$/i,
    /as directed/i,
    /as instructed/i,
    /standard procedure/i,
    /following usual/i,
    /usual method/i,
    /thoroughly cooked/i,
    /completely cooked/i,
    /until tender/i,  // unless accompanied by a specific time or test
    /until done/i,
    /accordingly$/i,
    /appropriately$/i,
    /cook through/i,
    /safely cooked/i
  ];
  
  // Check for lack of specific measurements or timing in cooking instructions
  const measurementPatterns = [
    /\d+\s*(minute|min|hour|hr|second|sec)/i,  // Time measurements
    /\d+\s*(degrees?|°[FC])/i,  // Temperature measurements
    /\d+\s*(cup|tbsp|tsp|tablespoon|teaspoon|oz|ounce|pound|lb|gram|g|ml|liter|l|inch|in|cm)/i  // Volume/weight/size measurements
  ];
  
  // Step counts
  let stepsWithoutActionVerbs = 0;
  let stepsWithGenericPhrases = 0;
  let cookingStepsWithoutMeasurements = 0;
  
  for (const step of instructions) {
    if (typeof step !== 'string') continue;
    
    // Remove numbering if present
    const stepText = step.replace(/^(\d+\.|Step \d+:|#\d+)\s*/, '').trim();
    
    // 1. Check if step starts with a banned phrase
    const hasBannedPhrase = bannedPhraseStarts.some(phrase => 
      stepText.toLowerCase().startsWith(phrase)
    );
    
    // 2. Check if step contains generic patterns
    const hasGenericPattern = genericPatterns.some(pattern => 
      pattern.test(stepText)
    );
    
    // 3. Check if step has specific measurements when it involves cooking
    const involveCooking = /(cook|bake|roast|grill|simmer|boil|fry|saut[ée])/i.test(stepText);
    const hasMeasurements = measurementPatterns.some(pattern => 
      pattern.test(stepText)
    );
    const lacksMeasurements = involveCooking && !hasMeasurements;
    
    // 4. Check if step begins with a strong action verb
    const firstWordMatch = stepText.match(/^[^a-zA-Z]*([a-zA-Z]+)/);
    const firstWord = firstWordMatch ? firstWordMatch[1].toLowerCase() : '';
    const hasActionVerb = actionVerbs.includes(firstWord);
    
    // Count issues
    if (!hasActionVerb || hasBannedPhrase) stepsWithoutActionVerbs++;
    if (hasGenericPattern) stepsWithGenericPhrases++;
    if (lacksMeasurements) cookingStepsWithoutMeasurements++;
  }
  
  // Criteria for determining if instructions need improvement
  // 1. More than 1/4 of steps don't start with action verbs
  const tooManyStepsWithoutVerbs = stepsWithoutActionVerbs >= Math.ceil(instructions.length / 4);
  
  // 2. Any generic phrases in short instructions, or more than 1 in longer instructions
  const tooManyGenericPhrases = (instructions.length <= 7 && stepsWithGenericPhrases > 0) || 
                                stepsWithGenericPhrases > 1;
  
  // 3. Too few steps total (less than 8)
  const tooFewSteps = instructions.length < 8;
  
  // 4. More than 1/3 of cooking steps lack specific measurements
  const tooManyStepsWithoutMeasurements = cookingStepsWithoutMeasurements >= Math.ceil(instructions.length / 3);
  
  return tooManyStepsWithoutVerbs || 
         tooManyGenericPhrases || 
         tooFewSteps || 
         tooManyStepsWithoutMeasurements;
}

/**
 * Generate detailed instructions based on the recipe type and ingredients
 */
function generateDetailedInstructions(recipe: any): string[] {
  const recipeName = recipe.name?.toLowerCase() || '';
  const description = recipe.description?.toLowerCase() || '';
  const ingredients = recipe.ingredients || recipe.mainIngredients || [];
  
  // Determine recipe type
  const isStirFry = recipeName.includes('stir fry') || description.includes('stir fry') || description.includes('stir-fry');
  const isPasta = recipeName.includes('pasta') || description.includes('pasta');
  const isSoup = recipeName.includes('soup') || description.includes('soup');
  const isSalad = recipeName.includes('salad') || description.includes('salad');
  const isRoasted = recipeName.includes('roast') || description.includes('roast');
  const isBaked = recipeName.includes('bake') || description.includes('bake');
  const isGrilled = recipeName.includes('grill') || description.includes('grill');
  const isInstantPot = recipeName.includes('instant pot') || description.includes('instant pot');
  const isSlowCooker = recipeName.includes('slow cooker') || description.includes('slow cooker') || 
                       recipeName.includes('crockpot') || description.includes('crockpot');
  
  // Check for protein types
  const hasChicken = ingredients.some((ing: string) => 
    typeof ing === 'string' && ing.toLowerCase().includes('chicken'));
  const hasBeef = ingredients.some((ing: string) => 
    typeof ing === 'string' && (ing.toLowerCase().includes('beef') || ing.toLowerCase().includes('steak')));
  const hasPork = ingredients.some((ing: string) => 
    typeof ing === 'string' && ing.toLowerCase().includes('pork'));
  const hasSeafood = ingredients.some((ing: string) => 
    typeof ing === 'string' && (ing.toLowerCase().includes('fish') || ing.toLowerCase().includes('shrimp') || 
                                ing.toLowerCase().includes('salmon') || ing.toLowerCase().includes('tuna')));
  
  // Generate appropriate instructions based on meal type
  if (isStirFry) {
    return [
      "1. Prep: Wash and pat dry all vegetables. Dice onions into 1/4-inch pieces, mince 2 cloves of garlic, and slice other vegetables into uniform 1-inch pieces. For protein, slice against the grain into 1/4-inch strips for quicker, more even cooking.",
      "2. Make Sauce: In a small bowl, whisk together 3 tablespoons soy sauce, 1 tablespoon cornstarch, 1/2 cup chicken broth, 1 tablespoon honey, and 1 teaspoon sesame oil until completely smooth with no lumps.",
      "3. Heat: Place a wok or 12-inch skillet over high heat for exactly 2 minutes until very hot. Add 1 tablespoon vegetable oil and swirl to coat the entire cooking surface.",
      "4. Cook Protein: Add protein to the hot pan in a single layer without overcrowding (work in two batches if needed). Cook for 3-4 minutes, turning occasionally, until browned but not fully cooked through. Transfer to a clean plate using tongs.",
      "5. Sauté Aromatics: Add another 1/2 tablespoon oil to the same pan. Add minced garlic and 1 tablespoon grated ginger, stirring constantly for exactly 30 seconds until fragrant but not browned.",
      "6. Cook Vegetables: Add harder vegetables first (carrots, broccoli stems) and stir-fry for 2 minutes. Add medium-firm vegetables (bell peppers, snap peas) for 1 minute, then add leafy greens last for 30 seconds, stirring constantly.",
      "7. Combine: Return protein to the pan with any accumulated juices. Pour the sauce over everything and stir constantly for 1-2 minutes until sauce thickens and coats all ingredients evenly. The sauce should reach a nappe consistency that coats the back of a spoon.",
      "8. Serve: Remove from heat and garnish with 2 thinly sliced green onions and 1 tablespoon toasted sesame seeds. Serve immediately over steamed rice or noodles while still hot."
    ];
  } else if (isPasta) {
    return [
      "1. Boil Water: Fill a large 6-quart pot with 4 quarts of water. Bring to a rolling boil over high heat. Add 1 tablespoon salt to the water – it should taste as salty as seawater.",
      "2. Prep Ingredients: While water is heating, finely dice 1 medium onion and mince 3 cloves of garlic. Measure all sauce ingredients and set aside in separate bowls.",
      "3. Start Sauce: Heat a large 12-inch skillet over medium heat. Add 2 tablespoons olive oil or butter. When oil is hot but not smoking, add diced onions and sauté for 3 minutes until translucent.",
      "4. Build Flavor: Add minced garlic to the skillet and cook for 30 seconds until fragrant. If using ground meat, add it now and cook for 5-7 minutes, breaking it apart with a wooden spoon until browned and no pink remains.",
      "5. Cook Pasta: Add 12 ounces of pasta to the boiling water and stir immediately to prevent sticking. Set a timer according to package instructions for al dente texture (usually 8-10 minutes). Stir occasionally while cooking.",
      "6. Finish Sauce: While pasta cooks, add remaining sauce ingredients to the skillet. For tomato sauce, add 2 cups marinara and simmer for 5 minutes. For cream sauce, add 1 cup heavy cream and reduce by one-third, about 4 minutes.",
      "7. Reserve Pasta Water: Just before draining, scoop out 1/2 cup of starchy pasta water with a measuring cup. Then drain pasta in a colander but do not rinse it.",
      "8. Combine: Add drained pasta directly to the sauce in the skillet. Toss continuously with tongs for 1-2 minutes until pasta is completely coated. If sauce is too thick, add reserved pasta water 1 tablespoon at a time.",
      "9. Garnish: Remove from heat and add any finishing ingredients like 1/4 cup fresh herbs, 1/2 cup grated cheese, or 1/4 cup toasted pine nuts. Toss once more and serve immediately on warmed plates."
    ];
  } else if (isSoup) {
    return [
      "1. Prep Vegetables: Wash and peel all vegetables. Dice 1 medium onion, 2 medium carrots, and 2 celery stalks into 1/4-inch pieces (creating a mirepoix). Cut remaining vegetables into uniform 1/2-inch bite-sized pieces for even cooking.",
      "2. Heat Base: Place a large 6-quart pot or Dutch oven over medium heat. Add 2 tablespoons olive oil or butter and heat until shimmering but not smoking, about 1 minute.",
      "3. Sauté Aromatics: Add diced onions, carrots, and celery to the hot oil. Sauté for exactly 5 minutes, stirring occasionally with a wooden spoon, until vegetables are softened but not browned.",
      "4. Add Aromatics: Add 3 minced garlic cloves and 1 tablespoon dried herbs (or 2 tablespoons fresh herbs). Cook for exactly 30 seconds, stirring constantly to prevent burning.",
      "5. Brown Protein: If using raw meat (like 1 pound ground beef or 1 pound diced chicken), add it now. Cook until no pink remains, about 5-7 minutes, breaking apart with a wooden spoon. For pre-cooked meat, reserve until step 7.",
      "6. Add Remaining Vegetables: Add all remaining diced vegetables to the pot and stir to coat with oil and herbs. Cook for 2 minutes, stirring occasionally.",
      "7. Add Liquid: Pour in 6-8 cups broth or stock and add 1 bay leaf. If using pre-cooked meat or canned beans, add them now. Bring to a full rolling boil over medium-high heat, about 5 minutes.",
      "8. Simmer: Once boiling, reduce heat to maintain a gentle simmer (small bubbles around the edges). Cover with lid slightly ajar and simmer for 25 minutes, stirring every 7-8 minutes, until all vegetables are tender when pierced with a fork.",
      "9. Season: Remove bay leaf. Taste and adjust seasoning with salt and pepper (start with 1/2 teaspoon salt, 1/4 teaspoon pepper). For creamy soups, stir in 1/2 cup cream or milk. For blended soups, use an immersion blender until desired consistency is reached.",
      "10. Serve: Ladle hot soup into warmed bowls. Garnish each serving with 1 tablespoon fresh chopped herbs (parsley, dill, or cilantro) and serve immediately with warm bread on the side."
    ];
  } else if (isSlowCooker) {
    return [
      "1. Prepare Ingredients: Dice 1 large onion into 1/2-inch pieces. Cut root vegetables (2 carrots, 2 potatoes) into 1-inch chunks. Trim any excess fat from 2-3 pounds of meat and cut into 1.5-inch pieces if using large cuts. Mince 3 cloves of garlic.",
      "2. Sear Meat (Optional): Heat a large skillet over medium-high heat. Add 1 tablespoon oil and heat until shimmering. Season meat with 1 teaspoon salt and 1/2 teaspoon black pepper. Brown meat in batches (don't overcrowd) for 3-4 minutes per side until golden brown. This step is optional but adds significant flavor.",
      "3. Layer Ingredients: Add 1 cup diced onions and any root vegetables to the bottom of the slow cooker (closest to the heat source). Place browned meat on top of vegetables.",
      "4. Add Flavor Base: Sprinkle 3 minced garlic cloves, 1 tablespoon dried herbs (thyme, rosemary, oregano), 1 teaspoon salt, and 1/2 teaspoon black pepper evenly over the meat and vegetables.",
      "5. Add Liquid: Pour in 1-2 cups of liquid (broth, wine, sauce) until ingredients are about 2/3 covered – not completely submerged. For tomato-based dishes, add 1 tablespoon tomato paste for depth of flavor.",
      "6. Set Temperature: Cover the slow cooker with its lid, ensuring a proper seal with no gaps for steam to escape. Set to LOW for 7-8 hours (best for tough cuts like chuck or pork shoulder) or HIGH for 3-4 hours depending on your time constraints.",
      "7. Maintain Closed Environment: Avoid opening the lid during cooking as each peek adds 15-20 minutes to cooking time due to heat loss. If you must check, do so quickly.",
      "8. Add Quick-Cooking Items: During final 30 minutes of cooking, stir in any delicate vegetables (1 cup frozen peas, 2 cups fresh spinach), pasta, or pre-cooked items. If sauce needs thickening, stir in a slurry of 2 tablespoons cornstarch mixed with 3 tablespoons cold water.",
      "9. Check Doneness: Meat is properly cooked when it reaches 205°F for tough cuts like chuck or pork shoulder (should easily shred with two forks) or 165°F for poultry (use an instant-read thermometer). Vegetables should be tender when pierced with a fork but still hold their shape.",
      "10. Serve: Remove from heat and let stand 10 minutes before serving. Skim off any excess fat from the surface. Transfer to a serving platter, garnish with 2 tablespoons fresh chopped herbs, and serve with appropriate sides."
    ];
  } else if (isInstantPot) {
    return [
      "1. Prep Ingredients: Trim 2 pounds of meat (if using) into 1.5-inch chunks, removing excess fat. Dice 1 onion into 1/2-inch pieces. Mince 3 cloves of garlic. Chop vegetables into uniform 1-inch pieces. Measure all seasonings and liquids.",
      "2. Sauté Base: Press the 'Sauté' button on the Instant Pot and set to 'Normal' heat. Allow to heat for exactly 2 minutes until the display reads 'Hot'. Add 2 tablespoons of oil and heat until shimmering.",
      "3. Brown Protein: Pat meat dry with paper towels and season with 1 teaspoon salt and 1/2 teaspoon black pepper. Add meat to the hot pot in a single layer (work in batches if needed) and sear for 3-4 minutes per side until golden brown. Remove and set aside on a plate.",
      "4. Build Flavor Base: Add diced onions to the pot and sauté for 2 minutes until translucent, scraping up any browned bits from the bottom of the pot. Add minced garlic and sauté for 30 seconds until fragrant. Add 1 tablespoon dried herbs or spices and stir for 15 seconds to bloom their flavors.",
      "5. Deglaze: Pour in 1/4 cup of liquid (broth, wine, or water) and scrape the bottom of the pot thoroughly with a wooden spoon for 1 minute to remove all stuck-on bits. This critical step prevents the 'Burn' notice during pressure cooking.",
      "6. Add Remaining Ingredients: Return browned meat to the pot along with any accumulated juices. Add chopped vegetables and remaining ingredients according to the recipe. Pour in remaining liquid (total liquid should be at least 1 cup). Do not fill pot more than 2/3 full.",
      "7. Seal and Set: Press 'Cancel' to stop the Sauté function. Close the lid securely and turn the pressure release valve to 'Sealing' position. Press 'Pressure Cook' or 'Manual' and set to HIGH pressure. For tough cuts of meat, set for 25 minutes; for chicken pieces, 12 minutes; for vegetable dishes, 5 minutes.",
      "8. Release Pressure: When cooking cycle completes, allow for natural pressure release (NPR) for exactly 10 minutes (set a timer). After 10 minutes, carefully turn the valve to 'Venting' using a long spoon or oven mitt to perform a quick release of remaining pressure. Wait for the float valve to drop completely.",
      "9. Check and Adjust: Carefully open the lid away from your face. Check that meat reaches 165°F for poultry or 145°F for beef/pork using an instant-read thermometer. If sauce needs thickening, press 'Sauté' and simmer for 5 minutes, or stir in a slurry of 1 tablespoon cornstarch mixed with 2 tablespoons cold water.",
      "10. Finish and Serve: Press 'Cancel' to turn off the heat. Adjust seasonings with additional salt and pepper if needed (start with 1/4 teaspoon increments). Let stand for 5 minutes, then serve directly from the Instant Pot or transfer to a serving dish. Garnish with 2 tablespoons fresh herbs if desired."
    ];
  } else if (isBaked || isRoasted) {
    const temp = isBaked ? "375°F (190°C)" : "425°F (220°C)";
    return [
      `1. Preheat: Set your oven to ${temp} and position the rack in the center. Allow oven to fully preheat for at least 15 minutes to ensure accurate temperature.`,
      "2. Prepare Baking Surface: Line a rimmed 18x13-inch baking sheet with parchment paper or aluminum foil for easy cleanup. If using a baking dish, lightly coat with 1 tablespoon of olive oil or cooking spray.",
      "3. Prepare Ingredients: Rinse and pat dry all vegetables with paper towels. For root vegetables (carrots, potatoes), peel and cut into uniform 1-inch chunks. For protein, pat dry with paper towels to ensure proper browning.",
      "4. Season: In a large mixing bowl, combine 2 tablespoons olive oil, 1 teaspoon salt, 1/2 teaspoon black pepper, and 1 tablespoon of dried herbs (rosemary, thyme, or Italian seasoning). Add vegetables and/or protein and toss until evenly coated.",
      "5. Arrange: Transfer seasoned ingredients to the prepared baking sheet in a single layer with at least 1/2 inch between pieces to allow for proper air circulation. Overcrowding will cause steaming instead of roasting.",
      `6. Bake: Place in the preheated oven and bake for ${isBaked ? "25-30" : "20-25"} minutes. ${isRoasted ? "For roasted vegetables, they should be caramelized and tender when pierced with a fork." : "For baked dishes, the top should be golden brown and a thermometer inserted in the center should read 165°F."}`,
      "7. Check Progress: At the halfway point, rotate the pan 180 degrees for even browning and use a spatula to carefully flip larger pieces. If some ingredients are browning too quickly, cover those areas loosely with foil.",
      "8. Check Doneness: For proteins, verify doneness with an instant-read thermometer: 165°F for chicken, 145°F for fish, 160°F for ground meat, and 145-160°F for whole cuts of beef/pork (depending on desired doneness).",
      "9. Rest: Remove from oven and let rest for 5-10 minutes before serving. This allows juices to redistribute in proteins and prevents burning your mouth on vegetables.",
      "10. Garnish and Serve: Just before serving, sprinkle with 2 tablespoons freshly chopped herbs (parsley, cilantro, or basil) or a squeeze of fresh lemon juice to brighten flavors. Transfer to a warmed serving platter and serve immediately."
    ];
  } else if (isGrilled) {
    return [
      "1. Preheat Grill: Set gas grill to medium-high heat (approximately 400-450°F) and allow to preheat for a full 15 minutes with lid closed. For charcoal grill, light coals and let burn until covered with white ash (approximately 25-30 minutes).",
      "2. Clean Grates: Once hot, scrub grates thoroughly with a wire brush to remove any residue. Fold a paper towel into a small pad, grip with long-handled tongs, dip in vegetable oil, and wipe grates to create a non-stick surface.",
      "3. Prepare Protein: Pat 1.5-2 pounds of protein (chicken, steak, fish) completely dry with paper towels to promote browning. Season with 1 teaspoon kosher salt, 1/2 teaspoon black pepper, and 1 tablespoon of your preferred spice rub, coating all sides evenly.",
      "4. Prepare Vegetables: Wash and cut 4 cups of vegetables into pieces at least 1-inch thick to prevent falling through grates. For smaller items like cherry tomatoes or mushrooms, thread onto metal skewers, leaving 1/4-inch space between pieces. Brush with 2 tablespoons olive oil and season with 1/2 teaspoon each of salt and pepper.",
      "5. Create Cooking Zones: For gas grills, set one side to high heat and the other to medium-low, creating direct and indirect heat zones. For charcoal, pile coals on one side of the grill, leaving the other side empty for indirect cooking.",
      "6. Grill Protein: Place protein on the hot zone. For boneless chicken breasts, grill 6 minutes per side; for 1-inch thick steaks, 4-5 minutes per side for medium; for 1-inch thick fish fillets, 3-4 minutes per side. Use a spatula, not a fork, to flip to avoid piercing and losing juices.",
      "7. Grill Vegetables: Place larger, denser vegetables (corn, bell peppers, zucchini) on the hot zone, and more delicate items on the cooler zone. Arrange perpendicular to grates and turn every 3-4 minutes until char marks develop and vegetables are tender when pierced with a fork.",
      "8. Check Doneness: Use an instant-read thermometer inserted into the thickest part to verify doneness: 165°F for chicken, 145°F for fish, 125°F for rare beef, 135°F for medium-rare, 145°F for medium, 155°F for medium-well. If meat is browning too quickly but not reaching proper temperature, move to indirect heat to finish cooking.",
      "9. Rest Protein: Transfer grilled protein to a clean cutting board and tent loosely with aluminum foil for 5-10 minutes (5 for fish, 10 for larger cuts of meat). This critical step allows juices to redistribute throughout the meat rather than spilling out when cut.",
      "10. Slice and Serve: For steaks and larger cuts, slice against the grain into 1/4 to 1/2-inch thick pieces. Arrange protein and vegetables on a warmed platter. Finish with 1 tablespoon fresh chopped herbs and a squeeze of fresh lemon juice (about 1 tablespoon) over everything just before serving."
    ];
  } else if (isSalad) {
    return [
      "1. Wash Produce: Thoroughly rinse all fruits and vegetables under cold running water for at least 30 seconds each. For greens, fill a large bowl with cold water, submerge greens, swish gently, then lift out. Repeat with fresh water if necessary. Spin dry in a salad spinner or pat completely dry with clean kitchen towels.",
      "2. Prepare Dressing Base: In a small bowl, combine 3 tablespoons acid (lemon juice, lime juice, or vinegar) with 1/2 teaspoon salt and 1/4 teaspoon freshly ground black pepper. Let stand for 3 minutes to dissolve salt and mellow acid.",
      "3. Emulsify Dressing: While whisking constantly, slowly drizzle in 6 tablespoons oil (olive, avocado, or preferred oil) in a thin stream until fully incorporated and emulsified. Add 1 teaspoon honey or maple syrup and 1 teaspoon Dijon mustard if desired. Whisk until smooth and slightly thickened.",
      "4. Prepare Greens: Remove any tough stems from 8 cups of fresh greens. Tear or chop larger leaves into bite-sized pieces (approximately 1.5-inch squares). Place in a large salad bowl with at least 3-inch depth for proper tossing.",
      "5. Prep Crisp Vegetables: Using a sharp chef's knife, slice 1 medium cucumber into 1/4-inch half-moons, dice 1 bell pepper into 1/2-inch pieces, halve 1 cup cherry tomatoes, and thinly slice 1/4 red onion. Keep vegetables separate until assembly.",
      "6. Toast Nuts/Seeds: If using, place 1/2 cup nuts or seeds in a dry skillet over medium heat. Cook for exactly 4 minutes, shaking the pan every 30 seconds until golden brown and fragrant. Immediately transfer to a plate to cool completely.",
      "7. Prepare Protein: If including protein, slice 6 ounces cooked chicken into 1/2-inch strips, or crumble 4 ounces feta cheese, or drain and rinse one 15-ounce can of beans. Cut any delicate proteins (like avocado) just before serving to prevent browning.",
      "8. Layer Ingredients: Place sturdier ingredients (carrots, bell peppers, cucumbers) directly on greens. Add protein components next. Save delicate items (avocado, berries, fresh herbs) for the top layer.",
      "9. Dress the Salad: Just before serving, drizzle exactly 3 tablespoons of dressing over the salad. Using salad tongs or two large spoons, gently toss from bottom to top for 30 seconds until ingredients are evenly coated. Taste and add more dressing 1 tablespoon at a time if needed.",
      "10. Garnish and Serve: Finish with 1/4 cup toasted nuts or seeds, 2 tablespoons fresh herbs (basil, cilantro, or parsley), and a final light sprinkle of flaky sea salt (1/4 teaspoon). Serve immediately on chilled plates for maximum freshness and texture."
    ];
  } else {
    // Generic detailed instructions for other types of recipes
    const cookingMethod = getDefaultCookingMethod(recipe);
    return generateGenericInstructions(recipe, cookingMethod);
  }
}

/**
 * Determine the default cooking method based on recipe information
 */
function getDefaultCookingMethod(recipe: any): string {
  const recipeName = recipe.name?.toLowerCase() || '';
  const description = recipe.description?.toLowerCase() || '';
  const ingredients = recipe.ingredients || recipe.mainIngredients || [];
  
  if (recipeName.includes('bake') || description.includes('bake') || 
      recipeName.includes('roast') || description.includes('roast')) {
    return 'bake';
  } else if (recipeName.includes('grill') || description.includes('grill')) {
    return 'grill';
  } else if (recipeName.includes('slow cooker') || description.includes('slow cooker') ||
             recipeName.includes('crockpot') || description.includes('crockpot')) {
    return 'slowcook';
  } else if (recipeName.includes('instant pot') || description.includes('instant pot')) {
    return 'instantpot';
  } else if (recipeName.includes('stir fry') || description.includes('stir fry') || 
             description.includes('stir-fry')) {
    return 'stirfry';
  } else if (recipeName.includes('soup') || description.includes('soup')) {
    return 'soup';
  } else if (recipeName.includes('salad') || description.includes('salad')) {
    return 'salad';
  } else if (recipeName.includes('pasta') || description.includes('pasta')) {
    return 'pasta';
  } else {
    // Default to stovetop cooking
    return 'stovetop';
  }
}

/**
 * Generate generic detailed instructions for recipes that don't match specific categories
 */
function generateGenericInstructions(recipe: any, cookingMethod: string): string[] {
  const instructions: string[] = [];
  
  // Initial prep step
  instructions.push("Wash, peel, and chop all produce as indicated in the ingredients list. Measure all spices, liquids, and other ingredients. Arrange everything in small bowls for easy access during cooking.");
  
  // Cooking specific instructions
  if (cookingMethod === 'stovetop') {
    instructions.push("1. Heat Pan: Place a 12-inch skillet or sauté pan over medium heat. Add 2 tablespoons of oil (olive oil, vegetable oil, or butter) and heat for exactly 2 minutes until shimmering but not smoking. Test the heat by flicking a drop of water into the pan—it should sizzle immediately.");
    instructions.push("2. Sauté Aromatics: Add 1 diced medium onion to the hot oil and sauté for 3-4 minutes, stirring occasionally with a wooden spoon, until translucent. Add 2-3 minced garlic cloves and cook for exactly 30 seconds until fragrant but not browned.");
    instructions.push("3. Brown Protein: If using meat, add 1-1.5 pounds of protein (cut into uniform pieces) to the pan in a single layer. Season with 1 teaspoon salt and 1/2 teaspoon black pepper. Cook undisturbed for 3-4 minutes until golden brown, then flip and cook another 3-4 minutes. For ground meat, cook 5-7 minutes, breaking apart with a spatula, until no pink remains.");
    instructions.push("4. Add Vegetables: Add 3-4 cups of vegetables in order of density—harder vegetables first (carrots, celery, bell peppers) for 3 minutes, then more delicate vegetables (zucchini, mushrooms) for 2 minutes. Maintain medium-high heat to promote browning rather than steaming.");
    instructions.push("5. Season and Build Flavor: Add 1-2 teaspoons of dried herbs or spices. Cook for 30 seconds to bloom their flavors. For acidity, add 2 tablespoons of wine, vinegar, or citrus juice and scrape up any browned bits from the bottom of the pan.");
    instructions.push("6. Add Liquid and Simmer: Pour in 1-2 cups of liquid (broth, sauce, crushed tomatoes) and stir to combine. Bring to a strong simmer with bubbles breaking the surface regularly. Reduce heat to medium-low and maintain a gentle simmer for 10-15 minutes until liquid has reduced by one-third, stirring occasionally.");
    instructions.push("7. Thicken Sauce: If the sauce needs thickening, create a slurry by mixing 1 tablespoon cornstarch with 3 tablespoons cold water in a small bowl until smooth. Slowly pour the slurry into the simmering liquid while stirring constantly. Cook for exactly 2 minutes until thickened to a consistency that coats the back of a spoon.");
    instructions.push("8. Adjust Seasonings: Remove from heat and taste the dish. Adjust seasonings with salt and pepper in 1/4 teaspoon increments, stirring and tasting between additions. For brightness, add 1/2 teaspoon of an acidic ingredient (lemon juice, vinegar) if needed.");
  } else {
    // Default instructions if we can't determine a specific cooking method
    instructions.push("1. Prepare Cooking Vessel: Select the appropriate cooking vessel based on the recipe and volume of ingredients. For larger batches, use a 6-quart pot or 12-inch skillet. Place over medium heat and add 2 tablespoons oil or fat.");
    instructions.push("2. Layer Ingredients: Add ingredients in order of cooking time, starting with those requiring the longest cooking. For proteins, cook first until properly browned and nearly cooked through (165°F for chicken, 145°F for fish, 160°F for ground meat).");
    instructions.push("3. Build Flavor Base: Create a flavor foundation by sautéing aromatic vegetables (onions, garlic, celery, carrots) until softened, about 3-5 minutes. Add dried herbs and spices and cook for 30 seconds to release their flavors.");
    instructions.push("4. Manage Heat: Adjust heat as needed throughout cooking process. High heat (375-450°F) for browning and searing, medium heat (325-375°F) for most cooking, low heat (below 325°F) for simmering and gentle cooking.");
    instructions.push("5. Monitor Doneness: Check doneness by testing vegetables with a fork (should pierce easily) and using a thermometer for proteins. For sauces and liquids, look for proper reduction and consistency (should coat the back of a spoon).");
    instructions.push("6. Finish with Fresh Elements: In the final 1-2 minutes of cooking, add delicate herbs, quick-cooking vegetables, or final seasonings to preserve their freshness and flavor.");
  }
  
  // Final steps
  instructions.push("Remove from heat when cooking is complete. Let stand for 2-3 minutes to allow flavors to settle and distribute.");
  instructions.push("Transfer to serving plates or bowls. Garnish with fresh herbs, a sprinkle of cheese, or a drizzle of olive oil if appropriate for the dish.");
  
  return instructions;
}

/**
 * Validate a meal to ensure it meets quality standards
 * Returns an object with a boolean indicating if the meal is valid and any error messages
 */
export function validateMealQuality(meal: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check if meal object exists
  if (!meal) {
    return { isValid: false, issues: ['Meal object is missing or null'] };
  }
  
  // Check for required properties
  if (!meal.name) issues.push('Meal name is missing');
  if (!meal.description) issues.push('Meal description is missing');
  
  // Validate ingredients
  const ingredients = meal.ingredients || meal.mainIngredients || [];
  if (!Array.isArray(ingredients)) {
    issues.push('Ingredients must be an array');
  } else {
    // Check ingredient count - increased minimum to enforce more complete recipes
    if (ingredients.length < 8) {
      issues.push(`Insufficient ingredients: found ${ingredients.length}, minimum 8 required`);
    }
    
    // Check if ingredients have measurements
    const ingredientsWithoutMeasurements = ingredients.filter(ingredient => {
      if (typeof ingredient !== 'string') return true;
      
      // Check for common measurement patterns - expanded to catch more variation
      const hasMeasurement = /\d+\.?\d*\s*(cup|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound|g|gram|ml|liter|l|bunch|clove|pinch|dash|slice|piece|can|package|pkg|bottle)/i.test(ingredient);
      return !hasMeasurement;
    });
    
    // Stricter measurement requirement - only 20% of ingredients can lack measurements now
    if (ingredientsWithoutMeasurements.length > ingredients.length * 0.2) {
      issues.push(`Too many ingredients (${ingredientsWithoutMeasurements.length}) lack specific measurements - specify amounts for at least 80% of ingredients`);
    }
  }
  
  // Validate instructions
  const instructions = meal.instructions || meal.directions || [];
  if (!Array.isArray(instructions)) {
    issues.push('Instructions must be an array');
  } else {
    // Check instruction count - increased minimum from 7 to 8 steps
    if (instructions.length < 8) {
      issues.push(`Insufficient instructions: found ${instructions.length}, minimum 8 detailed steps required for complete recipe`);
    }
    
    // Check for sequential numbering in instructions (recommended but not required)
    const hasNumbering = instructions.some(step => {
      if (typeof step !== 'string') return false;
      return /^\d+\.\s/.test(step);
    });
    
    if (!hasNumbering && instructions.length >= 5) {
      issues.push('Instructions should ideally be numbered for easier following (e.g., "1. Preheat oven...")')
    }
    
    // Expanded list of banned generic phrases
    const genericPhrases = [
      'standard procedure',
      'standard procedures',
      'cook until done',
      'cook as usual',
      'cook according to',
      'package directions',
      'to taste',
      'follow instructions',
      'following instructions',
      'standard method',
      'according to the main',
      'thoroughly cooked',
      'for this type of dish',
      'as needed for this recipe',
      'usual practice',
      'as directed',
      'prepare ingredients',
      'until done',
      'cook through',
      'enjoy with family',
      'serve and enjoy',
      'prepare as usual',
      'as preferred',
      'cook accordingly',
      'heat as needed',
      'serve immediately'
    ];
    
    const genericSteps = instructions.filter(step => {
      if (typeof step !== 'string') return false;
      return genericPhrases.some(phrase => step.toLowerCase().includes(phrase.toLowerCase()));
    });
    
    if (genericSteps.length > 0) {
      issues.push(`Found ${genericSteps.length} generic instruction step(s). Replace vague phrases like "standard procedure" or "cook until done" with specific instructions.`);
    }
    
    // Check for temperature and timing information - expanded pattern matching
    const cookingStepsWithoutDetails = instructions.filter(step => {
      if (typeof step !== 'string') return false;
      const containsCookingWords = /(cook|bake|roast|simmer|boil|sauté|fry|grill|broil|steam|poach|braise)/i.test(step);
      if (!containsCookingWords) return false;
      
      // Check if step has time or temperature information
      const hasTimeInfo = /\d+\.?\d*\s*(minute|min|second|sec|hour|hr)/i.test(step);
      const hasTempInfo = /\d+\s*(degree|°|[°º][FC]|F\b|C\b)/i.test(step) || /(low|medium-low|medium|medium-high|high)\s+heat/i.test(step);
      
      return containsCookingWords && !(hasTimeInfo || hasTempInfo);
    });
    
    if (cookingStepsWithoutDetails.length > 0) {
      issues.push(`Found ${cookingStepsWithoutDetails.length} cooking steps without specific time or temperature information. All cooking steps must include precise timing (e.g., "5 minutes") or temperature (e.g., "over medium heat" or "350°F").`);
    }
    
    // Check for specific measurements in the instructions
    const stepsWithoutIngredientMeasurements = instructions.filter(step => {
      if (typeof step !== 'string') return false;
      
      // Look for steps that mention adding ingredients but don't have measurements
      const mentionsAddingIngredients = /(add|stir in|pour in|mix in|combine with)/i.test(step);
      if (!mentionsAddingIngredients) return false;
      
      // Check if measurement patterns exist
      const hasMeasurement = /\d+\.?\d*\s*(cup|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound|g|gram|ml|liter|l)/i.test(step);
      
      return mentionsAddingIngredients && !hasMeasurement;
    });
    
    // If more than 1/3 of steps that mention adding ingredients lack measurements, flag it
    if (stepsWithoutIngredientMeasurements.length > 2) {
      issues.push(`Found ${stepsWithoutIngredientMeasurements.length} steps that add ingredients without specific measurements. Include precise quantities in cooking steps (e.g., "Add 2 tablespoons olive oil").`);
    }
    
    // Check for action verbs at the beginning of each step
    const stepsWithoutActionVerbs = instructions.filter(step => {
      if (typeof step !== 'string') return false;
      
      // Remove any numbering
      const cleanStep = step.replace(/^\d+\.\s*/, '').trim();
      
      // Common cooking action verbs that should begin steps
      const actionVerbs = [
        'add', 'arrange', 'bake', 'beat', 'blend', 'boil', 'bring', 'brush', 'chop', 'combine', 'cook', 
        'cool', 'cover', 'cut', 'dice', 'drain', 'drizzle', 'drop', 'dry', 'fill', 'flip', 'fold', 
        'garnish', 'grate', 'grease', 'grill', 'heat', 'knead', 'layer', 'marinate', 'mash', 'measure', 
        'melt', 'microwave', 'mix', 'pat', 'peel', 'place', 'poach', 'pour', 'preheat', 'prepare', 
        'press', 'reduce', 'refrigerate', 'remove', 'rinse', 'roast', 'roll', 'rub', 'sauté', 'season', 
        'serve', 'set', 'simmer', 'slice', 'spread', 'sprinkle', 'stir', 'strain', 'stuff', 'taste', 
        'thicken', 'toss', 'transfer', 'trim', 'turn', 'warm', 'wash', 'whip', 'whisk'
      ];
      
      // Extract first word
      const firstWord = cleanStep.split(/\s+/)[0].toLowerCase();
      
      return !actionVerbs.includes(firstWord);
    });
    
    if (stepsWithoutActionVerbs.length > 0) {
      issues.push(`Found ${stepsWithoutActionVerbs.length} steps that don't begin with clear action verbs. Begin each step with a specific cooking action verb (e.g., "Sauté", "Whisk", "Combine").`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
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