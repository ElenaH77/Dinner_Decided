import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, ChefHat, MessageSquare, Check, RefreshCw, Edit } from "lucide-react";
// Removed fixRecipeInstructions import as we're using OpenAI directly
import { validateRecipeInstructions } from "@shared/recipe-validation";
import { useMealPlan } from "@/contexts/meal-plan-context";

interface Meal {
  id: string;
  name: string;
  description?: string;
  categories?: string[];
  category?: string;
  prepTime?: number;
  servings?: number;
  ingredients?: string[];
  mainIngredients?: string[];
  instructions?: string[];
  mealPrepTips?: string;
  dietaryInfo?: string;
  rationales?: string[];
  _needsRegeneration?: boolean;
  _qualityIssues?: string[];
  regenerationNotes?: string;
}

interface RecipeDetailProps {
  meal: Meal;
  isOpen: boolean;
  onClose: () => void;
  onModify?: (mealId: string, modification: string) => void;
}

export default function RecipeDetail({ meal, isOpen, onClose, onModify }: RecipeDetailProps) {
  const [activeTab, setActiveTab] = useState("ingredients");
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Get regenerate function from meal plan context
  const { regenerateMealInstructions, isRegeneratingMeal } = useMealPlan();

  // Track when the modal is opened to force re-processing of data
  const [openTimestamp, setOpenTimestamp] = useState<number>(Date.now());
  
  // When the dialog opens, update the timestamp to force re-processing
  useEffect(() => {
    if (isOpen) {
      setOpenTimestamp(Date.now());
      console.log('Recipe detail opened, processing data at:', Date.now());
    }
  }, [isOpen]);
  
  // Handle regeneration of instructions for this specific meal
  const handleRegenerateInstructions = async () => {
    if (!meal.id) return;
    
    setIsRegenerating(true);
    try {
      console.log(`Requesting regeneration for meal: ${meal.name} (${meal.id})`);
      const success = await regenerateMealInstructions(meal.id);
      
      if (success) {
        console.log(`Successfully regenerated instructions for ${meal.name}`);
      } else {
        console.error(`Failed to regenerate instructions for ${meal.name}`);
      }
    } catch (error) {
      console.error("Error regenerating instructions:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Format the ingredients into a list with checkboxes
  // Handle both string arrays and object arrays with item/quantity properties
  const processIngredients = () => {
    // Use the improved meal instead of the original
    const mealToProcess = improvedMeal || meal;
    
    // Use main ingredients first if available, then fall back to regular ingredients
    // This ensures modified meals with mainIngredients will show the updated ingredients
    const rawIngredients = mealToProcess.mainIngredients || mealToProcess.ingredients || [];
    const result: string[] = [];
    
    try {
      // Log raw data for debugging
      console.log('Meal object:', JSON.stringify(mealToProcess));
      console.log('Raw Ingredients:', JSON.stringify(rawIngredients));
      
      // Check if it's an array first
      if (Array.isArray(rawIngredients)) {
        rawIngredients.forEach((ingredient) => {
          if (typeof ingredient === 'string') {
            // If it's a string, just add it
            result.push(ingredient);
          } else if (ingredient && typeof ingredient === 'object') {
            // If it's an object with item/quantity properties
            if (ingredient.item && typeof ingredient.item === 'string') {
              const item = ingredient.item;
              const quantity = ingredient.quantity ? String(ingredient.quantity) : '';
              result.push(quantity ? `${quantity} ${item}` : item);
            } else {
              // For other object formats, try to make a readable string
              try {
                const ingredientStr = JSON.stringify(ingredient)
                  .replace(/[{}"\']/g, '') // Remove braces, quotes
                  .replace(/,/g, ', ') // Add spacing after commas
                  .replace(/:/g, ': '); // Add spacing after colons
                result.push(ingredientStr);
              } catch (e) {
                // Fallback if JSON stringify fails
                result.push('Ingredient data unavailable');
              }
            }
          } else if (ingredient !== null && ingredient !== undefined) {
            // For any other non-null value, convert to string
            result.push(String(ingredient));
          }
        });
      } else if (typeof rawIngredients === 'object' && rawIngredients !== null) {
        // If ingredients is an object (not an array), extract its values
        Object.entries(rawIngredients).forEach(([key, value]) => {
          if (typeof value === 'string') {
            result.push(value);
          } else if (value && typeof value === 'object') {
            // Try to make a reasonable string from the object
            try {
              const valueStr = JSON.stringify(value)
                .replace(/[{}"\']/g, '')
                .replace(/,/g, ', ')
                .replace(/:/g, ': ');
              result.push(`${key}: ${valueStr}`);
            } catch (e) {
              result.push(`${key}: [Object]`);
            }
          } else if (value !== null && value !== undefined) {
            result.push(`${key}: ${String(value)}`);
          }
        });
      }
      
      console.log('Processed ingredients:', result);
      return result;
    } catch (error) {
      console.error('Error processing ingredients:', error);
      // Return an empty array or some fallback in case of error
      return ['Ingredients unavailable. Please check recipe details.'];
    }
  };
  
  // Always use the meal as is from the meal plan context - all improvements are in the meal object already
  const improvedMeal = useMemo(() => {
    // Log the exact meal object we received for debugging
    console.log('[RECIPE DETAIL] Received meal object:', JSON.stringify(meal));
    
    // Special debug check for instructions
    if (meal.instructions && Array.isArray(meal.instructions)) {
      console.log('[RECIPE DETAIL] Showing instructions from meal object: First 3 of', meal.instructions.length, 
        'instructions:', meal.instructions.slice(0, 3));
    }
    
    if (meal.directions && Array.isArray(meal.directions)) {
      console.log('[RECIPE DETAIL] Directions field exists with', meal.directions.length, 'items');
    }
    
    // Log validation status for diagnostics
    if (meal.instructions && Array.isArray(meal.instructions)) {
      const validationResult = validateRecipeInstructions(meal.instructions);
      
      // Log validation details
      console.log('[RECIPE DETAIL] Recipe validation for:', meal.name, {
        isValid: validationResult.isValid,
        issuesCount: validationResult.issues.length,
        instructionsCount: meal.instructions.length,
        needsRegeneration: meal._needsRegeneration
      });
      
      if (!validationResult.isValid) {
        console.log('[RECIPE DETAIL] Validation issues:', validationResult.issues);
      }
    } else {
      // Important debugging info if instructions are missing
      console.log('[RECIPE DETAIL] Missing or invalid instructions for:', meal.name, {
        instructionsType: typeof meal.instructions,
        hasInstructions: !!meal.instructions,
        directionsType: typeof meal.directions, 
        hasDirections: !!meal.directions
      });
    }
    
    // Always use the original meal - improvements happen at the meal plan level
    return meal;
  }, [meal, openTimestamp]);

  // Just log the raw instructions for debugging
  console.log('[RECIPE DETAIL] Raw Instructions:', JSON.stringify(meal.instructions || []));
  
  // If directions exist but instructions don't, copy directions to instructions
  if ((!meal.instructions || !Array.isArray(meal.instructions) || meal.instructions.length === 0) && 
      meal.directions && Array.isArray(meal.directions) && meal.directions.length > 0) {
    console.log('[RECIPE DETAIL] Using directions field as fallback');
    meal.instructions = meal.directions;
  }
  
  // Process ingredients when the component renders or meal changes
  const ingredientsList = processIngredients();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{meal.name}</DialogTitle>
          <DialogDescription className="flex flex-wrap gap-4 items-center mt-2">
            {meal.prepTime && (
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-1 text-[#21706D]" />
                <span>{meal.prepTime} minutes</span>
              </div>
            )}
            {meal.servings && (
              <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-1 text-[#21706D]" />
                <span>Serves {meal.servings}</span>
              </div>
            )}
            {meal.category && (
              <div className="flex items-center text-sm">
                <ChefHat className="h-4 w-4 mr-1 text-[#21706D]" />
                <span>{meal.category}</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ingredients" className="flex-1 overflow-hidden flex flex-col" 
              value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 pr-4">
            <TabsContent value="ingredients" className="mt-4">
              {meal.description && (
                <p className="text-sm text-muted-foreground mb-4">{meal.description}</p>
              )}
              
              <h3 className="font-medium text-base mb-2">Ingredients:</h3>
              <ul className="space-y-2">
                {ingredientsList.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="flex-shrink-0 h-6 w-6 border border-[#21706D] rounded-md text-[#21706D] flex items-center justify-center hover:bg-[#21706D] hover:text-white transition-colors cursor-pointer">
                      <Check className="h-4 w-4" />
                    </div>
                    <span className="text-sm">{ingredient}</span>
                  </li>
                ))}
              </ul>
              
              {/* Show dietary info if available */}
              {meal.dietaryInfo && (
                <div className="mt-4">
                  <h3 className="font-medium text-base mb-2">Dietary Information:</h3>
                  <p className="text-sm text-muted-foreground">{meal.dietaryInfo}</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="instructions" className="mt-4">
              <h3 className="font-medium text-base mb-2">Cooking Instructions:</h3>
              
              {/* Ultra simple rendering - just show the instructions if they exist */}
              {Array.isArray(meal.instructions) && meal.instructions.length > 0 ? (
                <ol className="space-y-3 list-decimal ml-4">
                  {meal.instructions.map((step, i) => (
                    <li key={i} className="text-sm">{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="instructions-fallback mb-4" style={{ color: "#666", fontStyle: "italic" }}>
                  Instructions not available. Try regenerating this recipe.
                </p>
              )}
              
              {/* Regenerate Instructions Button */}
              <div className="mt-4">
                <Button 
                  onClick={handleRegenerateInstructions}
                  disabled={isRegenerating || isRegeneratingMeal(meal.id)}
                  variant="outline"
                  className="w-full text-[#21706D] border-[#21706D] hover:bg-[#21706D]/10"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${(isRegenerating || isRegeneratingMeal(meal.id)) ? 'animate-spin' : ''}`} />
                  {isRegenerating || isRegeneratingMeal(meal.id) 
                    ? 'Regenerating Instructions...' 
                    : 'Regenerate Cooking Instructions'}
                </Button>
              </div>
              
              {/* Show meal prep tips if available */}
              {meal.mealPrepTips && (
                <div className="mt-4 bg-[#F9F9F9] p-3 rounded-md border border-[#E2E2E2]">
                  <h3 className="font-medium text-sm mb-1 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-1 text-[#21706D]" />
                    Meal Prep Tips:
                  </h3>
                  <p className="text-sm text-muted-foreground">{meal.mealPrepTips}</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="pt-4 flex flex-wrap gap-2 justify-end">
          {onModify && (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (onModify && meal.id) {
                    // Force a timestamp update to ensure state is fresh when dialog reopens
                    setOpenTimestamp(Date.now());
                    onModify(meal.id, 'replace');
                    onClose();
                  }
                }}
                className="bg-white hover:bg-gray-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Replace Meal
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  const userModification = prompt('How would you like to modify this meal? (e.g., "Make it vegetarian", "Add more protein", etc.)');
                  if (userModification && onModify && meal.id) {
                    // Force a timestamp update to ensure state is fresh when dialog reopens
                    setOpenTimestamp(Date.now());
                    onModify(meal.id, userModification);
                    onClose();
                  }
                }}
                className="bg-white hover:bg-gray-100"
              >
                <Edit className="h-4 w-4 mr-2" />
                Modify Meal
              </Button>
            </>
          )}
          
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}