import fetch from 'node-fetch';

async function testAddToGroceryList() {
  try {
    // Get current meal plan
    const mealPlanResponse = await fetch('http://localhost:5000/api/meal-plan/current');
    const mealPlan = await mealPlanResponse.json();
    
    console.log(`Found meal plan with ${mealPlan.meals.length} meals`);
    
    if (mealPlan.meals.length === 0) {
      console.log('No meals available to test');
      return;
    }
    
    const meal = mealPlan.meals[0];
    console.log('Testing with meal:', meal.name);
    console.log('Meal ID:', meal.id);
    console.log('Has ingredients array:', !!meal.ingredients);
    console.log('Ingredients count:', meal.ingredients ? meal.ingredients.length : 0);
    console.log('Has mainIngredients array:', !!meal.mainIngredients);
    console.log('mainIngredients count:', meal.mainIngredients ? meal.mainIngredients.length : 0);
    
    // Now try to add this meal to grocery list
    const addResponse = await fetch('http://localhost:5000/api/grocery-list/add-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        mealId: meal.id,
        meal: meal  // Include full meal data to be sure
      })
    });
    
    const result = await addResponse.json();
    console.log('Response status:', addResponse.status);
    console.log('Response body keys:', Object.keys(result));
    console.log('Grocery list sections:', result.sections ? result.sections.length : 0);
    
    if (result.sections && result.sections.length > 0) {
      result.sections.forEach(section => {
        console.log(`Section: ${section.name}, Items: ${section.items.length}`);
        if (section.items.length > 0) {
          console.log('First few items:', section.items.slice(0, 3).map(i => i.name));
        }
      });
    }
  } catch (error) {
    console.error('Error testing add to grocery list:', error);
  }
}

testAddToGroceryList();
