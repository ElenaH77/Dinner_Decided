import { Route, Switch, useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import MealPlan from "@/pages/MealPlan";
import SimpleMealPlan from "@/pages/SimpleMealPlan";
import MealPlanBuilder from "@/pages/MealPlanBuilder";
import GroceryList from "@/pages/GroceryList";
import ProfileSimple from "@/pages/ProfileSimple";
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
import "@/utils/household-recovery";

function App() {
  return (
    <HouseholdProvider>
      <MealPlanProvider>
        <Switch>
          <Route path="/chat-onboarding" component={ChatOnboarding} />
          
          <Route>
            <AppLayout>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/onboarding" component={ProfileSimple} />
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
