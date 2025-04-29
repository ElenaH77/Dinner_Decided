import OpenAI from "openai";
import { Message } from "@shared/schema";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. Do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy_api_key" });

// Generate a response for the chat conversation
export async function generateChatResponse(messages: Message[]): Promise<string> {
  try {
    // For demo purposes with no API key, return a canned response
    if (!process.env.OPENAI_API_KEY) {
      return generateDummyResponse(messages);
    }
    
    // Map messages to OpenAI format
    const openaiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add system message to give context
    openaiMessages.unshift({
      role: "system",
      content: `You are a helpful meal planning assistant called "Dinner, Decided" that creates personalized meal plans for busy families.
      Your goal is to understand the family's needs, preferences, and constraints, and then provide personalized meal suggestions with rationales.
      Always be warm, encouraging, and practical. Suggest accessible recipes that match the family's cooking skill level.
      If the conversation suggests the user wants a meal plan, provide 3-5 meal suggestions that fit their needs.
      Include details about why each meal is a good fit (e.g., "uses up the ingredients you mentioned", "quick for your busy Wednesday").
      Don't assign meals to specific days unless the user asks for that structure.`
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    return response.choices[0].message.content || "I'm not sure how to respond to that.";
    
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm sorry, I'm having trouble connecting to my knowledge base. Please try again later.";
  }
}

// Generate a meal plan based on household profile and preferences
export async function generateMealPlan(household: any, preferences: any = {}): Promise<any[]> {
  try {
    // For demo purposes with no API key, return canned meal suggestions
    if (!process.env.OPENAI_API_KEY) {
      return generateDummyMeals(preferences);
    }
    
    const promptContent = preferences.replaceMeal
      ? `Generate a single replacement meal for "${preferences.mealName}". The replacement should be in the same category (${preferences.categories.join(", ")}) but different enough to provide variety.`
      : `Create a meal plan with 5 dinner ideas for a family with the following profile:
        - Family size: ${household.members.length} people
        - Available appliances: ${household.appliances.join(", ")}
        - Cooking skill level (1-5): ${household.cookingSkill}
        - Preferences: ${household.preferences}
        
        Generate unique, practical dinner ideas that this family would enjoy. For each meal, include a name, brief description explaining why it's a good fit for this family, categories (e.g., "quick", "vegetarian"), approximate prep time, and serving size.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a meal planning assistant that creates personalized meal suggestions based on family preferences."
        },
        {
          role: "user",
          content: promptContent
        }
      ],
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
    
    const meals = mealPlan.meals.map((meal: any) => {
      return {
        id: meal.id,
        name: meal.name,
        ingredients: meal.ingredients || []
      };
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful meal planning assistant that creates organized grocery lists based on meal plans."
        },
        {
          role: "user",
          content: `Create a grocery list for the following meals: ${JSON.stringify(meals)}. 
          Organize items by store section (Produce, Meat & Seafood, Dairy, etc.) and include quantities when possible.
          Return the list as a JSON object with sections array, where each section has a name and items array.
          Each item should have an id, name, and optional quantity and mealId (to track which meal it's for).`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Extract sections from the result
    return result.sections || [];
    
  } catch (error) {
    console.error("Error generating grocery list:", error);
    return generateDummyGroceryList();
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
  
  return [
    {
      id: `meal-${Date.now()}-1`,
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
      id: `meal-${Date.now()}-2`,
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
      id: `meal-${Date.now()}-3`,
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
      id: `meal-${Date.now()}-4`,
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
      id: `meal-${Date.now()}-5`,
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
