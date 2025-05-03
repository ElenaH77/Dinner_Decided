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
  const { removeMeal, refetchMealPlan } = useMealPlan();
  const [isReplacing, setIsReplacing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [isModified, setIsModified] = useState(false);
  
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
    setIsModified(true);
    try {
      const response = await apiRequest("POST", `/api/meal-plan/replace-meal/${meal.id}`, {});
      
      if (!response.ok) {
        throw new Error(`Failed to replace meal: ${response.status}`);
      }
      
      // Get the updated meal data
      const replacedMeal = await response.json();
      console.log("Received replacement meal:", replacedMeal);
      
      // Update both the query cache and the context data
      await queryClient.invalidateQueries({ queryKey: ['/api/meal-plan/current'] });
      
      // Force a full refresh of the meal plan to ensure all components have the latest data
      if (refetchMealPlan) {
        try {
          await refetchMealPlan(); // This will update the context with fresh data
        } catch (refetchError) {
          console.error("Error refetching meal plan:", refetchError);
          // Continue even if refetch fails - we'll still show success message
        }
      }
      
      // Additional refresh step - fetch directly to bypass any caching layers
      try {
        await fetch(`/api/meal-plan/current?_=${Date.now()}`);
      } catch (fetchError) {
        console.error("Error direct fetching meal plan:", fetchError);
      }
      
      toast({
        title: "Meal replaced",
        description: "Your meal has been updated with a new suggestion."
      });
    } catch (error) {
      console.error("Error replacing meal:", error);
      toast({
        title: "Error",
        description: typeof error === 'string' ? error : "Failed to replace meal",
        variant: "destructive"
      });
    } finally {
      setIsReplacing(false);
      setIsModified(false);
    }
  };

  const handleRemoveMeal = async () => {
    try {
      setIsRemoving(true);
      setIsModified(true);
      console.log("Before removal - active meal ID:", meal.id);
      
      // Create a local ID if none exists
      const mealId = meal.id || `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // First update the UI via context for immediate feedback
      removeMeal(mealId);
      
      // Then persist to the server
      // Get current plan data from the query cache
      const currentPlan = queryClient.getQueryData(['/api/meal-plan/current']);
      
      // Create an updated plan with the meal filtered out
      const updatedPlan = {
        ...currentPlan,
        meals: currentPlan?.meals?.filter((m: any) => m.id !== mealId) || []
      };
      
      // Send the complete updated plan to the server
      const response = await apiRequest("PATCH", "/api/meal-plan/current", {
        updatedPlanData: updatedPlan
      });
      
      // Make sure the query cache is updated
      if (response.ok) {
        // Update both the query cache and the context data
        await queryClient.invalidateQueries({ queryKey: ["/api/meal-plan/current"] });
        await refetchMealPlan(); // Ensure context has fresh data
        
        // Show confirmation
        toast({
          title: "Meal removed",
          description: "The meal has been removed from your plan."
        });
        
        console.log("Meal was removed with ID:", mealId);
      } else {
        // If server update failed, show error and refresh data
        const errorData = await response.json();
        console.error("Server error removing meal:", errorData);
        
        toast({
          title: "Error",
          description: "Something went wrong on the server. Refreshing data.",
          variant: "destructive"
        });
        
        // Force refresh from server
        await queryClient.invalidateQueries({ queryKey: ["/api/meal-plan/current"] });
        await refetchMealPlan();
      }
    } catch (error) {
      console.error("Error in handleRemoveMeal:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
      
      // Force refresh from server on error
      await queryClient.invalidateQueries({ queryKey: ["/api/meal-plan/current"] });
      await refetchMealPlan();
    } finally {
      setIsRemoving(false);
      setIsModified(false);
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
      <Card className="border border-[#E2E2E2] overflow-hidden bg-[#F9F9F9] hover:shadow-md transition-all max-h-[550px]">
        <div className="p-4 w-full">
          {/* Category Badge at the top */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-wrap gap-2">
              {primaryCategory && (
                <Badge className="bg-[#21706D] text-white px-3 py-1 flex items-center gap-1">
                  {categoryIcon && <span>{categoryIcon}</span>}
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
