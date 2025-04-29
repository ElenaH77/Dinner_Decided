// Message types
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

// Meal types
export interface Meal {
  id: string;
  name: string;
  description?: string;
  categories: string[];
  prepTime?: number;
  servings?: number;
  imageUrl?: string;
  ingredients?: string[];
}

export interface MealPlan {
  id: number;
  name: string;
  createdAt: string;
  meals: Meal[];
}

// Grocery list types
export interface GroceryItem {
  id: string;
  name: string;
  quantity?: string;
  checked?: boolean;
  mealId?: string;
}

export interface GrocerySection {
  name: string;
  items: GroceryItem[];
}

export interface GroceryList {
  id: number;
  mealPlanId: number;
  createdAt: string;
  sections: GrocerySection[];
}

// Household types
export interface HouseholdMember {
  id: string;
  name: string;
  age: string;
  dietaryRestrictions?: string[];
}

export interface Household {
  id: number;
  name: string;
  members: HouseholdMember[];
  cookingSkill: number;
  preferences: string;
  appliances: string[];
}
