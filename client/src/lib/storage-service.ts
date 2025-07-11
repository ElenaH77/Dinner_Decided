/**
 * Centralized Storage Service
 * 
 * This service provides a consistent way to load and save application data.
 * It handles both local storage and API interactions, with proper error handling
 * and data synchronization.
 */

import { apiRequest } from './queryClient';

// Define consistent storage keys
const STORAGE_KEYS = {
  MEAL_PLAN: 'dinner_decided_meal_plan', // Single consistent key for meal plans
  HOUSEHOLD: 'dinner_decided_household',
  MESSAGES: 'dinner_decided_messages',
  GROCERY_LIST: 'dinner_decided_grocery_list',
  USER_PREFERENCES: 'dinner_decided_preferences'
};

// Type for handling storage operations
type StorageResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  source?: 'localStorage' | 'api' | 'memory';
};

/**
 * Deep clone an object to avoid reference issues
 */
export function deepClone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Clear all meal plan related caches to prevent restoration of deleted meals
 */
export function clearAllMealPlanCaches(): void {
  console.log('[CACHE CLEAR] Clearing all meal plan related caches');
  
  // Clear all possible meal plan cache keys
  const allKeys = [
    'dinner_decided_meal_plan',
    'current_meal_plan',
    'current_meals', 
    'meal_plan_cache',
    'processed_meal_plan',
    'dinner-decided-meal-plan',
    'meal_plan_storage'
  ];
  
  allKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[CACHE CLEAR] Removed ${key}`);
  });
}

/**
 * Clear all localStorage data when household ID changes
 */
export function clearStaleHouseholdData(): void {
  // Clear all dinner-decided related keys
  const keys = Object.keys(localStorage);
  const keysToRemove = keys.filter(key => 
    key.startsWith('dinner_decided_') || 
    key.startsWith('dinner-decided-') ||
    key.includes('meal_plan') ||
    key.includes('household') ||
    key.includes('grocery') ||
    key.includes('messages') ||
    key.includes('preferences')
  );
  
  // Also include known legacy keys
  keysToRemove.push(
    'meal_plan_cache',
    'current_meal_plan', 
    'household_data',
    'grocery_list_cache',
    'chat_messages',
    'user_preferences'
  );
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log('Cleared stale household data from localStorage:', keysToRemove);
}

/**
 * Clear all meal plan cache data - used when reset is performed
 */
export function clearAllMealPlanCache(): void {
  console.log('[CACHE] Clearing all meal plan cache data');
  
  // Remove all meal plan related keys
  const keysToRemove = [
    STORAGE_KEYS.MEAL_PLAN,
    'meal_plan_cache',
    'current_meal_plan',
    'dinner_decided_meal_plan',
    'active_meal_plan_id'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[CACHE] Removed: ${key}`);
  });
  
  console.log('[CACHE] All meal plan cache cleared');
}

/**
 * Check if localStorage data belongs to current household
 */
export function validateHouseholdData(data: any): boolean {
  if (!data || !data.householdId) return false;
  
  // Get current household ID from header
  const currentHouseholdId = document.querySelector('meta[name="household-id"]')?.getAttribute('content') || 
                            localStorage.getItem('dinner-decided-household-id');
  
  if (!currentHouseholdId) return false;
  
  // If householdId is a number and current is string, compare as strings
  const dataHouseholdId = String(data.householdId);
  const currentHouseholdIdStr = String(currentHouseholdId);
  
  if (dataHouseholdId !== currentHouseholdIdStr) {
    console.log(`Household ID mismatch: localStorage has ${dataHouseholdId}, current session is ${currentHouseholdIdStr}`);
    clearStaleHouseholdData();
    return false;
  }
  
  return true;
}

/**
 * Save data to localStorage with error handling
 */
export function saveToStorage<T>(key: string, data: T): StorageResult<T> {
  try {
    const dataString = JSON.stringify(data);
    localStorage.setItem(key, dataString);
    return {
      success: true,
      data: deepClone(data),
      source: 'localStorage'
    };
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error saving to localStorage',
      source: 'localStorage'
    };
  }
}

/**
 * Load data from localStorage with error handling
 */
export function loadFromStorage<T>(key: string): StorageResult<T> {
  try {
    const dataString = localStorage.getItem(key);
    if (!dataString) {
      return {
        success: false,
        error: `No data found for key: ${key}`,
        source: 'localStorage'
      };
    }
    
    const data = JSON.parse(dataString) as T;
    return {
      success: true,
      data: deepClone(data),
      source: 'localStorage'
    };
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error loading from localStorage',
      source: 'localStorage'
    };
  }
}

/**
 * Load data from API with error handling
 */
export async function loadFromApi<T>(endpoint: string): Promise<StorageResult<T>> {
  try {
    const response = await apiRequest('GET', endpoint);
    if (!response.ok) {
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
        source: 'api'
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      data: deepClone(data),
      source: 'api'
    };
  } catch (error) {
    console.error(`Error loading from API ${endpoint}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error loading from API',
      source: 'api'
    };
  }
}

/**
 * Save data to API with error handling
 */
export async function saveToApi<T>(endpoint: string, data: T): Promise<StorageResult<T>> {
  try {
    const response = await apiRequest('POST', endpoint, data);
    if (!response.ok) {
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
        source: 'api'
      };
    }
    
    const responseData = await response.json();
    return {
      success: true,
      data: deepClone(responseData),
      source: 'api'
    };
  } catch (error) {
    console.error(`Error saving to API ${endpoint}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error saving to API',
      source: 'api'
    };
  }
}

/**
 * Update data to API with error handling
 */
export async function updateToApi<T>(endpoint: string, data: T): Promise<StorageResult<T>> {
  try {
    const response = await apiRequest('PATCH', endpoint, data);
    if (!response.ok) {
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
        source: 'api'
      };
    }
    
    const responseData = await response.json();
    return {
      success: true,
      data: deepClone(responseData),
      source: 'api'
    };
  } catch (error) {
    console.error(`Error updating to API ${endpoint}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating to API',
      source: 'api'
    };
  }
}

// Meal Plan specific methods

export async function loadMealPlan(forceFresh = false) {
  // If forceFresh is true, skip localStorage and go directly to API
  if (!forceFresh) {
    // First try localStorage for immediate response
    const localResult = loadFromStorage(STORAGE_KEYS.MEAL_PLAN);
    
    // If we have local data, validate it belongs to current household
    if (localResult.success && localResult.data && localResult.data.id) {
      if (validateHouseholdData(localResult.data)) {
        console.log("Loaded meal plan from localStorage:", localResult.data);
        return localResult;
      } else {
        console.log("localStorage meal plan belongs to different household, ignoring");
      }
    }
  } else {
    console.log("Force refresh requested, skipping localStorage");
  }
  
  // Try to load from API as a fallback
  console.log("Attempting to load meal plan from API");
  const apiResult = await loadFromApi('/api/meal-plan/current');
  
  // If API load was successful, cache the result in localStorage
  if (apiResult.success && apiResult.data) {
    console.log("Loaded meal plan from API, caching to localStorage", apiResult.data);
    saveToStorage(STORAGE_KEYS.MEAL_PLAN, apiResult.data);
    
    // For legacy support, also save to the old storage keys
    localStorage.setItem('meal_plan_cache', JSON.stringify(apiResult.data));
    localStorage.setItem('current_meal_plan', JSON.stringify(apiResult.data));
    
    // Check if the API response includes a clearCache signal
    if (apiResult.data.clearCache) {
      console.log("API response includes clearCache signal, clearing all meal plan cache");
      clearAllMealPlanCache();
    }
  }
  
  return apiResult;
}

/**
 * Save meal plan to both localStorage and API if available
 */
export async function saveMealPlan(mealPlan: any) {
  // Always save to localStorage first for immediate persistence
  const localResult = saveToStorage(STORAGE_KEYS.MEAL_PLAN, mealPlan);
  
  // For legacy support, also save to the old storage keys
  localStorage.setItem('meal_plan_cache', JSON.stringify(mealPlan));
  localStorage.setItem('current_meal_plan', JSON.stringify(mealPlan));
  
  // Make sure to save the current meal plan ID correctly
  if (mealPlan && mealPlan.id) {
    console.log('[DEBUG] Storing meal plan ID in localStorage:', mealPlan.id);
    localStorage.setItem('current_meal_plan_id', String(mealPlan.id));
  }
  
  // Try to save to API if available
  if (mealPlan.id) {
    try {
      console.log("Saving meal plan to API:", mealPlan.id);
      
      // IMPORTANT: Add flag to explicitly tell the server not to regenerate the grocery list
      // This prevents meal plan refreshes from clearing the grocery list
      const mealPlanWithFlag = {
        ...mealPlan,
        regenerateGroceryList: false // Explicitly tell server NOT to regenerate grocery list
      };
      
      const apiResult = await updateToApi(`/api/meal-plan/${mealPlan.id}`, mealPlanWithFlag);
      return apiResult;
    } catch (error) {
      console.error("Failed to save meal plan to API:", error);
      // Return the localStorage result anyway
      return localResult;
    }
  }
  
  return localResult;
}

/**
 * Update a specific meal in a meal plan using a direct API call to the server
 */
export async function updateMealInPlan(mealPlanId: number, mealId: string, updatedMeal: any) {
  console.log(`Making direct API call to update meal ${mealId} in plan ${mealPlanId}`);
  
  try {
    // First attempt the direct API call pattern using apiRequest
    const response = await apiRequest(`/api/meal-plan/${mealPlanId}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json'
      },
      body: {
        mealId: mealId,
        updatedMeal: updatedMeal
      }
    });
    
    if (response.ok) {
      const apiData = await response.json();
      console.log('Direct API update successful:', apiData);
      
      // Also update local storage to keep them in sync
      // First load the current meal plan
      const result = await loadMealPlan();
      if (result.success && result.data) {
        const mealPlan = result.data;
        
        // Find and update the specific meal
        if (Array.isArray(mealPlan.meals)) {
          const mealIndex = mealPlan.meals.findIndex(meal => meal.id === mealId);
          if (mealIndex >= 0) {
            // Create a deep copy of the meal plan
            const updatedPlan = deepClone(mealPlan);
            
            // Ensure ID consistency
            updatedMeal.id = mealId;
            
            // Replace the meal
            updatedPlan.meals[mealIndex] = updatedMeal;
            
            // Save to localStorage only, not back to API
            saveToStorage(STORAGE_KEYS.MEAL_PLAN, updatedPlan);
            localStorage.setItem('meal_plan_cache', JSON.stringify(updatedPlan));
            localStorage.setItem('current_meal_plan', JSON.stringify(updatedPlan));
            
            // Also save the meal plan ID correctly
            if (updatedPlan && updatedPlan.id) {
              localStorage.setItem('current_meal_plan_id', String(updatedPlan.id));
            }
          }
        }
      }
      
      return {
        success: true,
        data: apiData,
        source: 'api'
      };
    } else {
      // API returned an error
      const errorData = await response.json();
      console.error('API meal update failed:', errorData);
      
      // Fall back to updating the local copy
      return await updateLocalMealPlan(mealPlanId, mealId, updatedMeal);
    }
  } catch (error) {
    console.error('Error in direct API update:', error);
    
    // Fall back to updating the local copy
    return await updateLocalMealPlan(mealPlanId, mealId, updatedMeal);
  }
}

/**
 * Helper function to update the meal plan locally
 */
async function updateLocalMealPlan(mealPlanId: number, mealId: string, updatedMeal: any): Promise<StorageResult<any>> {
  // First load the current meal plan
  const result = await loadMealPlan();
  if (!result.success || !result.data) {
    console.error("Unable to load meal plan for meal update");
    return {
      success: false,
      error: "Failed to load meal plan",
      source: 'memory'
    };
  }
  
  const mealPlan = result.data;
  
  // Find and update the specific meal
  if (Array.isArray(mealPlan.meals)) {
    const mealIndex = mealPlan.meals.findIndex(meal => meal.id === mealId);
    if (mealIndex >= 0) {
      // Create a deep copy of the meal plan
      const updatedPlan = deepClone(mealPlan);
      
      // Ensure ID consistency
      updatedMeal.id = mealId;
      
      // Replace the meal
      updatedPlan.meals[mealIndex] = updatedMeal;
      
      // Save the updated plan
      console.log(`Updating meal ${mealId} in plan ${mealPlanId} (local only)`);
      return await saveMealPlan(updatedPlan);
    }
  }
  
  return {
    success: false,
    error: `Meal with ID ${mealId} not found in meal plan`,
    source: 'memory'
  };
}

// Export the consistent storage keys for use throughout the app
export { STORAGE_KEYS };
