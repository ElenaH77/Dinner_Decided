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
    
    // Get weather context if location is available
    let weatherContext = "";
    if (household.location) {
      try {
        weatherContext = await getWeatherContextForMealPlanning(household.location);
        console.log(`[MEAL PLAN] Retrieved weather context for ${household.location}`);
      } catch (weatherError) {
        console.error("[MEAL PLAN] Error getting weather context:", weatherError);
        weatherContext = "Weather information is not available.";
      }
    }
    
    // Handle different types of requests
    let promptContent = "";
    
    if (preferences.replaceMeal) {
      // Replacement meal request
      promptContent = `Generate a single replacement meal for "${preferences.mealName}". The replacement should be in the same category (${preferences.categories.join(", ")}) but different enough to provide variety.`;
    } else if (preferences.mealsByDay && Object.keys(preferences.mealsByDay).length > 0) {
      // New structured meal planning format
      const mealSelections = [];
      const days = Object.keys(preferences.mealsByDay);
      
      // Each day has one category in the mealsByDay object (not an array)
      for (const day of days) {
        const category = preferences.mealsByDay[day];
        if (category) {
          const categoryDescription = preferences.categoryDefinitions?.[category] || category;
          mealSelections.push(`- ${day}: ${categoryDescription}`);
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
        1. Name of dish
        2. Brief description of the dish
        3. Appropriate day of the week based on the selections above
        4. Meal category from my selection
        5. Prep time (in minutes)
        6. List of main ingredients needed (with quantities)
        7. Serving size (number of people)
        8. Any meal prep tips, especially for "split prep" category meals
        9. IMPORTANT: Add 2-3 personalized rationales for why this meal is a good fit for this specific family (considering their dietary needs, preferences, time constraints, etc.)
        
        Generate a JSON response with an array of meal objects, ensuring that you include the rationales as an array of strings in a "rationales" field for each meal.`;
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
        
        Generate unique, practical dinner ideas that this family would enjoy. For each meal, include:
        1. A name for the dish
        2. Brief description of the dish
        3. Categories (e.g., "quick", "vegetarian")
        4. Approximate prep time in minutes
        5. Serving size
        6. 3-4 specific rationales for why this meal is a good fit (each one in a separate string in a "rationales" array):
           - Include dietary considerations based on household members
           - Mention time/effort alignment with their cooking confidence
           - Reference equipment they have available
           - If location and weather data is available, note weather appropriateness
        
        Return the response as a JSON object with an array of meal objects, where each object has a "rationales" field containing an array of strings.`;
    }
    
    // Log the prompt being sent to OpenAI
    console.log('[MEAL PLAN] Sending prompt to OpenAI:');
    console.log(promptContent);
    console.log('[MEAL PLAN] Household data:', JSON.stringify(household, null, 2));
    console.log('[MEAL PLAN] Preferences:', JSON.stringify(preferences, null, 2));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system" as const,
          content: `You are a meal planning assistant that creates personalized meal suggestions based on family preferences.
          Assume picky kids and use simple Hello Fresh-style recipes unless instructed otherwise.
          Treat food allergies and appliance limitations as inviolable restrictions.
          For each meal, include 2-3 specific rationales on why it fits the family (based on meal notes, dietary needs, weather, or overall profile).
          Focus on practical, accessible recipes that are kid-friendly.
          Always include specific ingredient details in meal descriptions (like "with roasted broccoli and garlic mashed potatoes").`
        },
        {
          role: "user" as const,
          content: promptContent
        }
      ] as any, // Type assertion to fix TypeScript error
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Extract meals from the result
    return preferences.replaceMeal 
      ? [result.meal || result]
      : (result.meals || []);
    
  } catch (error) {
    console.error("Error generating meal plan:", error);
    
    // Check for specific OpenAI API errors
    if (error && typeof error === 'object') {
      // Handle OpenAI error object types
      if ('error' in error && typeof error.error === 'object') {
        const openaiError = error.error;
        if ('type' in openaiError && openaiError.type === 'insufficient_quota') {
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
      
      // If we have instructions, we might have detailed ingredients with quantities in there
      if (meal.instructions && Array.isArray(meal.instructions) && meal.instructions.length > 0) {
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
    const uniqueMealNames = [...new Set(mealNames)];
    
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
        if ('type' in openaiError && openaiError.type === 'insufficient_quota') {
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
          Maintain the general structure of the meal but accommodate their modification requests.
          Assume picky kids and use simple Hello Fresh-style recipes unless instructed otherwise.
          Treat food allergies and appliance limitations as inviolable restrictions.
          For each meal, include 2-3 specific rationales for why it fits the family (based on meal notes, dietary needs, weather, or overall profile).
          Always include specific ingredient details in meal descriptions (like "with roasted broccoli and garlic mashed potatoes").
          
          Family profile:
          ${household ? `- Family size: ${household.members.length} people
          - Family members: ${household.members.map((m: any) => `${m.name} (${m.age || 'Adult'}, ${m.dietaryRestrictions || 'No restrictions'})`).join(', ')}
          - Available kitchen equipment: ${household.appliances?.join(", ") || "Standard kitchen equipment"}
          - Cooking skill level (1-5): ${household.cookingSkill || 3}
          - Preferences: ${household.preferences || "Family-friendly meals"}
          - Location: ${household.location || "Unknown location"}` : 'Family profile not available.'}
          
          ${weatherContext ? `Current weather and forecast: ${weatherContext}` : ''}
          
          Respond in JSON format with the following fields:
          - name: the modified recipe name
          - description: brief description of the modified recipe
          - prepTime: preparation time in minutes (similar to original)
          - mealCategory: same category as the original
          - mealPrepTips: preparation tips for the modified recipe
          - mainIngredients: array of ingredients WITH QUANTITIES (e.g., "1 lb ground turkey", "2 cups pasta")
          - instructions: array of step-by-step cooking instructions (at least 5-7 detailed steps)
          - appropriateDay: same as the original recipe day
          - rationales: array of 3-4 specific reasons why this meal suits this family, including:
             - How it accommodates their dietary needs
             - Why it's appropriate for their cooking skill level
             - How it works with their equipment
             - Why it's suitable for the current weather conditions
          
          IMPORTANT NOTES:
          - Every ingredient MUST include specific quantities (e.g., "1 lb", "2 cups", "3 tablespoons")
          - The cooking instructions must be detailed and complete, explaining the entire cooking process from start to finish
          - Instructions should be in order and assume the reader needs guidance on all steps
          - Rationales should be personalized to this specific family
          `
        },
        {
          role: "user",
          content: `Here is the original recipe:
          ${JSON.stringify(meal, null, 2)}
          
          Please modify it according to this request: "${modificationRequest}"
          
          Make sure to include 3-4 personalized rationales that explain why this modified meal is appropriate for this specific family, including how it suits the current weather conditions.
          
          Return ONLY the JSON for the modified recipe.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    const modifiedMeal = JSON.parse(content);
    
    // Start with critical original fields that need to be preserved
    const result = {
      id: meal.id, // Preserve ID
      day: meal.day || modifiedMeal.day || modifiedMeal.appropriateDay, // Keep or set day
      category: modifiedMeal.mealCategory || meal.category, // Favor new category if available
      modifiedFrom: meal.name,
      modificationRequest
    };
    
    // Apply the modified meal data (modified meal takes priority for most fields)
    Object.assign(result, {
      name: modifiedMeal.name,
      description: modifiedMeal.description,
      prepTime: modifiedMeal.prepTime,
      servings: modifiedMeal.servingSize || meal.servings,
      mealPrepTips: modifiedMeal.mealPrepTips,
      instructions: modifiedMeal.instructions
    });
    
    // Critical: Ensure ingredients are properly formatted and consistent - use both properties
    if (modifiedMeal.mainIngredients && Array.isArray(modifiedMeal.mainIngredients)) {
      result.ingredients = [...modifiedMeal.mainIngredients]; // Clone the array
      result.mainIngredients = [...modifiedMeal.mainIngredients]; // Clone the array
    }
    
    // Preserve rationales
    if (modifiedMeal.rationales && Array.isArray(modifiedMeal.rationales)) {
      result.rationales = [...modifiedMeal.rationales];
    }
    
    // Add a timestamp for the modification
    result.lastModified = new Date().toISOString();
    
    console.log('[MEAL MODIFICATION] Modified meal result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error modifying meal with AI:', error);
    throw new Error('Failed to modify recipe. Please try again.');
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
    // Get household data
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
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful meal planning assistant specializing in creating alternative recipes.
          Your goal is to create a completely different meal that meets the same criteria as the original:
          - Must have the same meal category/type (e.g., Quick & Easy, Batch Cooking)
          - Should have similar preparation time
          - Should be appropriate for the same day of the week
          - Should use different primary ingredients than the original
          - Should be appropriate for the current weather and forecast
          
          Family profile:
          ${household ? `- Family size: ${household.members.length} people
          - Family members: ${household.members.map((m: any) => `${m.name} (${m.age || 'Adult'}, ${m.dietaryRestrictions || 'No restrictions'})`).join(', ')}
          - Available kitchen equipment: ${household.appliances?.join(", ") || "Standard kitchen equipment"}
          - Cooking skill level (1-5): ${household.cookingSkill || 3}
          - Preferences: ${household.preferences || "Family-friendly meals"}
          - Location: ${household.location || "Unknown location"}` : 'Family profile not available.'}
          
          ${weatherContext ? `Current weather and forecast: ${weatherContext}` : ''}
          
          Respond in JSON format with the following fields:
          - name: a new recipe name (must be different and creative)
          - description: detailed description of the new recipe
          - prepTime: preparation time in minutes (similar to original)
          - mealCategory: same category as the original
          - mealPrepTips: helpful preparation tips specific to this new recipe
          - mainIngredients: array of ingredients WITH QUANTITIES (e.g., "1 lb ground turkey", "2 cups pasta") 
          - instructions: array of step-by-step cooking instructions (at least 5-7 detailed steps)
          - appropriateDay: same as the original recipe day
          - rationales: array of 3-4 specific reasons why this meal suits this family, including:
             - How it accommodates their dietary needs
             - Why it's appropriate for their cooking skill level
             - How it works with their equipment
             - Why it's suitable for the current weather conditions
          
          IMPORTANT NOTES:
          - Every ingredient MUST include specific quantities (e.g., "1 lb", "2 cups", "3 tablespoons")
          - The cooking instructions must be detailed and complete, explaining the entire cooking process from start to finish
          - Instructions should be in order and assume the reader needs guidance on all steps
          - Rationales should be personalized to this specific family
          `
        },
        {
          role: "user",
          content: `Here is the original recipe:
          ${JSON.stringify(meal, null, 2)}
          
          Please create a completely different meal that meets the same criteria.
          The new meal should NOT be a variation of ${meal.name}, but a totally different dish.
          Make sure to include 3-4 personalized rationales that explain why this meal is appropriate for this specific family, including how it suits the current weather conditions.
          
          Return ONLY the JSON for the new replacement recipe.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    const replacementMeal = JSON.parse(content);
    
    // Start with critical original fields that need to be preserved
    const result = {
      id: meal.id, // Preserve ID
      day: meal.day || replacementMeal.day || replacementMeal.appropriateDay, // Keep or set day
      category: replacementMeal.mealCategory || meal.category, // Favor new category if available
      replacedFrom: meal.name
    };
    
    // Apply the replacement meal data (replacement meal takes priority for most fields)
    Object.assign(result, {
      name: replacementMeal.name,
      description: replacementMeal.description,
      prepTime: replacementMeal.prepTime,
      servings: replacementMeal.servingSize || meal.servings,
      mealPrepTips: replacementMeal.mealPrepTips,
      instructions: replacementMeal.instructions
    });
    
    // Critical: Ensure ingredients are properly formatted and consistent - use both properties
    if (replacementMeal.mainIngredients && Array.isArray(replacementMeal.mainIngredients)) {
      result.ingredients = [...replacementMeal.mainIngredients]; // Clone the array
      result.mainIngredients = [...replacementMeal.mainIngredients]; // Clone the array
    }
    
    // Preserve rationales
    if (replacementMeal.rationales && Array.isArray(replacementMeal.rationales)) {
      result.rationales = [...replacementMeal.rationales];
    }
    
    // Add a timestamp for the replacement
    result.lastModified = new Date().toISOString();
    
    console.log('[MEAL REPLACEMENT] Replacement meal result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error replacing meal with AI:', error);
    throw new Error('Failed to generate replacement recipe. Please try again.');
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
    return "Perfect! I've got all the information I need to create your personalized meal plan. Here's a flexible 5-meal dinner plan for this week. Remember, these aren't tied to specific days (except as noted for your busy days). Let me know if you'd like to make any changes!";
  }
  
  if (lastUserMessage.toLowerCase().includes("looks great")) {
    return "Absolutely! I've updated the beef stew to use the Instant Pot instead of the slow cooker. This will make it faster to prepare - about 45 minutes total instead of 6-8 hours. I've also added another vegetarian option for you - Black Bean & Sweet Potato Enchiladas that combine your family's love for Mexican food with your goal of vegetarian meals. I've updated your grocery list to reflect these changes. Anything else you'd like to adjust in your meal plan?";
  }
  
  return "I understand! Based on what you've shared, I'll create a personalized meal plan that works for your family. Would you like me to suggest 5 dinner ideas for the week?";
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
          day: day,
          category: category,
          prepTime: 0,
          servings: 4,
          ingredients: []
        };
        
        // Customize based on category
        switch (category) {
          case 'quick':
            meal.name = "Quick Sheet Pan Chicken Fajitas";
            meal.description = "Perfect for a busy weeknight. Can be prepared in just 15 minutes.";
            meal.prepTime = 15;
            meal.ingredients = [
              "1.5 lbs chicken breast, sliced",
              "2 bell peppers, sliced",
              "1 large onion, sliced",
              "Fajita seasoning",
              "Flour tortillas"
            ];
            break;
            
          case 'weeknight':
            meal.name = "Weeknight Pasta Bolognese";
            meal.description = "A classic family favorite that comes together in about 30 minutes.";
            meal.prepTime = 30;
            meal.ingredients = [
              "1 lb ground beef",
              "1 onion, diced",
              "2 cloves garlic, minced",
              "1 jar marinara sauce",
              "1 lb pasta"
            ];
            break;
            
          case 'batch':
            meal.name = "Big Batch Chili";
            meal.description = "Makes plenty for leftovers - freeze some for another meal.";
            meal.prepTime = 60;
            meal.ingredients = [
              "2 lbs ground beef",
              "2 cans beans",
              "1 large onion, diced",
              "2 bell peppers, diced",
              "2 cans diced tomatoes",
              "Chili seasonings"
            ];
            break;
            
          case 'split':
            meal.name = "Split-Prep Marinated Chicken";
            meal.description = "Marinate the night before for maximum flavor with minimal evening effort.";
            meal.prepTime = 40;
            meal.prepTips = "Marinate chicken the night before. Prep vegetables in the morning.";
            meal.ingredients = [
              "2 lbs chicken thighs",
              "Marinade ingredients",
              "2 cups rice",
              "Side vegetables"
            ];
            break;
            
          default:
            // Create generic meal names that don't mention specific days
            const genericMealNames = [
              "Homestyle Roast Chicken",
              "Family Favorite Stir Fry",
              "Classic Pasta Dinner",
              "Hearty Beef Stew",
              "Vegetable Curry Bowl",
              "Simple Sheet Pan Dinner",
              "Easy Taco Night",
              "Creamy Pasta with Vegetables",
              "Teriyaki Chicken with Rice",
              "Garden Vegetable Soup",
              "Southwest Bean Bowl",
              "Mediterranean Baked Fish"
            ];
            
            // Select a random meal name
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
        }
        
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
        { id: "item17", name: "Beef broth", quantity: "2 cups", mealId: "meal-3" },
        { id: "item18", name: "Tomato paste", quantity: "1 small can", mealId: "meal-3" },
        { id: "item19", name: "Black beans", quantity: "1 can", mealId: "meal-4" },
        { id: "item20", name: "Enchilada sauce", quantity: "1 jar", mealId: "meal-4" },
        { id: "item21", name: "BBQ sauce", quantity: "1 bottle", mealId: "meal-5" },
        { id: "item22", name: "Brown sugar", quantity: "1 small bag", mealId: "meal-5" },
        { id: "item23", name: "Worcestershire sauce", quantity: "1 bottle", mealId: "meal-5" },
        { id: "item24", name: "Spices (garlic powder, onion powder, cumin, chili powder)", quantity: "As needed" }
      ]
    },
    {
      name: "Bakery",
      items: [
        { id: "item25", name: "Flour tortillas", quantity: "16 count", mealId: "meal-1" },
        { id: "item26", name: "Hamburger buns", quantity: "1 package", mealId: "meal-5" }
      ]
    }
  ];
}
