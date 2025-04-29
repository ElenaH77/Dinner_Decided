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
    question: "😓 What makes dinner hard at your house?",
    hint: "(Anything goes—picky eaters, decision fatigue, no time, just tired. We get it.)",
    icon: '😓'
  }
];

// Response messages for each onboarding step
export const ONBOARDING_RESPONSES = {
  welcome: "Hi there! I'm your personal meal planning assistant. Let me ask you a few quick questions so I can create meal plans that work perfectly for your household.",
  
  household_response: (details: string) => 
    `Got it! I'll plan meals appropriate for ${details}. This helps me suggest the right portion sizes and kid-friendly options when needed.`,
  
  dietary_response: (restrictions: string) => 
    `Thanks for letting me know about ${restrictions}. I'll make sure to keep these preferences in mind when suggesting meals.`,
  
  equipment_response: (equipment: string[]) => 
    `Great! I'll suggest recipes that work with your ${equipment.join(', ')}. This helps me recommend meals you can actually make with what you have.`,
  
  skill_response: (level: string) => 
    `Perfect! I'll make sure to suggest recipes that match your comfort level: ${level}.`,
  
  location_response: (zipCode: string) => 
    `Thanks! I'll consider seasonal ingredients and weather patterns in ${zipCode} when planning your meals.`,
  
  challenges_response: (challenges: string) => 
    `I understand - ${challenges} can definitely make meal planning tougher. I'll work on suggestions that help overcome these challenges.`,
  
  complete: "Thanks for sharing all that information! I have everything I need to start creating personalized meal plans for you. Let's get cooking!"
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