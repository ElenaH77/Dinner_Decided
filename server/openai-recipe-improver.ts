/**
 * OpenAI Recipe Instruction Improver
 * This module provides functionality to improve recipe instructions using OpenAI.
 */
import OpenAI from "openai";
import { validateMealQuality } from "./openai";

// Check if we have a valid API key
const apiKey = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: apiKey || undefined,
  timeout: 120000,
  maxRetries: 3,
});

/**
 * Improve recipe instructions to meet quality standards
 * @param recipe The recipe to improve
 * @returns Improved recipe with better instructions
 */
export async function improveRecipeInstructions(recipe: any, retryCount: number = 0): Promise<any> {
  if (!apiKey || apiKey === '') {
    console.log('[RECIPE IMPROVER] No valid API key, returning original recipe');
    return recipe;
  }
  
  try {
    console.log(`[RECIPE IMPROVER] Starting instruction improvement for "${recipe.name}"`);
    
    // Prepare the recipe context
    const recipeText = JSON.stringify(recipe);
    
    // Create detailed prompt specifically for instruction improvement
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: 
          `You are an expert culinary writer specializing in creating clear, detailed recipe instructions. Your task is to rewrite ONLY the instructions for the provided recipe to meet professional culinary standards.

          INSTRUCTION QUALITY STANDARDS:
          1. Write exactly 12-18 detailed instruction steps.
          2. Each step MUST begin with a strong, specific action verb (avoid weak verbs like "prepare", "add", "combine", "mix").
          3. Include PRECISE cooking times and temperatures with specific numbers in EVERY cooking step.
          4. Include specific internal cooking temperatures where applicable (e.g., 165°F for chicken, 145°F for fish).
          5. Include multiple sensory cues for doneness (visual, texture, aroma) to help home cooks.
          6. Include detailed technique explanations (e.g., explain folding, deglazing, etc.)
          7. Avoid ALL generic phrases like "cook until done", "to taste", "prepare ingredients", "as needed".
          8. Each step must be substantive and detailed (minimum 15 words per step).
          9. Instructions should be logically ordered and clear to follow.
          10. Include precise measurements and quantities in each step.

          DO NOT change the recipe name, ingredients, preparation time, or any other aspects of the recipe.
          ONLY rewrite the instructions array to meet the quality standards.
          
          RESPONSE FORMAT:
          Return a JSON object with ONLY the improved instructions array. Example:
          {
            "instructions": ["Step 1...", "Step 2...", ...]
          }`
        },
        {
          role: "user",
          content: `Here is the recipe that needs improved instructions: ${recipeText}
          
          Please rewrite ONLY the instructions to make them detailed, specific, and professional quality.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2048,
    });

    // Parse the response
    const content = response.choices[0].message.content || "{}";
    const improvedContent = JSON.parse(content);
    console.log(`[RECIPE IMPROVER] Received response from OpenAI for "${recipe.name}"`);
    
    // Make sure we got back an instructions array
    if (!improvedContent.instructions || !Array.isArray(improvedContent.instructions)) {
      throw new Error("Failed to get valid instructions from OpenAI");
    }
    
    console.log(`[RECIPE IMPROVER] Successfully parsed instructions array with ${improvedContent.instructions.length} steps`);
    
    // Create an improved recipe with the new instructions
    const improvedRecipe = { 
      ...recipe,
      instructions: improvedContent.instructions,
      _needsRegeneration: false,
      _qualityIssues: [], 
      _instructionsImproved: true,
      regenerationNotes: "Instructions improved by AI chef to meet quality standards."
    };
    
    // Run validation on improved results to make sure they meet standards
    const validationResult = validateMealQuality(improvedRecipe);
    if (!validationResult.isValid && retryCount < 2) {
      console.log(`[RECIPE IMPROVER] Improved instructions still have issues: ${validationResult.issues.join(", ")}`);
      console.log(`[RECIPE IMPROVER] Retrying instruction improvement (attempt ${retryCount + 1})`);
      return improveRecipeInstructions(recipe, retryCount + 1);
    }
    
    console.log(`[RECIPE IMPROVER] Successfully improved instructions for "${recipe.name}"`);
    return improvedRecipe;
  } catch (error: any) {
    console.error("[RECIPE IMPROVER] Error improving recipe instructions:", 
      error?.message || "Unknown error occurred");
    
    // Implement retry logic
    if (retryCount < 2) {
      console.log(`[RECIPE IMPROVER] Retrying instruction improvement (attempt ${retryCount + 1})`);
      return improveRecipeInstructions(recipe, retryCount + 1);
    }
    
    // Return original recipe if all retries fail
    console.log(`[RECIPE IMPROVER] Failed to improve recipe after ${retryCount} attempts, returning original`);
    return recipe;
  }
}