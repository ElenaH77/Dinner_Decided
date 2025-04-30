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
import { Clock, Users, MoreVertical, Trash2, MessageSquare, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  };
  onViewDetails?: (mealId: string) => void;
  onRemove?: (mealId: string) => void;
  onReplace?: (mealId: string) => void;
}

export default function MealCard({ meal, onViewDetails, onRemove, onReplace }: MealCardProps) {
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  return (
    <Card className="overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow duration-200">
      {meal.imageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img 
            src={meal.imageUrl} 
            alt={meal.name} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{meal.name}</CardTitle>
          
          {(onRemove || onReplace) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onReplace && (
                  <DropdownMenuItem onClick={() => onReplace(meal.id)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Generate Alternative</span>
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <DropdownMenuItem 
                    onClick={() => onRemove(meal.id)}
                    className="text-red-500"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Remove Meal</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {meal.categories && meal.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {meal.categories.map((category, index) => (
              <Badge key={index} variant="secondary" className="bg-teal-light/10 text-teal-primary hover:bg-teal-light/20">
                {category}
              </Badge>
            ))}
          </div>
        )}
        
        <CardDescription className="mt-2 line-clamp-2">
          {meal.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2 flex-grow">
        <div className="flex gap-4 text-sm text-neutral-text mb-3">
          {meal.prepTime && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{meal.prepTime} min</span>
            </div>
          )}
          
          {meal.servings && (
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span>{meal.servings} servings</span>
            </div>
          )}
        </div>
        
        {/* Display personalized rationales if available */}
        {meal.rationales && meal.rationales.length > 0 && (
          <div className="mt-2">
            <h4 className="text-xs font-semibold text-teal-primary mb-1.5">Why This Meal Fits Your Family:</h4>
            <ul className="list-disc pl-4 space-y-1">
              {meal.rationales.map((rationale, index) => (
                <li key={index} className="text-xs text-gray-700">{rationale}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          variant="outline" 
          onClick={() => setRecipeDialogOpen(true)}
          className="w-full"
        >
          <FileText className="h-4 w-4 mr-2" /> 
          Full Recipe
        </Button>
      </CardFooter>
      
      {/* Recipe Detail Dialog */}
      <RecipeDetail 
        meal={meal} 
        isOpen={recipeDialogOpen} 
        onClose={() => setRecipeDialogOpen(false)} 
      />
    </Card>
  );
}