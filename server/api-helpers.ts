/**
 * API Helpers - Common utilities for API routes
 */
import { Request, Response } from 'express';
import { improveRecipeInstructions } from './openai-recipe-improver';
import { validateMealQuality } from './openai';
import { storage } from './storage';

/**
 * Improve recipe instructions for a meal
 * This function handles the validation and improvement of recipe instructions
 */
export async function handleRecipeImprovement(req: Request, res: Response) {
  try {
    const { mealId, mealPlanId } = req.body;
    
    if (!mealId) {
      return res.status(400).json({ message: "Meal ID is required" });
    }
    
    // Get the meal plan to find the meal
    let mealPlan;
    
    if (mealPlanId) {
      mealPlan = await storage.getMealPlan(mealPlanId);
    } else {
      mealPlan = await storage.getCurrentMealPlan();
    }
    
    if (!mealPlan) {
      return res.status(404).json({ message: "Meal plan not found" });
    }
    
    // Find the meal within the plan
    if (!Array.isArray(mealPlan.meals)) {
      return res.status(400).json({ message: "Meal plan does not contain meals array" });
    }
    
    const mealToImprove = mealPlan.meals.find(meal => meal.id === mealId);
    
    if (!mealToImprove) {
      return res.status(404).json({ message: "Meal not found in the specified meal plan" });
    }
    
    console.log(`[IMPROVE] Improving instructions for meal: ${mealToImprove.name} (${mealId})`);
    
    // First, validate the meal to see if it needs improvement
    const validationResult = validateMealQuality(mealToImprove);
    
    if (validationResult.isValid) {
      console.log(`[IMPROVE] Meal instructions already meet quality standards: ${mealToImprove.name}`);
      return res.json({
        meal: mealToImprove,
        improved: false,
        message: "Instructions already meet quality standards"
      });
    }
    
    console.log(`[IMPROVE] Quality issues found: ${validationResult.issues.join(', ')}`);
    
    // Generate improved instructions
    const improvedMeal = await improveRecipeInstructions(mealToImprove);
    
    // Update the meal plan with the improved meal
    const updatedMeals = mealPlan.meals.map(meal => {
      if (meal.id === mealId) {
        return improvedMeal;
      }
      return meal;
    });
    
    // Update the meal plan in storage
    const updatedMealPlan = await storage.updateMealPlan(mealPlan.id, {
      ...mealPlan,
      meals: updatedMeals,
      lastUpdated: new Date().toISOString()
    } as any); // Type assertion to avoid TypeScript errors
    
    console.log(`[IMPROVE] Updated meal plan ${mealPlan.id} with improved instructions`);
    
    // Return the improved meal and updated plan
    return res.json({
      meal: improvedMeal,
      mealPlan: updatedMealPlan,
      improved: true,
      message: "Instructions successfully improved"
    });
  } catch (error: any) {
    console.error("Error improving meal instructions:", error?.message || "Unknown error");
    return res.status(500).json({ message: "Failed to improve meal instructions" });
  }
}

/**
 * Validate recipe instructions for a meal
 */
export async function handleRecipeValidation(req: Request, res: Response) {
  try {
    const { meal } = req.body;
    
    if (!meal) {
      return res.status(400).json({ message: "Meal object is required" });
    }
    
    // Validate the meal instructions
    const validationResult = validateMealQuality(meal);
    
    // Return the validation result
    return res.json({
      isValid: validationResult.isValid,
      issues: validationResult.issues,
      needsImprovement: !validationResult.isValid
    });
  } catch (error: any) {
    console.error("Error validating meal instructions:", error?.message || "Unknown error");
    return res.status(500).json({ message: "Failed to validate meal instructions" });
  }
}