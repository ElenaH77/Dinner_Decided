/**
 * Shared recipe validation utility to ensure consistent quality checking
 * across both client and server components
 */

// Focus on truly unhelpful phrases rather than an extensive list
const bannedPhrases = [
  "cook until done",
  "follow package directions",
  "cook according to instructions",
  "standard procedure",
  "cook following standard procedures"
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

  // Simplified requirement: at least 5 steps
  if (instructions.length < 5) {
    issues.push(`Too few instruction steps (${instructions.length}, minimum required: 5).`);
  }

  // Track steps with temperature or timing info
  let stepsWithTempOrTime = 0;
  
  instructions.forEach((step, index) => {
    if (!step || typeof step !== 'string') {
      issues.push(`Step ${index + 1} is invalid or empty.`);
      return;
    }

    const stepLower = step.toLowerCase();

    // Banned phrases check - focus only on truly unhelpful phrases
    for (const phrase of bannedPhrases) {
      if (stepLower.includes(phrase.toLowerCase())) {
        issues.push(`Step ${index + 1} contains banned phrase: "${phrase}"`);
        break; // Stop after finding one banned phrase per step
      }
    }
    
    // Check for temperature or timing information
    const hasTemperatureOrTime = /(\d+\s*°[fc]|\d+\s*(minutes?|mins?|hours?|hrs?|seconds?|secs?))/i.test(stepLower);
    if (hasTemperatureOrTime) {
      stepsWithTempOrTime++;
    }
  });
  
  // Only check that at least 2 steps have temperature or timing info
  if (stepsWithTempOrTime < 2) {
    issues.push(`Recipe should include specific temperature or timing information in at least 2 steps (found in ${stepsWithTempOrTime}).`);
  }

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