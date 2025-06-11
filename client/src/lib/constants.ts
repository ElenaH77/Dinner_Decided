// Welcome message for onboarding
export const ONBOARDING_WELCOME_MESSAGE = `Welcome to Dinner, Decided! I'm your personal meal planning assistant. I'll help you create a flexible, personalized weekly dinner plan tailored to your family's needs.

Let's get started with a few questions about your household. How many people are you cooking for?`;

// Welcome message for the DinnerBot chat assistant
export const WELCOME_MESSAGE = `Hey 👋 Need a hand with dinner? I can help you figure out what to do with that mystery veggie in your fridge, or save your Tuesday with a 10-minute dinner idea. What's going on?

Try asking me:
• "What can I make with sweet potatoes and black beans?"
• "Give me some 15-minute emergency dinner ideas"
• "What are some healthy dinners my kids will actually eat?"
• "I'm at Trader Joe's, what can I pick up for easy dinners?"`;

// Meal categories
export const MEAL_CATEGORIES = [
  "quick",
  "vegetarian",
  "vegan",
  "slowCooker",
  "instantPot",
  "kid-friendly",
  "family favorite",
  "batch cook",
  "leftover friendly",
  "low-carb",
  "healthy",
  "comfort food",
  "mexican",
  "italian",
  "asian",
];

// Grocery categories
export const GROCERY_CATEGORIES = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Frozen Foods",
  "Pantry Staples",
  "Canned Goods",
  "Condiments & Sauces",
  "Snacks",
  "Beverages",
  "Household"
];

// Kitchen appliance options
export const KITCHEN_APPLIANCES = [
  { id: "slowCooker", name: "Slow Cooker" },
  { id: "instantPot", name: "Instant Pot/Pressure Cooker" },
  { id: "airFryer", name: "Air Fryer" },
  { id: "standMixer", name: "Stand Mixer" },
  { id: "blender", name: "Blender" },
  { id: "foodProcessor", name: "Food Processor" },
  { id: "ovenStovetop", name: "Oven/Stovetop" },
  { id: "microwave", name: "Microwave" },
  { id: "grill", name: "Grill" },
  { id: "sousvide", name: "Sous Vide" },
];

// Cooking skill levels
export const COOKING_SKILL_LEVELS = [
  { value: 1, label: "Beginner - Basic cooking skills" },
  { value: 2, label: "Casual - Can follow simple recipes" },
  { value: 3, label: "Intermediate - Comfortable with most recipes" },
  { value: 4, label: "Advanced - Creative with recipes & ingredients" },
  { value: 5, label: "Expert - Professional-level cooking skills" }
];
