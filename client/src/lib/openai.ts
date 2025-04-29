import { apiRequest } from "./queryClient";
import { Message } from "@/types";

export async function sendMessage(messages: Message[]): Promise<Message> {
  try {
    const response = await apiRequest("POST", "/api/chat", { messages });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

export async function generateMealPlan(household: any, preferences: any): Promise<any> {
  try {
    const response = await apiRequest("POST", "/api/meal-plan/generate", { household, preferences });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error generating meal plan:", error);
    throw error;
  }
}

export async function updateMealPlan(mealPlanId: number, updates: any): Promise<any> {
  try {
    const response = await apiRequest("PATCH", `/api/meal-plan/${mealPlanId}`, updates);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating meal plan:", error);
    throw error;
  }
}

export async function generateGroceryList(mealPlanId: number): Promise<any> {
  try {
    const response = await apiRequest("POST", `/api/grocery-list/generate`, { mealPlanId });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error generating grocery list:", error);
    throw error;
  }
}
