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
import { Clock, Users, Tag, ChefHat, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RecipeDetailProps {
  meal: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function RecipeDetail({ meal, isOpen, onClose }: RecipeDetailProps) {
  if (!meal) return null;

  // Handle different property name structures
  const ingredients = meal.mainIngredients || meal.main_ingredients || meal.ingredients || [];
  const prepTips = meal.mealPrepTips || meal.meal_prep_tips || meal.prepTips || '';
  const prepTime = meal.prepTime || meal.prep_time || 0;
  const servingSize = meal.servingSize || meal.serving_size || 3;
  const category = meal.mealCategory || meal.category || '';
  
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
            {ingredients.map((ingredient: string, idx: number) => (
              <li key={idx} className="text-gray-800">{ingredient}</li>
            ))}
          </ul>
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