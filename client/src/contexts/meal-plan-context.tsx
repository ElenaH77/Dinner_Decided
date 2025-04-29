import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { MealPlan } from '@/lib/types';

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
  setCurrentPlan: (plan: ExtendedMealPlan) => void;
  addMeal: (meal: MealWithId) => void;
  removeMeal: (mealId: string) => void;
}

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export function MealPlanProvider({ children }: { children: ReactNode }) {
  const [currentPlan, setCurrentPlan] = useState<ExtendedMealPlan | null>(null);

  const addMeal = (meal: MealWithId) => {
    if (!currentPlan) return;
    
    // Update with the correct structure
    setCurrentPlan({
      ...currentPlan,
      meals: [...currentPlan.meals, meal],
      mealIds: [...currentPlan.mealIds, parseInt(meal.id)]
    });
  };

  const removeMeal = (mealId: string) => {
    if (!currentPlan) return;
    
    setCurrentPlan({
      ...currentPlan,
      meals: currentPlan.meals.filter(meal => meal.id !== mealId),
      mealIds: currentPlan.mealIds.filter(id => id.toString() !== mealId)
    });
  };

  return (
    <MealPlanContext.Provider value={{ 
      currentPlan, 
      setCurrentPlan, 
      addMeal, 
      removeMeal 
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