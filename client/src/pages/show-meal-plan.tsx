import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCcw, Edit } from 'lucide-react';

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

// Enhanced MealCard component with modification capabilities
const MealCard = ({ meal, onUpdate }: { meal: any, onUpdate?: (updatedMeal: any) => void }) => {
  const day = meal.day || meal.dayOfWeek || meal.appropriateDay || '';
  const category = meal.mealCategory || meal.category || '';
  const icon = MEAL_CATEGORY_ICONS[category] || '';
  
  // Dialog states
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [modificationRequest, setModificationRequest] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Handle modify meal request
  const handleModifyMeal = async () => {
    if (!modificationRequest.trim()) {
      toast({
        title: "Modification needed",
        description: "Please describe the changes you'd like to make.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // In a production app, this would make an API call to modify the meal
      // using OpenAI with the modification request
      
      // Simple mock for now - in a real implementation we'd call the API
      setTimeout(() => {
        const updatedMeal = {
          ...meal,
          modifiedFrom: meal.name,
          modificationRequest
        };
        
        if (onUpdate) {
          onUpdate(updatedMeal);
        }
        
        toast({
          title: "Meal updated",
          description: "Your modifications have been applied successfully.",
        });
        
        setModifyDialogOpen(false);
        setModificationRequest('');
        setLoading(false);
      }, 1500);
      
    } catch (error) {
      console.error("Error modifying meal:", error);
      toast({
        title: "Modification failed",
        description: "There was an error processing your request. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };
  
  // Handle replace meal request
  const handleReplaceMeal = async () => {
    setLoading(true);
    
    try {
      // In a production app, this would make an API call to replace the meal
      // using similar criteria but generating a new option
      
      // Simple mock for now - in a real implementation we'd call the API
      setTimeout(() => {
        const replacementMeal = {
          ...meal,
          name: `Alternative to ${meal.name}`,
          description: `This is a replacement option similar to ${meal.name} but with different ingredients or preparation methods.`,
          isReplacement: true
        };
        
        if (onUpdate) {
          onUpdate(replacementMeal);
        }
        
        toast({
          title: "Meal replaced",
          description: "A new meal option has been generated for you.",
        });
        
        setReplaceDialogOpen(false);
        setLoading(false);
      }, 1500);
      
    } catch (error) {
      console.error("Error replacing meal:", error);
      toast({
        title: "Replacement failed",
        description: "There was an error generating a new meal. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };
  
  return (
    <Card className="mb-6 border border-gray-200 overflow-hidden">
      <div className="bg-[#21706D] px-4 py-2 flex items-center justify-between">
        <div className="text-white">
          {day && <span className="font-medium text-white">{day}: </span>}
          <span className="font-bold text-white">{meal.name}</span>
        </div>
        {icon && <span className="text-xl text-white">{icon}</span>}
      </div>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium text-gray-700 flex items-center">
            {icon && <span className="mr-1">{icon}</span>}
            <span>{category}</span>
          </div>
          <div className="text-sm text-gray-600">
            Prep Time: {meal.prepTime} min
          </div>
        </div>
        
        <p className="text-gray-700 mb-4">{meal.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meal.mainIngredients && meal.mainIngredients.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="font-medium text-[#21706D] mb-2">Ingredients:</h4>
              <ul className="list-disc pl-5 space-y-1">
                {meal.mainIngredients.map((ingredient: string, i: number) => (
                  <li key={i} className="text-sm">{ingredient}</li>
                ))}
              </ul>
            </div>
          )}
          
          {meal.mealPrepTips && (
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="font-medium text-[#F25C05] mb-2">Prep Tips:</h4>
              <p className="text-sm">{meal.mealPrepTips}</p>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="bg-gray-50 px-5 py-3 flex justify-end gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex items-center gap-1"
          onClick={() => setModifyDialogOpen(true)}
        >
          <Edit size={16} /> Modify
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex items-center gap-1"
          onClick={() => setReplaceDialogOpen(true)}
        >
          <RefreshCcw size={16} /> Replace
        </Button>
      </CardFooter>
      
      {/* Modify Meal Dialog */}
      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modify this meal</DialogTitle>
            <DialogDescription>
              Describe the changes you'd like to make to this meal. For example, ingredient substitutions or preparation alterations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="e.g., 'Use soft tacos instead of taco shells' or 'I have ground beef in my freezer, can I add that to the chili?'"
              value={modificationRequest}
              onChange={(e) => setModificationRequest(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setModifyDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleModifyMeal}
              disabled={loading}
              className="relative"
            >
              {loading ? (
                <>
                  <span className="opacity-0">Modify Meal</span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  </span>
                </>
              ) : (
                "Modify Meal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Replace Meal Dialog */}
      <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace this meal</DialogTitle>
            <DialogDescription>
              Generate a completely new meal using the same requirements as before.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 text-center">
            <p>This will replace <strong>{meal.name}</strong> with a different meal that meets the same criteria:</p>
            <div className="mt-2 space-y-1 text-sm">
              <p>• Same meal type: {category}</p>
              <p>• Similar preparation time: ~{meal.prepTime} minutes</p>
              <p>• Still suitable for {day}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setReplaceDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReplaceMeal}
              disabled={loading}
              className="relative"
            >
              {loading ? (
                <>
                  <span className="opacity-0">Generate New Meal</span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  </span>
                </>
              ) : (
                "Generate New Meal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  
  // Handle meal update (for modifications or replacements)
  const handleMealUpdate = (updatedMeal: any, index: number) => {
    if (!mealPlan || !mealPlan.meals) return;
    
    // Create a copy of the meal plan
    const updatedPlan = {
      ...mealPlan,
      meals: [...mealPlan.meals]
    };
    
    // Update the specific meal
    updatedPlan.meals[index] = updatedMeal;
    
    // Update state and localStorage
    setMealPlan(updatedPlan);
    localStorage.setItem('current_meal_plan', JSON.stringify(updatedPlan));
    
    console.log("Updated meal plan with modified meal:", updatedMeal.name);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6" style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
        <h1 className="text-2xl font-bold mb-4">
          Your Meal Plan
        </h1>
        
        <div className="mb-4 flex flex-wrap gap-2">
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
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Home
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
                <MealCard 
                  key={meal.id || index} 
                  meal={meal} 
                  onUpdate={(updatedMeal) => handleMealUpdate(updatedMeal, index)}
                />
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