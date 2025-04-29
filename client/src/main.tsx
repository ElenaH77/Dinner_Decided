import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { HouseholdProvider } from "./contexts/household-context";
import { MealPlanProvider } from "./contexts/meal-plan-context";

createRoot(document.getElementById("root")!).render(
  <HouseholdProvider>
    <MealPlanProvider>
      <App />
    </MealPlanProvider>
  </HouseholdProvider>
);
