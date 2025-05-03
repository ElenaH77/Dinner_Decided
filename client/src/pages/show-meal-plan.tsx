import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCcw, Edit, ShoppingCart, FileText } from 'lucide-react';
import { modifyMeal, replaceMeal } from '@/lib/meal-ai';

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

import { useMealPlan } from '@/contexts/meal-plan-context';

// Enhanced MealCard component with modification capabilities
const MealCard = ({ 
  meal, 
  onUpdate, 
  mealPlanId,
  currentMeals 
}: { 
  meal: any, 
  onUpdate?: (updatedMeal: any) => void, 
  mealPlanId?: number,
  currentMeals?: any[] 
}) => {
  // Access the meal plan context for better state management
  const { updateMeal: updateMealInContext, refreshUI } = useMealPlan();
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
      console.log(`[MealCard] Modifying meal ${meal.id} with request: ${modificationRequest}`);
      
      // Use OpenAI to modify the meal with the user's request
      // Pass the meal plan ID and current meals for grocery list updates
      const updatedMeal = await modifyMeal(
        meal, 
        modificationRequest, 
        mealPlanId,
        currentMeals // Pass the current meals array
      );
      
      console.log(`[MealCard] Received modified meal:`, updatedMeal);
      
      // Update the meal plan in both local component state and context
      if (onUpdate) {
        onUpdate(updatedMeal);
      }
      
      // Also update in the global context if available
      if (updateMealInContext) {
        try {
          updateMealInContext(meal.id, updatedMeal);
          console.log(`[MealCard] Updated meal in context successfully`);
          
          // Force UI refresh to ensure changes are reflected
          setTimeout(() => refreshUI?.(), 100);
        } catch (contextError) {
          console.error("Error updating meal in context:", contextError);
        }
      }
      
      toast({
        title: "Meal updated",
        description: "Your modifications have been applied successfully.",
      });
      
      setModifyDialogOpen(false);
      setModificationRequest('');
      setLoading(false);
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
      // Use OpenAI to generate a completely new meal
      // Pass the meal plan ID and current meals for grocery list updates
      const replacementMeal = await replaceMeal(
        meal, 
        mealPlanId,
        currentMeals // Pass the current meals array
      );
      
      // Update the meal plan
      if (onUpdate) {
        onUpdate(replacementMeal);
      }
      
      toast({
        title: "Meal replaced",
        description: "A new meal option has been generated for you.",
      });
      
      setReplaceDialogOpen(false);
      setLoading(false);
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
          {/* Check for both camelCase and snake_case property names */}
          {(meal.mainIngredients || meal.main_ingredients || meal.ingredients) && (
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="font-medium text-[#21706D] mb-2">Ingredients:</h4>
              <ul className="list-disc pl-5 space-y-1">
                {(meal.mainIngredients || meal.main_ingredients || meal.ingredients || []).map((ingredient: string, i: number) => (
                  <li key={i} className="text-sm">{ingredient}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Check for both camelCase and snake_case property names */}
          {(meal.mealPrepTips || meal.meal_prep_tips || meal.prepTips) && (
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="font-medium text-[#F25C05] mb-2">Prep Tips:</h4>
              <p className="text-sm">{meal.mealPrepTips || meal.meal_prep_tips || meal.prepTips}</p>
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
    // Import and use the centralized storage service
    import('@/lib/storage-service').then(({ loadMealPlan }) => {
      setLoading(true);
      loadMealPlan().then(result => {
        if (result.success && result.data) {
          const planData = result.data;
          console.log(`Found meal plan from ${result.source}:`, planData);
          
          if (planData?.meals?.length > 0) {
            setMealPlan(planData);
            toast({
              title: "Plan loaded",
              description: `Found meal plan with ${planData.meals.length} meals`
            });
          } else {
            toast({
              title: "Invalid meal plan",
              description: "The meal plan doesn't contain any meals",
              variant: "destructive"
            });
          }
        } else {
          console.error("Error loading meal plan:", result.error);
          toast({
            title: "No meal plan found",
            description: result.error || "Could not find a meal plan in storage",
            variant: "destructive"
          });
        }
        setLoading(false);
      }).catch(error => {
        console.error("Error loading meal plan from storage service:", error);
        toast({
          title: "Error",
          description: "Failed to load meal plan from storage",
          variant: "destructive"
        });
        setLoading(false);
      });
    }).catch(error => {
      console.error("Error importing storage service:", error);
      setLoading(false);
    });
  }, []);

  // Button handler to re-attempt loading
  const handleReload = () => {
    window.location.reload();
  };
  
  // Handle meal update (for modifications or replacements)
  const handleMealUpdate = (updatedMeal: any, index: number) => {
    if (!mealPlan || !mealPlan.meals) return;
    
    // Import the storage service methods dynamically
    import('@/lib/storage-service').then(({ deepClone, updateMealInPlan, saveMealPlan }) => {
      // Create a deep copy of the meal plan
      const updatedPlan = deepClone({
        ...mealPlan,
        meals: [...mealPlan.meals]
      });
      
      // Create a deep clone of the updated meal
      const clonedMeal = deepClone(updatedMeal);
      
      // Update the specific meal
      updatedPlan.meals[index] = clonedMeal;
      
      console.log("Updating meal plan with modified meal:", clonedMeal.name);
      
      // Update state
      setMealPlan(updatedPlan);
      
      // Save to storage service
      saveMealPlan(updatedPlan).then(result => {
        if (result.success) {
          console.log("Successfully saved updated meal plan");
          toast({
            title: "Meal updated", 
            description: `Successfully updated ${clonedMeal.name}`
          });
        } else {
          console.error("Failed to save meal plan update:", result.error);
          toast({
            title: "Update Warning",
            description: "Changes saved locally but sync may be incomplete",
            variant: "warning"
          });
        }
      });
      
      // Also ensure the specific meal is updated correctly
      if (mealPlan.id && clonedMeal.id) {
        updateMealInPlan(mealPlan.id, clonedMeal.id, clonedMeal).catch(error => {
          console.error("Error updating individual meal:", error);
        });
      }
    }).catch(error => {
      console.error("Error importing storage service for meal update:", error);
      toast({
        title: "Update Error",
        description: "There was a problem updating the meal",
        variant: "destructive"
      });
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
      {/* Fixed Action Buttons - Always Visible */}
      <div className="sticky top-4 z-10 mb-6 flex justify-center">
        <div className="bg-white rounded-full shadow-md px-4 py-2 flex gap-3">
          <Button
            onClick={() => {
              window.location.href = '/grocery';
            }}
            className="bg-teal-primary hover:bg-teal-dark text-white"
            size="sm"
          >
            <ShoppingCart className="w-4 h-4 mr-2" /> Generate Grocery List
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              window.location.href = '/meal-plan';
            }}
            size="sm"
          >
            <FileText className="w-4 h-4 mr-2" /> Back to Meal Plan
          </Button>
        </div>
      </div>
      
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
                  mealPlanId={mealPlan.id}
                  currentMeals={mealPlan.meals} // Pass all current meals
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