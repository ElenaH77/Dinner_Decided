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
import { Clock, Users, MoreVertical, Trash2, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  };
  onViewDetails?: (mealId: string) => void;
  onRemove?: (mealId: string) => void;
  onReplace?: (mealId: string) => void;
}

export default function MealCard({ meal, onViewDetails, onRemove, onReplace }: MealCardProps) {
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
        <div className="flex gap-4 text-sm text-neutral-text">
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
      </CardContent>
      
      {onViewDetails && (
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => onViewDetails(meal.id)}
            className="w-full"
          >
            View Details
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}