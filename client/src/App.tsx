import { Route, Switch, useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import MealPlan from "@/pages/MealPlan";
import SimpleMealPlan from "@/pages/SimpleMealPlan";
import MealPlanBuilder from "@/pages/MealPlanBuilder";
import GroceryList from "@/pages/GroceryList";
import ProfileSimple from "@/pages/ProfileSimple";
import QuickProfile from "@/pages/QuickProfile";
import TestErrorHandling from "@/pages/test-error-handling";
import NotFound from "@/pages/not-found";
import ShowMealPlan from "@/pages/show-meal-plan";
import Settings from "@/pages/settings";
import TestNewUser from "@/pages/TestNewUser";
import Start from "@/pages/Start";
import DinnerBot from "@/pages/DinnerBot";
import { useEffect, useState } from "react";
import { HouseholdProvider } from "@/contexts/household-context";
import { MealPlanProvider } from "@/contexts/meal-plan-context";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import "@/lib/reset-household";
import "@/utils/household-recovery";

// Smart routing component for streamlined onboarding flow
function OnboardingRouter() {
  const [, setLocation] = useLocation();
  const { data: household, isLoading } = useQuery({
    queryKey: ['/api/household'],
    retry: false,
  });

  useEffect(() => {
    if (isLoading) return;

    // No household exists - redirect to start
    if (!household) {
      setLocation('/start');
      return;
    }

    const householdData = household as any;
    
    // Check if profile is complete
    const isProfileComplete = Boolean(
      householdData.ownerName?.trim() &&
      householdData.members?.length > 0 &&
      householdData.members[0]?.name?.trim() &&
      householdData.appliances?.length > 0
    );

    // Profile incomplete - go to profile
    if (!isProfileComplete) {
      setLocation('/profile');
      return;
    }

    // Profile complete - show meal planning
    setLocation('/this-week');
  }, [household, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return null;
}

function App() {
  return (
    <HouseholdProvider>
      <MealPlanProvider>
        <Switch>
          <Route path="/start" component={Start} />
          
          <Route>
            <AppLayout>
              <Switch>
                <Route path="/" component={OnboardingRouter} />
                <Route path="/dinnerbot" component={DinnerBot} />
                <Route path="/this-week" component={SimpleMealPlan} />
                <Route path="/meal-plan" component={SimpleMealPlan} />
                <Route path="/meals" component={SimpleMealPlan} />
                <Route path="/meal-plan-builder" component={MealPlanBuilder} />
                <Route path="/old-meal-plan" component={MealPlan} />
                <Route path="/grocery" component={GroceryList} />
                <Route path="/profile" component={ProfileSimple} />
                <Route path="/quick-profile" component={QuickProfile} />
                <Route path="/settings" component={Settings} />
                <Route path="/test-errors" component={TestErrorHandling} />
                <Route path="/test-new-user" component={TestNewUser} />
                <Route path="/show-meal-plan" component={ShowMealPlan} />
                <Route component={NotFound} />
              </Switch>
            </AppLayout>
          </Route>
        </Switch>
      </MealPlanProvider>
    </HouseholdProvider>
  );
}

export default App;
