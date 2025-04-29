export type HouseholdMember = {
  id: string | number;
  userId?: number;
  name: string;
  dietaryRestrictions?: string;
  age?: string;
  isMainUser?: boolean;
};

export type KitchenEquipment = {
  id: number;
  userId: number;
  name: string;
  isOwned: boolean;
};

export type CookingPreference = {
  id: number;
  userId: number;
  confidenceLevel: number;
  weekdayCookingTime: string;
  weekendCookingStyle: string;
  preferredCuisines: string[];
  location: string;
};

export type MealTag = {
  label: string;
  isPrimary?: boolean;
};

export type Meal = {
  id: number;
  userId: number;
  name: string;
  description: string;
  imageUrl: string;
  prepTime: string;
  tags: string[];
  rationales: string[];
  ingredients: string[];
};

export type MealPlan = {
  id: number;
  userId: number;
  weekStartDate: string;
  weekEndDate: string;
  numberOfMeals: number;
  mealIds: number[];
  specialNotes?: string;
};

export type GroceryItem = {
  id: string | number;
  name: string;
  department: string;
  isChecked: boolean;
  relatedMealId?: string | number;
  mealPlanId?: number;
  quantity?: string;
};

export type ChatMessage = {
  id: number;
  userId: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  mealPlanId?: number;
};

export type GroceryDepartment = {
  name: string;
  items: GroceryItem[];
};

export type OnboardingStep = 'welcome' | 'household' | 'equipment' | 'preferences' | 'complete';
