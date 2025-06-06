import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MEAL_TYPES = [
  { id: 'quick', name: 'Quick & Easy', icon: '⚡', description: '15-20 minutes - assembly type meals and rotisserie chicken magic' },
  { id: 'weeknight', name: 'Weeknight Meals', icon: '🍽️', description: 'About 30-40 minutes, balanced dinners for busy evenings' },
  { id: 'batch', name: 'Batch Cooking', icon: '📦', description: 'Make once, eat multiple times' },
  { id: 'split', name: 'Split Prep', icon: '⏰', description: 'Prep ahead, cook later - including crockpot meals' },
];

export default function MealPlanBuilder() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showDescriptions, setShowDescriptions] = useState(false);
  
  // State to track selected meal types for each day
  const [selectedMeals, setSelectedMeals] = useState<Record<string, string>>({});
  
  // State for any additional notes
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  // Handle meal type selection for a day via dropdown
  const handleMealSelection = (day: string, mealType: string) => {
    if (mealType === "none") {
      // Remove the day if "No meal planned" is selected
      const updatedMeals = { ...selectedMeals };
      delete updatedMeals[day];
      setSelectedMeals(updatedMeals);
    } else {
      // Set the meal type for the day
      setSelectedMeals({
        ...selectedMeals,
        [day]: mealType
      });
    }
  };
  
  // Count how many of each meal type is selected
  const getMealTypeCounts = () => {
    const counts: Record<string, number> = {};
    MEAL_TYPES.forEach(type => counts[type.id] = 0);
    
    // Count how many of each meal type is selected
    Object.values(selectedMeals).forEach(mealType => {
      if (mealType) counts[mealType]++;
    });
    
    return counts;
  };
  
  const mealCounts = getMealTypeCounts();
  
  // Generate the meal plan
  const handleGenerateMealPlan = async () => {
    // Ensure at least one meal is selected
    if (Object.keys(selectedMeals).length === 0) {
      toast({
        title: "No meals selected",
        description: "Please select at least one meal type for any day of the week.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    console.log('[MEAL BUILDER] Starting meal plan generation...');
    
    try {
      // Format the meal preferences to send to the API
      const preferences = {
        mealsByDay: { ...selectedMeals },
        specialNotes: additionalNotes || ""  
      };
      
      console.log('[MEAL BUILDER] Preferences structured:', { 
        mealsByDay: Object.keys(selectedMeals).length, 
        notesLength: additionalNotes?.length || 0 
      });
      
      // Make the API request to generate a meal plan
      const response = await apiRequest('POST', '/api/meal-plan/generate', { preferences });
      
      if (!response.ok) {
        throw new Error('Failed to create meal plan');
      }
      
      const data = await response.json();
      console.log('[MEAL BUILDER] Created new meal plan with ID:', data.id);
      
      // Store the meal plan ID in localStorage for reference
      if (data && data.id) {
        localStorage.setItem('current_meal_plan_id', String(data.id));
        console.log('[MEAL BUILDER] Stored meal plan ID in localStorage:', data.id);
      }
      
      toast({
        title: "Meal plan created",
        description: "Your personalized meal plan is ready!",
      });
      
      // Clear any stale data
      localStorage.removeItem('current_meals');
      
      // Refresh the meal plan data
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plan/current"] });
      console.log('[MEAL BUILDER] Invalidated query cache');
      
      // Navigate to the meal plan page with a query parameter to trigger auto-refresh
      console.log('[MEAL BUILDER] Redirecting to meal plan view');
      navigate('/this-week?from=builder');
    } catch (error) {
      console.error("[MEAL BUILDER] Error creating meal plan:", error);
      
      // Try to extract error message from response if it exists
      let errorMessage = "Unknown error";
      try {
        const errorObj = error as Error & { response?: Response };
        if (errorObj.response) {
          const errorData = await errorObj.response.json();
          errorMessage = errorData.message || "Failed to create meal plan";
        } else if (errorObj.message) {
          errorMessage = errorObj.message;
        }
      } catch (parseError) {
        console.error("[MEAL BUILDER] Error parsing error response:", parseError);
      }
      
      // If there's no household data yet, redirect to onboarding
      if (errorMessage.includes('Household not found') || errorMessage.includes('household')) {
        console.log('[MEAL BUILDER] Redirecting to onboarding due to missing household data');
        toast({
          title: "Household setup needed",
          description: "We need some information about your household first.",
        });
        navigate('/chat-onboarding');
      } else if (errorMessage.includes('API key') || errorMessage.includes('OpenAI')) {
        console.log('[MEAL BUILDER] OpenAI API issue detected');
        toast({
          title: "API Configuration Required",
          description: "OpenAI API access is needed to generate meal plans. Please check your API settings.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage || "Failed to create meal plan. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 min-h-screen flex flex-col space-y-6 pb-24">
      <h1 className="text-3xl font-bold text-gray-900">Pick what kind of dinner makes sense for each night.</h1>
      <p className="text-gray-600">
        Don't overthink it—just go with your gut. Leave days blank if you're planning to eat out, have leftovers, or want to decide later. This is just a starting point.
      </p>
      
      {/* Meal Type Descriptions */}
      <Card className="w-full">
        <CardContent className="p-4">
          <button 
            className="flex items-center justify-between w-full text-left"
            onClick={() => setShowDescriptions(!showDescriptions)}
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-gray-500" />
              <span>Not sure what the meal types mean?</span>
            </div>
            {showDescriptions ? 
              <ChevronUp className="h-5 w-5" /> : 
              <ChevronDown className="h-5 w-5" />}
          </button>
          
          {showDescriptions && (
            <div className="mt-4 space-y-3">
              {MEAL_TYPES.map(type => (
                <div key={type.id} className="flex items-start gap-2">
                  <span className="text-xl">{type.icon}</span>
                  <div>
                    <h3 className="font-medium">{type.name}</h3>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Mobile-Optimized Meal Selection */}
      <Card className="w-full">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Choose meals for each day</h2>
          <div className="space-y-4">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="flex flex-col space-y-2">
                <Label htmlFor={`${day}-select`} className="text-sm font-medium">
                  {day}:
                </Label>
                <Select
                  value={selectedMeals[day] || "none"}
                  onValueChange={(value) => handleMealSelection(day, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No meal planned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No meal planned</SelectItem>
                    {MEAL_TYPES.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.icon} {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h2 className="text-lg font-medium mb-2">Summary</h2>
        <div className="space-y-1">
          {MEAL_TYPES.map(type => (
            <div key={type.id} className="flex items-center gap-2">
              <span>{type.icon}</span>
              <span className="font-medium">{type.name}:</span>
              <span>{mealCounts[type.id]}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Special notes section */}
      <div className="bg-white p-4 rounded-md border border-gray-200">
        <h2 className="text-lg font-medium mb-2">Anything else I need to know?</h2>
        <p className="text-sm text-gray-600 mb-3">
          Use this space to tell me about any special considerations (e.g. temporary dietary needs, additional mouths you're feeding this week, or the farmers market haul we need to use up)
        </p>
        <Textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="E.g., We have asparagus to use up, sister visiting on Saturday..."
          className="min-h-[100px]"
        />
      </div>
      
      {/* Action Buttons */}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleGenerateMealPlan}
          className="bg-[#21706D] hover:bg-[#195957]"
          disabled={isLoading || Object.keys(selectedMeals).length === 0}
        >
          {isLoading ? "Creating Meal Plan..." : "Create Meal Plan"}
        </Button>
      </div>
    </div>
  );
}
