import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, RefreshCw, Utensils, X, FileText, ShoppingCart } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMealPlan } from "@/contexts/meal-plan-context";
import RecipeDetail from "./recipe-detail";

// Meal category icons mapping
const MEAL_CATEGORY_ICONS: { [key: string]: string } = {
  'Quick & Easy': '⚡',
  'Weeknight Meals': '🍽️',
  'Batch Cooking': '📦',
  'Split Prep': '⏰',
  'quick': '⚡',
  'weeknight': '🍽️',
  'batch': '📦',
  'split': '⏰'
};

// Using inline type definition to ensure rationales is included
interface Meal {
  id: string;
  name: string;
  description?: string;
  categories?: string[];
  category?: string;
  prepTime?: number;
  servings?: number;
  imageUrl?: string;
  ingredients?: string[];
  mainIngredients?: string[];
  rationales?: string[];
}

interface MealCardProps {
  meal: Meal;
  compact?: boolean;
}

export default function MealCard({ meal, compact = false }: MealCardProps) {
  const { toast } = useToast();
  const { removeMeal } = useMealPlan();
  const [isReplacing, setIsReplacing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  
  // Ensure the meal has an ID
  useEffect(() => {
    if (!meal.id) {
      meal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      console.log('Assigned missing ID to meal:', meal.id);
    }
  }, [meal]);
  
  // Get a single category for icon display
  // Categories can be in different formats depending on the meal data
  let primaryCategory = meal.category || '';
  if (!primaryCategory && meal.categories && meal.categories.length > 0) {
    primaryCategory = meal.categories[0];
  }
  
  // Try to match category with known category patterns
  let categoryIcon = '';
  if (primaryCategory) {
    // Check for exact match first
    categoryIcon = MEAL_CATEGORY_ICONS[primaryCategory] || '';
    
    // If no direct match, try to find partial matches
    if (!categoryIcon) {
      const lowerCategory = primaryCategory.toLowerCase();
      if (lowerCategory.includes('quick') || lowerCategory.includes('easy')) {
        categoryIcon = '⚡';
        primaryCategory = 'Quick & Easy';
      } else if (lowerCategory.includes('weeknight')) {
        categoryIcon = '🍽️';
        primaryCategory = 'Weeknight Meals';
      } else if (lowerCategory.includes('batch')) {
        categoryIcon = '📦';
        primaryCategory = 'Batch Cooking';
      } else if (lowerCategory.includes('split') || lowerCategory.includes('prep')) {
        categoryIcon = '⏰';
        primaryCategory = 'Split Prep';
      }
    }
  }
  
  // If still no icon/category, use a default
  if (!primaryCategory) {
    primaryCategory = 'Weeknight Meals';
    categoryIcon = '🍽️';
  }

  const handleReplaceMeal = async () => {
    setIsReplacing(true);
    try {
      await apiRequest("POST", `/api/meal-plan/replace-meal/${meal.id}`, {});
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plan/current'] });
      toast({
        title: "Meal replaced",
        description: "Your meal has been updated with a new suggestion."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to replace meal",
        variant: "destructive"
      });
    } finally {
      setIsReplacing(false);
    }
  };

  const handleRemoveMeal = () => {
    setIsRemoving(true);
    try {
      // Log meal to debug
      console.log("Removing meal:", meal);
      console.log("Meal ID:", meal.id);
      
      if (!meal.id) {
        // Generate an ID if one doesn't exist
        meal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        console.log("Generated ID for meal:", meal.id);
      }
      
      // Remove the meal from the local context 
      removeMeal(meal.id);
      
      // Skip server sync for now - we've already removed it from the UI
      // which is most important for user experience
      
      toast({
        title: "Meal removed",
        description: "The meal has been removed from your plan."
      });
    } catch (error) {
      console.error("Error removing meal:", error);
      toast({
        title: "Error",
        description: "Failed to remove the meal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleAddToGroceryList = async () => {
    try {
      await apiRequest("POST", "/api/grocery-list/add-meal", { mealId: meal.id });
      queryClient.invalidateQueries({ queryKey: ['/api/grocery-list/current'] });
      toast({
        title: "Added to grocery list",
        description: "Ingredients have been added to your grocery list"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to grocery list",
        variant: "destructive"
      });
    }
  };

  // Show recipe detail dialog
  const handleViewRecipe = () => {
    setIsRecipeOpen(true);
  };

  return (
    <>
      <Card className="border border-[#E2E2E2] overflow-hidden bg-[#F9F9F9] hover:shadow-md transition-all">
        <div className="p-4 w-full">
          {/* Category Badge at the top */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-wrap gap-2">
              {primaryCategory && (
                <Badge className="bg-[#21706D] text-white px-3 py-1 flex items-center gap-1">
                  {categoryIcon && <span>{categoryIcon}</span>}
                  <span>{primaryCategory}</span>
                </Badge>
              )}
              {meal.prepTime && (
                <Badge className="bg-[#F25C05] bg-opacity-80 text-white px-3 py-1">
                  {meal.prepTime} min
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{meal.name}</h3>
            </div>
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-[#8A8A8A] hover:text-red-500 h-8 w-8"
                onClick={handleRemoveMeal}
                disabled={isRemoving}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-[#8A8A8A] hover:text-[#21706D] h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-[#8A8A8A] hover:text-[#21706D] h-8 w-8"
                onClick={handleReplaceMeal}
                disabled={isReplacing}
              >
                <RefreshCw className={`h-4 w-4 ${isReplacing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {!compact && meal.description && (
            <p className="text-sm text-[#8A8A8A] mt-2">{meal.description}</p>
          )}
          
          {/* Show rationales if available - limit to 2 */}
          {!compact && meal.rationales && meal.rationales.length > 0 && (
            <div className="mt-3 bg-teal-50 rounded-md p-3">
              <h4 className="text-xs font-semibold text-[#21706D] mb-1.5">Why This Meal Fits Your Family:</h4>
              <ul className="list-disc pl-4 space-y-1">
                {meal.rationales.slice(0, 2).map((rationale, index) => (
                  <li key={index} className="text-xs text-gray-700">{rationale}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-3 flex flex-col md:flex-row justify-between gap-2">
            <div className="text-sm text-[#212121] flex items-center">
              <Utensils className="h-4 w-4 mr-1 text-[#21706D]" />
              <span>Serves {meal.servings || 4}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="link" 
                size="sm" 
                className="text-[#21706D] hover:text-[#195957] text-sm font-medium p-0 flex items-center"
                onClick={handleViewRecipe}
              >
                <FileText className="h-4 w-4 mr-1" /> View Recipe
              </Button>
              <Button 
                variant="link" 
                size="sm" 
                className="text-[#21706D] hover:text-[#195957] text-sm font-medium p-0 flex items-center"
                onClick={handleAddToGroceryList}
              >
                <ShoppingCart className="h-4 w-4 mr-1" /> Add to Grocery List
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Recipe Detail Dialog */}
      <RecipeDetail 
        meal={meal} 
        isOpen={isRecipeOpen} 
        onClose={() => setIsRecipeOpen(false)} 
      />
    </>
  );
}
