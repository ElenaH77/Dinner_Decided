import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, PlusCircle, Calendar, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
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

// Simple meal card component (defined inline)
const SimpleMealCard = ({ meal, onRemove }: { meal: any, onRemove: (id: string) => void }) => {
  return (
    <Card className="w-full relative shadow-sm hover:shadow transition-shadow duration-300">
      <button 
        onClick={() => onRemove(meal.id)}
        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors z-10"
        aria-label="Remove meal"
      >
        <X className="h-5 w-5" />
      </button>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {meal.category && (
            <Badge className="bg-[#21706D] text-white px-3 py-1 flex items-center gap-1">
              {meal.category.includes('Quick') && '⚡'}
              {meal.category.includes('Weeknight') && '🍽️'}
              {meal.category.includes('Batch') && '📦'}
              {meal.category.includes('Split') && '⏰'}
              <span>{meal.category}</span>
            </Badge>
          )}
          {meal.prepTime && (
            <Badge className="bg-[#F25C05] bg-opacity-80 text-white px-3 py-1">
              {meal.prepTime} min
            </Badge>
          )}
        </div>
        
        <h3 className="font-semibold text-lg mb-2">{meal.name}</h3>
        {meal.description && (
          <p className="text-sm text-[#8A8A8A] mb-3">{meal.description}</p>
        )}
        
        <div className="flex justify-end">
          <Button 
            variant="link" 
            size="sm" 
            className="text-[#21706D] hover:text-[#195957] text-sm font-medium p-0 flex items-center"
          >
            <FileText className="h-4 w-4 mr-1" /> View Recipe
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function SimpleMealPlan() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mealType, setMealType] = useState("");
  const [preferences, setPreferences] = useState("");
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [meals, setMeals] = useState<any[]>([]);
  
  // Fetch meal plan data
  const { data: mealPlan, isLoading } = useQuery({
    queryKey: ['/api/meal-plan/current'],
  });
  
  // Process meals when data is loaded
  useEffect(() => {
    if (mealPlan?.meals?.length) {
      const processedMeals = mealPlan.meals.map((meal: any, index: number) => ({
        ...meal,
        id: meal.id || `static-meal-${index}`
      }));
      setMeals(processedMeals);
    }
  }, [mealPlan]);
  
  // Add meal handler
  const handleAddMeal = () => {
    setIsDialogOpen(true);
  };
  
  // Remove meal handler
  const handleRemoveMeal = (mealId: string) => {
    if (!mealId) {
      console.error("Cannot remove meal with undefined ID");
      return;
    }
    
    console.log('Removing meal with ID:', mealId);
    console.log('Before removal, meals count:', meals.length);
    
    // Update local state
    setMeals(meals.filter(meal => meal.id !== mealId));
    
    toast({
      title: "Meal removed",
      description: "The meal has been removed from your plan"
    });
  };
  
  // Reset form state
  const resetForm = () => {
    setMealType("");
    setPreferences("");
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
      // Call API to add meal
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
    <div className="container max-w-4xl mx-auto py-6 px-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white py-4 border-b border-gray-100 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#212121]">Your Meal Plan</h1>
          <Button 
            onClick={handleAddMeal}
            className="bg-[#21706D] hover:bg-[#195957]"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Meal
          </Button>
        </div>
      </div>
      
      {/* Loading state */}
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
      ) : meals.length > 0 ? (
        <div className="space-y-4">
          {meals.map((meal) => (
            <SimpleMealCard 
              key={meal.id} 
              meal={meal} 
              onRemove={handleRemoveMeal} 
            />
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