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
}

export default function RecipeDetail({ meal, isOpen, onClose }: RecipeDetailProps) {
  const [activeTab, setActiveTab] = useState("ingredients");

  // Format the ingredients into a list with checkboxes
  const ingredientsList = meal.ingredients || meal.mainIngredients || [];

  // Create a simple list of recipe steps if instructions aren't available
  const instructions = meal.instructions || [
    `Prepare the ${meal.name}.`,
    `Cook according to your preference.`,
    `Serve and enjoy!`
  ];

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