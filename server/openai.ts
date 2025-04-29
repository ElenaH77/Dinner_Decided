import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Type definitions for OpenAI responses
type MealSuggestion = {
  name: string;
  description: string;
  prepTime: string;
  tags: string[];
  rationales: string[];
  ingredients: string[];
  imageUrl: string;
};

type GroceryItem = {
  name: string;
  department: string;
  relatedMealName: string;
};

// Generate meal suggestions based on user input
export async function generateMealSuggestions(
  numberOfMeals: number,
  specialRequests: string,
  dietaryRestrictions: string[],
  cookingEquipment: string[],
  confidenceLevel: number,
  cookingTime: string,
  preferredCuisines: string[]
): Promise<MealSuggestion[]> {
  try {
    const prompt = `
      Please generate ${numberOfMeals} meal suggestions for a family with the following parameters:
      - Special requests/notes: ${specialRequests}
      - Dietary restrictions: ${dietaryRestrictions.join(', ')}
      - Available cooking equipment: ${cookingEquipment.join(', ')}
      - Cooking confidence level (1-5): ${confidenceLevel}
      - Preferred cooking time: ${cookingTime}
      - Preferred cuisines: ${preferredCuisines.join(', ')}
      
      For each meal, include:
      1. Name
      2. Brief description
      3. Prep time
      4. Tags (e.g., "quick meal", "batch cooking", "one pan")
      5. Rationales (explain why this meal fits their needs)
      6. Ingredients list
      7. A URL for an image that represents this meal
      
      Respond in JSON format.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful meal planning assistant that creates personalized meal suggestions for families."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(content);
    
    return result.meals || [];
  } catch (error) {
    console.error("Error generating meal suggestions:", error);
    throw new Error("Failed to generate meal suggestions");
  }
}

// Generate grocery list based on meal plans
export async function generateGroceryList(
  meals: MealSuggestion[]
): Promise<GroceryItem[]> {
  try {
    // Extract all ingredients and pass them to OpenAI
    const allIngredients = meals.flatMap((meal) => 
      meal.ingredients.map(ingredient => ({ ingredient, mealName: meal.name }))
    );

    const prompt = `
      Please create a grocery list based on these ingredients, organized by department:
      ${JSON.stringify(allIngredients)}
      
      For each item, include:
      1. Name of the item (and quantity if mentioned)
      2. Department (Produce, Meat & Seafood, Dairy, Pantry, Bakery, Frozen, etc.)
      3. The meal it's related to
      
      Respond in JSON format.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful meal planning assistant that organizes grocery lists by department."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(content);
    
    return result.groceryItems || [];
  } catch (error) {
    console.error("Error generating grocery list:", error);
    throw new Error("Failed to generate grocery list");
  }
}

// Handle conversational queries about meal planning
export async function handleMealPlanningQuery(
  query: string,
  chatHistory: { role: string, content: string }[],
  currentMeals: MealSuggestion[]
): Promise<string> {
  try {
    const messages = [
      {
        role: "system",
        content: `You are a helpful meal planning assistant called "Dinner, Decided". 
        Your tone is friendly, supportive, and practical. You help families plan meals,
        suggest alternatives, and provide meal planning advice. 
        Current meals in the plan: ${JSON.stringify(currentMeals)}`
      },
      ...chatHistory,
      {
        role: "user",
        content: query
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any[]
    });

    return response.choices[0].message.content || "I'm not sure how to respond to that.";
  } catch (error) {
    console.error("Error handling meal planning query:", error);
    throw new Error("Failed to process your query");
  }
}
