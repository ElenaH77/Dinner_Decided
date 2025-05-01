import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar } from "lucide-react";
import MealCard from "@/components/meals/MealCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Meal types with their descriptions
const MEAL_TYPES = [
  { value: "Quick & Easy", label: "Quick & Easy ⚡", description: "Ready in 30 minutes or less" },
  { value: "Weeknight Meals", label: "Weeknight Meals 🍽️", description: "Balanced dinners for busy evenings" },
  { value: "Batch Cooking", label: "Batch Cooking 📦", description: "Make once, eat multiple times" },
  { value: "Split Prep", label: "Split Prep ⏰", description: "Prep ahead, cook later" }
];

export default function MealPlan() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mealType, setMealType] = useState<string>("");
  const [preferences, setPreferences] = useState<string>("");
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  
  const { data: mealPlan, isLoading } = useQuery({
    queryKey: ['/api/meal-plan/current'],
  });

  const currentMeals = useMemo(() => {
    return mealPlan?.meals || [];
  }, [mealPlan]);

  // Open dialog to start creating a meal plan from scratch
  const handleCreateNewPlan = () => {
    toast({
      title: "Starting new meal plan",
      description: "Let's chat to create your new meal plan",
    });

    // Navigate to chat interface
    window.location.href = "/";
  };

  // Open dialog to add a single meal
  const handleAddMeal = () => {
    setIsDialogOpen(true);
  };

  // Reset form state
  const resetForm = () => {
    setMealType("");
    setPreferences("");
  };

  // Submit the new meal request to be generated
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
      // Call API to add a new meal
      const response = await apiRequest("POST", "/api/meal-plan/add-meal", {
        mealType,
        preferences
      });

      if (response.ok) {
        // Refresh meal plan data
        queryClient.invalidateQueries({ queryKey: ['/api/meal-plan/current'] });
        
        toast({
          title: "Meal added",
          description: "A new meal has been added to your plan"
        });

        // Close dialog and reset form
        setIsDialogOpen(false);
        resetForm();
      } else {
        const errorData = await response.json();
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
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#212121]">Your Meal Plan</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={handleAddMeal}
            className="bg-[#21706D] hover:bg-[#195957]"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Meal
          </Button>
          <Button 
            onClick={handleCreateNewPlan}
            variant="outline"
            className="border-[#21706D] text-[#21706D] hover:bg-[#21706D] hover:text-white"
          >
            New Plan
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
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
      ) : currentMeals.length > 0 ? (
        <div className="space-y-4">
          {currentMeals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      ) : (
        <Card className="w-full bg-white shadow-sm">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <Calendar className="h-12 w-12 text-[#21706D] mb-4" />
            <h3 className="text-lg font-medium mb-2">No meal plan yet</h3>
            <p className="text-sm text-[#8A8A8A] mb-4">
              Start a conversation with the assistant to create your personalized meal plan.
            </p>
            <Link href="/">
              <Button className="bg-[#21706D] hover:bg-[#195957]">Create Meal Plan</Button>
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
                placeholder="Ingredients to use, dietary preferences, etc."
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
