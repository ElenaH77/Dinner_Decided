/**
 * This is a utility script to add a patch for fixing the recipe quality issues
 * Run this script to update the prompts and validation for recipe generation
 */

const fs = require('fs');
const path = require('path');

// Path to the openai.ts file
const openaiFilePath = path.join(__dirname, 'server', 'openai.ts');

// Read the current content of the file
let content = fs.readFileSync(openaiFilePath, 'utf8');

// 1. Update the system prompt for meal generation
const oldSystemPrompt = `You are a professional chef creating detailed, well-structured recipes for home cooks.`;
const newSystemPrompt = `You are a professional chef and recipe writer creating detailed, well-structured recipes for home cooks. 
YOUR FOCUS IS ON CREATING PRECISE, STEP-BY-STEP INSTRUCTIONS THAT ARE HIGHLY DETAILED.`;

content = content.replace(oldSystemPrompt, newSystemPrompt);

// 2. Update the singleMeal prompt instruction section for better instructions
const oldInstructionSection = `7. Step-by-step cooking instructions (minimum 8-10 detailed steps)
          * CRITICAL: Instructions must be comprehensive enough for a beginner cook to follow without prior knowledge
          * Include precise cooking times, temperatures, and methods for EVERY step (e.g., "sauté over medium heat for 5 minutes" not just "sauté until done")
          * Include exact time and temperature for any oven, slow cooker, or instant pot steps
          * Mention each ingredient specifically when it's used with exact quantities
          * Break complex processes into multiple detailed steps
          * Include specific guidance on how to tell when things are properly cooked
          * NO generic steps like "cook according to standard procedure" - every step must be explicit
          * NEVER assume prior cooking knowledge - explain techniques like "fold in", "deglaze", etc.
          * For mixed dishes, include how to assemble and serve`;

const newInstructionSection = `7. Step-by-step cooking instructions (EXACTLY 10-12 detailed steps - NO GENERIC STEPS ALLOWED)
          * ABSOLUTELY REQUIRED: Each step must begin with a specific action verb (Heat, Stir, Add, etc.)
          * ABSOLUTELY REQUIRED: Each step must include exact numerical times and temperatures
          * ABSOLUTELY REQUIRED: Steps like "Prepare ingredients" or "Cook according to procedure" are FORBIDDEN
          * ABSOLUTELY REQUIRED: For ALL protein cooking, include exact internal temperature (165°F for chicken, 145°F for fish)
          * Include multiple sensory cues in each step (e.g., "until golden brown and fragrant, about 3-4 minutes")
          * When introducing a cooking technique like "fold" or "deglaze", include a brief explanation in parentheses
          * Each step should be at least 20 words long with specific details for beginner cooks
          * When listing ingredients in steps, always include exact measurements (e.g., "Add 2 tablespoons olive oil" not "Add oil")
          * Mention exactly how long to cook ingredients and what visual/textural changes to look for
          * Explicitly state what the food should look like at each critical stage of cooking`;

content = content.replace(oldInstructionSection, newInstructionSection);

// 3. Update the regular meal plan instructions section too
const oldMealPlanInstructions = `        8. Step-by-step cooking instructions (EXACTLY 10-15 detailed steps with no shortcuts)
          * CRITICAL: Each recipe MUST include AT LEAST 10 detailed instruction steps - no exceptions
          * EVERY instruction must begin with a strong, specific action verb (e.g., "Heat", "Stir", "Whisk")
          * Include EXACT cooking times, temperatures, and methods for EVERY step with specific numbers (e.g., "Sauté over medium-high heat for exactly 4-5 minutes" not "Sauté until done")
          * Include EXACT time and temperature for any oven, slow cooker, or instant pot steps (e.g., "Bake at 375°F for 25-30 minutes" not "Bake until done")
          * For EVERY ingredient, specify EXACT quantities when used (e.g., "Add 2 tablespoons of olive oil" not "Add oil")
          * EXPLICITLY state minimum internal cooking temperatures (165°F for chicken/poultry, 145°F for fish, 160°F for ground meat)
          * ALWAYS provide multiple sensory cues for doneness (e.g., "until golden brown, crispy on edges, and internal temperature reaches 165°F, about 5-6 minutes")
          * CLEARLY describe what the food should look like at EACH critical stage with visual and textural details (e.g., "the sauce should be glossy and thick enough to coat the back of a spoon")
          * NEVER use generic steps like "cook according to standard procedure" - EVERY step must be explicit and detailed
          * EVERY specialized cooking technique (fold, deglaze, sauté, broil, etc.) MUST include a parenthetical explanation (e.g., "Deglaze the pan (pour liquid into hot pan to loosen browned bits)")
          * For mixed dishes, include SPECIFIC assembly instructions with exact measurements and layering (e.g., "Spread exactly 1 cup of sauce on bottom of dish, layer with 6 lasagna noodles slightly overlapping")
          * Format each instruction as a detailed, specific sentence of at least 15 words with measurements, cooking methods, times, and sensory cues`;

const newMealPlanInstructions = `        8. Step-by-step cooking instructions (EXACTLY 10-12 detailed steps - NO GENERIC STEPS ALLOWED)
          * ABSOLUTELY REQUIRED: Each step must begin with a specific action verb (Heat, Stir, Add, etc.)
          * ABSOLUTELY REQUIRED: Each step must include exact numerical times and temperatures
          * ABSOLUTELY REQUIRED: Steps like "Prepare ingredients" or "Cook according to procedure" are STRICTLY FORBIDDEN
          * ABSOLUTELY REQUIRED: For ALL protein cooking, include exact internal temperature (165°F for chicken, 145°F for fish)
          * Include multiple sensory cues in each step (e.g., "until golden brown and fragrant, about 3-4 minutes")
          * When introducing a cooking technique like "fold" or "deglaze", include a brief explanation in parentheses
          * Each step should be at least 20 words long with specific details for beginner cooks
          * When listing ingredients in steps, always include exact measurements (e.g., "Add 2 tablespoons olive oil" not "Add oil")
          * Mention exactly how long to cook ingredients and what visual/textural changes to look for
          * Explicitly state what the food should look like at each critical stage of cooking
          * FORBIDDEN STEPS: "Prepare all ingredients" or "Combine according to ingredients list" or "Cook until done"
          * Format each instruction as a detailed, specific sentence with measurements, times, and visual cues`;

content = content.replace(oldMealPlanInstructions, newMealPlanInstructions);

// 4. Update model to consistently use GPT-4o
const oldModel = `model: "gpt-4",`;
const newModel = `model: "gpt-4o",`;
content = content.replace(new RegExp(oldModel, 'g'), newModel);

// 5. Update validateMealQuality to detect generic placeholder instructions
const genericInstructionCheck = `    // Check if instructions look like placeholders or filler content by examining content patterns
    if (meal.instructions.length <= 5 && 
        meal.instructions.some((instr: string) => 
          instr.toLowerCase().includes('ingredients list') || 
          instr.toLowerCase().includes('standard procedure'))) {
      issues.push(\`Recipe appears to contain placeholder instructions rather than genuine cooking steps. Each step must be detailed and specific.\`);
    }`;

const enhancedGenericInstructionCheck = `    // Check for generic placeholder instructions
    const genericPhrases = [
      'according to the ingredients list',
      'as needed for this recipe',
      'following standard procedures',
      'enjoy with your family',
      'standard procedure',
      'preheat your oven or stovetop as needed',
      'cook until all components are thoroughly cooked',
      'combine the ingredients according to',
      'prepare all ingredients'
    ];
    
    const hasGenericInstructions = meal.instructions.some((instr: string) => 
      typeof instr === 'string' && 
      genericPhrases.some(phrase => instr.toLowerCase().includes(phrase))
    );
    
    if (hasGenericInstructions) {
      issues.push(\`Recipe contains generic placeholder instructions. Each step must be detailed and specific with exact times and temperatures.\`);
    }
    
    // Check if instructions look like placeholders by examining length and patterns
    if (meal.instructions.length <= 5) {
      issues.push(\`Recipe has too few instructions (\${meal.instructions.length}). Each recipe must have at least 10 detailed steps.\`);
    }`;

content = content.replace(genericInstructionCheck, enhancedGenericInstructionCheck);

// Write the updated content back to the file
fs.writeFileSync(openaiFilePath, content);

console.log('Successfully updated recipe quality system in server/openai.ts');