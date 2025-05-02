// Conversational onboarding questions and prompts
export const ONBOARDING_QUESTIONS = [
  {
    id: 'household',
    question: "👋 Let's start simple. Who are we feeding?",
    hint: "(How many adults? How many kids?)",
    icon: '👨‍👩‍👧‍👦'
  },
  {
    id: 'dietary',
    question: "🥦 Any food stuff we should know?",
    hint: "(Allergies, picky eaters, dietary needs, or \"we eat everything\" works too.)",
    icon: '🥦'
  },
  {
    id: 'equipment',
    question: "🔍 What's your kitchen like?",
    hint: "(Just check off what you use: Instant Pot, air fryer, oven, grill, etc.)",
    icon: '🍳'
  },
  {
    id: 'skill',
    question: "👨‍🍳 How do you feel about cooking?",
    options: [
      "I avoid it when I can",
      "I can follow a recipe",
      "I enjoy it when I have time",
      "Give me a cooking project!"
    ],
    icon: '👨‍🍳'
  },
  {
    id: 'location',
    question: "📍 Where do you live?",
    hint: "(Just your ZIP code—we'll use it to check the weather when planning)",
    icon: '📍'
  },
  {
    id: 'challenges',
    question: "😓 Last question: What makes dinner hard at your house?",
    hint: "(Anything goes—picky eaters, decision fatigue, no time, just tired. We get it.)",
    icon: '😓'
  }
];

// Response messages for each onboarding step
export const ONBOARDING_RESPONSES = {
  welcome: "Welcome to Dinner, Decided! I'm your personal meal planning assistant. I'll help you create a flexible, personalized weekly dinner plan tailored to your family's needs.\n\nLet's get started with a few questions about your household to create meal plans that work perfectly for you.",
  
  household_response: (details: string) => 
    `Got it! I'll plan meals appropriate for ${details || 'your household'}. This helps me suggest the right portion sizes and kid-friendly options when needed.`,
  
  dietary_response: (restrictions: string) => 
    `Thanks for letting me know! I'll make sure to keep these preferences in mind when suggesting meals.`,
  
  equipment_response: (equipment: string[]) => 
    equipment && equipment.length > 0 
      ? `Great! This helps me recommend meals you can actually make with what you have.`
      : `Thanks for letting me know about your kitchen setup. I'll focus on simple recipes that don't require specialized equipment.`,
  
  skill_response: (level: string) => 
    `Perfect! I'll make sure to suggest recipes that match your cooking comfort level.`,
  
  location_response: (zipCode: string) => 
    zipCode
      ? `Thanks! This helps me consider your local weather when we plan - no one wants soup when it's hot!`
      : `Thanks! This helps me consider your local weather when we plan - no one wants soup when it's hot!`,
  
  challenges_response: (challenges: string) => 
    challenges
      ? `I understand - ${challenges} can definitely make meal planning tougher. I'll work on suggestions that help overcome these challenges.`
      : `Thanks for sharing your thoughts on meal planning challenges. I'll design a meal plan that simplifies your dinner routine.`,
  
  complete: "Let's get cooking!"
};

// Emoji mapping for different categories
export const CATEGORY_EMOJIS = {
  household: '👨‍👩‍👧‍👦',
  dietary: '🥦',
  equipment: '🍳',
  skill: '👨‍🍳',
  location: '📍',
  challenges: '😓',
  success: '✅'
};