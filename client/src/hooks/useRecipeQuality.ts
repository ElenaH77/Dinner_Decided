// Custom hook to improve recipe quality on the client side
import { useState, useEffect, useMemo } from 'react';
import { validateRecipeInstructions } from '@shared/recipe-validation';
import { regenerateInstructions } from '@/lib/recipe-generator';

// Function to analyze and fix recipe instructions if they're generic or low quality
export async function regenerateRecipeInstructions(recipe: any): Promise<any> {
  if (!recipe || !recipe.name || !recipe.ingredients) {
    console.error('[RECIPE QUALITY] Cannot regenerate instructions - missing recipe name or ingredients');
    return recipe;
  }
  
  try {
    console.log(`[RECIPE QUALITY] Regenerating instructions for "${recipe.name}" using OpenAI`);
    
    // Call the OpenAI-based regeneration function
    const newInstructions = await regenerateInstructions({
      name: recipe.name,
      ingredients: recipe.ingredients
    });
    
    if (newInstructions && newInstructions.length > 0) {
      console.log(`[RECIPE QUALITY] Successfully regenerated ${newInstructions.length} instructions for "${recipe.name}"`);
      
      // Create a copy of the recipe with improved instructions
      const improvedRecipe = { 
        ...recipe,
        instructions: newInstructions,
        directions: newInstructions, // For backward compatibility
        _needsRegeneration: false,
        _qualityIssues: [],
        _instructionsImproved: true,
        _instructionsSource: 'openai'
      };
      
      return improvedRecipe;
    } else {
      console.error('[RECIPE QUALITY] Failed to regenerate instructions - empty result');
      // Fall back to template-based improvement
      return fixRecipeInstructions(recipe);
    }
  } catch (error) {
    console.error('[RECIPE QUALITY] Error regenerating instructions:', error);
    // Fall back to template-based improvement
    return fixRecipeInstructions(recipe);
  }
}

// Function to analyze and fix recipe instructions if they're generic or low quality
export function fixRecipeInstructions(recipe: any): any {
  if (!recipe || !recipe.instructions || !Array.isArray(recipe.instructions)) {
    return recipe;
  }

  // Use standardized validation logic
  const validationResult = validateRecipeInstructions(recipe.instructions);
  
  // Special case for certain recipe types that need extra care
  const hasSeafood = recipe.name?.toLowerCase().includes('shrimp') || 
                   recipe.name?.toLowerCase().includes('fish') ||
                   recipe.name?.toLowerCase().includes('salmon') ||
                   (recipe.ingredients && recipe.ingredients.some((ing: string) => 
                     ing.toLowerCase().includes('shrimp') || 
                     ing.toLowerCase().includes('fish') || 
                     ing.toLowerCase().includes('salmon')
                   ));
                   
  const isAsianInspired = recipe.name?.toLowerCase().includes('stir') || 
                         recipe.name?.toLowerCase().includes('asian') ||
                         recipe.name?.toLowerCase().includes('teriyaki') ||
                         recipe.name?.toLowerCase().includes('szechuan');
  
  // If the recipe doesn't need fixing, return as is
  if (validationResult.isValid && !recipe._needsRegeneration && !(hasSeafood && isAsianInspired)) {
    return recipe;
  }
  
  // Log validation issues
  console.log(`[RECIPE QUALITY] Issues detected in "${recipe.name}":`, 
    validationResult.issues.length > 0 ? `${validationResult.issues.length} validation issues` : '',
    recipe._needsRegeneration ? 'Needs regeneration flag' : '',
    (hasSeafood && isAsianInspired) ? 'Special case recipe type' : ''
  );
  
  if (validationResult.issues.length > 0) {
    console.log(`[RECIPE QUALITY] Validation issues:`, validationResult.issues);
  }
  
  console.log(`[RECIPE QUALITY] Fixing low-quality instructions for "${recipe.name}"`);
  
  // Create improved instructions based on the type of recipe
  let newInstructions: string[] = [];
  
  // Detect recipe type based on ingredients and name for specialized fixes
  const hasChicken = recipe.name?.toLowerCase().includes('chicken') || 
                (recipe.ingredients && recipe.ingredients.some((ing: string) => ing.toLowerCase().includes('chicken')));
  
  const hasBeef = recipe.name?.toLowerCase().includes('beef') || 
               (recipe.ingredients && recipe.ingredients.some((ing: string) => ing.toLowerCase().includes('beef')));
  
  const isGrilled = recipe.name?.toLowerCase().includes('grill') || 
                recipe.name?.toLowerCase().includes('bbq') ||
                recipe.name?.toLowerCase().includes('skewer');
  
  const hasPasta = recipe.name?.toLowerCase().includes('pasta') || 
                (recipe.ingredients && recipe.ingredients.some((ing: string) => ing.toLowerCase().includes('pasta') || 
                 ing.toLowerCase().includes('spaghetti')));

  const hasSalmon = recipe.name?.toLowerCase().includes('salmon') ||
                 (recipe.ingredients && recipe.ingredients.some((ing: string) => ing.toLowerCase().includes('salmon')));
                 
  const hasShrimp = recipe.name?.toLowerCase().includes('shrimp') ||
                 (recipe.ingredients && recipe.ingredients.some((ing: string) => ing.toLowerCase().includes('shrimp')));

  // Select the right template based on recipe type
  if (isAsianInspired && hasShrimp) {
    // Enhanced shrimp stir fry instructions with Szechuan specifics
    newInstructions = [
      "Prepare all ingredients before starting: ensure shrimp are completely peeled, deveined, and patted dry with paper towels (moisture will prevent proper searing); slice bell peppers into 1/4-inch strips; trim snow peas; and mince garlic and ginger finely.",
      "In a small bowl, whisk together 2 tablespoons soy sauce, 1 tablespoon Szechuan sauce (which contains fermented broad beans, chili oil, and garlic), 1 teaspoon sesame oil, and set aside. This creates the flavor base that will permeate the entire dish.",
      "In a separate small bowl, create a cornstarch slurry by mixing 1 teaspoon cornstarch with 2 tablespoons cool water until completely smooth with no lumps. This will be used to thicken the sauce to the perfect consistency.",
      "Heat a large wok or heavy skillet over high heat for 2 minutes until very hot - you should feel intense heat when holding your hand 6 inches above the surface. This proper preheating is essential for achieving 'wok hei' (breath of the wok).",
      "Add 1 tablespoon vegetable oil to the hot wok and immediately swirl to coat the cooking surface. The oil should shimmer but not smoke excessively, indicating the perfect temperature of approximately 375-400°F.",
      "Carefully add the shrimp in a single layer without overcrowding (work in batches if necessary) and let them sear undisturbed for exactly 45 seconds. The shrimp should begin to turn pink and opaque along the edges.",
      "Flip each shrimp and cook for an additional 45 seconds until they reach an internal temperature of exactly 145°F. The shrimp should be pinkish-orange with a slight translucency in the thickest part - overcooked shrimp become rubbery.",
      "Using a slotted spoon, transfer the partially cooked shrimp to a clean plate, leaving any rendered juices in the wok. The shrimp will finish cooking when returned to the sauce later.",
      "Return the wok to high heat and add the remaining 1 tablespoon vegetable oil. Once hot (about 15 seconds), add the minced garlic (3 cloves) and ginger (1 tablespoon), stirring constantly for precisely 20 seconds until fragrant but not browned.",
      "Add 1 teaspoon of crushed red pepper flakes and stir for 10 seconds to infuse the oil with spice - you should smell the aromatic heat releasing from the flakes. Adjust this amount based on desired spice level.",
      "Add the sliced red and green bell peppers to the wok and stir-fry for exactly 2 minutes, using a consistent tossing motion to ensure even cooking while maintaining their vibrant color and crisp-tender texture.",
      "Add the trimmed snow peas and stir-fry for 90 seconds until bright green and glossy, but still crisp - they should make a slight snapping sound when bent.",
      "Pour the prepared sauce mixture around the edges of the wok (not directly on the vegetables), allowing it to caramelize slightly as it hits the hot surface, then quickly stir everything together.",
      "When the sauce begins to bubble (about 30 seconds), add the cornstarch slurry while stirring continuously. The sauce should immediately begin to thicken and turn glossy within 30-45 seconds.",
      "Return the shrimp to the wok and gently toss for exactly 1 minute to finish cooking and coat evenly with sauce. The shrimp should be plump, completely opaque, and slightly curled into a 'C' shape when fully cooked.",
      "Turn off the heat and stir in 2 of the 3 chopped green onions, reserving some for garnish. The residual heat will slightly wilt the green onions while maintaining their fresh flavor.",
      "Transfer the stir-fry immediately to a large serving platter or individual plates over hot jasmine rice, arranging the colorful ingredients attractively.",
      "Garnish with the remaining chopped green onions, 1 tablespoon toasted sesame seeds, and 1/4 cup fresh cilantro leaves for a professional presentation and added flavor complexity.",
      "Serve immediately while the vegetables are still crisp and the sauce is hot - the dish should steam slightly when presented at the table, with aromas of garlic, ginger, and Szechuan spices."
    ];
  } else if (isGrilled && hasChicken) {
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
  } else if (isAsianInspired && hasChicken) {
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
  } else if (hasPasta && hasSeafood) {
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
  } else if (isAsianInspired && hasSalmon) {
    // Teriyaki salmon instructions
    newInstructions = [
      "Preheat your oven to exactly 400°F (205°C) and position the rack in the middle of the oven. Allow at least 15 minutes for proper preheating to ensure consistent cooking temperature.",
      "Line a rimmed baking sheet with aluminum foil or parchment paper for easy cleanup, then lightly brush with 1 teaspoon of vegetable oil to prevent sticking.",
      "Pat the salmon fillets completely dry with paper towels - this crucial step ensures proper caramelization of the teriyaki glaze and prevents excess moisture that would steam rather than roast the fish.",
      "Season each salmon fillet with 1/4 teaspoon of salt and 1/8 teaspoon of freshly ground black pepper, applying evenly to both sides but concentrating more on the flesh side.",
      "In a small saucepan, combine 1/2 cup teriyaki sauce, 2 tablespoons soy sauce, 1 tablespoon honey, and 1 tablespoon rice vinegar. Heat over medium-low heat while whisking occasionally.",
      "Simmer the teriyaki mixture for exactly 5 minutes until it reduces slightly and becomes syrupy, but watch carefully as the sugars in the honey can burn quickly if the heat is too high.",
      "Arrange the seasoned salmon fillets skin-side down on the prepared baking sheet, leaving at least 1 inch between each piece to promote even heat circulation and proper browning.",
      "Brush half of the teriyaki glaze generously over the tops and sides of the salmon fillets, ensuring even coverage with approximately 1 tablespoon of glaze per fillet.",
      "Meanwhile, in a separate large skillet, heat 1 tablespoon of sesame oil over medium-high heat until shimmering but not smoking, about 30 seconds.",
      "Add the minced garlic and grated ginger to the hot oil and stir constantly for exactly 30 seconds until fragrant but not browned, as burning will create bitter flavors.",
      "Add the broccoli florets to the skillet and stir-fry for 2 minutes, then add 2 tablespoons of water and immediately cover the pan with a lid to create steam.",
      "Steam the broccoli for 3 minutes until bright green and crisp-tender, then uncover and continue cooking for 1 minute to evaporate any remaining water.",
      "Place the salmon in the preheated oven and roast for exactly 12-14 minutes for 1-inch thick fillets, or until the internal temperature reaches 145°F (63°C) when measured with an instant-read thermometer inserted into the thickest part.",
      "During the last 2 minutes of cooking, brush the remaining teriyaki glaze over the salmon to create a glossy, caramelized finish. The salmon is done when it flakes easily with a fork but still maintains a slightly translucent center.",
      "Remove the salmon from the oven and let rest for 2 minutes to allow the juices to redistribute throughout the fish while you finish the broccoli.",
      "Season the broccoli with 1/4 teaspoon salt and a drizzle of the teriyaki sauce, tossing to coat evenly. The broccoli should remain vibrant green with a slight crunch.",
      "Serve each salmon fillet immediately on warmed plates alongside a portion of the teriyaki broccoli, spooning any remaining glaze from the baking sheet over the fish.",
      "Garnish with thinly sliced green onions and a sprinkle of sesame seeds for visual appeal and textural contrast, positioning them decoratively across the top of the salmon."
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
  
  // Log the improvement being made
  console.log(`[RECIPE QUALITY] Replacing ${recipe.instructions?.length || 0} instructions with ${newInstructions.length} improved instructions for "${recipe.name}"`);
  
  // If the recipe has placeholder instructions like "standard procedures", log them to help with debugging
  const genericInstructions = recipe.instructions?.filter((instr: string) => 
    typeof instr === 'string' && (
      instr.toLowerCase().includes('standard procedure') ||
      instr.toLowerCase().includes('following standard') ||
      instr.toLowerCase().includes('ingredients list') ||
      instr.toLowerCase().includes('as needed')
    )
  );
  
  if (genericInstructions && genericInstructions.length > 0) {
    console.log(`[RECIPE QUALITY] Found ${genericInstructions.length} generic instructions:`, genericInstructions);
  }
  
  // Update the recipe with new instructions and clear the quality flags
  improvedRecipe.instructions = newInstructions;
  improvedRecipe.directions = newInstructions; // For backwards compatibility
  improvedRecipe._needsRegeneration = false;
  improvedRecipe._qualityIssues = [];
  improvedRecipe._instructionsImproved = true;
  
  console.log(`[RECIPE QUALITY] Successfully improved instructions for "${recipe.name}"`);
  
  return improvedRecipe;
}

// Custom hook for checking recipe quality throughout the app
export function useRecipeQuality(mealPlan: any) {
  const [improvedMealPlan, setImprovedMealPlan] = useState(mealPlan);
  
  // Whenever the meal plan changes, check if any recipes need quality improvements
  useEffect(() => {
    if (!mealPlan || !mealPlan.meals || !Array.isArray(mealPlan.meals)) {
      return;
    }
    
    console.log('[RECIPE QUALITY] Checking recipe quality for meal plan');
    
    // Define an async function to process the meal plan with OpenAI
    const improveMealPlanAsync = async () => {
      try {
        // Track whether any improvements are needed
        let needsImprovement = false;
        
        // Process each meal, potentially using async OpenAI regeneration
        const improvedMealsPromises = mealPlan.meals.map(async (meal: any) => {
          if (!meal || !meal.instructions) {
            return meal;
          }
          
          // Use the validation utility
          const validationResult = validateRecipeInstructions(meal.instructions);
          
          // Only regenerate if there are actual issues
          if (!validationResult.isValid || meal._needsRegeneration) {
            needsImprovement = true;
            console.log(`[RECIPE QUALITY] Issues found in "${meal.name}":`, validationResult.issues);
            
            // Only attempt OpenAI regeneration if we have both name and ingredients
            if (meal.name && meal.ingredients && meal.ingredients.length > 0) {
              try {
                console.log(`[RECIPE QUALITY] Regenerating instructions for "${meal.name}" via OpenAI API`);
                
                // Call the API to get new instructions
                const newInstructions = await regenerateInstructions({
                  name: meal.name,
                  ingredients: meal.ingredients
                });
                
                if (newInstructions && newInstructions.length >= 8) {
                  console.log(`[RECIPE QUALITY] Successfully regenerated ${newInstructions.length} instructions for "${meal.name}"`);
                  
                  // Create an improved recipe with the new instructions
                  return {
                    ...meal,
                    instructions: newInstructions,
                    directions: newInstructions, // For backward compatibility
                    _needsRegeneration: false,
                    _qualityIssues: [],
                    _instructionsImproved: true,
                    _regeneratedAt: new Date().toISOString()
                  };
                } else {
                  console.log(`[RECIPE QUALITY] Failed to get valid instructions from API for "${meal.name}"`);
                }
              } catch (error) {
                console.error(`[RECIPE QUALITY] API error while regenerating "${meal.name}":`, error);
              }
            }
            
            // If OpenAI regeneration failed or wasn't possible, use our template system
            console.log(`[RECIPE QUALITY] Using template system for "${meal.name}"`);
            return fixRecipeInstructions(meal);
          }
          
          return meal;
        });
        
        // Wait for all async regenerations to complete
        const improvedMeals = await Promise.all(improvedMealsPromises);
        
        // Only update if we actually made improvements
        if (needsImprovement) {
          // Create a new meal plan with improved recipes
          const newMealPlan = {
            ...mealPlan,
            meals: improvedMeals,
            lastQualityCheck: new Date().toISOString()
          };
          
          console.log('[RECIPE QUALITY] Setting improved meal plan with fixed recipes');
          setImprovedMealPlan(newMealPlan);
        } else {
          console.log('[RECIPE QUALITY] No quality issues found in meal plan');
          setImprovedMealPlan(mealPlan);
        }
      } catch (error) {
        console.error('[RECIPE QUALITY] Error improving meal plan:', error);
        // In case of error, use the original meal plan
        setImprovedMealPlan(mealPlan);
      }
    };
    
    // Execute the async function
    improveMealPlanAsync();
  }, [mealPlan]);
  
  return improvedMealPlan;
}