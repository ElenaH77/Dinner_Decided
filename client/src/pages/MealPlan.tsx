import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar } from "lucide-react";
import MealCard from "@/components/meals/MealCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useMemo } from "react";

export default function MealPlan() {
  const { toast } = useToast();
  
  const { data: mealPlan, isLoading } = useQuery({
    queryKey: ['/api/meal-plan/current'],
  });

  const currentMeals = useMemo(() => {
    return mealPlan?.meals || [];
  }, [mealPlan]);

  const handleCreateNewPlan = () => {
    toast({
      title: "Starting new meal plan",
      description: "Let's chat to create your new meal plan",
    });

    // Navigate to chat interface
    window.location.href = "/";
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#212121]">Your Meal Plan</h1>
        <Button 
          onClick={handleCreateNewPlan}
          className="bg-[#21706D] hover:bg-[#195957]"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-1/4">
                    <Skeleton className="h-32 md:h-full w-full" />
                  </div>
                  <div className="p-4 w-full md:w-3/4">
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
    </div>
  );
}
