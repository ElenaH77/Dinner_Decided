import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { MealPlan } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';

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
  addMeal: (meal: MealWithId) => void;
  removeMeal: (mealId: string) => void;
  isLoading: boolean;
  refetchMealPlan: () => Promise<void>;
}

const STORAGE_KEY = 'meal_plan_cache';
const DIRECT_STORAGE_KEY = 'current_meal_plan';

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export function MealPlanProvider({ children }: { children: ReactNode }) {
  const [currentPlan, setCurrentPlanState] = useState<ExtendedMealPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
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
      processedPlan = plan;
    }
    
    // Save to state
    setCurrentPlanState(processedPlan);
    
    // Save to both local storage locations for persistence and redundancy
    try {
      console.log("Saving processed plan to localStorage:", processedPlan);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(processedPlan));
      localStorage.setItem(DIRECT_STORAGE_KEY, JSON.stringify(processedPlan));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  // Load from localStorage or API on mount
  useEffect(() => {
    const loadMealPlan = async () => {
      try {
        setIsLoading(true);
        
        console.log("Loading meal plan on context initialization");
        
        // First try the direct storage key (used by the meal planning assistant)
        const directStored = localStorage.getItem(DIRECT_STORAGE_KEY);
        if (directStored) {
          try {
            const parsedPlan = JSON.parse(directStored);
            console.log("Loaded meal plan from direct storage:", parsedPlan);
            if (parsedPlan && parsedPlan.id) {
              setCurrentPlan(parsedPlan);
              return;
            }
          } catch (e) {
            console.error("Error parsing direct stored meal plan:", e);
          }
        }
        
        // Then try the regular cache
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            const parsedPlan = JSON.parse(cached);
            console.log("Loaded meal plan from cache:", parsedPlan);
            if (parsedPlan && parsedPlan.id) {
              setCurrentPlan(parsedPlan);
              return;
            }
          } catch (e) {
            console.error("Error parsing cached meal plan:", e);
          }
        }
        
        // Finally try to load from API
        const response = await apiRequest('GET', '/api/users/1/meal-plans/current');
        if (response.ok) {
          const data = await response.json();
          console.log("Loaded meal plan from API:", data);
          
          // If we have a valid meal plan, set it
          if (data && data.id) {
            setCurrentPlan(data);
          }
        }
      } catch (error) {
        console.error("Error loading meal plan:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMealPlan();
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
    
    // Update with the correct structure
    const updatedPlan = {
      ...currentPlan,
      meals: [...(currentPlan.meals || []), meal],
      mealIds: [...(currentPlan.mealIds || []), parseInt(meal.id)]
    };
    
    setCurrentPlan(updatedPlan);
  };

  const removeMeal = (mealId: string) => {
    if (!currentPlan) return;
    
    const updatedPlan = {
      ...currentPlan,
      meals: (currentPlan.meals || []).filter(meal => meal.id !== mealId),
      mealIds: (currentPlan.mealIds || []).filter(id => id.toString() !== mealId)
    };
    
    setCurrentPlan(updatedPlan);
  };

  return (
    <MealPlanContext.Provider value={{ 
      currentPlan, 
      setCurrentPlan, 
      addMeal, 
      removeMeal,
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