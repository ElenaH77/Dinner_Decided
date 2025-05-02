import { apiRequest } from './queryClient';

/**
 * Modify a meal based on user requirements
 */
export async function modifyMeal(meal: any, modificationRequest: string, mealPlanId?: number, currentMeals?: any[]): Promise<any> {
  try {
    console.log(`[MEAL AI] Starting modification of ${meal.name} with request: ${modificationRequest}`);
    
    // Create deep copy of meal to avoid reference issues
    const mealCopy = JSON.parse(JSON.stringify(meal));
    
    const payload: any = {
      meal: mealCopy,
      modificationRequest
    };
    
    // Add meal plan ID if available for grocery list updates
    if (mealPlanId) {
      payload.mealPlanId = mealPlanId;
      console.log(`[MEAL AI] Including meal plan ID ${mealPlanId} for grocery list updates`);
    }
    
    // Add current meals from UI context if available
    if (currentMeals && Array.isArray(currentMeals) && currentMeals.length > 0) {
      // Deep copy to avoid reference issues
      payload.currentMeals = JSON.parse(JSON.stringify(currentMeals));
      console.log(`[MEAL AI] Including ${currentMeals.length} current meals in modification request`);
    }
    
    console.log(`[MEAL AI] Sending modification request for ${meal.id}`);
    const response = await apiRequest('POST', '/api/meal/modify', payload);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to modify recipe');
    }
    
    const modifiedMeal = await response.json();
    console.log(`[MEAL AI] Successfully modified meal: ${modifiedMeal.name}`);
    
    return modifiedMeal;
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
    console.log(`[MEAL AI] Starting replacement of ${meal.name} with ID: ${meal.id}`);
    
    // Create deep copy of meal to avoid reference issues
    const mealCopy = JSON.parse(JSON.stringify(meal));
    
    const payload: any = { meal: mealCopy };
    
    // Add meal plan ID if available for grocery list updates
    if (mealPlanId) {
      payload.mealPlanId = mealPlanId;
      console.log(`[MEAL AI] Including meal plan ID ${mealPlanId} for grocery list updates`);
    }
    
    // Add current meals from UI context if available
    if (currentMeals && Array.isArray(currentMeals) && currentMeals.length > 0) {
      // Deep copy to avoid reference issues
      payload.currentMeals = JSON.parse(JSON.stringify(currentMeals));
      console.log(`[MEAL AI] Including ${currentMeals.length} current meals in replacement request`);
    }
    
    console.log(`[MEAL AI] Sending replacement request for ${meal.id}`);
    const response = await apiRequest('POST', '/api/meal/replace', payload);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate replacement recipe');
    }
    
    const replacementMeal = await response.json();
    console.log(`[MEAL AI] Successfully replaced meal with: ${replacementMeal.name}`);
    
    return replacementMeal;
  } catch (error) {
    console.error('Error replacing meal with AI:', error);
    throw new Error('Failed to generate replacement recipe. Please try again.');
  }
}