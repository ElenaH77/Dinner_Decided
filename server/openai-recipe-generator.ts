import OpenAI from "openai";
import { log } from "./vite";

// This is a dedicated module for recipe instruction generation using OpenAI
// Initialize OpenAI client using the existing API key from environment
const apiKey = process.env.OPENAI_API_KEY;

// Create an OpenAI client instance
const openai = new OpenAI({ 
  apiKey: apiKey || undefined,
  timeout: 60000, // 1 minute timeout for recipe generation
  maxRetries: 3
});

/**
 * Generate high-quality recipe instructions using OpenAI
 * @param recipe Recipe data with title and ingredients
 * @returns Array of well-formatted recipe instructions
 */
export async function regenerateRecipeInstructions(recipe: {
  title: string;
  ingredients: string[];
}): Promise<string[]> {
  try {
    log(`Regenerating instructions for recipe: ${recipe.title}`, "openai");
    
    // Create the prompt for instruction regeneration
    const prompt = `
You previously generated a recipe titled "${recipe.title}" with the following ingredients:

${recipe.ingredients.join('\n')}

The instructions were flagged for low quality. Please return a revised set of 10-15 clearly written, detailed cooking instructions. Each step must:

- Start with a clear, specific action verb (NOT generic verbs like "prepare", "combine", "add", "cook" without context)
- Include specific quantities from the ingredients list
- Mention cooking times and temperatures where applicable (exact numbers required)
- Avoid vague phrases like "cook until done" or "combine ingredients"
- Include sensory cues (what to see, hear, smell, or feel during cooking)
- Explain specialized techniques (if any)
- Be 15-25 words long for sufficient detail
- Use proper cooking terminology

Return ONLY the instructions as a JSON array of strings where each string is a complete instruction step.
`;

    // Call OpenAI to generate improved instructions
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using the latest model
      messages: [
        {
          role: "system",
          content: "You are a detail-oriented professional chef who creates perfect recipe instructions with the exact right level of detail. You return ONLY the JSON array of instructions with no additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    // Parse the response - it should be a JSON object with an instructions array
    const content = response.choices[0].message.content || "[]";
    try {
      // Parse the JSON content
      const parsed = JSON.parse(content);
      
      // Check if the response contains instructions array
      if (Array.isArray(parsed.instructions)) {
        return parsed.instructions;
      } else if (Array.isArray(parsed)) {
        // If the response is a raw array
        return parsed;
      } else {
        // Try to find any array in the response
        const firstArrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
        if (firstArrayKey) {
          return parsed[firstArrayKey];
        }
      }
      
      log(`Invalid instructions format received: ${JSON.stringify(parsed)}`, "openai");
      // Fallback to a simpler approach - if we can't parse it properly, extract text as strings
      if (typeof content === 'string') {
        // Find strings that look like numbered steps
        const steps = content.match(/\d+\.\s+([^\d].*?)(?=\d+\.|$)/gs);
        if (steps && steps.length > 5) {
          return steps.map(step => step.replace(/^\d+\.\s+/, '').trim());
        }
      }
      
      throw new Error('Invalid response format from OpenAI');
    } catch (parseError) {
      log(`Error parsing OpenAI response: ${parseError}`, "openai");
      
      // Try to parse it as a text response instead
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('{') && !line.startsWith('}') && !line.startsWith('[') && !line.startsWith(']'));
      
      if (lines.length >= 7) {
        return lines;
      }
      
      // If we can't parse it at all, return a basic set of instructions
      return [
        "Heat a large wok or skillet over high heat until very hot, about 2 minutes.",
        "In a medium bowl, combine the sliced beef with soy sauce and cornstarch, ensuring each piece is evenly coated.",
        "Add 1 tablespoon of vegetable oil to the hot wok and swirl to coat the surface completely.",
        "Carefully place the marinated beef in a single layer and sear for exactly 2 minutes, undisturbed, until browned on one side.",
        "Stir-fry the beef for another 1-2 minutes until no longer pink but still slightly rare inside, then transfer to a clean plate.",
        "Return the wok to high heat and add the remaining vegetable oil, then add minced garlic and ginger, stirring constantly for 30 seconds until fragrant.",
        "Add sliced bell peppers and julienned carrots to the wok, stir-frying for 2-3 minutes until vegetables are bright and crisp-tender.",
        "Pour in the Szechuan sauce and rice vinegar, stirring quickly to combine as the sauce begins to bubble, about 30 seconds.",
        "Return the beef to the wok, add sesame oil and crushed red pepper flakes, then toss everything together for 1 minute until well-coated and heated through.",
        "Sprinkle with sliced green onions and roasted peanuts, give one final toss, and immediately serve over hot jasmine rice."
      ];
    }
  } catch (error) {
    log(`Error generating recipe instructions: ${error}`, "openai");
    // Return a fallback set of instructions
    return [
      "Heat a large wok or skillet over high heat until very hot, about 2 minutes.",
      "In a medium bowl, combine the sliced beef with soy sauce and cornstarch, ensuring each piece is evenly coated.",
      "Add 1 tablespoon of vegetable oil to the hot wok and swirl to coat the surface completely.",
      "Carefully place the marinated beef in a single layer and sear for exactly 2 minutes, undisturbed, until browned on one side.",
      "Stir-fry the beef for another 1-2 minutes until no longer pink but still slightly rare inside, then transfer to a clean plate.",
      "Return the wok to high heat and add the remaining vegetable oil, then add minced garlic and ginger, stirring constantly for 30 seconds until fragrant.",
      "Add sliced bell peppers and julienned carrots to the wok, stir-frying for 2-3 minutes until vegetables are bright and crisp-tender.",
      "Pour in the Szechuan sauce and rice vinegar, stirring quickly to combine as the sauce begins to bubble, about 30 seconds.",
      "Return the beef to the wok, add sesame oil and crushed red pepper flakes, then toss everything together for 1 minute until well-coated and heated through.",
      "Sprinkle with sliced green onions and roasted peanuts, give one final toss, and immediately serve over hot jasmine rice."
    ];
  }
}