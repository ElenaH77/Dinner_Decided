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
import { PlusCircle } from 'lucide-react';

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
  } catch (error) {
    console.error("Error accessing meal plan context:", error);
  }
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>('meals');

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

  // Initialize meal plan from API data
  useEffect(() => {
    if (mealPlanApiData && !currentMealPlan) {
      setCurrentMealPlan(mealPlanApiData);
    }
  }, [mealPlanApiData, currentMealPlan, setCurrentMealPlan]);

  // Initialize meals from API data
  useEffect(() => {
    if (mealsApiData && currentMealPlan) {
      // Filter meals to only those in the current meal plan
      const planMeals = Array.isArray(mealsApiData) ? mealsApiData.filter((meal: Meal) => 
        currentMealPlan.mealIds && currentMealPlan.mealIds.includes(meal.id)
      ) : [];
      setMeals(planMeals);
    }
  }, [mealsApiData, currentMealPlan, setMeals]);

  const isLoading = isMealPlanLoading || isMealsLoading;

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
      <Tabs defaultValue="meals" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="border-b border-neutral-gray w-full justify-start mb-6">
          <TabsTrigger value="meals" className="text-neutral-text data-[state=active]:text-teal-primary data-[state=active]:border-b-2 data-[state=active]:border-teal-primary">
            This Week's Plan
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-neutral-text data-[state=active]:text-teal-primary data-[state=active]:border-b-2 data-[state=active]:border-teal-primary">
            Plan Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meals" className="mt-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-neutral-text">{weekDateRange}</h2>
            {meals && meals.length > 0 && (
              <span className="bg-teal-primary text-white text-sm py-1 px-3 rounded-full">
                {meals.length} meals planned
              </span>
            )}
          </div>

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
              
              {/* Meal cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {meals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}

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

        <TabsContent value="chat" className="mt-0">
          <div className="bg-white rounded-xl shadow-sm p-4 h-[calc(100vh-20rem)]">
            <ChatInterface standalone={true} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
