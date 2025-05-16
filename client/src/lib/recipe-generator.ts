/**
 * Client-side interface to the server's recipe instruction regeneration API
 */

// Base API URL for API calls
const API_BASE_URL = '/api';

/**
 * Request to regenerate recipe instructions
 * @param recipe Object containing recipe title and ingredients
 * @returns Array of regenerated instructions
 */
export async function regenerateInstructions(recipe: {
  name: string;
  ingredients: string[];
}): Promise<string[]> {
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
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response JSON
    const data = await response.json();
    
    // Ensure the response contains instructions
    if (!data || !data.instructions || !Array.isArray(data.instructions)) {
      console.error('[RECIPE GENERATOR] Invalid response format:', data);
      throw new Error('Invalid response format from server');
    }
    
    // Return the instructions array
    return data.instructions.filter((line: string) => typeof line === 'string' && line.trim().length > 0);
    
  } catch (error) {
    console.error('[RECIPE GENERATOR] Failed to regenerate instructions:', error);
    throw error;
  }
}