import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import ChatInterface from '@/components/chat/chat-interface';
import MealPlanningAssistant from '@/components/chat/meal-planning-assistant';
import MealCard from '@/components/meals/meal-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useHousehold } from '@/contexts/household-context';
import { useMealPlan } from '@/contexts/meal-plan-context';
import { Meal } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { PlusCircle, ShoppingCart, FileText } from 'lucide-react';

export default function MealPlan() {
  const { toast } = useToast();
  
  // Use dummy values if context throws errors
  let members = [];
  let equipment = [];
  let preferences = null;
  let currentMealPlan = null;
  let setCurrentMealPlan = () => {};
  let meals = [];
  let setMeals = () => {};
  
  try {
    const householdData = useHousehold();
    members = householdData.members;
    equipment = householdData.equipment;
    preferences = householdData.preferences;
  } catch (error) {
    console.error("Error accessing household context:", error);
  }
  
  try {
    const mealPlanContext = useMealPlan();
    currentMealPlan = mealPlanContext.currentPlan;
    setCurrentMealPlan = mealPlanContext.setCurrentPlan;
    meals = mealPlanContext.currentPlan?.meals || [];
    setMeals = mealPlanContext.addMeal;
    
    // Refetch meal plan if reload param is present or no plan loaded
    useEffect(() => {
      const shouldRefetch = window.location.search.includes('reload') || !currentMealPlan;
      if (shouldRefetch && !mealPlanContext.isLoading) {
        console.log("Refetching meal plan due to reload parameter or missing plan");
        mealPlanContext.refetchMealPlan();
      }
    }, [window.location.search, mealPlanContext, currentMealPlan]);
  } catch (error) {
    console.error("Error accessing meal plan context:", error);
  }
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>('meals');
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Get the current week's dates
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const weekDateRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  // Get meal plan data if it exists
  const { data: mealPlanApiData, isLoading: isMealPlanLoading } = useQuery({
    queryKey: ['/api/users/1/meal-plans/current'],
    enabled: !currentMealPlan
  });

  // Get meals data if we have a meal plan
  const { data: mealsApiData, isLoading: isMealsLoading } = useQuery({
    queryKey: ['/api/users/1/meals'],
    enabled: !!currentMealPlan || !!mealPlanApiData
  });

  // Check for direct localStorage data on mount
  useEffect(() => {
    try {
      // First try to load directly from localStorage
      const storedPlan = localStorage.getItem('current_meal_plan');
      if (storedPlan) {
        const parsedPlan = JSON.parse(storedPlan);
        console.log("Found meal plan in localStorage:", parsedPlan);
        
        if (parsedPlan && parsedPlan.id) {
          console.log("Setting meal plan from localStorage");
          setCurrentMealPlan(parsedPlan);
          return;
        }
      }
      
      // Fall back to API data
      if (mealPlanApiData && (!currentMealPlan || window.location.search.includes('t'))) {
        console.log("Setting meal plan from API data:", mealPlanApiData);
        setCurrentMealPlan(mealPlanApiData);
      }
    } catch (error) {
      console.error("Error loading meal plan from localStorage:", error);
    }
  }, [mealPlanApiData, currentMealPlan, setCurrentMealPlan]);

  // Initialize meals from API data
  useEffect(() => {
    if (mealsApiData && (currentMealPlan || mealPlanApiData)) {
      const mealPlanToUse = currentMealPlan || mealPlanApiData;
      
      if (!mealPlanToUse) return;
      
      // Instead of filtering, directly use the meals from the meal plan
      console.log("Using meals from meal plan:", mealPlanToUse);
      
      // Check if the meal plan has meals directly embedded
      if (mealPlanToUse.meals && Array.isArray(mealPlanToUse.meals) && mealPlanToUse.meals.length > 0) {
        console.log("Using embedded meals from meal plan, count:", mealPlanToUse.meals.length);
        // Log to check if meals have IDs
        console.log("Meal IDs:", mealPlanToUse.meals.map(m => m.id));
        setMeals(mealPlanToUse.meals);
      } else {
        // Fallback to filtering if needed
        console.log("No embedded meals in meal plan, falling back to filtering from API data");
        const planMeals = Array.isArray(mealsApiData) ? mealsApiData : [];
        console.log("Using all available meals, count:", planMeals.length);
        setMeals(planMeals);
      }
    }
  }, [mealsApiData, currentMealPlan, mealPlanApiData, setMeals]);

  const isLoading = isMealPlanLoading || isMealsLoading;

  // Handle meal modification requests (both replacements and modifications)
  const handleMealModification = async (mealId: string, modificationRequest: string) => {
    if (!mealId) {
      toast({
        title: "Error",
        description: "Could not modify this meal because it has no ID.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Show loading toast
      toast({
        title: modificationRequest === 'replace' ? "Replacing meal" : "Modifying meal",
        description: modificationRequest === 'replace' 
          ? "Generating a new alternative meal..." 
          : `Applying changes: ${modificationRequest}`,
      });
      
      // Find the meal being modified
      const mealToModify = meals.find(m => m.id === mealId);
      if (!mealToModify) {
        throw new Error(`Meal with ID ${mealId} not found`);
      }
      
      console.log('Modifying meal:', mealToModify);
      console.log('Modification request:', modificationRequest);
      
      // Call the appropriate API endpoint based on the request type
      const endpoint = modificationRequest === 'replace' 
        ? `/api/meal/replace` 
        : `/api/meal/modify`;
      
      // The payload format needs to match client/src/lib/meal-ai.ts expectations
      const payload = {
        meal: mealToModify, // This is the full meal object
        modificationRequest, // The request string for modify, or just 'replace' for replacement
        mealPlanId: currentMealPlan?.id,
        currentMeals: meals // Include all current meals for context
      };
      
      console.log('Sending meal modification request with payload:', JSON.stringify(payload, null, 2));
      const response = await apiRequest('POST', endpoint, payload);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const updatedMeal = await response.json();
      console.log('Received updated meal:', updatedMeal);
      
      // Update the meal plan with the new meal
      if (currentMealPlan && currentMealPlan.meals) {
        console.log('Current meal plan before update:', JSON.stringify(currentMealPlan));
        console.log('Meal ID to update:', mealId);
        console.log('Updated meal data:', JSON.stringify(updatedMeal));
        
        // Create a new array of meals with the modified one
        const updatedMeals = currentMealPlan.meals.map(meal => {
          console.log(`Comparing meal ID: ${meal.id} with ${mealId}, match: ${meal.id === mealId}`);
          
          if (meal.id === mealId) {
            // Keep the day if it's not in the updated meal
            if (meal.day && !updatedMeal.day) {
              updatedMeal.day = meal.day;
            }
            
            // Log what's being replaced
            console.log('Replacing:', meal);
            console.log('With:', updatedMeal);
            
            return updatedMeal;
          }
          
          return meal;
        });
        
        console.log('Updated meals array length:', updatedMeals.length);
        
        // Create new plan object (don't mutate existing)
        const updatedPlan = {
          ...currentMealPlan,
          meals: updatedMeals,
          lastUpdated: new Date().toISOString()
        };
        
        console.log('Updated plan to save, ID:', updatedPlan.id);
        
        // 1. Use our dedicated storage service method that handles both API and local storage
        try {
          console.log(`Using storage service to update meal ${mealId} in plan ${currentMealPlan.id}`);
          
          // Import our storage service function
          const { updateMealInPlan } = await import('@/lib/storage-service');
          
          // Call the service function which handles everything
          const result = await updateMealInPlan(currentMealPlan.id, mealId, updatedMeal);
          
          if (result.success) {
            console.log('Successfully updated meal via storage service:', result);
          } else {
            console.warn('Storage service update failed:', result.error);
            toast({
              title: "Error updating meal",
              description: result.error || "Failed to update meal",
              variant: "destructive"
            });
          }
        } catch (patchError) {
          console.error('Error using storage service:', patchError);
          // Continue with state updates as fallback
        }
        
        // 2. Force a deep clone when updating state to avoid reference issues
        const planClone = JSON.parse(JSON.stringify(updatedPlan));
        
        // 3. Update context with the cloned object
        setCurrentMealPlan(planClone);
        
        // 4. Also update meals array state directly to ensure UI refreshes
        setMeals(updatedMeals);
        
        // 5. Update localStorage for persistence
        localStorage.setItem('current_meal_plan', JSON.stringify(planClone));
        
        // 6. Additional direct data refresh
        try {
          // Bypass cache with timestamp parameter
          await fetch(`/api/meal-plan/current?_=${Date.now()}`);
          // Invalidate any react-query cache using imported queryClient
          import('@/lib/queryClient').then(({ queryClient }) => {
            queryClient.invalidateQueries({ queryKey: ['/api/meal-plan/current'] });
          }).catch(error => {
            console.error('Error importing queryClient:', error);
          });
        } catch (refreshError) {
          console.error('Error refreshing data:', refreshError);
        }
        
        // 7. Force UI refresh by triggering re-render
        setRefreshCounter(prev => prev + 1);
        
        toast({
          title: "Success",
          description: modificationRequest === 'replace' 
            ? "Meal replaced successfully" 
            : "Meal modified successfully",
        });
      }
    } catch (error) {
      console.error('Error modifying meal:', error);
      toast({
        title: "Error",
        description: `Failed to ${modificationRequest === 'replace' ? 'replace' : 'modify'} meal: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Add a direct check for localStorage data on render for debugging
  useEffect(() => {
    // If we don't have a plan yet or are loading, try to get from localStorage directly
    if ((!currentMealPlan || !meals || meals.length === 0) && !isLoading) {
      console.log("No meal plan found normally, checking localStorage directly");
      
      try {
        // Try direct storage first
        const directStored = localStorage.getItem('current_meal_plan');
        if (directStored) {
          const parsedPlan = JSON.parse(directStored);
          console.log("Found meal plan in direct localStorage:", parsedPlan);
          
          if (parsedPlan && parsedPlan.id && parsedPlan.meals && parsedPlan.meals.length > 0) {
            console.log("Using plan from localStorage with " + parsedPlan.meals.length + " meals");
            setCurrentMealPlan(parsedPlan);
            setMeals(parsedPlan.meals);
            return;
          }
        }
      } catch (error) {
        console.error("Error loading meal plan from localStorage fallback:", error);
      }
    }
  }, [currentMealPlan, meals, isLoading, setCurrentMealPlan, setMeals, refreshCounter]);

  const generateMealPlan = async () => {
    if (!preferences || !equipment) {
      toast({
        title: "Missing profile information",
        description: "Please complete your household profile first.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGenerating(true);

      // Get dietary restrictions from members
      const dietaryRestrictions = members
        ?.map(member => member.dietaryRestrictions)
        .filter(Boolean) as string[];

      // Get equipment names that are owned
      const ownedEquipment = equipment
        ?.filter(item => item.isOwned)
        .map(item => item.name);

      // Generate meal suggestions
      const response = await apiRequest('POST', '/api/generate-meals', {
        numberOfMeals: 5,
        specialRequests: "Family-friendly meals with a mix of quick options and comfort food.",
        dietaryRestrictions: dietaryRestrictions || [],
        cookingEquipment: ownedEquipment || [],
        confidenceLevel: preferences?.confidenceLevel || 3,
        cookingTime: preferences?.weekdayCookingTime || "30-45 minutes",
        preferredCuisines: preferences?.preferredCuisines || []
      });

      const data = await response.json();
      
      // Create a meal plan
      const mealPlanResponse = await apiRequest('POST', '/api/meal-plans', {
        userId: 1,
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
        numberOfMeals: data.meals.length,
        mealIds: [],
        specialNotes: ""
      });

      const mealPlanData = await mealPlanResponse.json();
      
      // Create all meals
      const createdMeals = [];
      for (const meal of data.meals) {
        const mealResponse = await apiRequest('POST', '/api/meals', {
          userId: 1,
          name: meal.name,
          description: meal.description,
          imageUrl: meal.imageUrl || `https://source.unsplash.com/random/300x200/?${encodeURIComponent(meal.name)}`,
          prepTime: meal.prepTime,
          tags: meal.tags,
          rationales: meal.rationales,
          ingredients: meal.ingredients
        });
        
        const mealData = await mealResponse.json();
        createdMeals.push(mealData);
      }
      
      // Update meal plan with meal IDs
      const mealIds = createdMeals.map(meal => meal.id);
      await apiRequest('PUT', `/api/meal-plans/${mealPlanData.id}`, {
        mealIds
      });
      
      // Update state
      setCurrentMealPlan({
        ...mealPlanData,
        mealIds
      });
      setMeals(createdMeals);
      
      toast({
        title: "Meal plan created!",
        description: "Your weekly meal plan has been generated."
      });
    } catch (error) {
      console.error("Error generating meal plan:", error);
      toast({
        title: "Could not generate meal plan",
        description: "There was an error creating your meal plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl">
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
              window.location.href = '/show-meal-plan';
            }}
            size="sm"
          >
            <FileText className="w-4 h-4 mr-2" /> View Full Recipes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="meals" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="border-b border-neutral-gray w-full justify-start mb-6">
          <TabsTrigger value="meals" className="text-neutral-text data-[state=active]:text-teal-primary data-[state=active]:border-b-2 data-[state=active]:border-teal-primary">
            This Week's Plan
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-neutral-text data-[state=active]:text-teal-primary data-[state=active]:border-b-2 data-[state=active]:border-teal-primary">
            Plan Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meals" className="mt-0" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', paddingBottom: '60px' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-neutral-text">{weekDateRange}</h2>
            {meals && meals.length > 0 && (
              <span className="bg-teal-primary text-white text-sm py-1 px-3 rounded-full">
                {meals.length} meals planned
              </span>
            )}
          </div>

          {/* Add direct localStorage rescue button */}
          {!meals || meals.length === 0 ? (
            <div className="mb-6">
              <Button
                onClick={() => {
                  // Try to load directly from localStorage
                  try {
                    const savedPlan = localStorage.getItem('current_meal_plan');
                    if (savedPlan) {
                      const parsedPlan = JSON.parse(savedPlan);
                      console.log("Found plan in localStorage:", parsedPlan);
                      
                      if (parsedPlan?.meals?.length > 0) {
                        // Force immediate UI update with state
                        setMeals(parsedPlan.meals);
                        setCurrentMealPlan(parsedPlan);
                        
                        // Force page refresh to ensure everything is updated
                        toast({
                          title: "Plan loaded from backup",
                          description: `Recovered your meal plan with ${parsedPlan.meals.length} meals.`
                        });
                        
                        // Force a page reload for guaranteed rendering
                        setTimeout(() => {
                          window.location.reload();
                        }, 1500);
                        return;
                      }
                    }
                    toast({
                      title: "No saved plan found",
                      description: "We couldn't find a previously saved meal plan.",
                      variant: "destructive"
                    });
                  } catch (e) {
                    console.error("Error loading from localStorage:", e);
                    toast({
                      title: "Error loading plan",
                      description: "There was a problem loading your saved meal plan.",
                      variant: "destructive"
                    });
                  }
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white mb-4"
              >
                Recover Last Meal Plan
              </Button>
            </div>
          ) : null}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-teal-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading your meal plan...</p>
            </div>
          ) : meals && meals.length > 0 ? (
            <>
              {/* Show chat interface at the top for existing meal plans */}
              <div className="mb-8">
                <ChatInterface standalone={false} />
              </div>
              
              {/* Action buttons */}
              <div className="mb-6 flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    // Navigate to grocery list page
                    window.location.href = '/grocery';
                  }}
                  className="bg-teal-primary hover:bg-teal-dark text-white"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" /> Generate Grocery List
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Navigate to show-meal-plan page for full recipe details
                    window.location.href = '/show-meal-plan';
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" /> View Full Recipes
                </Button>
              </div>
              
              {/* Meal cards */}
              <div className="flex flex-col space-y-6">
                {meals.map((meal, index) => {
                  // Generate day information if not available
                  const currentDate = new Date();
                  const startDate = startOfWeek(currentDate);
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  const mealDay = meal.day || meal.dayOfWeek || dayNames[index % 7];
                  
                  return (
                    <MealCard 
                      key={meal.id} 
                      meal={{
                        id: meal.id || `meal-${index + 1}`, // Ensure we always have an ID by generating one if missing
                        ...meal,
                        // Ensure required properties are available
                        ingredients: meal.ingredients || meal.mainIngredients || meal.main_ingredients || [],
                        prepTime: meal.prepTime || meal.prep_time || 30,
                        servings: meal.servingSize || meal.serving_size || 4,
                        day: mealDay
                      }}
                      onReplace={(mealId) => handleMealModification(mealId, 'replace')}
                      onModify={(mealId, modificationRequest) => handleMealModification(mealId, modificationRequest)}
                    />
                  );
                })}

                {/* Add Meal Card */}
                <div className="border-2 border-dashed border-neutral-gray rounded-xl flex items-center justify-center h-48 bg-white cursor-pointer hover:border-teal-primary transition-colors">
                  <div className="flex flex-col items-center text-neutral-text">
                    <PlusCircle className="w-8 h-8 mb-2 text-neutral-gray" />
                    <span className="font-medium">Add another meal</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm">
              {/* Import at the top of the file: import MealPlanningAssistant from '@/components/chat/meal-planning-assistant'; */}
              <MealPlanningAssistant onComplete={() => {
                // No need to invalidate queries here as the component handles it
              }} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-0" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', paddingBottom: '60px' }}>
          <div className="bg-white rounded-xl shadow-sm p-4 h-[calc(100vh-20rem)]">
            <ChatInterface standalone={true} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
