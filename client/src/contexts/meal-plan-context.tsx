import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { MealPlan } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { 
  loadMealPlan, 
  saveMealPlan, 
  updateMealInPlan, 
  deepClone, 
  STORAGE_KEYS 
} from '@/lib/storage-service';

// For our context, we'll use a simplified version that matches what the components expect
interface MealWithId {
  id: string;
  name: string;
  [key: string]: any;
}

interface ExtendedMealPlan extends MealPlan {
  meals: MealWithId[];
}

interface MealPlanContextType {
  currentPlan: ExtendedMealPlan | null;
  setCurrentPlan: (plan: ExtendedMealPlan | any) => void;
  setActiveMealPlan: (planId: number) => Promise<boolean>; // Explicitly set a meal plan as active
  addMeal: (meal: MealWithId) => void;
  removeMeal: (mealId: string) => void;
  updateMeal: (mealId: string, updatedMeal: MealWithId) => void;
  refreshUI: () => void; // Force UI refresh without refetching
  isLoading: boolean;
  refetchMealPlan: () => Promise<void>;
}

const STORAGE_KEY = 'meal_plan_cache';
const DIRECT_STORAGE_KEY = 'current_meal_plan';

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export function MealPlanProvider({ children }: { children: ReactNode }) {
  const [currentPlan, setCurrentPlanState] = useState<ExtendedMealPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshCounter, setRefreshCounter] = useState(0); // Force UI refresh counter
  
  // Wrapper to handle both basic and extended meal plans
  const setCurrentPlan = (plan: ExtendedMealPlan | any) => {
    if (!plan) return;
    
    console.log("Setting current plan in context:", plan);
    
    // Process the plan to ensure it has the right structure
    let processedPlan: ExtendedMealPlan;
    
    if (!plan.meals && plan.mealIds) {
      // If we have a basic plan without meals, initialize an empty meals array
      processedPlan = {
        ...plan,
        meals: []
      };
    } else {
      // Deduplicate meals by ID and ensure all meals have IDs
      if (plan.meals && Array.isArray(plan.meals)) {
        // Create a map of meal IDs to detect duplicates
        const uniqueMeals: MealWithId[] = [];
        const mealIdsSet = new Set<string>();
        
        plan.meals.forEach((meal: any) => {
          // Ensure the meal has an ID
          if (!meal.id) {
            meal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            console.log('Added missing ID to meal in context:', meal.id);
          }
          
          // Only add the meal if we haven't seen its ID before
          if (!mealIdsSet.has(meal.id)) {
            mealIdsSet.add(meal.id);
            uniqueMeals.push(deepClone(meal)); // Use deep clone to avoid reference issues
          } else {
            console.log(`Skipping duplicate meal with ID: ${meal.id}, name: ${meal.name}`);
          }
        });
        
        if (plan.meals.length !== uniqueMeals.length) {
          console.log(`Removed ${plan.meals.length - uniqueMeals.length} duplicate meals`);
        }
        
        // Replace meals with deduplicated list
        plan.meals = uniqueMeals;
      }
      processedPlan = deepClone(plan); // Deep clone to prevent mutation issues
    }
    
    // Save to state
    setCurrentPlanState(processedPlan);
    
    // Use the centralized storage service to save the plan
    try {
      console.log("Saving processed plan via storage service:", processedPlan);
      saveMealPlan(processedPlan);
    } catch (error) {
      console.error("Error saving meal plan:", error);
    }
  };

  // Load meal plan using the centralized storage service
  useEffect(() => {
    const loadPlanFromStorage = async () => {
      try {
        setIsLoading(true);
        console.log("Loading meal plan on context initialization using storage service");
        
        // Use the centralized storage service for loading
        const result = await loadMealPlan();
        
        if (result.success && result.data) {
          console.log(`Loaded meal plan from ${result.source}:`, result.data);
          setCurrentPlan(result.data);
        } else {
          console.warn("No meal plan found or error loading plan:", result.error);
          
          // Try to load from API directly as fallback
          const response = await apiRequest('GET', '/api/meal-plan/current');
          if (response.ok) {
            const data = await response.json();
            console.log("Loaded meal plan directly from API:", data);
            
            // If we have a valid meal plan, set it
            if (data && data.id) {
              setCurrentPlan(data);
            }
          }
        }
      } catch (error) {
        console.error("Error loading meal plan:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPlanFromStorage();
  }, []);
  
  // Function to manually refetch meal plan data
  const refetchMealPlan = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', '/api/users/1/meal-plans/current');
      if (response.ok) {
        const data = await response.json();
        console.log("Refetched meal plan:", data);
        
        if (data && data.id) {
          // Load meals for this meal plan
          try {
            const mealsResponse = await apiRequest('GET', '/api/users/1/meals');
            if (mealsResponse.ok) {
              const mealsData = await mealsResponse.json();
              console.log("Fetched meals:", mealsData);
              
              // Filter to only get meals in this plan
              const planMeals = Array.isArray(mealsData) ? mealsData.filter((meal: any) => 
                data.mealIds && data.mealIds.includes(meal.id)
              ) : [];
              
              // Set the meal plan with meals included
              setCurrentPlan({
                ...data,
                meals: planMeals
              });
            }
          } catch (error) {
            console.error("Error fetching meals:", error);
            // Still set the meal plan without meals if we can't fetch them
            setCurrentPlan(data);
          }
        }
      }
    } catch (error) {
      console.error("Error refetching meal plan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMeal = (meal: MealWithId) => {
    if (!currentPlan) return;
    
    // Ensure meal has an ID
    if (!meal.id) {
      meal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      console.log('Added missing ID to meal in addMeal:', meal.id);
    }
    
    // Create a deep clone of the meal to avoid reference issues
    const clonedMeal = deepClone(meal);
    
    // Check if this meal ID already exists to prevent duplicates
    const existingMealIndex = currentPlan.meals?.findIndex(m => m.id === clonedMeal.id);
    
    if (existingMealIndex !== -1 && existingMealIndex !== undefined) {
      console.log(`Meal with ID ${clonedMeal.id} already exists in the plan. Skipping duplicate addition.`);
      return; // Skip adding if already exists
    }
    
    // Update with the correct structure - create a deep clone of the current plan and add the meal
    const updatedPlan = deepClone({
      ...currentPlan,
      meals: [...(currentPlan.meals || []), clonedMeal],
      mealIds: [...(currentPlan.mealIds || []), typeof clonedMeal.id === 'number' ? clonedMeal.id : parseInt(clonedMeal.id) || clonedMeal.id]
    });
    
    console.log(`Added meal ${clonedMeal.name} with ID ${clonedMeal.id} to plan, now has ${updatedPlan.meals.length} meals`);
    
    // Save through the storage service
    saveMealPlan(updatedPlan).then(result => {
      if (!result.success) {
        console.warn("Failed to persist meal addition to storage service:", result.error);
      }
    });
    
    // Update context state
    setCurrentPlan(updatedPlan);
  };

  const removeMeal = async (mealId: string) => {
    if (!currentPlan) return;
    
    console.log('Removing meal with ID:', mealId);
    console.log('Before removal, meals count:', currentPlan.meals?.length || 0);
    
    // Create a new plan object with the meal filtered out
    const updatedPlan = {
      ...currentPlan,
      meals: (currentPlan.meals || []).filter(meal => {
        const keepMeal = meal.id !== mealId;
        if (!keepMeal) {
          console.log('Filtered out meal:', meal.name);
        }
        return keepMeal;
      }),
      // Also filter from mealIds array if it exists
      mealIds: (currentPlan.mealIds || []).filter(id => id.toString() !== mealId)
    };
    
    console.log('After removal, meals count:', updatedPlan.meals.length);
    
    // Create a deep clone to avoid reference issues
    const clonedPlan = deepClone(updatedPlan);
    
    // Update the state with our new filtered plan
    setCurrentPlan(clonedPlan);
    
    // Use the centralized storage service to save the updated plan
    try {
      saveMealPlan(clonedPlan).then(result => {
        if (!result.success) {
          console.warn("Failed to persist meal removal to storage service:", result.error);
        }
      });
    } catch (err) {
      console.error('Failed to save meal plan after removal:', err);
    }
  };

  // Function to explicitly set a meal plan as active
  const setActiveMealPlan = async (planId: number): Promise<boolean> => {
    try {
      console.log(`Setting meal plan ${planId} as active`);
      setIsLoading(true);
      
      // Call the API endpoint to set the meal plan as active
      const response = await apiRequest('PUT', `/api/meal-plan/${planId}/set-active`);
      
      if (!response.ok) {
        throw new Error(`Failed to set meal plan ${planId} as active: ${response.statusText}`);
      }
      
      // Get the updated active meal plan
      const updatedPlan = await response.json();
      console.log(`Successfully set meal plan ${planId} as active:`, updatedPlan);
      
      // Update the state with the active plan
      if (updatedPlan && updatedPlan.id) {
        // Store the active meal plan ID in localStorage for future reference
        localStorage.setItem('current_meal_plan_id', String(updatedPlan.id));
        
        // Update any other meal plan related storage
        localStorage.setItem('current_meal_plan', JSON.stringify(updatedPlan));
        
        if (updatedPlan.meals && Array.isArray(updatedPlan.meals)) {
          localStorage.setItem('current_meals', JSON.stringify(updatedPlan.meals));
        }
        
        // Update context state
        setCurrentPlan(updatedPlan);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error setting meal plan as active:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced refresh method that forces UI and data update
  const refreshUI = () => {
    console.log('Forcing UI refresh with counter:', refreshCounter + 1);
    setRefreshCounter(prev => prev + 1);
    
    // Create a more aggressive refresh by recreating the state completely
    if (currentPlan) {
      // Create a fresh deep copy using our storage service helper
      const refreshedPlan = deepClone(currentPlan);
      console.log('Refreshing UI with deep cloned plan');
      
      // This creates a new object reference to trigger React's state update
      setCurrentPlanState(null); // Clear first to force a complete re-render
      
      // Small delay to ensure state updates properly
      setTimeout(() => {
        setCurrentPlanState(refreshedPlan);
        
        // Also re-save to ensure storage is in sync
        saveMealPlan(refreshedPlan).catch(err => 
          console.error('Error saving during refresh:', err)
        );
      }, 50);
    }
  };
  
  // Update a specific meal using the storage service with improved synchronization
  const updateMeal = async (mealId: string, updatedMeal: MealWithId) => {
    if (!currentPlan) return;
    
    console.log(`Updating meal ${mealId} with:`, updatedMeal.name);
    
    // Make sure the ID is preserved
    updatedMeal.id = mealId;
    
    // Create a deep clone of the updated meal to prevent reference issues
    const clonedMeal = deepClone(updatedMeal);
    
    // Update the meal in the meal plan
    const updatedPlan = {
      ...currentPlan,
      meals: currentPlan.meals.map(meal => 
        meal.id === mealId ? clonedMeal : deepClone(meal)
      )
    };
    
    console.log(`Updated meal in plan, now has ${updatedPlan.meals.length} meals`);
    
    // First update local state for immediate feedback
    setCurrentPlan(updatedPlan);
    
    try {
      // 1. Update in API - this ensures the backend has the latest data
      if (currentPlan.id) {
        try {
          const response = await apiRequest('PATCH', `/api/meal-plan/${currentPlan.id}`, {
            updatedMeal: clonedMeal,
            mealId: mealId
          });
          
          if (!response.ok) {
            console.warn('API update failed, falling back to storage service');
          }
        } catch (apiError) {
          console.error('Error updating meal via API:', apiError);
        }
      }
      
      // 2. Use the storage service as backup or for offline capability
      if (currentPlan.id) {
        const result = await updateMealInPlan(currentPlan.id, mealId, clonedMeal);
        if (!result.success) {
          console.warn("Failed to persist meal update to storage service:", result.error);
        }
      }
      
      // 3. Save the complete plan for good measure
      await saveMealPlan(updatedPlan);
      
      // 4. Force context update - this recreates the plan object
      console.log('Meal update successful, refreshing UI components');
      
      // 5. Ensure the query cache is updated to prevent stale data
      try {
        // Standard fetch to bypass react-query cache
        await fetch('/api/meal-plan/current?_=' + Date.now()); 
        // Also invalidate any cached queries
        import('@/lib/queryClient').then(({ queryClient }) => {
          queryClient.invalidateQueries({ queryKey: ['/api/meal-plan/current'] });
        });
      } catch (error) {
        console.error('Failed to refresh API cache:', error);
      }
      
    } catch (error) {
      console.error("Error updating meal:", error);
    }
    
    // Force a UI refresh to ensure all components see the update
    refreshUI();
  };

  // Track the refresh counter to force re-renders when needed
  useEffect(() => {
    // This effect runs when refreshCounter changes
    if (refreshCounter > 0) {
      console.log(`UI refresh triggered (${refreshCounter})`);
      
      // If refresh counter indicates we need a data refresh
      if (refreshCounter % 3 === 0) { // Every 3rd refresh, do a full data reload
        console.log('Performing full data reload from API');
        // Fetch fresh data from API to ensure we have latest
        refetchMealPlan().catch(err => 
          console.error('Error during refresh data reload:', err)
        );
      }
    }
  }, [refreshCounter]);

  return (
    <MealPlanContext.Provider value={{ 
      currentPlan, 
      setCurrentPlan, 
      setActiveMealPlan,
      addMeal, 
      removeMeal,
      updateMeal,
      refreshUI,
      isLoading,
      refetchMealPlan
    }}>
      
      {children}
    </MealPlanContext.Provider>
  );
}

export function useMealPlan() {
  const context = useContext(MealPlanContext);
  if (context === undefined) {
    throw new Error('useMealPlan must be used within a MealPlanProvider');
  }
  return context;
}