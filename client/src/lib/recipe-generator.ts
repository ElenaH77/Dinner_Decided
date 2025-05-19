/**
 * Client-side interface to the server's recipe instruction regeneration API
 */

// Base API URL for API calls
const API_BASE_URL = '/api';

/**
 * Request to regenerate recipe instructions
 * @param recipe Object containing recipe title and ingredients
 * @returns Array of regenerated instructions or null if regeneration fails
 */
export async function regenerateInstructions(recipe: {
  name: string;
  ingredients: string[];
}): Promise<string[] | null> {
  try {
    console.log(`[RECIPE GENERATOR] Requesting regenerated instructions for: ${recipe.name}`);
    
    // Make API call to the server endpoint
    const response = await fetch(`${API_BASE_URL}/regenerate-recipe-instructions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: recipe.name,
        ingredients: recipe.ingredients,
      }),
    });
    
    // Check for successful response
    if (!response.ok) {
      console.error(`[RECIPE GENERATOR] API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    // Parse the response JSON with improved error handling
    let data;
    try {
      const openAiResponse = await response.text();
      
      // Parse the JSON response with error handling
      try {
        data = JSON.parse(openAiResponse);
        // validate structure
        if (!data || data.success === false || !data.instructions || !Array.isArray(data.instructions)) {
          console.error('[RECIPE GENERATOR] Invalid response format:', data);
          return null;
        }
      } catch (e) {
        console.error("Failed to parse OpenAI instruction response:", e);
        return null;
      }
    } catch (error) {
      console.error('[RECIPE GENERATOR] Failed to read response:', error);
      return null;
    }
    
    // Return the instructions array
    const validInstructions = data.instructions.filter((line: string) => 
      typeof line === 'string' && line.trim().length > 0
    );
    
    // Final validation check - don't return very short instruction sets
    if (validInstructions.length < 5) {
      console.error(`[RECIPE GENERATOR] Not enough valid instructions (${validInstructions.length})`);
      return null;
    }
    
    return validInstructions;
    
  } catch (error) {
    console.error('[RECIPE GENERATOR] Failed to regenerate instructions:', error);
    return null;
  }
}