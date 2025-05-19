import OpenAI from "openai";
import { log } from "./vite";

// Initialize OpenAI client using the API key from environment
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
 * @returns Array of well-formatted recipe instructions or null if generation fails
 */
export async function regenerateRecipeInstructions(recipe: {
  title: string;
  ingredients: string[];
}): Promise<string[] | null> {
  const { title, ingredients } = recipe;

  const systemPrompt = `
You are a detail-oriented recipe assistant. Your task is to generate crystal-clear, precise, step-by-step cooking instructions for home cooks.

Guidelines:
- Provide 8–10 numbered steps
- Each step must begin with a strong action verb (e.g. Preheat, Add, Stir, Roast)
- Mention specific ingredient names and amounts where possible
- Include exact cooking times and temperatures (e.g. Bake at 375°F for 25 minutes)
- Break complex steps into smaller steps
- Avoid vague phrases like "cook until done," "prepare ingredients," or "combine everything"
- Do not assume prior cooking knowledge
`;

  const userPrompt = `
Please generate detailed cooking instructions for the recipe titled:

"${title}"

Ingredients:
${ingredients.join("\n")}

Only return the instructions in a numbered list format. Do not include ingredients or extra explanations—just the instructions.
`;

  try {
    log(`[RECIPE GENERATOR] Regenerating instructions for: ${title}`, "openai");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const content = response.choices[0]?.message?.content || "";
    
    // Basic validation
    if (!content || content.trim().length === 0) {
      log(`[RECIPE GENERATOR] OpenAI returned empty content for ${title}`, "openai");
      return null;
    }

    log(`[RECIPE GENERATOR] Raw OpenAI response for ${title}: ${content.substring(0, 100)}...`, "openai");

    // Extract instructions from the numbered list
    const steps = content
      .split(/\n+/)
      .map(line => line.replace(/^\d+\.\s*/, "").trim())
      .filter(line => line.length > 0);

    if (steps.length < 6) {
      log(`[RECIPE GENERATOR] OpenAI returned too few steps (${steps.length}) for ${title}`, "openai");
      return null;
    }

    log(`[RECIPE GENERATOR] Successfully generated ${steps.length} instructions for ${title}`, "openai");
    return steps;
  } catch (error) {
    console.error(`[RECIPE GENERATOR] Failed to regenerate instructions for ${title}:`, error);
    return null;
  }
}