import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useHousehold } from '@/contexts/household-context';
import { useMealPlan } from '@/contexts/meal-plan-context';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// Meal category types
interface MealCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

const MEAL_CATEGORIES: MealCategory[] = [
  {
    id: 'quick',
    name: 'Quick & Easy',
    description: '15 minutes or less - rotisserie chicken magic, simple assembly meals',
    icon: '⚡'
  },
  {
    id: 'weeknight',
    name: 'Weeknight Meals',
    description: 'About 30 minutes, kid-friendly, standard dinner fare',
    icon: '🍽️'
  },
  {
    id: 'batch',
    name: 'Batch Cooking',
    description: 'Larger meals meant to create leftovers for multiple meals',
    icon: '📦'
  },
  {
    id: 'split',
    name: 'Split Prep',
    description: 'Meals that allow you to do prep the night before or morning of',
    icon: '⏰'
  }
];

// Days of the week
const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

interface MealPlanningAssistantProps {
  onComplete: () => void;
}

export default function MealPlanningAssistant({ onComplete }: MealPlanningAssistantProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // We'll directly call the API instead of relying on context
  const [householdData, setHouseholdData] = useState<any>(null);
  
  // Fetch household data on mount
  useEffect(() => {
    async function fetchHouseholdData() {
      try {
        const response = await fetch('/api/household');
        if (response.ok) {
          const data = await response.json();
          setHouseholdData(data);
        } else {
          console.error("Failed to fetch household data");
        }
      } catch (error) {
        console.error("Error fetching household data:", error);
      }
    }
    
    fetchHouseholdData();
  }, []);
  
  // State - always start with the intro step
  const [step, setStep] = useState<'intro' | 'meals' | 'special' | 'generating'>('intro');
  const [specialNotes, setSpecialNotes] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Record<string, number>>({});
  const [mealsByDay, setMealsByDay] = useState<Record<string, string[]>>({});
  const [showDescriptions, setShowDescriptions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [step]);

  // Handle special notes submission
  const handleSpecialNotesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('meals');
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string, day: string) => {
    setMealsByDay(prev => {
      const updatedMeals = { ...prev };
      
      // Initialize the array for this day if it doesn't exist
      if (!updatedMeals[day]) {
        updatedMeals[day] = [];
      }
      
      // Check if category is already selected for this day
      const categoryIndex = updatedMeals[day].indexOf(categoryId);
      
      if (categoryIndex === -1) {
        // Add category
        updatedMeals[day] = [...updatedMeals[day], categoryId];
        // Increment category count
        setSelectedCategories(prev => ({
          ...prev,
          [categoryId]: (prev[categoryId] || 0) + 1
        }));
      } else {
        // Remove category
        updatedMeals[day] = updatedMeals[day].filter(id => id !== categoryId);
        // Decrement category count
        setSelectedCategories(prev => ({
          ...prev,
          [categoryId]: Math.max(0, (prev[categoryId] || 0) - 1)
        }));
      }
      
      return updatedMeals;
    });
  };

  // Generate meal plan mutation
  const generateMealPlanMutation = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1); // Start on Monday
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const mealCounts = Object.values(mealsByDay).flat().length;
      
      // Create meal plan request with timeout to handle long-running API calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      try {
        const response = await apiRequest('POST', '/api/meal-plan/generate', {
          preferences: {
            specialNotes,
            mealsByDay,
            mealCategories: selectedCategories,
            numberOfMeals: mealCounts
          },
          weekStartDate: weekStart.toISOString(),
          weekEndDate: weekEnd.toISOString(),
        }, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.json();
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          throw new Error('Request took too long. The AI might be busy creating your perfect meal plan!');
        }
        
        // Try to parse the error response
        if (error?.response) {
          try {
            const errorData = await error.response.json();
            if (errorData?.message) {
              // Handle specific OpenAI API errors
              if (errorData.message.includes('OpenAI API quota exceeded')) {
                throw new Error('The AI service has reached its usage limit. Please try again later or update your API key.');
              } else if (errorData.message.includes('API rate limit')) {
                throw new Error('The AI service is experiencing high demand. Please wait a moment and try again.');
              } else if (errorData.message.includes('API authentication error')) {
                throw new Error('There was an issue with the AI service authentication. Please check your API key.');
              }
              
              // Use the server's error message
              throw new Error(errorData.message);
            }
          } catch (parseError) {
            // If we can't parse the error, just fall through to the generic throw
          }
        }
        
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data && data.meals && data.meals.length > 0) {
        // Just invalidate the queries to refresh any components that fetch meal plans
        queryClient.invalidateQueries({ queryKey: ['/api/meal-plan/current'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users/1/meal-plans/current'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users/1/meals'] });
        toast({
          title: "Success!",
          description: "Your meal plan has been created.",
        });
        onComplete();
      } else {
        console.error("Received empty meal plan data:", data);
        toast({
          title: "Incomplete meal plan",
          description: "We couldn't generate a complete meal plan. Please try again with different selections.",
          variant: "destructive",
        });
        setIsGenerating(false);
        setStep('meals');
      }
    },
    onError: (error: any) => {
      console.error("Error generating meal plan:", error);
      
      // Check if we have a structured error response with helpText
      let errorMessage = "Failed to generate your meal plan. Please try again.";
      let helpText = "";
      
      if (error?.data) {
        errorMessage = error.data.message || errorMessage;
        helpText = error.data.helpText || "";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: (
          <div>
            <p>{errorMessage}</p>
            {helpText && <p className="mt-2 text-sm font-medium">{helpText}</p>}
          </div>
        ),
        variant: "destructive",
      });
      
      setIsGenerating(false);
      setStep('meals');
    }
  });

  // Start generating the meal plan
  const handleGenerateMealPlan = () => {
    if (Object.keys(mealsByDay).length === 0) {
      toast({
        title: "No meals selected",
        description: "Please select at least one meal to generate a plan.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    setStep('generating');
    generateMealPlanMutation.mutate();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm p-4">
      <div className="flex-grow overflow-y-auto p-4 conversation-container">
        {/* Intro Step */}
        {step === 'intro' && (
          <div className="ai-bubble conversation-bubble mb-4 bg-gray-50 p-6 rounded-lg border border-gray-100 shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Let's create your meal plan!</h3>
            <p className="mb-4">
              I'll help you put together a customized plan for this week's dinners. 
              This will be a collaborative process where we'll build the plan based on your needs.
            </p>
            <Button 
              onClick={() => setStep('meals')} 
              className="bg-[#21706D] hover:bg-[#2a8c88] text-white font-semibold py-2 px-6 rounded-md text-lg shadow-md"
              size="lg"
            >
              Let's Get Started
            </Button>
          </div>
        )}

        {/* Special Notes Step */}
        {step === 'special' && (
          <div className="ai-bubble conversation-bubble mb-4 bg-gray-50 p-6 rounded-lg border border-gray-100 shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Anything special happening this week?</h3>
            <p className="mb-4">
              Let me know if there's anything I should take into account:
              <ul className="list-disc pl-5 mt-2">
                <li>Guests visiting</li>
                <li>Ingredients you want to use up</li>
                <li>Nights you'll be eating out</li>
                <li>Days you need extra-quick meals</li>
              </ul>
            </p>
            
            <form onSubmit={handleSpecialNotesSubmit} className="mt-4">
              <Input
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Type your notes here..."
                className="mb-3"
              />
              <Button 
                type="submit" 
                className="bg-teal-primary hover:bg-teal-light text-white font-semibold py-2 px-6 rounded-md shadow-md"
                size="lg"
              >
                Continue
              </Button>
            </form>
          </div>
        )}

        {/* Meal Selection */}
        {step === 'meals' && (
          <div className="ai-bubble conversation-bubble bg-gray-50 p-6 rounded-lg border border-gray-100 shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Choose meals for each day</h3>
            <p className="mb-4">
              Select the type of meal you want for each day of the week. You can leave days empty if you plan to eat out or use leftovers.
            </p>
            
            <div className="my-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Day</TableHead>
                    {MEAL_CATEGORIES.map((category) => (
                      <TableHead key={category.id} className="text-center">
                        <div className="flex flex-col items-center">
                          <span>{category.name}</span>
                          <span className="text-xl">{category.icon}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DAYS_OF_WEEK.map((day) => (
                    <TableRow key={day}>
                      <TableCell className="font-medium">{day}</TableCell>
                      {MEAL_CATEGORIES.map((category) => (
                        <TableCell key={`${day}-${category.id}`} className="text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              id={`${day}-${category.id}`}
                              checked={(mealsByDay[day] || []).includes(category.id)}
                              onCheckedChange={() => handleCategorySelect(category.id, day)}
                            />
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold mb-2">Summary</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {MEAL_CATEGORIES.map((category) => (
                  <div key={category.id} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                    <span className="mr-1">{category.icon}</span> 
                    <span>{category.name}: {selectedCategories[category.id] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-4">
              <Button 
                onClick={handleGenerateMealPlan}
                className="bg-teal-primary hover:bg-teal-light text-white font-semibold py-2 px-6 rounded-md shadow-md"
                size="lg"
                disabled={Object.keys(mealsByDay).length === 0}
              >
                Generate My Meal Plan
              </Button>
            </div>
          </div>
        )}

        {/* Generating Step */}
        {step === 'generating' && (
          <div className="ai-bubble conversation-bubble bg-gray-50 p-6 rounded-lg border border-gray-100 shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Creating your meal plan...</h3>
            <p className="mb-4">
              I'm putting together your customized meal plan based on your preferences and schedule.
              This might take a moment!
            </p>
            <div className="flex items-center justify-center my-8">
              <div className="animate-spin h-8 w-8 border-4 border-teal-primary border-t-transparent rounded-full"></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}