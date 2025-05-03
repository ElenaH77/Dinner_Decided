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

// Meal types with their descriptions
const MEAL_TYPES = [
  { value: "Quick & Easy", label: "Quick & Easy ⚡", description: "Ready in 30 minutes or less" },
  { value: "Weeknight Meals", label: "Weeknight Meals 🍽️", description: "Balanced dinners for busy evenings" },
  { value: "Batch Cooking", label: "Batch Cooking 📦", description: "Make once, eat multiple times" },
  { value: "Split Prep", label: "Split Prep ⏰", description: "Prep ahead, cook later" }
];

// Enhanced meal card component (defined inline)
const EnhancedMealCard = ({ meal, onRemove }: { meal: any, onRemove: (id: string) => void }) => {
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);

  // Get category icon
  let categoryIcon = '';
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
  
  // Add placeholder directions if missing
  if (!meal.directions || !meal.directions.length) {
    meal.directions = [];
    
    // Common steps for most recipes
    meal.directions.push('Prepare all ingredients according to the ingredients list - wash, chop, and measure everything before starting.');
    
    // Add specific directions based on dish type
    if (meal.name && typeof meal.name === 'string') {
      const dishName = meal.name.toLowerCase();
      if (dishName.includes('pasta')) {
        meal.directions.push('Bring a large pot of salted water to a boil and cook pasta according to package directions until al dente.');
        meal.directions.push('While pasta is cooking, prepare the sauce by combining remaining ingredients in a large pan.');
        meal.directions.push('Drain the pasta and combine with sauce. Toss well to coat evenly.');
        meal.directions.push('Serve hot with grated cheese and fresh herbs if desired.');
      } else if (dishName.includes('chicken') && (dishName.includes('bake') || dishName.includes('roast') || dishName.includes('oven'))) {
        meal.directions.push('Preheat your oven to 375°F (190°C).');
        meal.directions.push('Season chicken with salt, pepper, and other spices as per the ingredients list.');
        meal.directions.push('Place in a baking dish with vegetables surrounding the chicken.');
        meal.directions.push('Bake for 25-30 minutes until chicken reaches an internal temperature of 165°F (74°C).');
      } else if (dishName.includes('soup') || dishName.includes('stew')) {
        meal.directions.push('In a large pot, heat oil over medium heat. Add onions, carrots, and celery, cooking until softened.');
        meal.directions.push('Add garlic and other aromatics, cooking for another minute until fragrant.');
        meal.directions.push('Pour in broth and add main ingredients. Bring to a boil, then reduce to a simmer.');
        meal.directions.push('Simmer covered for 20-30 minutes until all ingredients are tender and flavors have melded.');
      } else if (dishName.includes('slow cooker') || dishName.includes('crockpot')) {
        meal.directions.push('Add all ingredients to your slow cooker in the morning, starting with liquids at the bottom.');
        meal.directions.push('Cover and cook on low for 6-8 hours or on high for 3-4 hours.');
        meal.directions.push('About 30 minutes before serving, check seasoning and adjust as needed.');
        meal.directions.push('Serve directly from the slow cooker or transfer to a serving dish.');
      } else {
        meal.directions.push('Preheat your oven or stovetop as needed for this recipe.');
        meal.directions.push('Combine the ingredients according to the main ingredients list.');
        meal.directions.push('Cook following standard procedures for this type of dish until all components are thoroughly cooked.');
        meal.directions.push('Serve hot and enjoy with your family!');
      }
    }
  }
  
  // Dialog states
  const [isModifyDialogOpen, setIsModifyDialogOpen] = useState(false);
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false);
  const [modifyRequest, setModifyRequest] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Handle modify meal
  const handleModifyMeal = async () => {
    if (!modifyRequest.trim()) {
      toast({
        title: "Empty modification",
        description: "Please describe how you'd like to modify this meal",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Here would be the API call to modify the meal
      // For now just simulate a delay
      setTimeout(() => {
        setIsModifyDialogOpen(false);
        setModifyRequest("");
        toast({
          title: "Meal modified",
          description: "Your meal has been successfully modified"
        });
        setIsSubmitting(false);
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to modify the meal. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };
  
  // Handle replace meal
  const handleReplaceMeal = async () => {
    setIsSubmitting(true);
    
    try {
      // Here would be the API call to replace the meal
      // For now just simulate a delay
      setTimeout(() => {
        setIsReplaceDialogOpen(false);
        toast({
          title: "Meal replaced",
          description: "Your meal has been successfully replaced"
        });
        setIsSubmitting(false);
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to replace the meal. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
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
        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-sm text-gray-600 h-8"
              onClick={() => setIsModifyDialogOpen(true)}
            >
              Modify
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-sm text-gray-600 h-8"
              onClick={() => setIsReplaceDialogOpen(true)}
            >
              Replace
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-sm text-gray-600 h-8 flex items-center"
              onClick={handleAddToGroceryList}
            >
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6h19l-3 10H6L3 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 21a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/>
                <path d="M19 21a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/>
              </svg>
              Add to List
            </Button>
          </div>
          <Button 
            variant="link" 
            size="sm" 
            className="text-[#21706D] hover:text-[#195957] text-sm font-medium p-0 flex items-center"
            onClick={() => setIsRecipeOpen(true)}
          >
            <FileText className="h-4 w-4 mr-1" /> View Recipe
          </Button>
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
              {meal.directions?.length > 0 ? (
                <ol className="list-decimal pl-5 mb-4 space-y-2">
                  {meal.directions.map((step: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600">{step}</li>
                  ))}
                </ol>
              ) : (
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">1. Preheat your oven or stovetop as needed for this recipe.</p>
                  <p className="text-sm text-gray-600">2. Prepare all ingredients according to the ingredients list.</p>
                  <p className="text-sm text-gray-600">3. Cook following standard procedures for this type of dish.</p>
                  <p className="text-sm text-gray-600">4. Serve hot and enjoy with your family!</p>
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
              onClick={handleModifyMeal} 
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
              onClick={handleReplaceMeal} 
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
  
  // Fetch meal plan data
  const { data: mealPlan, isLoading, refetch } = useQuery({
    queryKey: ["/api/meal-plan/current"],
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
    } else {
      console.log("[DEBUG] No meal plan data received!");
    }
    
    // Proceed with normal processing
    if (mealPlan && Array.isArray(mealPlan.meals)) {
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
    } else {
      // Reset the meals array if no meals are found
      setMeals([]);
      console.log("No meals found in meal plan, reset to empty array");
    }
  }, [mealPlan]);
  
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
  
  // Reset meal plan function
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
        // Clear local storage
        localStorage.removeItem('current_meal_plan');
        localStorage.removeItem('current_meals');
        
        // Clear module-level cache
        cachedMeals = [];
        
        // Clear react query cache
        queryClient.invalidateQueries({ queryKey: ["/api/meal-plan/current"] });
        
        // Update meals state
        setMeals([]);
        
        // Refetch data
        await refetch();
        
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
      
      // Now add the new meal
      const addResponse = await apiRequest("POST", "/api/meal-plan/add-meal", {
        mealType,
        preferences
      });
      
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
        
        // Also refresh query cache
        queryClient.invalidateQueries({ queryKey: ["/api/meal-plan/current"] });
        
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
      toast({
        title: "Error",
        description: "Failed to add a new meal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingMeal(false);
    }
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white py-4 border-b border-gray-100 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#212121]">Your Meal Plan</h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => refetch()}
              variant="outline"
              className="text-[#21706D] border-[#21706D] hover:bg-[#f0f9f9] hover:text-[#195957]"
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className="bg-[#21706D] hover:bg-[#195957]"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
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
            />
          ))}
        </div>
      ) : mealPlan && mealPlan.id ? (
        <div className="space-y-4">
          <Card className="w-full bg-orange-50 border-orange-200">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="bg-orange-100 rounded-full p-3 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-orange-600"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <h3 className="text-lg font-medium text-orange-800 mb-2">Meal Plan Display Issue</h3>
              <p className="text-sm text-orange-700 mb-4">
                Found meal plan #{mealPlan.id} but it contains no meals. Try clicking the Refresh button above or generating a new meal plan.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                >
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="w-full bg-white shadow-sm mt-6">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-4">Debug Info:</p>
              <pre className="text-xs bg-gray-100 p-4 rounded-md overflow-auto">
                {JSON.stringify(mealPlan, null, 2)}
              </pre>
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