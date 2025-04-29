import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// Simple component to display meal details
const MealCard = ({ meal }: { meal: any }) => {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <h3 className="text-lg font-bold mb-2">{meal.name}</h3>
        <p className="text-gray-700 mb-2">{meal.description}</p>
        <p className="text-sm">Category: {meal.mealCategory || meal.category}</p>
        <p className="text-sm">Prep Time: {meal.prepTime} minutes</p>
        
        {meal.mainIngredients && meal.mainIngredients.length > 0 && (
          <div className="mt-3">
            <h4 className="font-medium">Ingredients:</h4>
            <ul className="list-disc pl-5">
              {meal.mainIngredients.map((ingredient: string, i: number) => (
                <li key={i} className="text-sm">{ingredient}</li>
              ))}
            </ul>
          </div>
        )}
        
        {meal.mealPrepTips && (
          <div className="mt-3">
            <h4 className="font-medium">Prep Tips:</h4>
            <p className="text-sm italic">{meal.mealPrepTips}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main component - completely standalone to bypass context issues
export default function ShowMealPlan() {
  // Local state for the meal plan
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Function to load directly from localStorage
    const loadFromStorage = () => {
      setLoading(true);
      try {
        // Try all known storage keys
        const directStored = localStorage.getItem('current_meal_plan');
        if (directStored) {
          const parsedPlan = JSON.parse(directStored);
          console.log("Found meal plan in direct storage:", parsedPlan);
          
          if (parsedPlan?.meals?.length > 0) {
            setMealPlan(parsedPlan);
            toast({
              title: "Plan loaded",
              description: `Found meal plan with ${parsedPlan.meals.length} meals in storage`
            });
            setLoading(false);
            return;
          }
        }
        
        // Try other keys
        const cachedPlan = localStorage.getItem('meal_plan_cache');
        if (cachedPlan) {
          const parsedPlan = JSON.parse(cachedPlan);
          console.log("Found meal plan in cache:", parsedPlan);
          
          if (parsedPlan?.meals?.length > 0) {
            setMealPlan(parsedPlan);
            toast({
              title: "Plan loaded from cache",
              description: `Found meal plan with ${parsedPlan.meals.length} meals`
            });
            setLoading(false);
            return;
          }
        }
        
        toast({
          title: "No meal plan found",
          description: "Could not find a meal plan in storage",
          variant: "destructive"
        });
        setLoading(false);
      } catch (error) {
        console.error("Error loading meal plan from storage:", error);
        toast({
          title: "Error",
          description: "Failed to load meal plan from storage",
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    
    // Load the meal plan on component mount
    loadFromStorage();
  }, []);

  // Button handler to re-attempt loading
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">
          Your Meal Plan
        </h1>
        
        <div className="mb-4">
          <Button 
            onClick={handleReload}
            className="mr-2"
          >
            Reload Page
          </Button>
          <Button 
            onClick={() => window.location.href = '/meal-plan'}
            variant="outline"
          >
            Go to Regular Meal Plan Page
          </Button>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-teal-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading your meal plan...</p>
          </div>
        ) : mealPlan && mealPlan.meals && mealPlan.meals.length > 0 ? (
          <div>
            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <h2 className="font-semibold mb-2">Meal Plan Details</h2>
              <p><strong>ID:</strong> {mealPlan.id}</p>
              <p><strong>Created:</strong> {new Date(mealPlan.createdAt).toLocaleString()}</p>
              <p><strong>Number of Meals:</strong> {mealPlan.meals.length}</p>
            </div>
            
            <h2 className="text-xl font-semibold mb-4">Your Meals</h2>
            <div>
              {mealPlan.meals.map((meal: any, index: number) => (
                <MealCard key={meal.id || index} meal={meal} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-md">
            <p className="mb-4">No meal plan found in storage.</p>
            <Button 
              onClick={() => window.location.href = '/meal-plan'}
              variant="default"
            >
              Create a Meal Plan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}