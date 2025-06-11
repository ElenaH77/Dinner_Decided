// This is a simplified version of the openai.ts file that covers basic functionality
// with a focus on reliability and error handling

const fs = require('fs');

// Main content to replace the existing openai.ts implementation
const content = `import OpenAI from "openai";
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

// Initialize OpenAI client with the API key
console.log('[OPENAI INIT] Initializing OpenAI client with key:', apiKey ? \`\${apiKey.substring(0, 3)}...\${apiKey.substring(apiKey.length - 4)}\` : 'undefined');

const openai = new OpenAI({ 
  apiKey: apiKey || undefined,
  timeout: 120000, // 2 minutes
  maxRetries: 5,
  defaultQuery: { 
    'request_timeout': '90' // as string
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

// Dummy response generator for when API is not available
function generateDummyResponse(messages: Message[]): string {
  // Look for keywords in the latest user message to generate context-aware responses
  const lastUserMessage = messages.find(m => m.role === 'user')?.content || '';
  
  if (lastUserMessage.toLowerCase().includes('hello') || lastUserMessage.toLowerCase().includes('hi')) {
    return "Hello! I'm your meal planning assistant. How can I help you today? I can suggest recipes, create meal plans for the week, or help with your cooking questions.";
  }
  
  if (lastUserMessage.toLowerCase().includes('meal plan') || lastUserMessage.toLowerCase().includes('dinner ideas')) {
    return "I'd be happy to help with meal planning! Some dinner ideas for this week could include: \\n\\n• Sheet Pan Chicken Fajitas - quick and great for busy weeknights\\n• Pasta Primavera - vegetable-packed and versatile\\n• Slow Cooker Beef Stew - perfect comfort food that cooks while you're away\\n• Teriyaki Salmon - healthy with a touch of sweetness\\n• Homemade Pizza Night - fun for the whole family to customize\\n\\nWould you like more details about any of these meals?";
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

// Generate a response for the chat conversation
export async function generateChatResponse(messages: Message[]): Promise<string> {
  try {
    // For demo purposes with no valid API key, return a canned response
    if (!hasValidApiKey()) {
      console.log('[CHAT] No valid OpenAI API key, using dummy response');
      return generateDummyResponse(messages);
    }
    
    // Map messages to OpenAI format
    const openaiMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));
    
    // Determine if we're in onboarding or chat mode
    const isOnboarding = messages.some(msg => 
      msg.content?.includes("Welcome to Dinner, Decided!") && 
      msg.content?.includes("Let's get started with a few questions about your household")
    );
    
    // Use different system prompts for onboarding vs. DinnerBot
    if (isOnboarding) {
      // Onboarding system prompt - focus on meal planning
      openaiMessages.unshift({
        role: "system" as const,
        content: \`You are a helpful meal planning assistant called "Dinner, Decided" that creates personalized meal plans for busy families.
        Your goal is to understand the family's needs, preferences, and constraints, and then provide personalized meal suggestions with rationales.
        Always be warm, encouraging, and practical. Suggest accessible recipes that match the family's cooking skill level.
        Assume picky kids and use simple Hello Fresh-style recipes unless instructed otherwise.
        Treat food allergies and appliance limitations as inviolable restrictions.
        If the conversation suggests the user wants a meal plan, provide 3-5 meal suggestions that fit their needs.
        For each meal, include 2 bullet points on why it fits the family (based on meal notes, weather, or overall profile).
        Include details about why each meal is a good fit (e.g., "uses up the ingredients you mentioned", "quick for your busy Wednesday").
        Don't assign meals to specific days unless the user asks for that structure.\`
      });
    } else {
      // DinnerBot system prompt - focus on dinner assistance, NOT meal planning
      openaiMessages.unshift({
        role: "system" as const,
        content: \`You are DinnerBot—a friendly, funny, and unflappable dinner assistant. Your job is to help busy families figure out what to cook in a pinch, answer common meal-related questions, and offer creative ideas using limited ingredients. You are always supportive and never judgy.

        You do NOT manage the user's weekly meal plan or grocery list. You are a sidekick, not the planner.
        
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
        
        When in doubt, start by saying: "Let's see what we can throw together…"\`
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
    console.log('[MEAL PLAN] Retry count:', retryCount);
    
    // Safety check to prevent infinite recursion
    if (retryCount >= 3) {
      console.warn(\`[MEAL PLAN] Maximum retry attempts (\${retryCount}) reached. Returning best attempt.\`);
      throw new Error("Maximum retry attempts reached. Please try again later.");
    }
    
    // For demo purposes with no valid API key, return canned meal suggestions
    if (!hasValidApiKey()) {
      console.log('[MEAL PLAN] Using mock data due to missing or invalid API key');
      return generateDummyMeals(preferences);
    }
    
    // Log that we have a valid API key
    console.log('[MEAL PLAN] Found valid OpenAI API key');
    
    // Get weather context if location is available
    let weatherContext = "";
    if (household && household.location) {
      try {
        weatherContext = await getWeatherContextForMealPlanning(household.location);
        console.log(\`[MEAL PLAN] Retrieved weather context for \${household.location}\`);
      } catch (weatherError) {
        console.error("[MEAL PLAN] Error getting weather context:", weatherError);
        weatherContext = "Weather information is not available.";
      }
    }
    
    // Prepare a simplified prompt structure to reduce token usage
    const promptContent = buildMealPlanPrompt(household, preferences, weatherContext);
    
    console.log('[MEAL PLAN] Generating meal plan with prompt');
    console.log('[MEAL PLAN DEBUG] Household preferences:', household?.preferences);
    console.log('[MEAL PLAN DEBUG] Prompt contains gluten-free:', promptContent.includes('gluten'));
    
    // Apply exponential backoff for retries
    if (retryCount > 0) {
      const delay = Math.min(10000, 1000 * Math.pow(2, retryCount));
      console.log(\`[MEAL PLAN] Retry attempt \${retryCount} - Waiting \${delay}ms before retry\`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Create a compact system prompt to reduce token usage
    const systemPrompt = \`You are a professional chef and recipe writer creating detailed, well-structured recipes for home cooks.
    Return valid JSON with an array of meal objects. Each meal must have: name, description, day, category, categories, prepTime, servings, 
    ingredients (10-15 with exact measurements), instructions (10-12 detailed steps with exact times/temps), and rationales (2-3 reasons).\`;
    
    // Simplified API call
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptContent }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });
      
      // Parse and process the response
      const content = response.choices[0].message.content || "[]";
      console.log('[MEAL PLAN] Response received, parsing content');
      
      try {
        // Parse the JSON response
        let parsedResponse = JSON.parse(content);
        
        // Handle multiple formats that OpenAI might return
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
          meals = [];
          throw new Error('Invalid response format - could not find meals array');
        }
        
        if (meals && meals.length > 0) {
          console.log(\`[MEAL PLAN] Successfully parsed \${meals.length} meals from OpenAI response\`);
          
          // Add unique IDs to each meal
          meals = meals.map((meal, index) => {
            const uniqueTimestamp = Date.now() + index * 100;
            return {
              ...meal,
              id: meal.id || \`meal-\${uniqueTimestamp}-\${Math.floor(Math.random() * 1000)}\`
            };
          });
          
          // Normalize meals
          meals = meals.map(normalizeMeal);
          
          console.log('[MEAL PLAN] Added stable IDs to meals');
          return meals;
        } else {
          throw new Error('Empty meals array or invalid structure received');
        }
      } catch (parseError) {
        console.error('[MEAL PLAN] Error parsing OpenAI response:', parseError);
        
        if (retryCount < 2) {
          console.log(\`[MEAL PLAN] Retrying meal plan generation (attempt \${retryCount + 1})\`);
          return generateMealPlan(household, preferences, retryCount + 1);
        }
        
        throw new Error('Failed to parse meal plan response. Please try again.');
      }
    } catch (apiError) {
      console.error('[MEAL PLAN] API request failed:', apiError);
      
      if (retryCount < 2) {
        console.log(\`[MEAL PLAN] Retrying meal plan generation after API error (attempt \${retryCount + 1})\`);
        return generateMealPlan(household, preferences, retryCount + 1);
      }
      
      throw new Error('Error connecting to API. Please try again.');
    }
  } catch (error) {
    console.error("Unexpected error in generateMealPlan:", error);
    throw new Error(\`Meal plan generation failed: \${error instanceof Error ? error.message : 'Unknown error'}\`);
  }
}

// Helper function to build a compact meal plan prompt
function buildMealPlanPrompt(household: any, preferences: any, weatherContext: string): string {
  // Start with standard prompt
  let prompt = "Create a meal plan for a family with the following profile:\\n";
  
  // Add household information
  if (household) {
    prompt += \`- Family size: \${household.members?.length || 'Unknown'} people\\n\`;
    
    if (household.members && household.members.length > 0) {
      prompt += "- Family members: ";
      prompt += household.members.map((m: any) => 
        \`\${m.name} (\${m.age || 'Adult'}, \${m.dietaryRestrictions || 'No restrictions'})\`
      ).join(', ');
      prompt += "\\n";
    }
    
    if (household.appliances && household.appliances.length > 0) {
      prompt += \`- Kitchen equipment: \${household.appliances.join(", ")}\\n\`;
    }
    
    if (household.cookingSkill) {
      prompt += \`- Cooking skill level (1-5): \${household.cookingSkill}\\n\`;
    }
    
    if (household.preferences) {
      prompt += \`- CRITICAL DIETARY RESTRICTIONS: \${household.preferences}\\n\`;
    }
    
    if (household.location) {
      prompt += \`- Location: \${household.location}\\n\`;
    }
  }
  
  // Add weather context if available
  if (weatherContext) {
    prompt += \`- Weather: \${weatherContext}\\n\`;
  }
  
  // Add critical dietary safety warning
  prompt += \`\\n🚨 MANDATORY DIETARY SAFETY REQUIREMENT:
If ANY dietary restrictions are mentioned above (especially gluten-free, dairy-free, allergies), you MUST:
- Use ONLY safe alternatives (gluten-free pasta, gluten-free pizza crust, tamari instead of soy sauce)
- Check EVERY ingredient for hidden sources of restricted items
- This is a medical safety requirement - violations could cause serious harm\\n\`;
  
  // Handle specific meal preferences
  if (preferences.mealsByDay && Object.keys(preferences.mealsByDay).length > 0) {
    prompt += "\\nMeal selections by day:\\n";
    for (const day in preferences.mealsByDay) {
      if (preferences.mealsByDay.hasOwnProperty(day)) {
        const categories = preferences.mealsByDay[day];
        // Handle both array and string formats
        const categoryList = Array.isArray(categories) ? categories : [categories];
        
        // Process each category for this day
        for (const category of categoryList) {
          if (category && typeof category === 'string') {
            // Map category to description
            let description = category;
            if (category.toLowerCase() === 'quick') description = 'Quick & Easy (15-20 minutes)';
            if (category.toLowerCase() === 'weeknight') description = 'Weeknight Meal (30-40 minutes)';
            if (category.toLowerCase() === 'batch') description = 'Batch Cooking (extras for leftovers)';
            if (category.toLowerCase() === 'split') description = 'Split Prep (prep ahead, cook later)';
            
            prompt += \`- \${day}: \${description}\\n\`;
          }
        }
      }
    }
  } else if (preferences.singleMeal) {
    // For single meal generation
    prompt += \`\\nPlease create a single \${preferences.mealType || "any"} dinner meal.\`;
    if (preferences.additionalPreferences) {
      prompt += \` Requirements: \${preferences.additionalPreferences}\`;
    }
  } else if (preferences.numberOfMeals) {
    // Standard meal plan with number of meals
    prompt += \`\\nCreate \${preferences.numberOfMeals} dinner ideas.\`;
  } else {
    // Default to 4 meals if nothing specified
    prompt += "\\nCreate 4 dinner ideas for the week.";
  }
  
  // Add mandatory quality requirements
  prompt += \`
  
For EACH meal, you MUST include:
1. Name and 2-3 sentence description
2. Day of week
3. Meal category
4. Prep time in minutes
5. Servings

INGREDIENTS:
- EXACTLY 10-15 ingredients with EXACT measurements
- Include specific amounts for ALL seasonings, oils, etc
- NO generic phrases like "salt to taste" - give exact amounts

INSTRUCTIONS:
- EXACTLY 10-12 detailed steps beginning with action verbs
- Include EXACT cooking times and temperatures 
- Multiple sensory cues for doneness
- Explain ALL cooking techniques
- Each step must be at least 15 words

RATIONALES:
- 2-3 reasons why this meal suits this family

Format as JSON with an array of meals. Each meal object must have the properties mentioned above.\`;

  return prompt;
}

// Generate a grocery list based on a meal plan (minimal implementation)
export async function generateGroceryList(mealPlan: any): Promise<any[]> {
  try {
    if (!hasValidApiKey()) {
      return generateDummyGroceryList();
    }
    
    // Extract recipes and ingredients
    const meals = mealPlan.meals || [];
    
    if (!meals.length) {
      return [];
    }
    
    // Simple placeholder implementation - assemble ingredients from all meals
    const groceryItems = [];
    let itemId = 1;
    
    for (const meal of meals) {
      const mealId = meal.id;
      const ingredients = meal.ingredients || meal.mainIngredients || [];
      
      for (const ingredient of ingredients) {
        groceryItems.push({
          id: \`grocery-\${Date.now()}-\${itemId++}\`,
          name: ingredient,
          mealIds: [mealId],
          department: "Uncategorized"
        });
      }
    }
    
    console.log(\`[GROCERY] Generated \${groceryItems.length} grocery items for \${meals.length} meals\`);
    return groceryItems;
  } catch (error) {
    console.error("Error generating grocery list:", error);
    return [];
  }
}

// Normalize meal object field names for consistency
export function normalizeMeal(meal: any): any {
  if (!meal) return meal;
  
  // Create a copy to avoid modifying the original
  const normalizedMeal = { ...meal };
  
  // Convert directions/steps to instructions if needed (backwards compatibility)
  if (normalizedMeal.directions && (!normalizedMeal.instructions || normalizedMeal.instructions.length === 0)) {
    console.log(\`[MEAL NORMALIZE] Normalized meal properties for \${normalizedMeal.name}: directions → instructions\`);
    normalizedMeal.instructions = normalizedMeal.directions;
  }
  
  // Ensure we have both mainIngredients and ingredients fields
  if (normalizedMeal.mainIngredients && 
      (!normalizedMeal.ingredients || normalizedMeal.ingredients.length === 0)) {
    normalizedMeal.ingredients = normalizedMeal.mainIngredients;
  } else if (normalizedMeal.ingredients && 
             (!normalizedMeal.mainIngredients || normalizedMeal.mainIngredients.length === 0)) {
    normalizedMeal.mainIngredients = normalizedMeal.ingredients;
  }
  
  // Ensure categories is an array
  if (!normalizedMeal.categories && normalizedMeal.category) {
    normalizedMeal.categories = [normalizedMeal.category];
  } else if (!normalizedMeal.categories) {
    normalizedMeal.categories = [];
  }
  
  return normalizedMeal;
}

// Dummy meals and grocery list generators
function generateDummyMeals(preferences: any): any[] {
  const mealCount = preferences?.numberOfMeals || 4;
  const meals = [];
  
  const mealOptions = [
    {
      name: "Sheet Pan Chicken Fajitas",
      description: "A quick and easy Mexican-inspired dinner with colorful bell peppers and tender chicken.",
      category: "Quick & Easy",
      prepTime: 25,
      servings: 4,
      day: "Monday",
      ingredients: ["1.5 lbs chicken breast", "1 red bell pepper", "1 green bell pepper", "1 onion", "2 tbsp olive oil", 
                    "2 tbsp fajita seasoning", "1 tsp salt", "8 flour tortillas", "1 lime", "1/2 cup sour cream"],
      instructions: ["Preheat oven to 425°F", "Cut chicken and vegetables into strips", "Toss with oil and seasoning", 
                      "Roast for 20-25 minutes", "Serve with warm tortillas and toppings"]
    },
    {
      name: "Pasta Primavera",
      description: "A light, vegetable-packed pasta dish perfect for a quick weeknight dinner.",
      category: "Weeknight",
      prepTime: 30,
      servings: 4,
      day: "Tuesday",
      ingredients: ["12 oz pasta", "2 cups mixed vegetables", "3 cloves garlic", "2 tbsp olive oil", "1/4 cup parmesan cheese",
                    "1 tsp dried basil", "1/2 tsp salt", "1/4 tsp pepper", "1/2 cup pasta water", "1 lemon"],
      instructions: ["Cook pasta according to package", "Sauté vegetables in olive oil", "Add garlic and seasonings", 
                      "Combine with pasta and cheese", "Add pasta water to create sauce"]
    },
    {
      name: "Slow Cooker Beef Stew",
      description: "A hearty, comforting beef stew that simmers all day in the slow cooker.",
      category: "Batch Cooking",
      prepTime: 15,
      servings: 6,
      day: "Wednesday",
      ingredients: ["2 lbs beef stew meat", "4 carrots", "3 potatoes", "1 onion", "2 cups beef broth", "2 tbsp tomato paste",
                    "2 cloves garlic", "1 tsp thyme", "1 bay leaf", "salt and pepper"],
      instructions: ["Brown meat in a skillet", "Add all ingredients to slow cooker", "Cook on low for 8 hours", 
                      "Remove bay leaf before serving"]
    },
    {
      name: "Quick Teriyaki Salmon",
      description: "Flavorful teriyaki glazed salmon fillets with steamed vegetables.",
      category: "Quick & Easy",
      prepTime: 20,
      servings: 4,
      day: "Thursday",
      ingredients: ["4 salmon fillets", "1/4 cup soy sauce", "2 tbsp honey", "1 tbsp ginger", "2 cloves garlic",
                    "1 tbsp sesame oil", "2 cups broccoli", "1 cup carrots", "2 green onions", "1 tbsp sesame seeds"],
      instructions: ["Mix soy sauce, honey, ginger, and garlic", "Marinate salmon for 10 minutes", "Cook salmon in a skillet 3-4 minutes per side",
                      "Steam vegetables", "Drizzle with sauce and sprinkle with sesame seeds"]
    },
    {
      name: "Homemade Pizza Night",
      description: "Create your own pizzas with store-bought dough and your favorite toppings.",
      category: "Weeknight",
      prepTime: 35,
      servings: 4,
      day: "Friday",
      ingredients: ["1 lb pizza dough", "1 cup pizza sauce", "2 cups mozzarella cheese", "1/4 cup parmesan cheese",
                    "Assorted toppings of choice", "1 tbsp olive oil", "1 tsp garlic powder", "1 tsp dried oregano"],
      instructions: ["Preheat oven to 450°F", "Roll out dough on floured surface", "Top with sauce, cheese, and toppings",
                      "Bake for 12-15 minutes until crust is golden", "Let cool slightly before slicing"]
    }
  ];
  
  // Select the requested number of meals
  for (let i = 0; i < mealCount; i++) {
    const mealIndex = i % mealOptions.length;
    const meal = { ...mealOptions[mealIndex] };
    
    // Add unique ID
    meal.id = \`meal-\${Date.now()}-\${i + 1}\`;
    
    // Set day if preferences.mealsByDay is specified
    if (preferences.mealsByDay) {
      const days = Object.keys(preferences.mealsByDay);
      if (i < days.length) {
        meal.day = days[i];
      }
    }
    
    // Add to array
    meals.push(meal);
  }
  
  return meals;
}

function generateDummyGroceryList(): any[] {
  return [
    { id: "grocery-1", name: "Chicken breast (1.5 lbs)", department: "Meat & Seafood" },
    { id: "grocery-2", name: "Beef stew meat (2 lbs)", department: "Meat & Seafood" },
    { id: "grocery-3", name: "Salmon fillets (4)", department: "Meat & Seafood" },
    { id: "grocery-4", name: "Bell peppers (3)", department: "Produce" },
    { id: "grocery-5", name: "Onions (3)", department: "Produce" },
    { id: "grocery-6", name: "Garlic (1 head)", department: "Produce" },
    { id: "grocery-7", name: "Carrots (1 bunch)", department: "Produce" },
    { id: "grocery-8", name: "Potatoes (3 medium)", department: "Produce" },
    { id: "grocery-9", name: "Broccoli (1 crown)", department: "Produce" },
    { id: "grocery-10", name: "Lime (1)", department: "Produce" },
    { id: "grocery-11", name: "Pasta (12 oz)", department: "Dry Goods" },
    { id: "grocery-12", name: "Pizza dough (1 lb)", department: "Refrigerated" },
    { id: "grocery-13", name: "Flour tortillas (8 pack)", department: "Bread & Bakery" },
    { id: "grocery-14", name: "Beef broth (2 cups)", department: "Canned & Jarred" },
    { id: "grocery-15", name: "Pizza sauce (1 cup)", department: "Canned & Jarred" },
    { id: "grocery-16", name: "Soy sauce (1/4 cup)", department: "Canned & Jarred" },
    { id: "grocery-17", name: "Tomato paste (2 tbsp)", department: "Canned & Jarred" },
    { id: "grocery-18", name: "Mozzarella cheese (2 cups)", department: "Dairy" },
    { id: "grocery-19", name: "Parmesan cheese (1/2 cup)", department: "Dairy" },
    { id: "grocery-20", name: "Sour cream (1/2 cup)", department: "Dairy" }
  ];
}`;

// Write the file
fs.writeFileSync('./server/openai.ts', content);
console.log('Successfully created simplified OpenAI implementation');