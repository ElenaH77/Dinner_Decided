import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Users, Tag, ChefHat, Info, ListOrdered, MessageSquare, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface RecipeDetailProps {
  meal: any;
  isOpen: boolean;
  onClose: () => void;
  onModify?: (mealId: string, instructions: string) => void;
}

interface Ingredient {
  quantity: string;
  name: string;
}

export default function RecipeDetail({ meal, isOpen, onClose, onModify }: RecipeDetailProps) {
  if (!meal) return null;

  // Handle different property name structures
  const ingredientStrings = meal.mainIngredients || meal.main_ingredients || meal.ingredients || [];
  const prepTips = meal.mealPrepTips || meal.meal_prep_tips || meal.prepTips || '';
  const prepTime = meal.prepTime || meal.prep_time || 0;
  const servingSize = meal.servingSize || meal.serving_size || 3;
  const category = meal.mealCategory || meal.category || '';
  
  // Process ingredients to extract quantities
  const ingredients = Array.isArray(ingredientStrings) ? 
    // If ingredientStrings already has quantities (like "2 lbs ground beef"), use them directly
    (ingredientStrings.some(ing => /^\d+\s*\w+\s+/.test(ing)) ? 
      ingredientStrings.map(ing => ({ 
        quantity: extractQuantity(ing), 
        name: extractIngredientName(ing) 
      })) : 
      // Otherwise try to parse from simple strings
      parseIngredientsWithQuantities(ingredientStrings)) 
    : [];
  
  // Get cooking instructions/steps if they exist in any of the possible property names
  const instructions = meal.instructions || meal.steps || meal.cookingSteps || meal.cooking_steps || [];
  
  // If there are no structured instructions, try to extract them from preparation tips
  // or create default instructions based on ingredients
  const hasInstructions = Array.isArray(instructions) && instructions.length > 0;
  
  // Helper functions to extract quantity and name from an ingredient string
  function extractQuantity(ingredientStr: string): string {
    // Extract quantity pattern (e.g., "2 lbs", "1/2 cup", "3 tablespoons")
    const match = ingredientStr.match(/^([\d\/\.\s]+\s*(?:lb|lbs|cup|cups|tablespoon|tablespoons|tbsp|tsp|teaspoon|teaspoons|ounce|ounces|oz|gram|grams|g|kg|ml|l|pinch|dash|handful|clove|cloves|bunch|can|cans|package|packages|slice|slices|piece|pieces))\s+/i);
    return match ? match[1] : '';
  }
  
  function extractIngredientName(ingredientStr: string): string {
    // Remove quantity from the beginning of the string
    return ingredientStr.replace(/^([\d\/\.\s]+\s*(?:lb|lbs|cup|cups|tablespoon|tablespoons|tbsp|tsp|teaspoon|teaspoons|ounce|ounces|oz|gram|grams|g|kg|ml|l|pinch|dash|handful|clove|cloves|bunch|can|cans|package|packages|slice|slices|piece|pieces))\s+/i, '');
  }
  
  // Create default instructions if none exist
  const defaultInstructions = !hasInstructions ? generateDefaultInstructions(ingredientStrings, prepTips) : [];
  
  // Parse ingredients to extract quantities and names
  function parseIngredientsWithQuantities(ingredientStrings: string[]): Ingredient[] {
    return ingredientStrings.map(ingredient => {
      // Try to identify if there's a quantity at the beginning (like "2 cups flour" or "1/2 lb chicken")
      const quantityMatch = ingredient.match(/^([\d\/\.\s]+\s*(?:cup|cups|tablespoon|tablespoons|tbsp|tsp|teaspoon|teaspoons|lb|pound|pounds|g|gram|grams|oz|ounce|ounces|ml|liter|liters|pinch|dash|handful|slice|slices|clove|cloves|head|bunch|can|cans|package|packages|box|boxes))?\s*(.*)/i);
      
      if (quantityMatch && quantityMatch[1]) {
        return {
          quantity: quantityMatch[1].trim(),
          name: quantityMatch[2].trim()
        };
      }
      
      // If no specific quantity found, return the ingredient as the name with empty quantity
      return {
        quantity: '',
        name: ingredient
      };
    });
  }
  
  // Function to generate basic instructions from ingredients and prep tips
  function generateDefaultInstructions(ingredients: string[], prepTips: string): string[] {
    // If we have prep tips but no instructions, break the prep tips into steps
    if (prepTips && prepTips.length > 0) {
      // Try to split by periods, line breaks, or numbered items
      if (prepTips.includes('\n')) {
        return prepTips.split('\n').filter(step => step.trim().length > 0);
      } else if (prepTips.match(/\d+\./)) {
        return prepTips.split(/\d+\./).filter(step => step.trim().length > 0);
      } else {
        return prepTips.split(/\.\s+/).filter(step => step.trim().length > 0)
          .map(step => step.endsWith('.') ? step : step + '.');
      }
    }
    
    // Very basic default instructions if nothing else is available
    return [
      "Prepare all ingredients as listed.",
      "Combine ingredients according to the meal type.",
      "Cook until done, following the preparation tips above if provided."
    ];
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-teal-primary flex items-center">
            {meal.name}
          </DialogTitle>
          <DialogDescription className="text-base text-gray-700 mt-2">
            {meal.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-4">
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 mr-2 text-teal-primary" />
            <span className="font-medium">Prep Time:</span> 
            <span className="ml-2">{prepTime} minutes</span>
          </div>
          <div className="flex items-center text-sm">
            <Users className="h-4 w-4 mr-2 text-teal-primary" />
            <span className="font-medium">Serves:</span> 
            <span className="ml-2">{servingSize} people</span>
          </div>
          <div className="flex items-center text-sm">
            <Tag className="h-4 w-4 mr-2 text-teal-primary" />
            <span className="font-medium">Category:</span> 
            <span className="ml-2">{category}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center text-teal-primary">
            <ChefHat className="h-5 w-5 mr-2" /> Ingredients
          </h3>
          <ul className="list-disc pl-6 mb-6 space-y-1.5">
            {ingredients.map((ingredient, idx) => (
              <li key={idx} className="text-gray-800">
                {ingredient.quantity && (
                  <span className="font-medium">{ingredient.quantity}</span>
                )}
                {ingredient.quantity && " "}
                {ingredient.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Cooking Instructions Section */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center text-teal-primary">
            <ListOrdered className="h-5 w-5 mr-2" /> Cooking Instructions
          </h3>
          <ol className="list-decimal pl-6 mb-6 space-y-3">
            {hasInstructions 
              ? instructions.map((step: string, idx: number) => (
                <li key={idx} className="text-gray-800">{step}</li>
              ))
              : defaultInstructions.map((step, idx) => (
                <li key={idx} className="text-gray-800">{step}</li>
              ))
            }
          </ol>
        </div>

        {prepTips && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center text-orange-accent">
              <Info className="h-5 w-5 mr-2" /> Preparation Tips
            </h3>
            <p className="text-gray-800 whitespace-pre-line">{prepTips}</p>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}