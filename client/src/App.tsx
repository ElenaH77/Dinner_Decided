import { Route, Switch } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import MealPlan from "@/pages/MealPlan";
import GroceryList from "@/pages/GroceryList";
import Profile from "@/pages/Profile";
import Onboarding from "@/pages/onboarding";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <Switch>
      <Route path="/onboarding">
        {/* Onboarding page doesn't use the AppLayout */}
        <Onboarding />
      </Route>
      
      <Route>
        {/* All other routes use the AppLayout */}
        <AppLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/meals" component={MealPlan} />
            <Route path="/grocery" component={GroceryList} />
            <Route path="/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

export default App;
