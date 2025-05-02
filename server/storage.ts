import { 
  InsertHousehold, 
  Household, 
  Message, 
  MealPlan,
  InsertMealPlan,
  GroceryList,
  InsertGroceryList,
  households,
  messages,
  mealPlans,
  groceryLists
} from "@shared/schema";
import { db } from './db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface IStorage {
  // Meal methods
  getAllMeals(): Promise<any[]>;
  updateMeal(id: string, data: any): Promise<any>;
  // Household methods
  getHousehold(): Promise<Household | undefined>;
  createHousehold(data: InsertHousehold): Promise<Household>;
  updateHousehold(data: Partial<Household>): Promise<Household>;
  
  // Message methods
  getMessages(): Promise<Message[]>;
  saveMessage(message: Message): Promise<Message>;
  
  // MealPlan methods
  getMealPlan(id: number): Promise<MealPlan | undefined>;
  getCurrentMealPlan(): Promise<MealPlan | undefined>;
  createMealPlan(data: InsertMealPlan): Promise<MealPlan>;
  updateMealPlan(id: number, data: Partial<MealPlan>): Promise<MealPlan>;
  
  // GroceryList methods
  getGroceryList(id: number): Promise<GroceryList | undefined>;
  getGroceryListByMealPlanId(mealPlanId: number): Promise<GroceryList | undefined>;
  getCurrentGroceryList(): Promise<GroceryList | undefined>;
  createGroceryList(data: InsertGroceryList): Promise<GroceryList>;
  updateGroceryList(id: number, data: Partial<GroceryList>): Promise<GroceryList>;
  ensureMealInGroceryList(groceryListId: number, meal: any): Promise<GroceryList>;
}

export class MemStorage implements IStorage {
  // Collection of all meals across meal plans
  private allMeals: Map<string, any> = new Map();
  private household: Household | undefined;
  private messages: Message[] = [];
  private mealPlans: Map<number, MealPlan> = new Map();
  private groceryLists: Map<number, GroceryList> = new Map();
  private currentMealPlanId: number | undefined;
  private mealPlanCounter: number = 1;
  private groceryListCounter: number = 1;

  constructor() {
    // Initialize with demo data only if we haven't already loaded from a persistent store
    const persistentData = this.loadFromPersistentStore();
    
    if (!persistentData) {
      this.initializeDemoData();
      this.saveToPersistentStore();
    }
  }
  
  // Load data from persistent store to survive server restarts
  private loadFromPersistentStore(): boolean {
    try {
      // In a real implementation, this would load from a database
      // For now we'll just use a basic flag to control initialization
      const alreadyInitialized = process.env.STORAGE_INITIALIZED === 'true';
      
      if (alreadyInitialized) {
        console.log('[STORAGE] Using existing data - server restarted but memory persists');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[STORAGE] Failed to load from persistent store:', error);
      return false;
    }
  }
  
  // Save data to persistent store
  private saveToPersistentStore(): void {
    try {
      // In a real implementation, this would save to a database
      // For now, just set a flag to indicate we've initialized
      process.env.STORAGE_INITIALIZED = 'true';
      console.log('[STORAGE] Data initialized and flag set');
    } catch (error) {
      console.error('[STORAGE] Failed to save to persistent store:', error);
    }
  }

  // Meal methods
  async getAllMeals(): Promise<any[]> {
    // Collect meals from all meal plans
    const allMeals: any[] = [];
    
    // Iterate through all meal plans and extract meals
    for (const mealPlan of this.mealPlans.values()) {
      if (mealPlan.meals && Array.isArray(mealPlan.meals)) {
        for (const meal of mealPlan.meals) {
          // Add or update meal in the map
          this.allMeals.set(meal.id, meal);
        }
      }
    }
    
    // Return all meals as an array
    return Array.from(this.allMeals.values());
  }
  
  async updateMeal(id: string, data: any): Promise<any> {
    // Update the meal in our collection
    const existingMeal = this.allMeals.get(id);
    
    if (!existingMeal) {
      throw new Error(`Meal with id ${id} not found`);
    }
    
    const updatedMeal = {
      ...existingMeal,
      ...data
    };
    
    // Update in the all meals collection
    this.allMeals.set(id, updatedMeal);
    
    // Now update the meal in any meal plans that contain it
    for (const [planId, mealPlan] of this.mealPlans.entries()) {
      if (mealPlan.meals && Array.isArray(mealPlan.meals)) {
        const updatedMeals = mealPlan.meals.map(meal => 
          meal.id === id ? updatedMeal : meal
        );
        
        // Update the meal plan with the updated meals
        this.mealPlans.set(planId, {
          ...mealPlan,
          meals: updatedMeals
        });
      }
    }
    
    return updatedMeal;
  }
  
  private initializeDemoData() {
    // Create demo household
    this.household = {
      id: 1,
      name: "Demo Family",
      members: [
        { id: "1", name: "Parent 1", age: "35" },
        { id: "2", name: "Parent 2", age: "33" },
        { id: "3", name: "Child", age: "8" }
      ],
      cookingSkill: 3,
      preferences: "We try to have 2 vegetarian meals each week. Kids don't like spicy food. Everyone loves pasta and Mexican dishes.",
      appliances: ["slowCooker", "instantPot", "ovenStovetop"]
    };

    // Create sample messages
    this.messages = [
      {
        id: "welcome",
        role: "assistant",
        content: "Welcome to Dinner, Decided! I'm your personal meal planning assistant. I'll help you create a flexible, personalized weekly dinner plan tailored to your family's needs.\n\nLet's get started with a few questions about your household. How many people are you cooking for?",
        timestamp: new Date().toISOString()
      }
    ];

    // Create sample meal plan
    const mealPlan: MealPlan = {
      id: 1,
      name: "Weekly Meal Plan",
      householdId: 1,
      createdAt: new Date().toISOString(),
      isActive: true,
      meals: [
        {
          id: "meal1",
          name: "Sheet Pan Chicken Fajitas",
          description: "Perfect for a busy weeknight. Mexican-inspired, as your family enjoys, and can be prepared quickly on a sheet pan.",
          categories: ["quick", "mexican", "kid-friendly"],
          prepTime: 25,
          servings: 4,
          ingredients: [
            "1.5 lbs chicken breast, sliced",
            "2 bell peppers (red and green), sliced",
            "1 large onion, sliced",
            "2 tbsp olive oil",
            "1 packet fajita seasoning",
            "8 flour tortillas",
            "Toppings: sour cream, avocado, salsa"
          ]
        },
        {
          id: "meal2",
          name: "Creamy Vegetable Pasta",
          description: "A vegetarian pasta dish that satisfies your family's love for pasta while incorporating seasonal vegetables.",
          categories: ["vegetarian", "family favorite"],
          prepTime: 30,
          servings: 4,
          ingredients: [
            "1 lb pasta (penne or fusilli)",
            "2 cups mixed vegetables (broccoli, carrots, peas)",
            "1 cup heavy cream",
            "1/2 cup grated parmesan cheese",
            "2 cloves garlic, minced",
            "2 tbsp olive oil",
            "Salt and pepper to taste"
          ]
        },
        {
          id: "meal3",
          name: "Instant Pot Beef Stew",
          description: "Perfect for a busy day - quick to prepare in the Instant Pot. Mild flavor for the kids.",
          categories: ["instantPot", "make ahead"],
          prepTime: 45,
          servings: 6,
          ingredients: [
            "1.5 lbs beef stew meat",
            "4 carrots, chopped",
            "2 potatoes, diced",
            "1 onion, diced",
            "2 cloves garlic, minced",
            "2 cups beef broth",
            "2 tbsp tomato paste",
            "1 tsp thyme",
            "Salt and pepper to taste"
          ]
        }
      ]
    };
    
    this.mealPlans.set(mealPlan.id, mealPlan);
    this.currentMealPlanId = mealPlan.id;
    this.mealPlanCounter = 2;

    // Create sample grocery list
    const groceryList: GroceryList = {
      id: 1,
      mealPlanId: 1,
      householdId: 1,
      createdAt: new Date().toISOString(),
      sections: [
        {
          name: "Produce",
          items: [
            { id: "item1", name: "Bell peppers (red and green)", quantity: "4" },
            { id: "item2", name: "Onions, yellow", quantity: "3" },
            { id: "item3", name: "Carrots", quantity: "1 lb" },
            { id: "item4", name: "Broccoli", quantity: "1 head" },
            { id: "item5", name: "Potatoes", quantity: "2 large" },
            { id: "item6", name: "Garlic", quantity: "1 head" }
          ]
        },
        {
          name: "Meat & Seafood",
          items: [
            { id: "item7", name: "Chicken breast", quantity: "1.5 lbs", mealId: "meal1" },
            { id: "item8", name: "Beef stew meat", quantity: "1.5 lbs", mealId: "meal3" }
          ]
        },
        {
          name: "Dairy & Eggs",
          items: [
            { id: "item9", name: "Heavy cream", quantity: "1 cup", mealId: "meal2" },
            { id: "item10", name: "Parmesan cheese", quantity: "8 oz", mealId: "meal2" },
            { id: "item11", name: "Sour cream", quantity: "8 oz", mealId: "meal1" }
          ]
        },
        {
          name: "Pantry Staples",
          items: [
            { id: "item12", name: "Pasta (penne or fusilli)", quantity: "1 lb", mealId: "meal2" },
            { id: "item13", name: "Olive oil", quantity: "1 bottle" },
            { id: "item14", name: "Fajita seasoning", quantity: "1 packet", mealId: "meal1" },
            { id: "item15", name: "Beef broth", quantity: "2 cups", mealId: "meal3" },
            { id: "item16", name: "Tomato paste", quantity: "1 small can", mealId: "meal3" }
          ]
        },
        {
          name: "Bakery",
          items: [
            { id: "item17", name: "Flour tortillas", quantity: "1 package", mealId: "meal1" }
          ]
        }
      ]
    };
    
    this.groceryLists.set(groceryList.id, groceryList);
    this.groceryListCounter = 2;
  }

  // Household methods
  async getHousehold(): Promise<Household | undefined> {
    return this.household;
  }

  async createHousehold(data: InsertHousehold): Promise<Household> {
    this.household = {
      id: 1,
      ...data
    };
    return this.household;
  }

  async updateHousehold(data: Partial<Household>): Promise<Household> {
    if (!this.household) {
      throw new Error("No household exists");
    }
    
    // Handle special case for members to avoid new household creation
    if (data.id && data.id !== this.household.id) {
      console.log('[HOUSEHOLD] Keeping existing household ID instead of creating new one');
      data.id = this.household.id;
    }
    
    this.household = {
      ...this.household,
      ...data
    };
    
    return this.household;
  }

  // Message methods
  async getMessages(): Promise<Message[]> {
    return this.messages;
  }

  async saveMessage(message: Message): Promise<Message> {
    this.messages.push(message);
    return message;
  }

  // MealPlan methods
  async getMealPlan(id: number): Promise<MealPlan | undefined> {
    return this.mealPlans.get(id);
  }

  async getCurrentMealPlan(): Promise<MealPlan | undefined> {
    if (!this.currentMealPlanId) return undefined;
    return this.mealPlans.get(this.currentMealPlanId);
  }

  async createMealPlan(data: InsertMealPlan): Promise<MealPlan> {
    const id = this.mealPlanCounter++;
    
    // Deactivate all other meal plans
    for (const [planId, plan] of this.mealPlans.entries()) {
      if (plan.isActive) {
        this.mealPlans.set(planId, { ...plan, isActive: false });
      }
    }
    
    const mealPlan: MealPlan = {
      id,
      ...data
    };
    
    this.mealPlans.set(id, mealPlan);
    this.currentMealPlanId = id;
    
    return mealPlan;
  }

  async updateMealPlan(id: number, data: Partial<MealPlan>): Promise<MealPlan> {
    const existingPlan = this.mealPlans.get(id);
    
    if (!existingPlan) {
      throw new Error(`Meal plan with id ${id} not found`);
    }
    
    // Ensure data.meals is a new array with new copies of each meal object to prevent shared references
    let processedMeals = existingPlan.meals || [];
    
    if (data.meals && Array.isArray(data.meals)) {
      // Create deep copies of the meal objects to avoid reference sharing between meals
      processedMeals = data.meals.map(meal => {
        // Ensure the meal has an ID
        if (!meal.id) {
          meal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          console.log(`[STORAGE] Added missing ID to meal: ${meal.id}`);
        }
        
        // Create a deep copy of the meal to avoid reference sharing
        return JSON.parse(JSON.stringify(meal));
      });
      
      console.log(`[STORAGE] Processed ${processedMeals.length} meals for plan ${id}`);
    }
    
    // Process data to handle date conversion issues
    const processedData = { ...data };
    
    // If createdAt is a string, convert it to a Date object
    if (processedData.createdAt && typeof processedData.createdAt === 'string') {
      try {
        processedData.createdAt = new Date(processedData.createdAt);
      } catch (err) {
        console.warn('[STORAGE] Failed to parse createdAt date from string:', processedData.createdAt);
        // Use existing date from the plan or current date as fallback
        processedData.createdAt = existingPlan.createdAt || new Date();
      }
    }
    
    // Create the updated plan with the processed meals
    const updatedPlan = {
      ...existingPlan,
      ...processedData,
      meals: processedMeals
    };
    
    this.mealPlans.set(id, updatedPlan);
    
    // Set this as the current meal plan if it's active
    if (updatedPlan.isActive) {
      this.currentMealPlanId = id;
    }
    
    // Ensure it's saved persistently
    this.saveToPersistentStore();
    
    // Update the allMeals collection to stay in sync
    if (updatedPlan.meals && Array.isArray(updatedPlan.meals)) {
      for (const meal of updatedPlan.meals) {
        if (meal && meal.id) {
          this.allMeals.set(meal.id, JSON.parse(JSON.stringify(meal))); // Store a deep copy
        }
      }
    }
    
    console.log(`[STORAGE] Updated meal plan ${id} with ${updatedPlan.meals?.length || 0} meals`);
    
    // Log full details of meals to aid in debugging
    if (process.env.DEBUG) {
      console.log('[STORAGE] Updated meal plan contents:', 
                updatedPlan.meals.map((m: any) => ({ id: m.id, name: m.name })));
    }
    
    return updatedPlan;
  }

  // GroceryList methods
  async getGroceryList(id: number): Promise<GroceryList | undefined> {
    return this.groceryLists.get(id);
  }

  async getGroceryListByMealPlanId(mealPlanId: number): Promise<GroceryList | undefined> {
    for (const list of this.groceryLists.values()) {
      if (list.mealPlanId === mealPlanId) {
        return list;
      }
    }
    return undefined;
  }

  async getCurrentGroceryList(): Promise<GroceryList | undefined> {
    if (!this.currentMealPlanId) return undefined;
    
    return this.getGroceryListByMealPlanId(this.currentMealPlanId);
  }

  async createGroceryList(data: InsertGroceryList): Promise<GroceryList> {
    const id = this.groceryListCounter++;
    
    const groceryList: GroceryList = {
      id,
      ...data
    };
    
    this.groceryLists.set(id, groceryList);
    
    return groceryList;
  }

  async updateGroceryList(id: number, data: Partial<GroceryList>): Promise<GroceryList> {
    const existingList = this.groceryLists.get(id);
    
    if (!existingList) {
      throw new Error(`Grocery list with id ${id} not found`);
    }
    
    const updatedList = {
      ...existingList,
      ...data
    };
    
    this.groceryLists.set(id, updatedList);
    
    return updatedList;
  }

  async ensureMealInGroceryList(groceryListId: number, meal: any): Promise<GroceryList> {
    const groceryList = await this.getGroceryList(groceryListId);
    
    if (!groceryList) {
      throw new Error(`Grocery list with id ${groceryListId} not found`);
    }
    
    // Simple implementation - just ensuring there's a section that mentions the meal
    // A more complex implementation would handle individual ingredients
    
    // Check if the meal is already represented
    let mealAlreadyIncluded = false;
    
    for (const section of groceryList.sections) {
      if (section.items.some(item => item.mealId === meal.id)) {
        mealAlreadyIncluded = true;
        break;
      }
    }
    
    if (mealAlreadyIncluded) {
      return groceryList;
    }
    
    // If the meal is not included, add its ingredients to the list
    // This is a simplified version - a real implementation would be more sophisticated
    if (meal.ingredients && meal.ingredients.length > 0) {
      const updatedSections = [...groceryList.sections];
      
      // Add to pantry staples section as a fallback
      let pantrySection = updatedSections.find(s => s.name === "Pantry Staples");
      
      if (!pantrySection) {
        pantrySection = { name: "Pantry Staples", items: [] };
        updatedSections.push(pantrySection);
      }
      
      // Add each ingredient as an item
      for (let i = 0; i < meal.ingredients.length; i++) {
        pantrySection.items.push({
          id: `added-${meal.id}-${i}`,
          name: meal.ingredients[i],
          mealId: meal.id
        });
      }
      
      return this.updateGroceryList(groceryListId, { sections: updatedSections });
    }
    
    return groceryList;
  }
}

// Database implementation

export class DatabaseStorage implements IStorage {
  // Meal methods
  async getAllMeals(): Promise<any[]> {
    try {
      // Get the current meal plan
      const currentMealPlan = await this.getCurrentMealPlan();
      
      if (!currentMealPlan || !currentMealPlan.meals) {
        return [];
      }
      
      // Return meals from the current meal plan
      return Array.isArray(currentMealPlan.meals) ? currentMealPlan.meals : [];
    } catch (error) {
      console.error('Error getting all meals:', error);
      return [];
    }
  }
  
  async updateMeal(id: string, data: any): Promise<any> {
    try {
      // Get the current meal plan
      const currentMealPlan = await this.getCurrentMealPlan();
      
      if (!currentMealPlan || !currentMealPlan.meals) {
        throw new Error('No current meal plan found');
      }
      
      // Update the meal in the current meal plan
      const updatedMeals = Array.isArray(currentMealPlan.meals) ? 
        currentMealPlan.meals.map(meal => 
          meal.id === id ? { ...meal, ...data } : meal
        ) : [];
      
      // Save the updated meal plan
      await this.updateMealPlan(currentMealPlan.id, {
        ...currentMealPlan,
        meals: updatedMeals
      });
      
      // Return the updated meal
      return updatedMeals.find(meal => meal.id === id);
    } catch (error) {
      console.error(`Error updating meal ${id}:`, error);
      throw error;
    }
  }
  async getHousehold(): Promise<Household | undefined> {
    // Get the most recently created household (highest ID)
    const [household] = await db
      .select()
      .from(households)
      .orderBy(households.id, 'desc')
      .limit(1);
    
    console.log('[DATABASE] Retrieved household with ID:', household?.id);
    return household;
  }

  async createHousehold(data: InsertHousehold): Promise<Household> {
    const [household] = await db.insert(households).values(data).returning();
    return household;
  }

  async updateHousehold(data: Partial<Household>): Promise<Household> {
    // Always use the existing household ID to prevent creating new households
    const household = await this.getHousehold();
    if (!household) {
      throw new Error("No household found to update");
    }
    
    // Force the ID to be the same as the existing household
    const updateData = { ...data, id: household.id };
    
    console.log('[DATABASE] Updating household with ID:', household.id);
    
    const [updatedHousehold] = await db
      .update(households)
      .set(updateData)
      .where(eq(households.id, household.id))
      .returning();
    
    return updatedHousehold;
  }

  async getMessages(): Promise<Message[]> {
    return db.select().from(messages).orderBy(messages.timestamp);
  }

  async saveMessage(message: Message): Promise<Message> {
    // Process data to handle date conversion issues
    const processedMessage = { ...message };
    
    // Ensure timestamp is a valid Date object
    if (processedMessage.timestamp && typeof processedMessage.timestamp === 'string') {
      try {
        processedMessage.timestamp = new Date(processedMessage.timestamp);
      } catch (err) {
        console.warn('[DATABASE] Failed to parse timestamp from string:', processedMessage.timestamp);
        // Use current date as fallback
        processedMessage.timestamp = new Date();
      }
    }
    
    // Ensure we always have a valid Date object for timestamp
    if (!processedMessage.timestamp || !(processedMessage.timestamp instanceof Date)) {
      console.log('[DATABASE] Setting default timestamp for message');
      processedMessage.timestamp = new Date();
    }
    
    const [savedMessage] = await db.insert(messages).values(processedMessage).returning();
    return savedMessage;
  }

  async getMealPlan(id: number): Promise<MealPlan | undefined> {
    const [mealPlan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.id, id));
    
    return mealPlan;
  }

  async getCurrentMealPlan(): Promise<MealPlan | undefined> {
    const [mealPlan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.isActive, true))
      .orderBy(mealPlans.createdAt, 'desc')
      .limit(1);
    
    return mealPlan;
  }

  async createMealPlan(data: InsertMealPlan): Promise<MealPlan> {
    // If this is set as active, deactivate all other meal plans
    if (data.isActive) {
      await db
        .update(mealPlans)
        .set({ isActive: false })
        .where(eq(mealPlans.isActive, true));
    }
    
    // Process data to handle date conversion issues
    const processedData = { ...data };
    
    // Ensure createdAt is a valid Date object
    if (processedData.createdAt && typeof processedData.createdAt === 'string') {
      try {
        processedData.createdAt = new Date(processedData.createdAt);
      } catch (err) {
        console.warn('[DATABASE] Failed to parse createdAt date from string in createMealPlan:', processedData.createdAt);
        // Use current date as fallback
        processedData.createdAt = new Date();
      }
    }
    
    // Ensure we always have a valid Date object for createdAt
    if (!processedData.createdAt || !(processedData.createdAt instanceof Date)) {
      console.log('[DATABASE] Setting default creation date for meal plan');
      processedData.createdAt = new Date();
    }
    
    // Ensure meals array is properly formatted
    if (processedData.meals && Array.isArray(processedData.meals)) {
      processedData.meals = processedData.meals.map(meal => {
        // Ensure each meal has an ID
        if (!meal.id) {
          meal.id = `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          console.log(`[DATABASE] Added missing ID to meal: ${meal.id}`);
        }
        return meal;
      });
    }

    const [mealPlan] = await db.insert(mealPlans).values(processedData).returning();
    return mealPlan;
  }

  async updateMealPlan(id: number, data: Partial<MealPlan>): Promise<MealPlan> {
    // If this is set as active, deactivate all other meal plans
    if (data.isActive) {
      await db
        .update(mealPlans)
        .set({ isActive: false })
        .where(eq(mealPlans.isActive, true));
    }

    // Process data to handle date conversion issues
    const processedData = { ...data };
    
    // If createdAt is a string, convert it to a Date object
    if (processedData.createdAt && typeof processedData.createdAt === 'string') {
      try {
        processedData.createdAt = new Date(processedData.createdAt);
      } catch (err) {
        console.warn('[DATABASE] Failed to parse createdAt date from string:', processedData.createdAt);
        // Use current date as fallback
        processedData.createdAt = new Date();
      }
    }
    
    // Remove createdAt from update if it's not a proper Date object
    // This will prevent SQL errors in DB update
    if (processedData.createdAt && !(processedData.createdAt instanceof Date)) {
      console.warn('[DATABASE] Removing invalid createdAt from update data to prevent SQL errors');
      delete processedData.createdAt;
    }

    console.log('[DATABASE] Updating meal plan:', id, 'with processed data');

    const [updatedMealPlan] = await db
      .update(mealPlans)
      .set(processedData)
      .where(eq(mealPlans.id, id))
      .returning();
    
    return updatedMealPlan;
  }

  async getGroceryList(id: number): Promise<GroceryList | undefined> {
    const [groceryList] = await db
      .select()
      .from(groceryLists)
      .where(eq(groceryLists.id, id));
    
    return groceryList;
  }

  async getGroceryListByMealPlanId(mealPlanId: number): Promise<GroceryList | undefined> {
    const [groceryList] = await db
      .select()
      .from(groceryLists)
      .where(eq(groceryLists.mealPlanId, mealPlanId))
      .orderBy(groceryLists.createdAt, 'desc')
      .limit(1);
    
    return groceryList;
  }

  async getCurrentGroceryList(): Promise<GroceryList | undefined> {
    const currentMealPlan = await this.getCurrentMealPlan();
    if (!currentMealPlan) return undefined;
    
    return this.getGroceryListByMealPlanId(currentMealPlan.id);
  }

  async createGroceryList(data: InsertGroceryList): Promise<GroceryList> {
    // Process data to handle date conversion issues
    const processedData = { ...data };
    
    // Ensure createdAt is a valid Date object
    if (processedData.createdAt && typeof processedData.createdAt === 'string') {
      try {
        processedData.createdAt = new Date(processedData.createdAt);
      } catch (err) {
        console.warn('[DATABASE] Failed to parse createdAt date from string in createGroceryList:', processedData.createdAt);
        // Use current date as fallback
        processedData.createdAt = new Date();
      }
    }
    
    // Ensure we always have a valid Date object for createdAt
    if (!processedData.createdAt || !(processedData.createdAt instanceof Date)) {
      console.log('[DATABASE] Setting default creation date for grocery list');
      processedData.createdAt = new Date();
    }

    const [groceryList] = await db.insert(groceryLists).values(processedData).returning();
    return groceryList;
  }

  async updateGroceryList(id: number, data: Partial<GroceryList>): Promise<GroceryList> {
    // Process data to handle date conversion issues
    const processedData = { ...data };
    
    // If createdAt is a string, convert it to a Date object
    if (processedData.createdAt && typeof processedData.createdAt === 'string') {
      try {
        processedData.createdAt = new Date(processedData.createdAt);
      } catch (err) {
        console.warn('[DATABASE] Failed to parse createdAt date from string in grocery list:', processedData.createdAt);
        // Use current date as fallback
        processedData.createdAt = new Date();
      }
    }
    
    // Remove createdAt from update if it's not a proper Date object
    if (processedData.createdAt && !(processedData.createdAt instanceof Date)) {
      console.warn('[DATABASE] Removing invalid createdAt from grocery list update data');
      delete processedData.createdAt;
    }

    const [updatedGroceryList] = await db
      .update(groceryLists)
      .set(processedData)
      .where(eq(groceryLists.id, id))
      .returning();
    
    return updatedGroceryList;
  }

  async ensureMealInGroceryList(groceryListId: number, meal: any): Promise<GroceryList> {
    const groceryList = await this.getGroceryList(groceryListId);
    if (!groceryList) {
      throw new Error(`Grocery list with ID ${groceryListId} not found`);
    }

    // Get the meal's ingredients and add them to the grocery list if not already there
    if (!meal.ingredients || !meal.ingredients.length) {
      return groceryList;
    }

    const updatedSections = [...groceryList.sections];

    // Process each ingredient and add it to the appropriate section
    for (const ingredient of meal.ingredients) {
      // Simple logic to determine the section; in a real app this would be more sophisticated
      const sectionName = ingredient.toLowerCase().includes('meat') ? 'Meat & Seafood' :
                         ingredient.toLowerCase().includes('vegetable') ? 'Produce' :
                         ingredient.toLowerCase().includes('bread') ? 'Bakery' :
                         'Other';
      
      // Find the section or create it
      let section = updatedSections.find(s => s.name === sectionName);
      if (!section) {
        section = { name: sectionName, items: [] };
        updatedSections.push(section);
      }

      // Add the ingredient if not already present
      const itemExists = section.items.some(item => 
        item.name.toLowerCase() === ingredient.toLowerCase() && item.mealId === meal.id
      );

      if (!itemExists) {
        section.items.push({
          id: uuidv4(),
          name: ingredient,
          mealId: meal.id
        });
      }
    }

    // Update the grocery list with the new sections
    return this.updateGroceryList(groceryListId, { sections: updatedSections });
  }
}

// Use database storage
// Initialize demo data before exporting storage
const storage = new DatabaseStorage();

// Seed function to add initial data to database if needed
export async function seedInitialData() {
  try {
    // Check if we already have a household
    const existingHousehold = await storage.getHousehold();
    
    if (!existingHousehold) {
      // Create demo household
      const household = await storage.createHousehold({
        name: "Demo Family",
        members: [
          { id: "1", name: "Adult 1", age: "35" },
          { id: "2", name: "Adult 2", age: "33" },
          { id: "3", name: "Child", age: "8" }
        ],
        cookingSkill: 3,
        preferences: "We try to have 2 vegetarian meals each week. Kids don't like spicy food. Everyone loves pasta and Mexican dishes.",
        appliances: ["slowCooker", "instantPot", "ovenStovetop"]
      });
      
      // Add welcome message
      await storage.saveMessage({
        id: "welcome",
        role: "assistant",
        content: "Welcome to Dinner, Decided! I'm your personal meal planning assistant. I'll help you create a flexible, personalized weekly dinner plan tailored to your family's needs.\n\nLet's get started with a few questions about your household. How many people are you cooking for?",
        timestamp: new Date(),
        householdId: household.id
      });
      
      // Create initial meal plan
      const mealPlan = await storage.createMealPlan({
        name: "Weekly Meal Plan",
        householdId: household.id,
        createdAt: new Date(),
        isActive: true,
        meals: [
          {
            id: "meal1",
            name: "Sheet Pan Chicken Fajitas",
            description: "Perfect for a busy weeknight. Mexican-inspired, as your family enjoys, and can be prepared quickly on a sheet pan.",
            categories: ["quick", "mexican", "kid-friendly"],
            prepTime: 25,
            servings: 4,
            ingredients: [
              "1.5 lbs chicken breast, sliced",
              "2 bell peppers (red and green), sliced",
              "1 large onion, sliced",
              "2 tbsp olive oil",
              "1 packet fajita seasoning",
              "8 flour tortillas",
              "Toppings: sour cream, avocado, salsa"
            ]
          },
          {
            id: "meal2",
            name: "Creamy Vegetable Pasta",
            description: "A vegetarian pasta dish that satisfies your family's love for pasta while incorporating seasonal vegetables.",
            categories: ["vegetarian", "family favorite"],
            prepTime: 30,
            servings: 4,
            ingredients: [
              "1 lb pasta (penne or fusilli)",
              "2 cups mixed vegetables (broccoli, carrots, peas)",
              "1 cup heavy cream",
              "1/2 cup grated parmesan cheese",
              "2 cloves garlic, minced",
              "2 tbsp olive oil",
              "Salt and pepper to taste"
            ]
          },
          {
            id: "meal3",
            name: "Instant Pot Beef Stew",
            description: "Perfect for a busy day - quick to prepare in the Instant Pot. Mild flavor for the kids.",
            categories: ["instantPot", "make ahead"],
            prepTime: 45,
            servings: 6,
            ingredients: [
              "1.5 lbs beef stew meat",
              "4 carrots, chopped",
              "2 potatoes, diced",
              "1 onion, diced",
              "2 cloves garlic, minced",
              "2 cups beef broth",
              "2 tbsp tomato paste",
              "1 tsp thyme",
              "Salt and pepper to taste"
            ]
          }
        ]
      });
      
      // Create initial grocery list
      await storage.createGroceryList({
        mealPlanId: mealPlan.id,
        householdId: household.id,
        createdAt: new Date(),
        sections: [
          {
            name: "Produce",
            items: [
              { id: "item1", name: "Bell peppers (red and green)", quantity: "4" },
              { id: "item2", name: "Onions, yellow", quantity: "3" },
              { id: "item3", name: "Carrots", quantity: "1 lb" },
              { id: "item4", name: "Broccoli", quantity: "1 head" },
              { id: "item5", name: "Potatoes", quantity: "2 large" },
              { id: "item6", name: "Garlic", quantity: "1 head" }
            ]
          },
          {
            name: "Meat & Seafood",
            items: [
              { id: "item7", name: "Chicken breast", quantity: "1.5 lbs", mealId: "meal1" },
              { id: "item8", name: "Beef stew meat", quantity: "1.5 lbs", mealId: "meal3" }
            ]
          },
          {
            name: "Dairy & Eggs",
            items: [
              { id: "item9", name: "Heavy cream", quantity: "1 cup", mealId: "meal2" },
              { id: "item10", name: "Parmesan cheese", quantity: "8 oz", mealId: "meal2" },
              { id: "item11", name: "Sour cream", quantity: "8 oz", mealId: "meal1" }
            ]
          },
          {
            name: "Pantry Staples",
            items: [
              { id: "item12", name: "Pasta (penne or fusilli)", quantity: "1 lb", mealId: "meal2" },
              { id: "item13", name: "Olive oil", quantity: "1 bottle" },
              { id: "item14", name: "Fajita seasoning", quantity: "1 packet", mealId: "meal1" },
              { id: "item15", name: "Beef broth", quantity: "2 cups", mealId: "meal3" },
              { id: "item16", name: "Tomato paste", quantity: "1 small can", mealId: "meal3" }
            ]
          },
          {
            name: "Bakery",
            items: [
              { id: "item17", name: "Flour tortillas", quantity: "1 package", mealId: "meal1" }
            ]
          }
        ]
      });
      
      console.log("Initial data seeded successfully");
    }
  } catch (error) {
    console.error("Error seeding initial data:", error);
  }
}

export { storage };
