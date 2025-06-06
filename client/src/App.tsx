import { Route, Switch, useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import MealPlan from "@/pages/MealPlan";
import SimpleMealPlan from "@/pages/SimpleMealPlan";
import MealPlanBuilder from "@/pages/MealPlanBuilder";
import GroceryList from "@/pages/GroceryList";
import ProfileSimple from "@/pages/ProfileSimple";
import Onboarding from "@/pages/onboarding";
import ChatOnboarding from "@/pages/chat-onboarding";
import TestErrorHandling from "@/pages/test-error-handling";
import NotFound from "@/pages/not-found";
import ShowMealPlan from "@/pages/show-meal-plan";
import Settings from "@/pages/settings";
import { useEffect, useState } from "react";
import { HouseholdProvider } from "@/contexts/household-context";
import { MealPlanProvider } from "@/contexts/meal-plan-context";
import { Loader2 } from "lucide-react";

function App() {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  
  // Handle initial loading state
  useEffect(() => {
    console.log('App component mounted');
    // Add a slight delay to show loading indicator
    const timer = setTimeout(() => {
      setIsLoading(false);
      console.log('App ready to render');
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // For development only - allow direct navigation to Home
  // We now disable the auto-redirect to onboarding since DinnerBot is used as emergency meal helper
  // If re-enabling this logic, consider checking if the household data exists first
  // useEffect(() => {
  //   if (location === "/" && !isLoading) {
  //     console.log('Redirecting to chat-onboarding');
  //     setLocation("/chat-onboarding");
  //   }
  // }, [location, setLocation, isLoading]);
  
  // Show loading indicator while app initializes
  if (isLoading) {
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
