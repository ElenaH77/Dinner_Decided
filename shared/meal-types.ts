/**
 * Shared meal type definitions used for validation and processing
 */

export interface Meal {
  id: string;
  name: string;
  description: string;
  categories: string[];
  prepTime: number;
  servings: number;
  ingredients: string[];
  instructions: string[];
  day?: string;
  rationales?: string[];
  prepInstructions?: string;
  cookingInstructions?: string;
  
  // Optional fields that may be present in legacy data
  mainIngredients?: string[];
  directions?: string[];
  mealCategory?: string;
  
  // Quality tracking fields
  _qualityIssues?: string[];
  _needsRegeneration?: boolean;
}

export interface MealValidationResult {
  isValid: boolean;
  issues: string[];
  meal: Meal; // The original or fixed meal
}

export const MINIMUM_REQUIREMENTS = {
  INSTRUCTIONS_COUNT: 5, // Simplified requirement - just need 5 steps
};

export const GENERIC_PHRASES = [
  "cook until done",
  "follow package directions",
  "cook according to instructions",
  "standard procedure",
  "cook following standard procedures"
];