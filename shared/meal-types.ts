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
  INGREDIENTS_COUNT: 8,
  INSTRUCTIONS_COUNT: 7,
  DETAIL_LENGTH: 50, // Minimum characters for each instruction
};

export const GENERIC_PHRASES = [
  "cook following standard procedures",
  "cook according to standard procedure",
  "cook using standard methods",
  "following package directions",
  "prepare according to instructions",
  "cook as you normally would",
  "cook until done",
  "cook until ready",
  "cook until finished"
];