// Recipe instruction generation using OpenAI
import { OpenAI } from 'openai';

// Initialize OpenAI client - in client-side, we'll use the API proxy
async function getOpenAIClient() {
  // Use the server API endpoint to proxy our OpenAI requests
  const apiUrl = '/api/openai/generate';
  
  // Return a simplified client object that proxies to the server
  return {
    async regenerateInstructions(recipe: {
      name: string;
      ingredients: string[];
    }): Promise<string[]> {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'recipe_instructions',
            recipe: {
              title: recipe.name,
              ingredients: recipe.ingredients
            }
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to generate instructions: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!data.success || !data.result) {
          throw new Error('Invalid response from instruction generator');
        }
        
        // Parse the returned instructions into an array
        return Array.isArray(data.result) ? data.result : data.result.split('\n').filter(line => line.trim());
      } catch (error) {
        console.error('[RECIPE GENERATOR] Error generating instructions:', error);
        throw error;
      }
    }
  };
}

// Export the function to regenerate instructions
export async function regenerateInstructions(recipe: {
  name: string;
  ingredients: string[];
}): Promise<string[]> {
  try {
    const client = await getOpenAIClient();
    return await client.regenerateInstructions(recipe);
  } catch (error) {
    console.error('[RECIPE GENERATOR] Failed to regenerate instructions:', error);
    // Return empty array on error - caller should handle this gracefully
    return [];
  }
}