import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import MealPlan from "@/pages/meal-plan";
import GroceryList from "@/pages/grocery-list";
import HouseholdProfile from "@/pages/household-profile";
import Onboarding from "@/pages/onboarding";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useHousehold } from "./contexts/household-context";
import { useEffect } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  const { hasProfile } = useHousehold();

  // If no profile exists, redirect to onboarding
  useEffect(() => {
    if (!hasProfile && location !== '/onboarding') {
      setLocation('/onboarding');
    }
  }, [hasProfile, location, setLocation]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/meal-plan" component={MealPlan} />
      <Route path="/grocery-list" component={GroceryList} />
      <Route path="/household-profile" component={HouseholdProfile} />
      <Route path="/onboarding" component={Onboarding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col min-h-screen bg-neutral-background">
          <Header />
          <div className="flex-grow">
            <Toaster />
            <Router />
          </div>
          <Footer />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
