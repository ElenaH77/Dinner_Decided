import { useState } from "react";
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
import { Clock, Users, ChefHat, MessageSquare, Check } from "lucide-react";

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
}

interface RecipeDetailProps {
  meal: Meal;
  isOpen: boolean;
  onClose: () => void;
  onModify?: (mealId: string, modification: string) => void;
}

export default function RecipeDetail({ meal, isOpen, onClose, onModify }: RecipeDetailProps) {
  const [activeTab, setActiveTab] = useState("ingredients");

  // Track when the modal is opened to force re-processing of data
  const [openTimestamp, setOpenTimestamp] = useState<number>(Date.now());
  
  // When the dialog opens, update the timestamp to force re-processing
  useEffect(() => {
    if (isOpen) {
      setOpenTimestamp(Date.now());
      console.log('Recipe detail opened, processing data at:', Date.now());
    }
  }, [isOpen]);

  // Format the ingredients into a list with checkboxes
  // Handle both string arrays and object arrays with item/quantity properties
  const processIngredients = () => {
    const rawIngredients = meal.ingredients || meal.mainIngredients || [];
    const result: string[] = [];
    
    try {
      // Log raw data for debugging
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
  
  // Process ingredients when the component renders or meal changes
  const ingredientsList = processIngredients();

  // Handle instructions which could be a string array or a string or object format
  let instructions;
  
  if (meal.instructions) {
    // If instructions exist, process them
    if (Array.isArray(meal.instructions)) {
      // If it's already an array, use it directly
      instructions = meal.instructions;
    } else if (typeof meal.instructions === 'string') {
      // If it's a string, split by newlines or periods to create steps
      instructions = meal.instructions
        .split(/\n|\. /)
        .filter(step => step.trim().length > 0)
        .map(step => step.trim().endsWith('.') ? step.trim() : `${step.trim()}.`);
    } else if (typeof meal.instructions === 'object' && meal.instructions !== null) {
      // If it's an object, extract steps
      const steps = [];
      Object.entries(meal.instructions).forEach(([key, value]) => {
        if (key.includes('step') && typeof value === 'string') {
          steps.push(value);
        }
      });
      instructions = steps.length > 0 ? steps : [`Prepare the ${meal.name}.`];
    }
  }
  
  // If we couldn't extract instructions or none were provided, use defaults
  if (!instructions || instructions.length === 0) {
    instructions = [
      `1. Prepare all ingredients for ${meal.name}.`,
      `2. Cook according to your preference and family's tastes.`,
      `3. Serve hot and enjoy!`
    ];
  }
  
  console.log('Processed instructions:', instructions);

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
              <ol className="space-y-3 list-decimal ml-4">
                {instructions.map((step, index) => (
                  <li key={index} className="text-sm">{step}</li>
                ))}
              </ol>
              
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

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}