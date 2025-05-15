// This file corrects the OpenAI API call code with proper error handling
const fs = require('fs');

// Read the current file
const content = fs.readFileSync('./server/openai.ts', 'utf8');

// Find the position of the API call problem
const startAPICall = content.indexOf('// Create the request to OpenAI with retry logic');
const endAPICall = content.indexOf('// Parse and process the response', startAPICall);

// Extract the problematic code section
const originalAPICall = content.substring(startAPICall, endAPICall);

// Corrected version with proper error handling
const correctedAPICall = `// Create the request to OpenAI with retry logic
    let response;
    try {
      // Calculate exponential backoff delay based on retry count
      const baseDelay = 1000; // 1 second
      const maxDelay = 10000; // 10 seconds
      const backoffDelay = Math.min(maxDelay, baseDelay * Math.pow(2, retryCount));
      
      if (retryCount > 0) {
        console.log(\`[MEAL PLAN] Retry attempt \${retryCount} - Applying backoff delay of \${backoffDelay}ms\`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    
      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
        {
          role: "system",
          content: \`You are a helpful meal planning assistant that creates personalized meal plans for busy families.
          
          IMPORTANT: You MUST return your response as a valid JSON object with an array of meal objects in a 'meals' property. Each meal object should have camelCase property names.
          
          Required properties for each meal:
          - name (string): The name of the dish
          - description (string): A brief description of the dish
          - categories (string[]): An array of meal categories (e.g., "quick", "batch cooking")
          - prepTime (number): Total preparation time in minutes
          - servings (number): Number of servings the meal makes
          - ingredients (string[]): Complete list of ALL ingredients with specific quantities - MUST include every single ingredient that appears in the directions
          - instructions (string[]): Step-by-step cooking instructions (8-10 detailed steps) with specific cooking times, temperatures and methods for every stage of cooking
          
          If the meal is assigned to a specific day, include:
          - day (string): The day of the week
          
          If rationales are requested, include:
          - rationales (string[]): Array of reasons why this meal is appropriate for the family
          
          For "split prep" meals, include:
          - prepInstructions (string): Detailed instructions for what to prepare ahead of time
          - cookingInstructions (string): Detailed instructions for the final cooking day
          
          Example response format:
          {
            "meals": [
              {
                "name": "Sheet Pan Chicken Fajitas",
                "description": "A quick and easy Mexican-inspired dinner with colorful bell peppers and tender chicken",
                "categories": ["quick", "mexican"],
                "day": "Monday",
                "prepTime": 25,
                "servings": 4,
                "ingredients": [
                  "1.5 lbs boneless, skinless chicken breast, sliced into strips", 
                  "1 red bell pepper, sliced", 
                  "1 green bell pepper, sliced", 
                  "1 yellow bell pepper, sliced", 
                  "1 large onion, sliced", 
                  "2 tbsp olive oil", 
                  "1 packet (2 tbsp) fajita seasoning", 
                  "1 tsp salt (for seasoning)",
                  "1/2 tsp black pepper (for seasoning)",
                  "1 sheet parchment paper",
                  "8 small flour tortillas", 
                  "1 lime, cut into wedges", 
                  "1/2 cup sour cream for serving", 
                  "1/4 cup chopped fresh cilantro for garnish"
                ],
                "instructions": [
                  "Preheat oven to 425°F (220°C) and position rack in the center. Line a large baking sheet with parchment paper.",
                  "Cut 1.5 lbs chicken breast into 1/4-inch strips. Place in a large bowl.",
                  "Slice 1 red bell pepper, 1 green bell pepper, 1 yellow bell pepper, and 1 large onion into 1/4-inch strips and add to the bowl with chicken.",
                  "Drizzle 2 tbsp olive oil over the mixture, then sprinkle with 2 tbsp fajita seasoning, 1 tsp salt, and 1/2 tsp black pepper.",
                  "Using clean hands or tongs, toss everything until the chicken and vegetables are evenly coated with oil and seasonings.",
                  "Spread the mixture in a single layer on the prepared baking sheet, making sure pieces aren't overlapping.",
                  "Roast in preheated oven for 20-25 minutes, stirring halfway through cooking time, until chicken reaches 165°F internal temperature and vegetables are tender with light charring on edges.",
                  "During the last 5 minutes of cooking, wrap 8 flour tortillas in aluminum foil and place in the oven to warm.",
                  "Cut 1 lime into 8 wedges and chop 1/4 cup fresh cilantro for garnish.",
                  "Serve by allowing each person to build their own fajitas with the roasted chicken mixture, warm tortillas, lime wedges, 1/2 cup sour cream, and cilantro."
                ],
                "rationales": ["Fits your weeknight time constraints", "Uses your family's preferred protein", "One-pan meal means easy cleanup"]
              },
              {...}
            ]
          }\`
        },
        {
          role: "user",
          content: promptContent
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });
    } catch (error) {
      console.error("[MEAL PLAN] API call failed:", error instanceof Error ? error.message : 'Unknown error');
      
      // Retry with backoff if we have attempts left
      if (retryCount < 3) {
        console.log(\`[MEAL PLAN] Retrying API call (attempt \${retryCount + 1} of 3)\`);
        return generateMealPlan(household, preferences, retryCount + 1);
      }
      throw error;
    }
    
`;

// Add the missing dummy response generator function
const dummyFunctionCode = `
// Dummy response generator for when API is not available
function generateDummyResponse(messages) {
  // Look for keywords in the latest user message to generate context-aware responses
  const lastUserMessage = messages.find(m => m.role === 'user')?.content || '';
  
  if (lastUserMessage.toLowerCase().includes('hello') || lastUserMessage.toLowerCase().includes('hi')) {
    return "Hello! I'm your meal planning assistant. How can I help you today? I can suggest recipes, create meal plans for the week, or help with your cooking questions.";
  }
  
  if (lastUserMessage.toLowerCase().includes('meal plan') || lastUserMessage.toLowerCase().includes('dinner ideas')) {
    return "I'd be happy to help with meal planning! Some dinner ideas for this week could include: \\n\\n• Sheet Pan Chicken Fajitas - quick and great for busy weeknights\\n• Pasta Primavera - vegetable-packed and versatile\\n• Slow Cooker Beef Stew - perfect comfort food that cooks while you're away\\n• Teriyaki Salmon - healthy with a touch of sweetness\\n• Homemade Pizza Night - fun for the whole family to customize\\n\\nWould you like more details about any of these meals?";
  }
  
  if (lastUserMessage.toLowerCase().includes('reset') || lastUserMessage.toLowerCase().includes('clear') || lastUserMessage.toLowerCase().includes('start over')) {
    return "I've reset our conversation! How can I help you with meal planning today?";
  }
  
  if (lastUserMessage.toLowerCase().includes('recipe') || lastUserMessage.toLowerCase().includes('how to make') || lastUserMessage.toLowerCase().includes('how do i cook')) {
    return "I'd be happy to help with recipe suggestions! To give you the best recommendations, could you share a bit more about what ingredients you have on hand, any dietary preferences, and how much time you have to cook?";
  }
  
  // Default response for any other queries
  return "I'm your friendly meal planning assistant. I can help suggest recipes based on your preferences, create weekly meal plans, or answer cooking questions. What would you like help with today?";
}
`;

// Replace the API call section
const updatedContent = content.replace(originalAPICall, correctedAPICall);

// Add the dummy response function if it doesn't exist
const hasDummyFunction = updatedContent.includes('function generateDummyResponse');
const finalContent = hasDummyFunction ? 
  updatedContent : 
  updatedContent.replace(
    '// Initialize OpenAI client with the API key (will throw error if invalid)', 
    '// Initialize OpenAI client with the API key (will throw error if invalid)\n' + dummyFunctionCode
  );

// Save the updated file
fs.writeFileSync('./server/openai.ts', finalContent);

console.log('OpenAI API code fixed successfully!');