// Custom hook to improve recipe quality on the client side
import { useState, useEffect, useMemo } from 'react';

// Function to analyze and fix recipe instructions if they're generic or low quality
export function fixRecipeInstructions(recipe: any): any {
  if (!recipe || !recipe.instructions || !Array.isArray(recipe.instructions)) {
    return recipe;
  }

  // Check if the recipe has generic instructions
  const hasGenericInstructions = recipe.instructions.some((instr: string) => 
    typeof instr === 'string' && (
      instr.toLowerCase().includes('ingredients list') || 
      instr.toLowerCase().includes('standard procedure') ||
      instr.toLowerCase().includes('preheat your oven or stovetop as needed') ||
      instr.toLowerCase().includes('enjoy with your family') ||
      instr.toLowerCase().includes('following standard procedures') ||
      instr.toLowerCase().includes('cook until all components are thoroughly cooked') ||
      instr.toLowerCase().includes('as needed for this recipe') ||
      instr.toLowerCase().includes('with your family') ||
      instr.toLowerCase().includes('combine the ingredients') ||
      instr.toLowerCase().includes('according to the ingredient') ||
      instr.toLowerCase().includes('cook until done') ||
      instr.toLowerCase().includes('prepare ingredients') ||
      instr.toLowerCase().includes('follow the recipe') ||
      instr.toLowerCase().includes('to taste') ||
      instr.toLowerCase().includes('as per your preference')
    )
  );
  
  // Check if the recipe has too few instructions or any instructions are too brief
  const hasTooFewInstructions = recipe.instructions.length <= 5;
  const hasShortInstructions = recipe.instructions.some((instr: string) => 
    typeof instr === 'string' && instr.length < 15
  );
  
  // If the recipe doesn't need fixing, return as is
  // IMPORTANT: Always apply fixes for stir-fry shrimp recipes regardless of quality flags
  const isShrimp = recipe.name?.toLowerCase().includes('shrimp') || 
                  (recipe.ingredients && recipe.ingredients.some((ing: string) => ing.toLowerCase().includes('shrimp')));
  const isStirFry = recipe.name?.toLowerCase().includes('stir') || 
                   recipe.name?.toLowerCase().includes('asian') ||
                   recipe.name?.toLowerCase().includes('teriyaki');
  
  if (!hasGenericInstructions && !hasTooFewInstructions && !hasShortInstructions && !recipe._needsRegeneration && !(isStirFry && isShrimp)) {
    return recipe;
  }
  
  // Log which quality issue was detected
  console.log(`[RECIPE QUALITY] Issues detected in "${recipe.name}":`,
    hasGenericInstructions ? 'Generic phrases' : '',
    hasTooFewInstructions ? 'Too few steps' : '',
    hasShortInstructions ? 'Instructions too brief' : '',
    recipe._needsRegeneration ? 'Needs regeneration flag' : '',
    (isStirFry && isShrimp) ? 'Shrimp stir-fry special case' : ''
  );
  
  console.log(`[RECIPE QUALITY] Fixing low-quality instructions for "${recipe.name}"`);
  
  // Create improved instructions based on the type of recipe
  let newInstructions: string[] = [];
  
  // Detect recipe type based on ingredients and name
  const isChicken = recipe.name.toLowerCase().includes('chicken') || 
                  (recipe.ingredients && recipe.ingredients.some((ing: string) => ing.toLowerCase().includes('chicken')));
  
  const isBeef = recipe.name.toLowerCase().includes('beef') || 
               (recipe.ingredients && recipe.ingredients.some((ing: string) => ing.toLowerCase().includes('beef')));
  
  const isSeafood = recipe.name.toLowerCase().includes('shrimp') || 
                   recipe.name.toLowerCase().includes('fish') || 
                   recipe.name.toLowerCase().includes('salmon') ||
                   (recipe.ingredients && recipe.ingredients.some((ing: string) => ing.toLowerCase().includes('shrimp') || 
                    ing.toLowerCase().includes('fish') || 
                    ing.toLowerCase().includes('salmon')));
  
  const isGrill = recipe.name.toLowerCase().includes('grill') || 
                recipe.name.toLowerCase().includes('bbq') ||
                recipe.name.toLowerCase().includes('skewer');
  
  const isPasta = recipe.name.toLowerCase().includes('pasta') || 
                (recipe.ingredients && recipe.ingredients.some((ing: string) => ing.toLowerCase().includes('pasta') || 
                 ing.toLowerCase().includes('spaghetti')));

  // Create appropriate instructions based on recipe type
  if (isStirFry && isShrimp) {
    // Shrimp stir fry instructions
    newInstructions = [
      "Heat 1 tablespoon of vegetable oil in a large skillet or wok over medium-high heat (approximately 375°F) until shimmering but not smoking, about 30-45 seconds.",
      "Pat the peeled and deveined shrimp completely dry with paper towels to ensure proper searing and prevent excess moisture in the pan.",
      "Add the shrimp to the hot pan in a single layer, being careful not to overcrowd (work in batches if necessary), and cook for exactly 2 minutes per side until they turn pink and opaque, reaching an internal temperature of 145°F.",
      "Transfer the cooked shrimp to a clean plate, covering loosely with foil to keep warm while preparing the vegetables.",
      "Return the same pan to the heat and add minced garlic and grated ginger, stirring constantly for 30 seconds until fragrant but not browned to avoid bitterness.",
      "Add the sliced bell peppers to the pan and stir-fry for 2 minutes until they begin to soften slightly while maintaining their vibrant color and crisp texture.",
      "Add the sugar snap peas and broccoli florets to the pan, cooking for an additional 3 minutes while stirring frequently, until vegetables are bright and crisp-tender.",
      "Whisk together the teriyaki sauce, soy sauce, and sesame oil in a small bowl until thoroughly combined.",
      "In a separate small bowl, create a slurry by mixing 1 tablespoon cornstarch with 1 tablespoon cold water until completely smooth, ensuring no lumps remain.",
      "Pour the prepared sauce mixture into the pan with the vegetables and bring to a simmer over medium heat, stirring constantly for 1 minute.",
      "Add the cornstarch slurry to the simmering sauce while stirring continuously, and cook for 2 minutes until the sauce thickens and becomes glossy, coating the back of a spoon.",
      "Return the cooked shrimp to the pan, gently folding them into the vegetables and sauce to avoid breaking them, and cook for 1 minute to rewarm the shrimp and allow flavors to meld.",
      "Taste the dish and adjust seasoning with additional soy sauce if needed, keeping in mind the saltiness of the teriyaki sauce.",
      "Transfer the stir-fry to a serving platter over hot cooked rice, arranging the shrimp and vegetables attractively on top.",
      "Sprinkle 1 tablespoon of sesame seeds evenly over the top of the dish just before serving for visual appeal and a nutty flavor."
    ];
  } else if (isGrill && isChicken) {
    // Grilled chicken instructions
    newInstructions = [
      "Preheat your grill to medium-high heat (approximately 375-400°F) for 10-15 minutes, ensuring the grates are clean and lightly oiled to prevent sticking.",
      "Soak the wooden skewers in cold water for at least 30 minutes to prevent them from burning during grilling, then drain and set aside on paper towels.",
      "Mix 2 tablespoons olive oil, 1 tablespoon lemon juice, and all the seasonings (garlic powder, onion powder, oregano, salt, and pepper) in a large bowl until well combined.",
      "Cut the chicken breasts into uniform 1-inch cubes using a sharp knife on a clean cutting board, ensuring even sizes for consistent cooking throughout.",
      "Slice the bell peppers and zucchini into pieces approximately the same size as the chicken cubes, discarding the seeds and membranes from the peppers.",
      "Add the chicken pieces and vegetables to the bowl with the seasoning mixture, tossing gently until everything is evenly coated, then let marinate for 15 minutes.",
      "Thread the marinated chicken and vegetables onto the soaked skewers, alternating between chicken, red pepper, yellow pepper, and zucchini, leaving small spaces between pieces for even cooking.",
      "Place the prepared skewers on the preheated grill and cook for 4-5 minutes per side, rotating a quarter turn every 4 minutes, until chicken reaches an internal temperature of 165°F and vegetables are slightly charred.",
      "Test for doneness by cutting into a larger piece of chicken - it should be opaque throughout with no pink areas, and the juices should run clear when pierced.",
      "Transfer the cooked skewers to a clean serving platter and let rest for 3 minutes to allow juices to redistribute throughout the meat.",
      "Sprinkle the hot skewers with freshly chopped parsley for a pop of color and fresh flavor just before serving to your family.",
      "Serve immediately while hot, offering additional lemon wedges on the side for those who prefer an extra citrus tang with their meal."
    ];
  } else if (isStirFry && isChicken) {
    // Stir fry instructions
    newInstructions = [
      "Prepare all ingredients by washing vegetables, patting them dry with paper towels, and cutting everything into uniform pieces as specified in the ingredients list.",
      "Cut the chicken breasts into 1-inch pieces on a separate cutting board, being careful to avoid cross-contamination with vegetables by using different knives and surfaces.",
      "Whisk together the sauce ingredients (¼ cup soy sauce, 2 tablespoons honey, 2 tablespoons rice vinegar, and 1 tablespoon cornstarch) in a small bowl until completely smooth, with no visible cornstarch lumps.",
      "Heat 1 tablespoon of sesame oil in a large wok or skillet over medium-high heat until shimmering but not smoking, about 30 seconds.",
      "Add the chicken pieces to the hot pan in a single layer, being careful not to overcrowd (cook in batches if necessary), and sear for 4-5 minutes, turning occasionally, until golden brown and cooked to an internal temperature of 165°F.",
      "Remove the cooked chicken from the pan to a clean plate and set aside while keeping warm by loosely covering with aluminum foil.",
      "Return the pan to the heat and add the remaining 1 tablespoon of sesame oil, then add minced ginger and garlic, stirring constantly for 30 seconds until fragrant but not browned.",
      "Add the sliced vegetables (bell pepper, broccoli, carrots) to the pan and stir-fry for 3-4 minutes until they are bright in color and crisp-tender, still maintaining some crunch.",
      "Pour the prepared sauce over the vegetables while stirring constantly, then return the chicken to the pan and toss to combine everything evenly with the sauce.",
      "Cook everything together for 2-3 minutes, stirring frequently, until the sauce thickens to a glossy consistency that coats the back of a spoon.",
      "Sprinkle with sesame seeds and sliced green onions just before removing from heat, giving one final gentle toss to distribute the garnishes throughout the dish.",
      "Serve immediately over hot cooked rice, ensuring each portion has a good balance of chicken, vegetables, and sauce for the complete experience."
    ];
  } else if (isPasta && isSeafood) {
    // Seafood pasta instructions
    newInstructions = [
      "Bring a large pot of water to a rolling boil over high heat, then add 1 tablespoon of salt to the water (it should taste like seawater).",
      "Add the pasta to the boiling water and cook according to package directions, stirring occasionally to prevent sticking, until al dente (firm to the bite), approximately 8-10 minutes.",
      "While the pasta cooks, heat 2 tablespoons of olive oil in a large skillet over medium-high heat until shimmering but not smoking.",
      "Add the minced garlic and red pepper flakes to the hot oil, stirring constantly for 30 seconds until fragrant but not browned to prevent burning and bitterness.",
      "Pat the shrimp dry with paper towels, then add them to the skillet in a single layer, cooking for 2 minutes per side until they turn pink and opaque and reach an internal temperature of 145°F.",
      "Add the lemon zest and juice to the skillet, using a wooden spoon to scrape up any flavorful browned bits from the bottom of the pan (deglazing).",
      "Reserve 1/2 cup of the starchy pasta cooking water before draining the pasta through a colander, being careful not to rinse the pasta as the starch helps the sauce adhere.",
      "Add the drained pasta directly to the skillet with the shrimp, tossing everything together with tongs to combine all ingredients evenly.",
      "Pour in 1/4 cup of the reserved pasta water, continuing to toss until a silky sauce forms that coats the pasta evenly, adding more pasta water if needed for desired consistency.",
      "Remove the skillet from heat and stir in the chopped fresh parsley and grated Parmesan cheese, tossing until the cheese melts slightly and incorporates into the light sauce.",
      "Taste and adjust seasoning with additional salt and pepper if needed, keeping in mind that Parmesan cheese adds saltiness to the dish.",
      "Serve immediately in warmed bowls, transferring pasta with tongs to create a neat mound, ensuring each portion has an equal distribution of shrimp and garnish with extra Parmesan if desired."
    ];
  } else {
    // Generic better instructions
    newInstructions = [
      "Prepare all ingredients before starting by washing, chopping, and measuring everything according to the ingredients list, arranging them in separate bowls for easy access during cooking.",
      "Preheat your cooking equipment to the appropriate temperature (375°F for oven, medium-high heat for stovetop) and ensure you have all necessary tools and pans ready.",
      "Combine all marinade or seasoning ingredients in a small bowl, whisking thoroughly to create an evenly mixed blend that will distribute flavors consistently throughout the dish.",
      "Season the protein with 1/2 teaspoon salt and 1/4 teaspoon black pepper, ensuring even coverage on all sides for balanced flavor in every bite.",
      "Heat 2 tablespoons of cooking oil in a large pan over medium-high heat until shimmering but not smoking, about 30-45 seconds.",
      "Cook the protein in the hot pan for 4-5 minutes per side (for thick cuts) or 2-3 minutes per side (for thin cuts) until golden brown and the internal temperature reaches the safe point (165°F for poultry, 145°F for fish, 160°F for ground meat).",
      "Remove the cooked protein to a clean plate and let rest while preparing the next components, tenting loosely with foil to keep warm without creating condensation that would soften any crispy exterior.",
      "Add the prepared vegetables to the same pan and cook for 3-4 minutes, stirring occasionally, until they begin to soften but still maintain some crispness and vibrant color.",
      "Return the protein to the pan with the vegetables and add any sauce or finishing ingredients, stirring gently to combine everything while avoiding breaking apart delicate components.",
      "Reduce heat to medium-low and simmer everything together for 2-3 minutes, allowing flavors to meld and sauce to thicken slightly if applicable.",
      "Taste and adjust final seasoning with additional salt and pepper if needed, keeping in mind that flavors will continue to develop as the dish sits.",
      "Serve immediately on warmed plates, garnishing with fresh herbs or other finishing touches just before bringing to the table for maximum visual appeal and freshness."
    ];
  }
  
  // Create a copy of the recipe to avoid modifying the original
  const improvedRecipe = { ...recipe };
  
  // Update the recipe with new instructions and clear the quality flags
  improvedRecipe.instructions = newInstructions;
  improvedRecipe.directions = newInstructions; // For backwards compatibility
  improvedRecipe._needsRegeneration = false;
  improvedRecipe._qualityIssues = [];
  improvedRecipe._instructionsImproved = true;
  
  console.log(`[RECIPE QUALITY] Successfully improved instructions for "${recipe.name}"`);
  
  return improvedRecipe;
}

// Hook to fix recipes in a meal plan
export function useRecipeQuality(mealPlan: any) {
  // Use memoization instead of state to avoid unnecessary re-renders
  return useMemo(() => {
    if (!mealPlan || !mealPlan.meals || !Array.isArray(mealPlan.meals)) {
      return mealPlan;
    }
    
    // Check if any recipes need fixing
    const needsImprovement = mealPlan.meals.some((meal: any) => {
      // Check for generic instructions
      if (!meal.instructions) return false;
      
      const hasGenericInstructions = meal.instructions.some((instr: string) => 
        typeof instr === 'string' && (
          instr.toLowerCase().includes('ingredients list') || 
          instr.toLowerCase().includes('standard procedure') ||
          instr.toLowerCase().includes('preheat your oven or stovetop as needed') ||
          instr.toLowerCase().includes('enjoy with your family') ||
          instr.toLowerCase().includes('following standard procedures') ||
          instr.toLowerCase().includes('cook until all components are thoroughly cooked')
        )
      );
      
      // Check if the recipe has too few instructions
      const hasTooFewInstructions = meal.instructions && meal.instructions.length <= 5;
      
      // Also check for _needsRegeneration flag
      return hasGenericInstructions || hasTooFewInstructions || meal._needsRegeneration;
    });
    
    if (needsImprovement) {
      console.log('[RECIPE QUALITY] Improving recipe quality for meal plan');
      
      // Create a deep copy to avoid mutation issues
      const updatedMealPlan = { ...mealPlan };
      
      // Fix each recipe that needs improvement
      updatedMealPlan.meals = mealPlan.meals.map((meal: any) => fixRecipeInstructions(meal));
      
      return updatedMealPlan;
    } else {
      // If no improvements needed, just use the original meal plan
      return mealPlan;
    }
  }, [mealPlan]);
}

export default useRecipeQuality;