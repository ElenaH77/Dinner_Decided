import { Route, Switch, useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/home";
import MealPlan from "@/pages/meal-plan";
import GroceryList from "@/pages/grocery-list";
import Profile from "@/pages/household-profile";
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
  
  // Redirect to onboarding on first load for demo purposes
  useEffect(() => {
    // Only redirect if we're at the root path and want to simulate first-time use
    if (location === "/") {
      setLocation("/chat-onboarding");
    }
  }, [location, setLocation]);
  
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
                <Route path="/this-week" component={MealPlan} />
                <Route path="/meal-plan" component={MealPlan} /> {/* Alias for backward compatibility */}
                <Route path="/meals" component={MealPlan} /> {/* Alias for backward compatibility */}
                <Route path="/grocery" component={GroceryList} />
                <Route path="/profile" component={Profile} />
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
