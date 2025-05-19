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
You are a professional culinary instructor creating detailed recipe instructions for an upscale cookbook. Your instructions must be precise, specific, and educational for home cooks of all skill levels.

STRICT REQUIREMENTS:
1. Generate EXACTLY 10-12 numbered steps
2. Each step MUST begin with a strong action verb (e.g. Slice, Sauté, Whisk, Simmer) - NEVER use weak verbs like "add", "mix", "combine", "prepare", or "cook" by themselves 
3. Include SPECIFIC quantities for every ingredient mentioned (e.g. "2 tablespoons olive oil" not just "olive oil")
4. Provide EXACT cooking times with precise numbers (e.g. "for 12-15 minutes" not "until done")
5. Include SPECIFIC cooking temperatures with precise numbers (e.g. "at 375°F" or "over medium-high heat")
6. For meat dishes, specify INTERNAL temperature targets (e.g. "until internal temperature reaches 165°F for chicken")
7. Include multiple SENSORY descriptions to indicate doneness (e.g. "until golden brown and fragrant")
8. When using specialized techniques, briefly explain them (e.g. "Deglaze the pan by pouring in wine and scraping up browned bits")
9. Each instruction step should be 15-30 words and contain detailed guidance
10. NEVER use generic phrases like "to taste", "until done", "cook as directed", or "follow package directions"

You are writing for an award-winning cookbook. Every instruction must be detailed, precise, and educational.
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

    // Validate overall instruction quality
    if (steps.length < 6) {
      log(`[RECIPE GENERATOR] OpenAI returned too few steps (${steps.length}) for ${title}`, "openai");
      return null;
    }
    
    // Check for steps that are too short (less than 10 characters)
    const shortSteps = steps.filter(step => step.length < 10);
    if (shortSteps.length > 0) {
      log(`[RECIPE GENERATOR] OpenAI returned ${shortSteps.length} steps that are too short for ${title}`, "openai");
      return null;
    }
    
    // Check for weak starting verbs that should be avoided
    const weakVerbs = ['add', 'combine', 'mix', 'cook', 'prepare'];
    const stepsWithWeakVerbs = steps.filter(step => {
      const firstWord = step.split(' ')[0].toLowerCase();
      return weakVerbs.includes(firstWord);
    });
    
    if (stepsWithWeakVerbs.length > 3) {
      log(`[RECIPE GENERATOR] OpenAI returned too many steps (${stepsWithWeakVerbs.length}) with weak verbs for ${title}`, "openai");
      // We don't return null here, just log it - we can still use the instructions
    }

    log(`[RECIPE GENERATOR] Successfully generated ${steps.length} instructions for ${title}`, "openai");
    return steps;
  } catch (error) {
    console.error(`[RECIPE GENERATOR] Failed to regenerate instructions for ${title}:`, error);
    return null;
  }
}