import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, RefreshCw, Utensils } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Using inline type definition to ensure rationales is included
interface Meal {
  id: string;
  name: string;
  description?: string;
  categories?: string[];
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
  const [isReplacing, setIsReplacing] = useState(false);
  
  // Images for meal categories
  const categoryImages: { [key: string]: string } = {
    "quick": "https://images.unsplash.com/photo-1605851868183-7a4de52117fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
    "vegetarian": "https://images.unsplash.com/photo-1600803907087-f56d462fd26b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
    "slowCooker": "https://images.unsplash.com/photo-1591001889567-c0a790e8fb06?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
    "instantPot": "https://images.unsplash.com/photo-1590301157890-4810ed352733?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
    "mexican": "https://images.unsplash.com/photo-1599020792689-9fde458e7e1f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
    "default": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
  };
  
  const getMealImage = () => {
    if (meal.imageUrl) return meal.imageUrl;
    
    // Check if we can match a category to an image
    const matchedCategory = Object.keys(categoryImages).find(category => 
      meal.categories?.includes(category)
    );
    
    return matchedCategory ? categoryImages[matchedCategory] : categoryImages.default;
  };

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

  return (
    <Card className="border border-[#E2E2E2] overflow-hidden bg-[#F9F9F9] hover:shadow-md transition-all">
      <div className={`flex flex-col ${!compact ? 'md:flex-row' : ''}`}>
        <div 
          className={`w-full ${!compact ? 'md:w-1/4 h-32 md:h-auto' : 'h-24'} bg-cover bg-center`} 
          style={{ backgroundImage: `url('${getMealImage()}')` }}
        />
        <div className="p-4 w-full">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{meal.name}</h3>
              <div className="flex mt-1 space-x-2 flex-wrap">
                {meal.categories?.map((category, index) => (
                  <Badge 
                    key={index} 
                    className={`bg-opacity-10 ${index % 2 === 0 ? 'bg-[#21706D] text-[#21706D]' : 'bg-[#F25C05] text-[#F25C05]'} text-xs px-2 py-1 rounded-full`}
                  >
                    {category}
                  </Badge>
                ))}
                {meal.prepTime && (
                  <Badge className="bg-[#21706D] bg-opacity-10 text-[#21706D] text-xs px-2 py-1 rounded-full">
                    {meal.prepTime} min
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex space-x-1">
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
          
          {/* Show rationales if available */}
          {!compact && meal.rationales && meal.rationales.length > 0 && (
            <div className="mt-3 bg-teal-50 rounded-md p-3">
              <h4 className="text-xs font-semibold text-[#21706D] mb-1.5">Why This Meal Fits Your Family:</h4>
              <ul className="list-disc pl-4 space-y-1">
                {meal.rationales.map((rationale, index) => (
                  <li key={index} className="text-xs text-gray-700">{rationale}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-3 flex justify-between items-center">
            <div className="text-sm text-[#212121] flex items-center">
              <Utensils className="h-4 w-4 mr-1 text-[#21706D]" />
              <span>Serves {meal.servings || 4}</span>
            </div>
            <Button 
              variant="link" 
              size="sm" 
              className="text-[#21706D] hover:text-[#195957] text-sm font-medium p-0"
              onClick={handleAddToGroceryList}
            >
              Add to grocery list
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
