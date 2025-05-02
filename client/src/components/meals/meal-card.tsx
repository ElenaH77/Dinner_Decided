import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, RefreshCw, FileText } from 'lucide-react';
import RecipeDetail from './recipe-detail';

interface MealCardProps {
  meal: {
    id: string;
    name: string;
    description?: string;
    categories?: string[];
    prepTime?: number;
    servings?: number;
    imageUrl?: string;
    ingredients?: string[];
    mainIngredients?: string[];
    main_ingredients?: string[];
    mealPrepTips?: string;
    meal_prep_tips?: string;
    prepTips?: string;
    rationales?: string[];
    // Additional properties for the updated card design
    day?: string;
    dayOfWeek?: string;
    appropriateDay?: string;
    mealCategory?: string;
    category?: string;
    servingSize?: number;
    serving_size?: number;
  };
  onViewDetails?: (mealId: string) => void;
  onRemove?: (mealId: string) => void;
  onReplace?: (mealId: string) => void;
}

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

export default function MealCard({ meal, onViewDetails, onRemove, onReplace }: MealCardProps) {
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  
  // Get category and icon
  const category = meal.mealCategory || meal.category || '';
  const icon = category ? (MEAL_CATEGORY_ICONS[category] || '') : '';
  
  // Get day
  const day = meal.day || meal.dayOfWeek || meal.appropriateDay || '';
  
  // Handle different property names for servings
  const servings = meal.servings || meal.servingSize || meal.serving_size || 4;
  
  // Limit rationales to just 2 for the card
  const limitedRationales = meal.rationales && meal.rationales.length > 0 
    ? meal.rationales.slice(0, 2) 
    : [];
  
  return (
    <Card className="overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow duration-200 border-t-4 border-t-teal-primary">
      <CardHeader className="pb-2 pt-4">
        {day && (
          <div className="font-medium text-gray-500 mb-1">{day}:</div>
        )}
        
        <div className="flex justify-between items-start">
          <CardTitle className="text-2xl font-bold">{meal.name}</CardTitle>
          {icon && <Badge className="bg-[#21706D] text-white px-3 py-1 flex items-center">{icon}</Badge>}
        </div>
        
        <CardDescription className="mt-3 text-base">
          {meal.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2 flex-grow">
        <div className="flex gap-6 text-sm text-neutral-text my-4">
          {meal.prepTime && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              <span>{meal.prepTime} min</span>
            </div>
          )}
          
          {servings && (
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              <span>{servings} servings</span>
            </div>
          )}
        </div>
        
        {/* Display condensed rationales if available */}
        {limitedRationales.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-teal-primary mb-2">Why This Works For Your Family:</h3>
            <ul className="list-disc pl-5 space-y-2">
              {limitedRationales.map((rationale, index) => (
                <li key={index} className="text-sm text-gray-700">{rationale}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="grid grid-cols-2 gap-3 pt-2">
        <Button 
          variant="outline" 
          onClick={() => setRecipeDialogOpen(true)}
          className="w-full"
        >
          <FileText className="h-4 w-4 mr-2" /> 
          View Recipe
        </Button>
        
        {onReplace && (
          <Button 
            className="w-full bg-teal-primary hover:bg-teal-dark"
            onClick={() => {
              console.log('Replace button clicked for meal with ID:', meal.id);
              // Make sure we handle properly
              if (meal.id) {
                // If we have an onReplace handler, use it
                if (onReplace) {
                  onReplace(meal.id);
                } else {
                  // Direct navigation with explicit URL path to ensure ID is included properly
                  const replaceUrl = `/api/meal/replace?id=${encodeURIComponent(meal.id)}`;
                  console.log('Navigating to:', replaceUrl);
                  window.location.href = replaceUrl;
                }
              } else {
                console.error('Meal has no ID, cannot replace');
                alert('Error: Cannot replace this meal because it has no ID');
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> 
            Replace
          </Button>
        )}
      </CardFooter>
      
      {/* Recipe Detail Dialog */}
      <RecipeDetail 
        meal={meal} 
        isOpen={recipeDialogOpen} 
        onClose={() => setRecipeDialogOpen(false)} 
        onModify={(mealId, modificationRequest) => {
          // Handle meal modification via API
          console.log('Modifying meal with ID:', mealId, 'and request:', modificationRequest);
          
          // Ensure we have a valid ID
          if (mealId) {
            if (onReplace) {
              // If onReplace exists, use it as a generic handler
              onReplace(mealId);
            } else {
              // Fallback to direct URL navigation with explicit path and query parameters
              const modifyUrl = `/api/meal/modify?id=${encodeURIComponent(mealId)}&request=${encodeURIComponent(modificationRequest)}`;
              console.log('Navigating to:', modifyUrl);
              window.location.href = modifyUrl;
            }
          } else {
            console.error('Cannot modify meal: Missing meal ID');
            alert('Error: Cannot modify this meal because it has no ID');
          }
        }}
      />
    </Card>
  );
}