import { apiRequest } from './queryClient';

/**
 * Modify a meal based on user requirements
 */
export async function modifyMeal(meal: any, modificationRequest: string, mealPlanId?: number, currentMeals?: any[]): Promise<any> {
  try {
    const payload: any = {
      meal,
      modificationRequest
    };
    
    // Add meal plan ID if available for grocery list updates
    if (mealPlanId) {
      payload.mealPlanId = mealPlanId;
    }
    
    // Add current meals from UI context if available
    if (currentMeals && Array.isArray(currentMeals) && currentMeals.length > 0) {
      payload.currentMeals = currentMeals;
      console.log(`Including ${currentMeals.length} current meals in modification request`);
    }
    
    const response = await apiRequest('POST', '/api/meal/modify', payload);
    
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
export async function replaceMeal(meal: any, mealPlanId?: number, currentMeals?: any[]): Promise<any> {
  try {
    const payload: any = { meal };
    
    // Add meal plan ID if available for grocery list updates
    if (mealPlanId) {
      payload.mealPlanId = mealPlanId;
    }
    
    // Add current meals from UI context if available
    if (currentMeals && Array.isArray(currentMeals) && currentMeals.length > 0) {
      payload.currentMeals = currentMeals;
      console.log(`Including ${currentMeals.length} current meals in replacement request`);
    }
    
    const response = await apiRequest('POST', '/api/meal/replace', payload);
    
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