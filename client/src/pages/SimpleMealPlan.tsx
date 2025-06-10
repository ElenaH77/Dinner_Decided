import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, PlusCircle, Calendar, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ResetButton } from "@/components/buttons/ResetButton";
import { useMealPlan } from "@/contexts/meal-plan-context";

// Meal types with their descriptions
const MEAL_TYPES = [
  { value: "Quick & Easy", label: "Quick & Easy ⚡", description: "15-20 minutes - assembly type meals and rotisserie chicken magic" },
  { value: "Weeknight Meals", label: "Weeknight Meals 🍽️", description: "About 30-40 minutes, balanced dinners for busy evenings" },
  { value: "Batch Cooking", label: "Batch Cooking 📦", description: "Make once, eat multiple times" },
  { value: "Split Prep", label: "Split Prep ⏰", description: "Prep ahead, cook later - including crockpot meals" }
];

// Interface for EnhancedMealCard props
interface EnhancedMealCardProps {
  meal: any;
  onRemove: (id: string) => void;
  onModify: (meal: any, request: string) => void;
  onReplace: (meal: any) => void;
}

// Enhanced meal card component
const EnhancedMealCard = ({ meal, onRemove, onModify, onReplace }: EnhancedMealCardProps) => {
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);

  // Get category icon and ensure meal has a category
  let categoryIcon = '';
  
  // Make sure every meal has a category assigned
  if (!meal.category && meal.name) {
    // Try to guess category from meal name and details
    const mealNameLower = meal.name.toLowerCase();
    if (mealNameLower.includes('quick') || 
        mealNameLower.includes('easy') || 
        mealNameLower.includes('simple') || 
        (meal.prepTime && meal.prepTime <= 20)) {
      meal.category = 'Quick & Easy';
    } else if (mealNameLower.includes('batch') || 
              mealNameLower.includes('multiple') || 
              mealNameLower.includes('bulk')) {
      meal.category = 'Batch Cooking';
    } else if (mealNameLower.includes('slow cooker') || 
              mealNameLower.includes('crockpot') || 
              mealNameLower.includes('prep ahead')) {
      meal.category = 'Split Prep';
    } else {
      // Default to Weeknight if we can't determine
      meal.category = 'Weeknight Meals';
    }
  }
  
  // Assign icon based on meal category
  if (meal.category) {
    if (meal.category.includes('Quick')) categoryIcon = '⚡';
    else if (meal.category.includes('Weeknight')) categoryIcon = '🍽️';
    else if (meal.category.includes('Batch')) categoryIcon = '📦';
    else if (meal.category.includes('Split')) categoryIcon = '⏰';
  }
  
  // Ensure meal has ingredients data
  if (!meal.mainIngredients || !meal.mainIngredients.length) {
    // Create placeholder ingredients based on meal name if not available
    meal.mainIngredients = [];
    
    // Common base ingredients for most dishes
    meal.mainIngredients.push('Salt and pepper to taste');
    meal.mainIngredients.push('2 tablespoons olive oil');
    
    // Add ingredients based on dish name keywords
    if (meal.name && typeof meal.name === 'string') {
      const dishName = meal.name.toLowerCase();
      if (dishName.includes('chicken')) {
        meal.mainIngredients.push('1.5 pounds boneless chicken breast or thighs');
        meal.mainIngredients.push('1 medium onion, diced');
        meal.mainIngredients.push('2 cloves garlic, minced');
      }
      
      if (dishName.includes('pasta') || dishName.includes('spaghetti') || dishName.includes('linguine')) {
        meal.mainIngredients.push('1 pound pasta of choice');
        meal.mainIngredients.push('1/2 cup parmesan cheese, grated');
        meal.mainIngredients.push('1/4 cup fresh herbs (basil, parsley)');
      }
      
      if (dishName.includes('vegetable') || dishName.includes('veggies')) {
        meal.mainIngredients.push('1 zucchini, sliced');
        meal.mainIngredients.push('1 bell pepper, diced');
        meal.mainIngredients.push('2 cups mixed vegetables of choice');
      }
      
      if (dishName.includes('beef') || dishName.includes('steak')) {
        meal.mainIngredients.push('1.5 pounds ground beef or steak');
        meal.mainIngredients.push('1 medium onion, diced');
        meal.mainIngredients.push('2 cloves garlic, minced');
      }
      
      if (dishName.includes('rice')) {
        meal.mainIngredients.push('2 cups rice');
        meal.mainIngredients.push('4 cups broth or water');
      }
      
      if (dishName.includes('soup') || dishName.includes('stew')) {
        meal.mainIngredients.push('6 cups vegetable or chicken broth');
        meal.mainIngredients.push('1 medium onion, diced');
        meal.mainIngredients.push('2 stalks celery, chopped');
        meal.mainIngredients.push('2 carrots, chopped');
      }
      
      if (dishName.includes('taco') || dishName.includes('mexican') || dishName.includes('enchilada')) {
        meal.mainIngredients.push('8-10 corn or flour tortillas');
        meal.mainIngredients.push('1 cup shredded cheese (cheddar or Mexican blend)');
        meal.mainIngredients.push('1 can black beans or pinto beans, drained and rinsed');
      }
      
      if (dishName.includes('cheese') || dishName.includes('cheesy')) {
        meal.mainIngredients.push('2 cups shredded cheese (cheddar, mozzarella, or blend)');
      }
      
      if (dishName.includes('creamy') || dishName.includes('cream')) {
        meal.mainIngredients.push('1 cup heavy cream or milk');
      }
    }
  }
  
  // Add placeholder meal prep tips if missing
  if (!meal.mealPrepTips) {
    if (meal.category?.includes('Split Prep')) {
      meal.mealPrepTips = "Prep ingredients in the morning by chopping vegetables and measuring spices.";
    } else if (meal.category?.includes('Quick')) {
      meal.mealPrepTips = "Consider pre-chopping vegetables or using pre-cut ones to save time.";
    } else if (meal.category?.includes('Batch')) {
      meal.mealPrepTips = "Portion leftovers for future meals. Can be frozen for up to 3 months.";
    } else {
      meal.mealPrepTips = "Read the recipe before starting and prep all ingredients for smoother cooking.";
    }
  }
  
  // Do not add placeholder directions - allow OpenAI to generate high-quality instructions
  // No fallback template should be added here
  // The system will request regeneration of instructions if they're needed
  
  // Dialog states
  const [isModifyDialogOpen, setIsModifyDialogOpen] = useState(false);
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false);
  const [modifyRequest, setModifyRequest] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Handle modify meal request
  const handleModifyMealRequest = () => {
    if (!modifyRequest.trim()) {
      toast({
        title: "Empty modification",
        description: "Please describe how you'd like to modify this meal",
        variant: "destructive"
      });
      return;
    }
    
    // Call the parent component's handler with the meal and modification request
    onModify(meal, modifyRequest);
    
    // Close the dialog and reset the form
    setIsModifyDialogOpen(false);
    setModifyRequest("");
  };
  
  // Handle replace meal request
  const handleReplaceMealRequest = () => {
    // Call the parent component's handler with the meal
    onReplace(meal);
    
    // Close the dialog
    setIsReplaceDialogOpen(false);
  };
  
  // Handle add to grocery list
  const handleAddToGroceryList = async () => {
    try {
      // Make API call to add meal to grocery list
      const response = await apiRequest("POST", "/api/grocery-list/add-meal", {
        mealId: meal.id,
        meal: meal // Send complete meal data
      });
      
      if (response.ok) {
        // Invalidate grocery list cache to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/grocery-list/current"] });
        
        toast({
          title: "Added to grocery list",
          description: `${meal.name} has been added to your grocery list`
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to add to grocery list",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error adding to grocery list:", error);
      toast({
        title: "Error",
        description: "Failed to add the meal to your grocery list. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className="border border-[#E2E2E2] overflow-hidden bg-[#F9F9F9] hover:shadow-md transition-all">
      <div className="p-4 w-full">
        {/* Top section with badges */}
        <div className="flex justify-between items-start">
          <div className="flex flex-wrap gap-2 mb-2">
            {meal.category && (
              <Badge className="bg-[#21706D] text-white px-3 py-1 flex items-center gap-1">
                {categoryIcon && <span>{categoryIcon}</span>}
                <span>{meal.category}</span>
              </Badge>
            )}
            {meal.prepTime && (
              <Badge className="bg-[#F25C05] bg-opacity-80 text-white px-3 py-1">
                {meal.prepTime} min
              </Badge>
            )}
          </div>
          <button 
            onClick={() => onRemove(meal.id)}
            className="text-gray-400 hover:text-red-500 transition-colors z-10 h-8 w-8 flex items-center justify-center"
            aria-label="Remove meal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Meal title and description */}
        <h3 className="font-semibold text-lg mb-2">{meal.name}</h3>
        {meal.description && (
          <p className="text-sm text-[#8A8A8A] mb-3">{meal.description}</p>
        )}
        
        {/* Rationales section - if available */}
        {meal.rationales && meal.rationales.length > 0 ? (
          <div className="mt-2 mb-3 bg-teal-50 rounded-md p-3">
            <h4 className="text-xs font-semibold text-[#21706D] mb-1.5">Why This Meal Fits Your Family:</h4>
            <ul className="list-disc pl-4 space-y-1">
              {meal.rationales.slice(0, 2).map((rationale: string, index: number) => (
                <li key={index} className="text-xs text-gray-700">{rationale}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-2 mb-3 bg-teal-50 rounded-md p-3">
            <h4 className="text-xs font-semibold text-[#21706D] mb-1.5">Why This Meal Fits Your Family:</h4>
            <ul className="list-disc pl-4 space-y-1">
              {meal.category && meal.category.includes('Quick') && (
                <li className="text-xs text-gray-700">Quick and easy to prepare, perfect for busy weeknights.</li>
              )}
              {meal.name && meal.name.toLowerCase().includes('pot') && (
                <li className="text-xs text-gray-700">Using the Instant Pot, this dish is quick and convenient, fitting the family's cooking confidence level.</li>
              )}
              {meal.name && meal.name.toLowerCase().includes('vegetarian') && (
                <li className="text-xs text-gray-700">This meal is vegetarian, supporting the family's weekly dietary preference.</li>
              )}
            </ul>
          </div>
        )}
        
        {/* Bottom actions */}
        <div className="mt-4 space-y-3">
          {/* Primary action buttons */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button 
              variant="outline" 
              className="border-[#21706D] text-[#21706D] hover:bg-[#21706D] hover:text-white h-12 text-sm font-medium shadow-sm"
              onClick={() => setIsRecipeOpen(true)}
            >
              <FileText className="h-4 w-4 mr-2" /> 
              View Recipe
            </Button>
            <Button 
              variant="outline" 
              className="border-[#21706D] text-[#21706D] hover:bg-[#21706D] hover:text-white h-12 text-sm font-medium shadow-sm flex items-center justify-center"
              onClick={handleAddToGroceryList}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6h19l-3 10H6L3 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 21a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/>
                <path d="M19 21a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/>
              </svg>
              Add to List
            </Button>
          </div>
          
          {/* Secondary action buttons */}
          <div className="flex gap-2 justify-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-gray-500 hover:text-[#21706D] h-8"
              onClick={() => setIsModifyDialogOpen(true)}
            >
              Modify
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-gray-500 hover:text-[#21706D] h-8"
              onClick={() => setIsReplaceDialogOpen(true)}
            >
              Replace
            </Button>
          </div>
        </div>
      </div>
      
      {/* Recipe dialog */}
      {isRecipeOpen && (
        <Dialog open={isRecipeOpen} onOpenChange={setIsRecipeOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{meal.name}</DialogTitle>
              <DialogDescription>
                A delicious recipe for your family
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
              <h3 className="font-medium text-lg mb-2">Description</h3>
              <p className="text-sm text-gray-600 mb-4">{meal.description}</p>
              
              <h3 className="font-medium text-lg mb-2">Main Ingredients</h3>
              {meal.mainIngredients?.length > 0 ? (
                <ul className="list-disc pl-5 mb-4">
                  {meal.mainIngredients.map((ingredient: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600">{ingredient}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600 mb-4">Ingredient information not available</p>
              )}
              
              <h3 className="font-medium text-lg mb-2">Directions</h3>
              {/* Check for either directions or instructions array */}
              {(meal.directions?.length > 0 || meal.instructions?.length > 0) ? (
                <ol className="list-decimal pl-5 mb-4 space-y-2">
                  {/* First show instructions if available, fall back to directions if needed */}
                  {(meal.instructions?.length > 0 ? meal.instructions : meal.directions).map((step: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600">{step}</li>
                  ))}
                </ol>
              ) : (
                <div className="text-sm text-gray-600 italic mb-4">
                  <p>Instructions not available. This recipe needs to be regenerated.</p>
                </div>
              )}
              
              <h3 className="font-medium text-lg mb-2">Meal Prep Tips</h3>
              <p className="text-sm text-gray-600">{meal.mealPrepTips || "No specific meal prep tips available."}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsRecipeOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Modify Meal Dialog */}
      <Dialog open={isModifyDialogOpen} onOpenChange={setIsModifyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modify {meal.name}</DialogTitle>
            <DialogDescription>
              Describe how you'd like to change this meal
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={modifyRequest}
              onChange={(e) => setModifyRequest(e.target.value)}
              placeholder="Example: Make it vegetarian, replace chicken with tofu, add more vegetables, etc."
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsModifyDialogOpen(false);
                setModifyRequest("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleModifyMealRequest} 
              disabled={isSubmitting || !modifyRequest.trim()}
              className="bg-[#21706D] hover:bg-[#195957] relative"
            >
              {isSubmitting ? (
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
      <Dialog open={isReplaceDialogOpen} onOpenChange={setIsReplaceDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Replace {meal.name}</DialogTitle>
            <DialogDescription>
              Are you sure you want to replace this meal with a new suggestion?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">We'll use what we know about your family to suggest a different meal that still meets your needs and preferences.</p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsReplaceDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReplaceMealRequest} 
              disabled={isSubmitting}
              className="bg-[#21706D] hover:bg-[#195957] relative"
            >
              {isSubmitting ? (
                <>
                  <span className="opacity-0">Replace Meal</span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  </span>
                </>
              ) : (
                "Replace Meal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Create a module-level variable to store meals between renders and navigations
let cachedMeals: any[] = [];

export default function SimpleMealPlan() {

  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mealType, setMealType] = useState("");
  const [preferences, setPreferences] = useState("");
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [_, navigate] = useLocation();
  // Initialize from either the cached meals or empty array
  const [meals, setMeals] = useState<any[]>(() => {
    const savedMeals = localStorage.getItem('current_meals');
    const storedMeals = savedMeals ? JSON.parse(savedMeals) : [];
    
    return cachedMeals.length ? cachedMeals : storedMeals;
  });
  
  // Fetch meal plan data with cache busting
  const { data: mealPlan, isLoading, refetch } = useQuery({
    queryKey: ["/api/meal-plan/current", Date.now()], // Cache busting
    staleTime: 0, // Always refetch
    cacheTime: 0, // Don't cache
  });
  
  // Process meals when data is loaded
  useEffect(() => {
    // Log detailed information about what we received
    console.log("[DEBUG] Meal plan data received:", mealPlan);
    console.log("[DEBUG] Meal plan data type:", typeof mealPlan);
    
    // Check if we have meal plan data
    if (mealPlan) {
      // Check for meals array and log info about it
      if (mealPlan.meals) {
        console.log("[DEBUG] Meals property exists, type:", typeof mealPlan.meals);
        console.log("[DEBUG] Is array?", Array.isArray(mealPlan.meals));
        console.log("[DEBUG] Length:", Array.isArray(mealPlan.meals) ? mealPlan.meals.length : 'N/A');
      } else {
        console.log("[DEBUG] No meals property on meal plan!");
      }
      
      // Store meal plan ID in localStorage for reference
      if (mealPlan.id) {
        console.log("[DEBUG] Storing meal plan ID in localStorage:", mealPlan.id);
        localStorage.setItem('current_meal_plan_id', String(mealPlan.id));
      }
    } else {
      console.log("[DEBUG] No meal plan data received!");
    }
    
    // Check if there's a stored ID that doesn't match the current one
    // This would indicate we might be looking at stale data
    const storedMealPlanId = localStorage.getItem('current_meal_plan_id');
    if (storedMealPlanId && mealPlan && mealPlan.id !== parseInt(storedMealPlanId)) {
      console.log(`[ID MISMATCH] Meal plan ID mismatch: API returned ${mealPlan.id} but localStorage has ${storedMealPlanId}`);
      
      // Log a warning to help with debugging
      console.warn(`Meal plan ID mismatch detected. This may indicate stale data. API: ${mealPlan.id}, Stored: ${storedMealPlanId}`);
      
      // Show a diagnostic message
      toast({
        title: "Synchronizing meal plan",
        description: "Refreshing data to ensure you have the latest meals.",
      });
      
      // Force a refresh after a short delay
      setTimeout(() => {
        console.log('[ID MISMATCH] Forcing refetch to resolve ID mismatch');
        refetch();
      }, 500);
      
      // Return early - we'll process the data after the refetch
      return;
    }
    
    // Proceed with normal processing
    if (mealPlan && Array.isArray(mealPlan.meals)) {
      // Check if the meal plan is empty (after a reset)
      if (mealPlan.meals.length === 0) {
        console.log("[DEBUG] Empty meal plan detected. Ready for new meals.");
        setMeals([]);
        console.log(`Updated meals from meal plan: 0 meals`);
        return;
      }
      
      // Create deep copies of the meals to prevent reference sharing
      const processedMeals = mealPlan.meals.map((meal: any, index: number) => {
        // Ensure each meal has a valid ID
        const mealId = meal.id || `static-meal-${Date.now()}-${index}`;
        
        // Create a complete copy of the meal to prevent reference issues
        const mealCopy = JSON.parse(JSON.stringify({ ...meal, id: mealId }));
        
        return mealCopy;
      });
      
      setMeals(processedMeals);
      console.log("Updated meals from meal plan:", processedMeals.length, "meals");
      
      // Store the current meal plan ID for debug purposes
      if (mealPlan.id && processedMeals.length > 0) {
        console.log("[DEBUG] Active meal plan ID with meals:", mealPlan.id);
      }
    } else {
      // Reset the meals array if no meals are found
      setMeals([]);
      console.log("No meals found in meal plan, reset to empty array");
    }
  }, [mealPlan, refetch, toast]);
  
  // Update cached meals and localStorage whenever meals changes
  useEffect(() => {
    if (meals.length > 0) {
      cachedMeals = [...meals]; // Update the module-level cache
      localStorage.setItem('current_meals', JSON.stringify(meals)); // Also update localStorage
      console.log('Cached', meals.length, 'meals for persistence between page navigations');
    }
  }, [meals]);
  
  // Check for URL parameters to see if we just came from meal plan builder
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const fromBuilder = queryParams.get('from') === 'builder';
    
    if (fromBuilder) {
      console.log('[NAVIGATION] Detected navigation from meal plan builder, will force refresh shortly...');
      
      // Show a toast to indicate we're loading the new plan
      toast({
        title: "Loading New Meal Plan",
        description: "Fetching your freshly created meal plan...",
      });
      
      // Wait a second to ensure server has fully processed the meal plan, then refresh
      setTimeout(() => {
        console.log('[NAVIGATION] Performing delayed refresh after returning from builder');
        refetch();
      }, 1000);
      
      // Clean up the URL by removing the query parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  // Add meal handler
  const handleAddMeal = () => {
    setIsDialogOpen(true);
  };
  
  // Remove meal handler
  const handleRemoveMeal = async (mealId: string) => {
    if (!mealId) {
      console.error("Cannot remove meal with undefined ID");
      return;
    }
    
    console.log('Removing meal with ID:', mealId);
    console.log('Before removal, meals count:', meals.length);
    
    try {
      // Make a copy of the current meals before removal
      const prevMeals = [...meals];
      
      // Update local state immediately for responsive UI
      setMeals(meals.filter(meal => meal.id !== mealId));
      
      // Persist to the server
      const updatedMeals = meals.filter(meal => meal.id !== mealId).map(meal => {
        // Create a deep copy of each meal to ensure no reference issues
        return JSON.parse(JSON.stringify(meal));
      });
      
      // First make a direct API call to get the current meal plan
      // This ensures we're not relying on the cache which might be stale
      let currentPlan;
      try {
        const planResponse = await apiRequest("GET", "/api/meal-plan/current");
        if (planResponse.ok) {
          currentPlan = await planResponse.json();
        } else {
          // If API call fails, try the cache as a fallback
          currentPlan = queryClient.getQueryData(["/api/meal-plan/current"]);
        }
      } catch (err) {
        // If API call fails, try the cache as a fallback
        currentPlan = queryClient.getQueryData(["/api/meal-plan/current"]);
      }
      
      // If we still don't have a plan, create a basic one with the meals we have
      if (!currentPlan || !currentPlan.id) {
        console.error('No current meal plan found, constructing a temporary one');
        currentPlan = {
          id: 1, // Temporary ID
          name: "Weekly Meal Plan",
          householdId: 1,
          isActive: true,
          meals: prevMeals, // Use the meals we had before removal
          createdAt: new Date().toISOString()
        };
      }
      
      // Create an updated plan with the meal filtered out
      // Use deep copy to ensure no reference issues
      const updatedPlan = JSON.parse(JSON.stringify({
        ...currentPlan,
        meals: updatedMeals
      }));
      
      console.log('Sending updated plan to server with', updatedMeals.length, 'meals');
      
      // Send the complete updated plan to the server
      const response = await apiRequest("PATCH", "/api/meal-plan/current", {
        updatedPlanData: updatedPlan
      });
      
      if (response.ok) {
        // Force refresh the query cache
        await queryClient.invalidateQueries({ queryKey: ["/api/meal-plan/current"] });
        
        toast({
          title: "Meal removed",
          description: "The meal has been removed from your plan"
        });
        
        // Make a direct server request to confirm the update was applied
        const verifyResponse = await apiRequest("GET", "/api/meal-plan/current");
        if (verifyResponse.ok) {
          const verifiedPlan = await verifyResponse.json();
          console.log('Verified plan after update has', verifiedPlan.meals?.length || 0, 'meals');
        }
      } else {
        // If server update fails, revert the local change
        const errorData = await response.json();
        console.error("Failed to remove meal:", errorData);
        
        // Restore the previous meals state
        queryClient.invalidateQueries({ queryKey: ["/api/meal-plan/current"] });
        
        toast({
          title: "Error",
          description: "Failed to remove meal from your plan",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error removing meal:", error);
      
      // Revert local state and refresh from server
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plan/current"] });
      
      toast({
        title: "Error",
        description: "Something went wrong when removing the meal",
        variant: "destructive"
      });
    }
  };
  
  // Reset form state
  const resetForm = () => {
    setMealType("");
    setPreferences("");
  };
  
  // Modify meal handler
  const handleModifyMeal = async (meal: any, modifyRequest: string) => {
    try {
      console.log('[MODIFY] Starting meal modification for:', meal.id);
      
      // Get the current meal plan ID from localStorage or fallback to a safe value
      const mealPlanId = localStorage.getItem('current_meal_plan_id');
      if (!mealPlanId) {
        console.warn('[MODIFY] No meal plan ID found in localStorage - this may affect grocery list updates');
      }
      
      // Import the specific meal-ai function for modification
      const { modifyMeal } = await import('@/lib/meal-ai');
      
      // Use the current meals array for context to ensure consistency
      console.log(`[MODIFY] Modifying meal with ${meals.length} meals as context`);
      
      // Call the modifyMeal function with the current meal, modification request, and context
      const modifiedMeal = await modifyMeal(
        meal, 
        modifyRequest,
        mealPlanId ? parseInt(mealPlanId) : undefined,
        meals
      );
      
      console.log('[MODIFY] Successfully received modified meal:', modifiedMeal.name);
      
      // Update the UI immediately
      setMeals(prev => {
        // Create a deep copy to avoid reference issues
        const updatedMeals = prev.map(m => {
          if (m.id === meal.id) {
            // Replace with the modified meal while ensuring ID consistency
            const result = JSON.parse(JSON.stringify(modifiedMeal));
            result.id = meal.id; // Guarantee ID consistency
            return result;
          }
          return m;
        });
        
        return updatedMeals;
      });
      
      toast({
        title: "Meal modified",
        description: `${meal.name} has been updated to ${modifiedMeal.name}`
      });
      
      // Force refresh data from server after a short delay
      setTimeout(() => {
        console.log('[MODIFY] Refreshing data from server after modification');
        refetch();
      }, 500);
    } catch (error) {
      console.error('[MODIFY] Error during meal modification:', error);
      
      // Check for API key errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.toLowerCase().includes('api key')) {
        toast({
          title: "API Configuration Required",
          description: "OpenAI API access is needed to modify meals. Please check your API settings.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage || "Failed to modify the meal. Please try again.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Replace meal handler
  const handleReplaceMeal = async (meal: any) => {
    try {
      console.log('[REPLACE] Starting meal replacement for:', meal.id);
      
      // First try to get meal plan ID from the query data (most reliable source)
      const effectiveMealPlanId = mealPlan?.id;
      console.log('[REPLACE DEBUG] Direct meal plan ID from query data:', effectiveMealPlanId);
      
      // Fallback to localStorage if needed
      let mealPlanId = effectiveMealPlanId;
      if (!mealPlanId) {
        mealPlanId = localStorage.getItem('current_meal_plan_id');
        console.log('[REPLACE DEBUG] Fallback meal plan ID from localStorage:', mealPlanId);
        
        if (!mealPlanId) {
          console.warn('[REPLACE] No meal plan ID found - this may affect grocery list updates');
        } else {
          mealPlanId = parseInt(mealPlanId);
        }
      }
      
      // Import the replaceMeal function specifically
      const { replaceMeal } = await import('@/lib/meal-ai');
      const { saveMealPlan } = await import('@/lib/storage-service');
      
      // Use the current meals array for context to ensure consistency
      console.log(`[REPLACE] Replacing meal with ${meals.length} meals as context and plan ID:`, mealPlanId);
      
      // Call the replaceMeal function with the current meal and context
      const replacedMeal = await replaceMeal(
        meal, 
        mealPlanId,
        meals
      );
      
      console.log('[REPLACE] Successfully received replacement meal:', replacedMeal.name);
      
      // Create an updated array of meals to use both in UI and for the full plan update
      let updatedMeals: any[] = [];
      
      setMeals(prev => {
        // Create a deep copy to avoid reference issues
        updatedMeals = prev.map(m => {
          if (m.id === meal.id) {
            // Replace with the modified meal while ensuring ID consistency
            const result = JSON.parse(JSON.stringify(replacedMeal));
            result.id = meal.id; // Guarantee ID consistency
            return result;
          }
          return m;
        });
        
        return updatedMeals;
      });
      
      // Also update the full plan in the database to ensure consistency
      if (mealPlan && mealPlanId) {
        console.log('[REPLACE] Saving updated meal plan with replaced meal');
        
        // Create a full plan update
        const updatedPlan = {
          ...mealPlan,
          meals: updatedMeals,
          lastUpdated: new Date().toISOString()
        };
        
        // Save via the storage service to ensure all systems are updated
        await saveMealPlan(updatedPlan);
        
        console.log('[REPLACE] Successfully saved updated meal plan with ID:', mealPlanId);
      }
      
      toast({
        title: "Meal replaced",
        description: `${meal.name} has been replaced with ${replacedMeal.name}`
      });
      
      // Force refresh data from server after a short delay
      setTimeout(() => {
        console.log('[REPLACE] Refreshing data from server after replacement');
        refetch();
      }, 500);
    } catch (error) {
      console.error('[REPLACE] Error during meal replacement:', error);
      
      // Check for API key errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.toLowerCase().includes('api key')) {
        toast({
          title: "API Configuration Required",
          description: "OpenAI API access is needed to replace meals. Please check your API settings.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage || "Failed to replace the meal. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // Get the meal plan context functions at the component level
  const { setActiveMealPlan, setCurrentPlan } = useMealPlan();

  // Reset meal plan function using the context functions
  const resetMealPlan = async () => {
    try {
      setIsResetting(true);
      
      // Show a loading toast
      toast({
        title: "Resetting meal plan",
        description: "Clearing meal plan data..."
      });
      
      // First, get the current meal plan to get its ID
      let currentPlanId;
      try {
        const planResponse = await apiRequest("GET", "/api/meal-plan/current");
        if (planResponse.ok) {
          const currentPlan = await planResponse.json();
          currentPlanId = currentPlan.id;
          console.log('[RESET] Got current plan ID:', currentPlanId);
        }
      } catch (error) {
        console.error("Error getting current plan ID:", error);
        // Try to get from query cache as fallback
        const cachedPlan = queryClient.getQueryData(["/api/meal-plan/current"]);
        if (cachedPlan && cachedPlan.id) {
          currentPlanId = cachedPlan.id;
        }
      }
      
      if (!currentPlanId) {
        throw new Error("Could not determine meal plan ID for reset");
      }
      
      console.log(`[RESET] Resetting meal plan ${currentPlanId}`);
      
      // Call our server endpoint to reset the plan
      const response = await fetch(`/api/meal-plan/${currentPlanId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset meal plan');
      }
      
      const result = await response.json();
      console.log('[RESET] Server response:', result);
      
      if (result.success) {
        console.log('[RESET] Server reset was successful, updating client state');
        
        // 1. Update the context with an empty meal plan
        const emptyPlan = {
          ...result.plan,
          meals: [] // Ensure an empty meals array
        };
        
        // Set the current plan directly in the context with the empty plan
        setCurrentPlan(emptyPlan);
        
        // 2. Force activation of the reset meal plan using our context function
        const activateSuccess = await setActiveMealPlan(currentPlanId);
        console.log(`[RESET] Setting meal plan ${currentPlanId} as active: ${activateSuccess ? 'success' : 'failed'}`);
        
        // 3. Clear all local storage related to meal plans
        localStorage.removeItem('current_meal_plan');
        localStorage.removeItem('current_meals');
        localStorage.removeItem('current_meal_plan_id');
        
        // Clear any other potential storage related to meal plans
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.includes('meal_plan') ||
            key.includes('meals') ||
            key.includes('grocery')
          )) {
            console.log(`[RESET] Clearing additional storage key: ${key}`);
            localStorage.removeItem(key);
          }
        }
        
        console.log('[RESET] Cleared all local storage data for meal plans');
        
        // 4. Clear module-level cache
        cachedMeals = [];
        
        // 5. Clear react query cache
        queryClient.invalidateQueries({ queryKey: ["/api/meal-plan/current"] });
        
        // 6. Update meals state directly
        setMeals([]);
        
        // 7. Wait a moment before refetching to allow state updates to propagate
        setTimeout(async () => {
          console.log('[RESET] Refetching data after reset');
          await refetch();
          console.log('[RESET] Refetch complete');
        }, 500);
        
        toast({
          title: "Success",
          description: "Meal plan has been reset successfully. Generate a new plan to continue."
        });
      } else {
        throw new Error(result.message || 'Reset operation failed');
      }
    } catch (error) {
      console.error('[RESET] Error resetting meal plan:', error);
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  // Submit new meal request
  const handleSubmitMeal = async () => {
    if (!mealType) {
      toast({
        title: "Missing information",
        description: "Please select a meal type",
        variant: "destructive"
      });
      return;
    }
    
    setIsAddingMeal(true);
    
    try {
      // We'll skip the meal plan clearing since it's causing issues
      // Instead we'll just add the new meal and handle duplicates on the client side
      
      // Now add the new meal with extended timeout for OpenAI generation
      console.log('[ADD MEAL] Starting meal addition with 120s timeout...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[ADD MEAL] Request timed out after 120 seconds');
        controller.abort();
      }, 120000); // 120 second timeout for OpenAI (longer than server timeout)
      
      const addResponse = await apiRequest("/api/meal-plan/add-meal", {
        method: "POST",
        body: {
          mealType,
          preferences
        },
        signal: controller.signal
      });
      
      console.log('[ADD MEAL] Request completed successfully');
      clearTimeout(timeoutId);
      
      if (addResponse.ok) {
        // Get only the single new meal
        const newMealPlan = await addResponse.json();
        if (newMealPlan?.meals) {
          // Find the newly added meal (should be the last one)
          const newMeal = newMealPlan.meals[newMealPlan.meals.length - 1];
          if (newMeal) {
            // Add the new meal to our existing meals array with a unique ID
            const uniqueId = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            
            // Ensure the meal has a category and prepTime
            const enhancedMeal = {
              ...newMeal,
              id: newMeal.id || uniqueId,
              category: newMeal.category || mealType,
              prepTime: newMeal.prepTime || (mealType === "Quick & Easy" ? 15 : 30)
            };
            
            // For crock pot meals, ensure the right category and prep time
            if (preferences.toLowerCase().includes("crock pot") || 
                preferences.toLowerCase().includes("crockpot") || 
                preferences.toLowerCase().includes("slow cooker")) {
              enhancedMeal.category = "Split Prep";
              enhancedMeal.prepTime = 20; // 20 mins of actual prep work
            }
            
            // First get the current plan from the server to make sure we have the latest data
            const planResponse = await apiRequest("GET", "/api/meal-plan/current");
            let currentPlan;
            
            if (planResponse.ok) {
              currentPlan = await planResponse.json();
              console.log('Retrieved current plan with', currentPlan.meals?.length || 0, 'meals');
            } else {
              console.warn('Could not fetch current plan, using cached data');
              currentPlan = queryClient.getQueryData(["/api/meal-plan/current"]);
            }
            
            // If we still don't have a plan, create a basic one
            if (!currentPlan || !currentPlan.id) {
              console.warn('No current meal plan found, constructing a new one');
              currentPlan = {
                id: 1,
                name: "Weekly Meal Plan",
                householdId: 1,
                isActive: true,
                meals: [],
                createdAt: new Date().toISOString()
              };
            }
            
            // Create a copy of the current meals and add the new one
            const updatedMeals = [...(currentPlan.meals || []), enhancedMeal];
            
            // Update the plan on the server with ALL meals including the new one
            const updateResponse = await apiRequest("PATCH", "/api/meal-plan/current", {
              updatedPlanData: {
                ...currentPlan,
                meals: updatedMeals
              }
            });
            
            if (updateResponse.ok) {
              console.log('Successfully updated plan with new meal');
              
              // Update the local meals state including the new meal
              setMeals(prevMeals => [...prevMeals, enhancedMeal]);
              console.log("Added a single new meal to existing meals");
              
              // Also update cached meals to ensure persistence
              cachedMeals = [...cachedMeals, enhancedMeal];
              localStorage.setItem('current_meals', JSON.stringify([...cachedMeals]));
            } else {
              console.error('Failed to update plan with new meal');
              toast({
                title: "Warning",
                description: "The meal was added but may not persist between pages. Please refresh.",
                variant: "destructive"
              });
              
              // Still update local state for immediate feedback
              setMeals(prevMeals => [...prevMeals, enhancedMeal]);
            }
          }
        }
        
        // Force refresh the meal plan from server
        await queryClient.invalidateQueries({ queryKey: ["/api/meal-plan/current"] });
        await queryClient.refetchQueries({ queryKey: ["/api/meal-plan/current"] });
        
        toast({
          title: "Meal added",
          description: "A new meal has been added to your plan"
        });
        
        setIsDialogOpen(false);
        resetForm();
      } else {
        const errorData = await addResponse.json();
        toast({
          title: "Error adding meal",
          description: errorData.message || "There was a problem adding your meal",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error adding meal:", error);
      
      // Check if it's a timeout error
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Request Timeout",
          description: "The meal generation is taking longer than expected. The meal may still be created - please check your meal plan in a moment.",
          variant: "destructive"
        });
      } else if (error instanceof Error && error.message.includes('404')) {
        toast({
          title: "Setup Required",
          description: "Please complete your household profile and generate an initial meal plan first.",
          variant: "destructive"
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast({
          title: "Error",
          description: errorMessage.includes('API key') ? 
            "OpenAI API access is required to generate meals. Please check your settings." : 
            "Failed to add a new meal. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsAddingMeal(false);
    }
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 overflow-y-auto h-full pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white py-4 border-b border-gray-100 mb-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold text-[#212121]">Your Meal Plan</h1>
          {/* Mobile-optimized header buttons */}
          <div className="grid grid-cols-3 gap-2 w-full">
            <Button 
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="text-[#21706D] border-[#21706D] hover:bg-[#f0f9f9] hover:text-[#195957] h-10 text-xs"
            >
              <svg className="mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              Refresh
            </Button>
            <ResetButton 
              onReset={resetMealPlan}
              label="Reset Plan"
              confirmMessage="This will clear all meals from your current plan. This action cannot be undone. Continue?"
            />
            <Button 
              onClick={handleAddMeal}
              size="sm"
              className="bg-[#21706D] hover:bg-[#195957] h-10 text-xs"
            >
              <PlusCircle className="mr-1 h-3 w-3" />
              Add Meal
            </Button>
          </div>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
            <h3 className="font-medium text-yellow-800">Loading meal plan...</h3>
            <p className="text-sm text-yellow-700">Fetching your latest meal plan from the server.</p>
          </div>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardContent className="p-0">
                <div className="flex flex-col">
                  <div className="p-4 w-full">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/3 mb-4" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : meals.length > 0 ? (
        <div className="space-y-4">
          {meals.map((meal) => (
            <EnhancedMealCard 
              key={meal.id} 
              meal={meal} 
              onRemove={handleRemoveMeal}
              onModify={handleModifyMeal}
              onReplace={handleReplaceMeal}
            />
          ))}
        </div>
      ) : mealPlan && mealPlan.id ? (
        <div className="space-y-4">
          <Card className="w-full bg-teal-50 border-teal-200">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="bg-teal-100 rounded-full p-3 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-teal-600"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              </div>
              <h3 className="text-lg font-medium text-teal-800 mb-2">Ready for New Meals</h3>
              <p className="text-sm text-teal-700 mb-4">
                Your meal plan has been successfully reset. You can now add new meals to your plan by clicking the "Add Meal" button above, or generate a completely new plan.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Meal
                </Button>
                <Link href="/meal-plan-builder">
                  <Button
                    variant="outline"
                    className="text-teal-600 border-teal-600 hover:bg-teal-50"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Generate New Plan
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

        </div>
      ) : (
        <Card className="w-full bg-white shadow-sm">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <Calendar className="h-12 w-12 text-[#21706D] mb-4" />
            <h3 className="text-lg font-medium mb-2">No meal plan yet</h3>
            <p className="text-sm text-[#8A8A8A] mb-4">
              Start a conversation with the assistant to create your personalized meal plan.
            </p>
            <Link href="/meal-plan-builder">
              <Button className="bg-[#21706D] hover:bg-[#195957]">
                Create Meal Plan
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
      
      {/* Add Meal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add a Meal to Your Plan</DialogTitle>
            <DialogDescription>
              Let's create a new meal that fits your family's needs.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="meal-type">What kind of meal?</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger id="meal-type">
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mealType && (
                <p className="text-sm text-muted-foreground">
                  {MEAL_TYPES.find(t => t.value === mealType)?.description}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="preferences">Anything special we should know?</Label>
              <Textarea
                id="preferences"
                placeholder="Example: Use crockpot so I can prep in morning, include more vegetables, make it kid-friendly, etc."
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
              disabled={isAddingMeal}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitMeal} 
              disabled={isAddingMeal || !mealType}
              className="bg-[#21706D] hover:bg-[#195957] relative"
            >
              {isAddingMeal ? (
                <>
                  <span className="opacity-0">Create Meal</span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  </span>
                </>
              ) : (
                "Create Meal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}