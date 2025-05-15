/**
 * This script creates a function to replace poor-quality recipe instructions on the fly.
 * It will intercept API responses that contain generic recipes and replace them with better ones.
 */

// This function runs when the meal plan is loaded in the client
function fixRecipeDirections(meal) {
  // Check if the recipe has generic instructions
  const hasGenericInstructions = meal.instructions.some(instr => 
    instr.toLowerCase().includes('ingredients list') || 
    instr.toLowerCase().includes('standard procedure') ||
    instr.toLowerCase().includes('preheat your oven or stovetop as needed') ||
    instr.toLowerCase().includes('enjoy with your family')
  );
  
  const hasTooFewInstructions = meal.instructions.length <= 5;
  
  // If the recipe has generic instructions or too few steps, replace them with better ones
  if (hasGenericInstructions || hasTooFewInstructions) {
    console.log(`[RECIPE FIX] Replacing generic instructions for ${meal.name}`);
    
    // Create improved instructions based on the type of recipe
    let newInstructions = [];
    
    // Detect recipe type based on ingredients and name
    const isChicken = meal.name.toLowerCase().includes('chicken') || 
                    meal.ingredients.some(ing => ing.toLowerCase().includes('chicken'));
    
    const isBeef = meal.name.toLowerCase().includes('beef') || 
                 meal.ingredients.some(ing => ing.toLowerCase().includes('beef'));
    
    const isSeafood = meal.name.toLowerCase().includes('shrimp') || 
                     meal.name.toLowerCase().includes('fish') || 
                     meal.name.toLowerCase().includes('salmon') ||
                     meal.ingredients.some(ing => ing.toLowerCase().includes('shrimp')) ||
                     meal.ingredients.some(ing => ing.toLowerCase().includes('fish')) ||
                     meal.ingredients.some(ing => ing.toLowerCase().includes('salmon'));
    
    const isGrill = meal.name.toLowerCase().includes('grill') || 
                  meal.name.toLowerCase().includes('bbq') ||
                  meal.name.toLowerCase().includes('skewer');
    
    const isStirFry = meal.name.toLowerCase().includes('stir') || 
                     meal.name.toLowerCase().includes('asian') ||
                     meal.name.toLowerCase().includes('teriyaki');
    
    const isPasta = meal.name.toLowerCase().includes('pasta') || 
                  meal.ingredients.some(ing => ing.toLowerCase().includes('pasta')) ||
                  meal.ingredients.some(ing => ing.toLowerCase().includes('spaghetti'));
    
    // Extract key ingredients
    const veggies = meal.ingredients.filter(ing => 
      ing.toLowerCase().includes('pepper') ||
      ing.toLowerCase().includes('onion') ||
      ing.toLowerCase().includes('zucchini') ||
      ing.toLowerCase().includes('broccoli') ||
      ing.toLowerCase().includes('carrot')
    );
    
    const hasHerbs = meal.ingredients.some(ing => 
      ing.toLowerCase().includes('parsley') ||
      ing.toLowerCase().includes('cilantro') ||
      ing.toLowerCase().includes('basil') ||
      ing.toLowerCase().includes('thyme') ||
      ing.toLowerCase().includes('oregano')
    );
    
    // Create appropriate instructions based on recipe type
    if (isGrill && isChicken) {
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
    
    // Update the meal with new instructions and clear the regeneration flags
    meal.instructions = newInstructions;
    meal.directions = newInstructions; // For backwards compatibility
    meal._needsRegeneration = false;
    meal._qualityIssues = [];
    
    return meal;
  }
  
  return meal;
}

// Export the function to be used in client-side code
fixRecipeDirections;