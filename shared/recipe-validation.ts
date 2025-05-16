/**
 * Shared recipe validation utility to ensure consistent quality checking
 * across both client and server components
 */

const bannedPhrases = [
  "cook until done",
  "as needed",
  "to taste",
  "follow package directions",
  "cook according to instructions",
  "standard procedure",
  "prepare ingredients",
  "wash, chop, and measure everything before starting",
  "preheat your oven or stovetop as needed for this recipe",
  "combine the ingredients according to the main ingredients list",
  "cook following standard procedures",
  "serve hot and enjoy",
  "enjoy with your family",
  "ingredients list",
  "according to the ingredient",
  "as needed for this recipe",
  "with your family",
  "following standard procedures"
];

const weakVerbs = [
  "prepare",
  "combine", 
  "cook", 
  "follow", 
  "make", 
  "serve", 
  "add", // 'add' only when standalone
  "mix",
  "enjoy"
];

/**
 * Validates recipe instructions against quality standards
 * @param instructions Array of recipe instruction steps
 * @returns Object containing validation result and issues found
 */
export function validateRecipeInstructions(instructions: string[]): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check number of steps
  if (!instructions || !Array.isArray(instructions)) {
    return { isValid: false, issues: ["Missing or invalid instructions"] };
  }

  if (instructions.length < 7) {
    issues.push(`Too few instruction steps (${instructions.length}, minimum required: 7).`);
  }

  // Check for instructions that are too short
  const shortInstructions = instructions.filter(step => step.trim().split(/\s+/).length < 10);
  if (shortInstructions.length > 0) {
    issues.push(`Found ${shortInstructions.length} instructions with fewer than 10 words.`);
  }

  instructions.forEach((step, index) => {
    if (!step || typeof step !== 'string') {
      issues.push(`Step ${index + 1} is invalid or empty.`);
      return;
    }

    const stepLower = step.toLowerCase();

    // Banned phrases check
    for (const phrase of bannedPhrases) {
      if (stepLower.includes(phrase.toLowerCase())) {
        issues.push(`Step ${index + 1} contains banned phrase: "${phrase}"`);
        break; // Stop after finding one banned phrase per step
      }
    }

    // Action verb check (first word of step)
    const firstWord = step.trim().split(/\s+/)[0].toLowerCase();
    if (weakVerbs.includes(firstWord)) {
      issues.push(`Step ${index + 1} starts with weak verb: "${firstWord}"`);
    }

    // Temperature or timing check
    const hasCookingWord = /\b(bake|roast|simmer|boil|cook|heat|fry|saute|sauté|grill|broil|toast|microwave)\b/i.test(stepLower);
    const hasTemperatureOrTime = /(\d+\s*°[fc]|\d+\s*(minutes?|mins?|hours?|hrs?|seconds?|secs?))/i.test(stepLower);
    
    if (hasCookingWord && !hasTemperatureOrTime) {
      issues.push(`Step ${index + 1} mentions cooking but lacks specific time or temperature.`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Enhances recipe instructions where needed
 * @param instructions Original recipe instructions
 * @param recipeContext Optional context about the recipe for better improvements
 * @returns Enhanced instructions
 */
export function enhanceRecipeInstructions(
  instructions: string[], 
  recipeContext?: { 
    name?: string; 
    ingredients?: string[];
    type?: string;
  }
): string[] {
  // If instructions seem OK, return them as is
  const validation = validateRecipeInstructions(instructions);
  if (validation.isValid) {
    return instructions;
  }

  console.log(`[RECIPE VALIDATION] Enhancing recipe instructions with ${validation.issues.length} issues:`, validation.issues);
  
  // For now, this is a placeholder for future implementation
  // In a real implementation, we would use the validation issues to guide
  // specific improvements, potentially using OpenAI to regenerate instructions
  
  // For now, return the original instructions, and the server-side regeneration
  // will eventually replace them with better instructions
  return instructions;
}