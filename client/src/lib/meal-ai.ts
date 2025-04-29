import { apiRequest } from './queryClient';

/**
 * Modify a meal based on user requirements
 */
export async function modifyMeal(meal: any, modificationRequest: string): Promise<any> {
  try {
    const response = await apiRequest('POST', '/api/meal/modify', {
      meal,
      modificationRequest
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to modify recipe');
    }
    
    return await response.json();
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
    const response = await apiRequest('POST', '/api/meal/replace', { meal });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate replacement recipe');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error replacing meal with AI:', error);
    throw new Error('Failed to generate replacement recipe. Please try again.');
  }
}