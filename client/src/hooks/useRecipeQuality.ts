// Custom hook to improve recipe quality on the client side
import { useState, useEffect } from 'react';
import { validateRecipeInstructions } from '@shared/recipe-validation';
import { regenerateInstructions } from '@/lib/recipe-generator';

// Custom hook for checking recipe quality throughout the app
export function useRecipeQuality(mealPlan: any) {
  const [improvedMealPlan, setImprovedMealPlan] = useState(mealPlan);
  const [processingMealIds, setProcessingMealIds] = useState<string[]>([]);
  
  // Whenever the meal plan changes, check if any recipes need quality improvements
  useEffect(() => {
    if (!mealPlan || !mealPlan.meals || !Array.isArray(mealPlan.meals)) {
      return;
    }
    
    console.log('[RECIPE QUALITY] Checking recipe quality for meal plan');
    
    // Define an async function to check meal plan quality
    const checkMealPlanQualityAsync = async () => {
      try {
        // Only check for automatic quality issues on initial load
        const mealsWithQualityIssues = mealPlan.meals.filter((meal: any) => {
          // Skip meals that are already being processed
          if (processingMealIds.includes(meal.id)) {
            return false;
          }
          
          // Check if the meal is explicitly marked for regeneration
          if (meal._needsRegeneration === true) {
            console.log(`[RECIPE QUALITY] Meal "${meal.name}" is marked for regeneration`);
            return true;
          }
          
          // Don't automatically check all meals for quality issues
          // This prevents unwanted bulk regeneration
          return false;
        });
        
        if (mealsWithQualityIssues.length > 0) {
          console.log(`[RECIPE QUALITY] Found ${mealsWithQualityIssues.length} meals needing regeneration`);
          // Set the meal plan but don't automatically regenerate
          setImprovedMealPlan(mealPlan);
        } else {
          console.log('[RECIPE QUALITY] No meals explicitly marked for regeneration');
          setImprovedMealPlan(mealPlan);
        }
      } catch (error) {
        console.error('[RECIPE QUALITY] Error checking meal plan quality:', error);
        setImprovedMealPlan(mealPlan);
      }
    };
    
    // Execute the async function
    checkMealPlanQualityAsync();
  }, [mealPlan, processingMealIds]);
  
  // Function to regenerate a specific meal's instructions
  const regenerateMealInstructions = async (mealId: string) => {
    if (!mealPlan || !mealPlan.meals || !Array.isArray(mealPlan.meals)) {
      return false;
    }
    
    // Find the meal by ID
    const mealToRegenerate = mealPlan.meals.find((meal: any) => meal.id === mealId);
    
    if (!mealToRegenerate) {
      console.error(`[RECIPE QUALITY] Cannot find meal with ID ${mealId}`);
      return false;
    }
    
    // Check if we're already processing this meal
    if (processingMealIds.includes(mealId)) {
      console.log(`[RECIPE QUALITY] Already regenerating meal "${mealToRegenerate.name}"`);
      return false;
    }
    
    // Mark this meal as being processed
    setProcessingMealIds(prev => [...prev, mealId]);
    
    try {
      console.log(`[RECIPE QUALITY] Regenerating instructions for "${mealToRegenerate.name}" via OpenAI API`);
      
      // Check if we have required data for regeneration
      if (!mealToRegenerate.name || !mealToRegenerate.ingredients || !mealToRegenerate.ingredients.length) {
        console.error(`[RECIPE QUALITY] Cannot regenerate instructions for "${mealToRegenerate.name}" - missing required data`);
        
        // Remove from processing list
        setProcessingMealIds(prev => prev.filter(id => id !== mealId));
        return false;
      }
      
      // Call the API to get new instructions
      const newInstructions = await regenerateInstructions({
        name: mealToRegenerate.name,
        ingredients: mealToRegenerate.ingredients
      });
      
      if (newInstructions && newInstructions.length >= 5) {
        console.log(`[RECIPE QUALITY] Successfully regenerated ${newInstructions.length} instructions for "${mealToRegenerate.name}"`);
        
        // Create improved meal plan with just this meal updated
        const updatedMeals = mealPlan.meals.map((meal: any) => {
          if (meal.id === mealId) {
            return {
              ...meal,
              instructions: newInstructions,
              directions: newInstructions, // For backward compatibility
              _needsRegeneration: false,
              _qualityIssues: [],
              _instructionsImproved: true,
              _regeneratedAt: new Date().toISOString()
            };
          }
          return meal;
        });
        
        const newMealPlan = {
          ...mealPlan,
          meals: updatedMeals,
          lastQualityCheck: new Date().toISOString()
        };
        
        console.log('[RECIPE QUALITY] Setting improved meal plan with fixed recipe');
        setImprovedMealPlan(newMealPlan);
        
        // Remove from processing list
        setProcessingMealIds(prev => prev.filter(id => id !== mealId));
        return true;
      } else {
        console.log(`[RECIPE QUALITY] Failed to get valid instructions from API for "${mealToRegenerate.name}"`);
        
        // Update the meal to indicate failure
        const updatedMeals = mealPlan.meals.map((meal: any) => {
          if (meal.id === mealId) {
            return {
              ...meal,
              _needsRegeneration: true,
              _qualityIssues: [...(meal._qualityIssues || []), "Instructions could not be regenerated by AI"],
              _regenerationFailed: true
            };
          }
          return meal;
        });
        
        const newMealPlan = {
          ...mealPlan,
          meals: updatedMeals
        };
        
        setImprovedMealPlan(newMealPlan);
        
        // Remove from processing list
        setProcessingMealIds(prev => prev.filter(id => id !== mealId));
        return false;
      }
    } catch (error) {
      console.error(`[RECIPE QUALITY] API error while regenerating "${mealToRegenerate.name}":`, error);
      
      // Remove from processing list
      setProcessingMealIds(prev => prev.filter(id => id !== mealId));
      return false;
    }
  };
  
  return { 
    mealPlan: improvedMealPlan, 
    regenerateMealInstructions,
    isRegenerating: (mealId: string) => processingMealIds.includes(mealId)
  };
}