import {
  User,
  InsertUser,
  HouseholdMember,
  InsertHouseholdMember,
  KitchenEquipment,
  InsertKitchenEquipment,
  CookingPreference,
  InsertCookingPreference,
  Meal,
  InsertMeal,
  MealPlan,
  InsertMealPlan,
  GroceryItem,
  InsertGroceryItem,
  ChatMessage,
  InsertChatMessage
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Household member operations
  getHouseholdMembers(userId: number): Promise<HouseholdMember[]>;
  getHouseholdMember(id: number): Promise<HouseholdMember | undefined>;
  createHouseholdMember(member: InsertHouseholdMember): Promise<HouseholdMember>;
  updateHouseholdMember(id: number, member: Partial<InsertHouseholdMember>): Promise<HouseholdMember | undefined>;
  deleteHouseholdMember(id: number): Promise<boolean>;

  // Kitchen equipment operations
  getKitchenEquipment(userId: number): Promise<KitchenEquipment[]>;
  createKitchenEquipment(equipment: InsertKitchenEquipment): Promise<KitchenEquipment>;
  updateKitchenEquipment(id: number, equipment: Partial<InsertKitchenEquipment>): Promise<KitchenEquipment | undefined>;
  deleteKitchenEquipment(id: number): Promise<boolean>;

  // Cooking preferences operations
  getCookingPreferences(userId: number): Promise<CookingPreference | undefined>;
  createCookingPreferences(preferences: InsertCookingPreference): Promise<CookingPreference>;
  updateCookingPreferences(id: number, preferences: Partial<InsertCookingPreference>): Promise<CookingPreference | undefined>;

  // Meal operations
  getMeals(userId: number): Promise<Meal[]>;
  getMeal(id: number): Promise<Meal | undefined>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  updateMeal(id: number, meal: Partial<InsertMeal>): Promise<Meal | undefined>;
  deleteMeal(id: number): Promise<boolean>;

  // Meal plan operations
  getMealPlans(userId: number): Promise<MealPlan[]>;
  getCurrentMealPlan(userId: number): Promise<MealPlan | undefined>;
  getMealPlan(id: number): Promise<MealPlan | undefined>;
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  updateMealPlan(id: number, mealPlan: Partial<InsertMealPlan>): Promise<MealPlan | undefined>;
  deleteMealPlan(id: number): Promise<boolean>;

  // Grocery item operations
  getGroceryItems(mealPlanId: number): Promise<GroceryItem[]>;
  createGroceryItem(item: InsertGroceryItem): Promise<GroceryItem>;
  updateGroceryItem(id: number, item: Partial<InsertGroceryItem>): Promise<GroceryItem | undefined>;
  deleteGroceryItem(id: number): Promise<boolean>;
  toggleGroceryItem(id: number): Promise<GroceryItem | undefined>;

  // Chat message operations
  getChatMessages(userId: number, mealPlanId?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private householdMembers: Map<number, HouseholdMember>;
  private kitchenEquipment: Map<number, KitchenEquipment>;
  private cookingPreferences: Map<number, CookingPreference>;
  private meals: Map<number, Meal>;
  private mealPlans: Map<number, MealPlan>;
  private groceryItems: Map<number, GroceryItem>;
  private chatMessages: Map<number, ChatMessage>;
  
  private userIdCounter: number;
  private householdMemberIdCounter: number;
  private kitchenEquipmentIdCounter: number;
  private cookingPreferencesIdCounter: number;
  private mealIdCounter: number;
  private mealPlanIdCounter: number;
  private groceryItemIdCounter: number;
  private chatMessageIdCounter: number;

  constructor() {
    this.users = new Map();
    this.householdMembers = new Map();
    this.kitchenEquipment = new Map();
    this.cookingPreferences = new Map();
    this.meals = new Map();
    this.mealPlans = new Map();
    this.groceryItems = new Map();
    this.chatMessages = new Map();
    
    this.userIdCounter = 1;
    this.householdMemberIdCounter = 1;
    this.kitchenEquipmentIdCounter = 1;
    this.cookingPreferencesIdCounter = 1;
    this.mealIdCounter = 1;
    this.mealPlanIdCounter = 1;
    this.groceryItemIdCounter = 1;
    this.chatMessageIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Household member operations
  async getHouseholdMembers(userId: number): Promise<HouseholdMember[]> {
    return Array.from(this.householdMembers.values()).filter(
      (member) => member.userId === userId
    );
  }

  async getHouseholdMember(id: number): Promise<HouseholdMember | undefined> {
    return this.householdMembers.get(id);
  }

  async createHouseholdMember(member: InsertHouseholdMember): Promise<HouseholdMember> {
    const id = this.householdMemberIdCounter++;
    const householdMember: HouseholdMember = { ...member, id };
    this.householdMembers.set(id, householdMember);
    return householdMember;
  }

  async updateHouseholdMember(id: number, member: Partial<InsertHouseholdMember>): Promise<HouseholdMember | undefined> {
    const existingMember = this.householdMembers.get(id);
    if (!existingMember) return undefined;

    const updatedMember = { ...existingMember, ...member };
    this.householdMembers.set(id, updatedMember);
    return updatedMember;
  }

  async deleteHouseholdMember(id: number): Promise<boolean> {
    return this.householdMembers.delete(id);
  }

  // Kitchen equipment operations
  async getKitchenEquipment(userId: number): Promise<KitchenEquipment[]> {
    return Array.from(this.kitchenEquipment.values()).filter(
      (equipment) => equipment.userId === userId
    );
  }

  async createKitchenEquipment(equipment: InsertKitchenEquipment): Promise<KitchenEquipment> {
    const id = this.kitchenEquipmentIdCounter++;
    const kitchenEquip: KitchenEquipment = { ...equipment, id };
    this.kitchenEquipment.set(id, kitchenEquip);
    return kitchenEquip;
  }

  async updateKitchenEquipment(id: number, equipment: Partial<InsertKitchenEquipment>): Promise<KitchenEquipment | undefined> {
    const existingEquipment = this.kitchenEquipment.get(id);
    if (!existingEquipment) return undefined;

    const updatedEquipment = { ...existingEquipment, ...equipment };
    this.kitchenEquipment.set(id, updatedEquipment);
    return updatedEquipment;
  }

  async deleteKitchenEquipment(id: number): Promise<boolean> {
    return this.kitchenEquipment.delete(id);
  }

  // Cooking preferences operations
  async getCookingPreferences(userId: number): Promise<CookingPreference | undefined> {
    return Array.from(this.cookingPreferences.values()).find(
      (prefs) => prefs.userId === userId
    );
  }

  async createCookingPreferences(preferences: InsertCookingPreference): Promise<CookingPreference> {
    const id = this.cookingPreferencesIdCounter++;
    const cookingPrefs: CookingPreference = { ...preferences, id };
    this.cookingPreferences.set(id, cookingPrefs);
    return cookingPrefs;
  }

  async updateCookingPreferences(id: number, preferences: Partial<InsertCookingPreference>): Promise<CookingPreference | undefined> {
    const existingPreferences = this.cookingPreferences.get(id);
    if (!existingPreferences) return undefined;

    const updatedPreferences = { ...existingPreferences, ...preferences };
    this.cookingPreferences.set(id, updatedPreferences);
    return updatedPreferences;
  }

  // Meal operations
  async getMeals(userId: number): Promise<Meal[]> {
    return Array.from(this.meals.values()).filter(
      (meal) => meal.userId === userId
    );
  }

  async getMeal(id: number): Promise<Meal | undefined> {
    return this.meals.get(id);
  }

  async createMeal(meal: InsertMeal): Promise<Meal> {
    const id = this.mealIdCounter++;
    const newMeal: Meal = { ...meal, id };
    this.meals.set(id, newMeal);
    return newMeal;
  }

  async updateMeal(id: number, meal: Partial<InsertMeal>): Promise<Meal | undefined> {
    const existingMeal = this.meals.get(id);
    if (!existingMeal) return undefined;

    const updatedMeal = { ...existingMeal, ...meal };
    this.meals.set(id, updatedMeal);
    return updatedMeal;
  }

  async deleteMeal(id: number): Promise<boolean> {
    return this.meals.delete(id);
  }

  // Meal plan operations
  async getMealPlans(userId: number): Promise<MealPlan[]> {
    return Array.from(this.mealPlans.values()).filter(
      (plan) => plan.userId === userId
    );
  }

  async getCurrentMealPlan(userId: number): Promise<MealPlan | undefined> {
    const today = new Date();
    return Array.from(this.mealPlans.values()).find(
      (plan) => 
        plan.userId === userId && 
        new Date(plan.weekStartDate) <= today && 
        new Date(plan.weekEndDate) >= today
    );
  }

  async getMealPlan(id: number): Promise<MealPlan | undefined> {
    return this.mealPlans.get(id);
  }

  async createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan> {
    const id = this.mealPlanIdCounter++;
    const newMealPlan: MealPlan = { ...mealPlan, id };
    this.mealPlans.set(id, newMealPlan);
    return newMealPlan;
  }

  async updateMealPlan(id: number, mealPlan: Partial<InsertMealPlan>): Promise<MealPlan | undefined> {
    const existingMealPlan = this.mealPlans.get(id);
    if (!existingMealPlan) return undefined;

    const updatedMealPlan = { ...existingMealPlan, ...mealPlan };
    this.mealPlans.set(id, updatedMealPlan);
    return updatedMealPlan;
  }

  async deleteMealPlan(id: number): Promise<boolean> {
    return this.mealPlans.delete(id);
  }

  // Grocery item operations
  async getGroceryItems(mealPlanId: number): Promise<GroceryItem[]> {
    return Array.from(this.groceryItems.values()).filter(
      (item) => item.mealPlanId === mealPlanId
    );
  }

  async createGroceryItem(item: InsertGroceryItem): Promise<GroceryItem> {
    const id = this.groceryItemIdCounter++;
    const groceryItem: GroceryItem = { ...item, id };
    this.groceryItems.set(id, groceryItem);
    return groceryItem;
  }

  async updateGroceryItem(id: number, item: Partial<InsertGroceryItem>): Promise<GroceryItem | undefined> {
    const existingItem = this.groceryItems.get(id);
    if (!existingItem) return undefined;

    const updatedItem = { ...existingItem, ...item };
    this.groceryItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteGroceryItem(id: number): Promise<boolean> {
    return this.groceryItems.delete(id);
  }

  async toggleGroceryItem(id: number): Promise<GroceryItem | undefined> {
    const item = this.groceryItems.get(id);
    if (!item) return undefined;

    const updatedItem = { ...item, isChecked: !item.isChecked };
    this.groceryItems.set(id, updatedItem);
    return updatedItem;
  }

  // Chat message operations
  async getChatMessages(userId: number, mealPlanId?: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter((message) => {
        if (message.userId !== userId) return false;
        if (mealPlanId && message.mealPlanId !== mealPlanId) return false;
        return true;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = this.chatMessageIdCounter++;
    const chatMessage: ChatMessage = { ...message, id };
    this.chatMessages.set(id, chatMessage);
    return chatMessage;
  }
}

export const storage = new MemStorage();
