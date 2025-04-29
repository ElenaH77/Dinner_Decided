import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // NOTE: In production, API calls should be made from the server
});

/**
 * Modify a meal based on user requirements
 */
export async function modifyMeal(meal: any, modificationRequest: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a helpful meal planning assistant tasked with modifying recipes.
          Your goal is to modify the provided recipe according to the user's request while keeping the same meal type and similar prep time.
          Maintain the general structure of the meal but accommodate their modification requests.
          Respond in JSON format with the following fields:
          - name: the modified recipe name
          - description: brief description of the modified recipe
          - prepTime: preparation time in minutes (similar to original)
          - mealCategory: same category as the original
          - mealPrepTips: preparation tips for the modified recipe
          - mainIngredients: array of ingredients for the modified recipe
          - appropriateDay: same as the original recipe day
          `
        },
        {
          role: "user",
          content: `Here is the original recipe:
          ${JSON.stringify(meal, null, 2)}
          
          Please modify it according to this request: "${modificationRequest}"
          
          Return ONLY the JSON for the modified recipe.`
        }
      ],
      response_format: { type: "json_object" }
    });

    // Safely parse the content, which should always be valid JSON since we specified response_format
    const content = response.choices[0].message.content || '{}';
    const modifiedMeal = JSON.parse(content);
    
    // Keep the original ID and other metadata if present
    return {
      ...meal,
      ...modifiedMeal,
      modifiedFrom: meal.name,
      modificationRequest
    };
  } catch (error) {
    console.error('Error modifying meal with AI:', error);
    throw new Error('Failed to modify recipe. Please try again.');
  }
}

/**
 * Generate a completely new replacement meal based on the criteria of the original
 */
export async function replaceMeal(meal: any): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a helpful meal planning assistant specializing in creating alternative recipes.
          Your goal is to create a completely different meal that meets the same criteria as the original:
          - Must have the same meal category/type (e.g., Quick & Easy, Batch Cooking)
          - Should have similar preparation time
          - Should be appropriate for the same day of the week
          - Should use different primary ingredients than the original
          
          Respond in JSON format with the following fields:
          - name: a new recipe name (must be different and creative)
          - description: detailed description of the new recipe
          - prepTime: preparation time in minutes (similar to original)
          - mealCategory: same category as the original
          - mealPrepTips: helpful preparation tips specific to this new recipe
          - mainIngredients: array of ingredients for the new recipe (should be different from original)
          - appropriateDay: same as the original recipe day
          `
        },
        {
          role: "user",
          content: `Here is the original recipe:
          ${JSON.stringify(meal, null, 2)}
          
          Please create a completely different meal that meets the same criteria.
          The new meal should NOT be a variation of ${meal.name}, but a totally different dish.
          
          Return ONLY the JSON for the new replacement recipe.`
        }
      ],
      response_format: { type: "json_object" }
    });

    // Safely parse the content, which should always be valid JSON since we specified response_format
    const content = response.choices[0].message.content || '{}';
    const replacementMeal = JSON.parse(content);
    
    // Keep the original ID and other metadata if present
    return {
      ...meal,
      ...replacementMeal,
      replacedFrom: meal.name
    };
  } catch (error) {
    console.error('Error replacing meal with AI:', error);
    throw new Error('Failed to generate replacement recipe. Please try again.');
  }
}