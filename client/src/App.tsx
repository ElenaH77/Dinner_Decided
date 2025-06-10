import { Route, Switch, useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import MealPlan from "@/pages/MealPlan";
import SimpleMealPlan from "@/pages/SimpleMealPlan";
import MealPlanBuilder from "@/pages/MealPlanBuilder";
import GroceryList from "@/pages/GroceryList";
import ProfileSimple from "@/pages/ProfileSimpleFixed";
import QuickProfile from "@/pages/QuickProfile";
import Onboarding from "@/pages/Onboarding";
import ChatOnboarding from "@/pages/chat-onboarding";
import TestErrorHandling from "@/pages/test-error-handling";
import NotFound from "@/pages/not-found";
import ShowMealPlan from "@/pages/show-meal-plan";
import Settings from "@/pages/settings";
import { useEffect, useState } from "react";
import { HouseholdProvider } from "@/contexts/household-context";
import { MealPlanProvider } from "@/contexts/meal-plan-context";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import "@/lib/reset-household";

function App() {
  const [location, setLocation] = useLocation();
  
  // Check if user has completed onboarding
  const { data: household, isLoading: householdLoading, error } = useQuery({
    queryKey: ['/api/household'],
    retry: false, // Don't retry if household doesn't exist
  });
  
  // Show loading indicator while checking household status
  if (householdLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h1 className="mt-4 text-xl font-medium text-foreground">Loading Dinner, Decided</h1>
          <p className="text-muted-foreground mt-2">Your meal planning assistant is getting ready...</p>
        </div>
      </div>
    );
  }
  
  // If no household exists or onboarding not complete, redirect to onboarding
  const needsOnboarding = !household || !household.onboardingComplete;
  
  if (needsOnboarding && location !== "/onboarding") {
    return <Onboarding />;
  }
  
  return (
    <HouseholdProvider>
      <MealPlanProvider>
        <Switch>
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/chat-onboarding" component={ChatOnboarding} />
          
          <Route>
            {/* All other routes use the AppLayout */}
            <AppLayout>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/this-week" component={SimpleMealPlan} />
                <Route path="/meal-plan" component={SimpleMealPlan} /> {/* Alias for backward compatibility */}
                <Route path="/meals" component={SimpleMealPlan} /> {/* Alias for backward compatibility */}
                <Route path="/meal-plan-builder" component={MealPlanBuilder} />
                <Route path="/old-meal-plan" component={MealPlan} /> {/* Old version in case we need to revert */}
                <Route path="/grocery" component={GroceryList} />
                <Route path="/profile" component={ProfileSimple} />
                <Route path="/quick-profile" component={QuickProfile} />
                <Route path="/settings" component={Settings} />
                <Route path="/test-errors" component={TestErrorHandling} />
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
