// Simple script to test the PATCH endpoint directly

async function testPatchMeal() {
  const mealId = 'test-meal-id-123';
  const updatedMeal = {
    id: mealId,
    name: 'Test Updated Meal',
    description: 'This is a test updated meal',
    day: 'Monday',
    prepTime: 30,
    mealCategory: 'Quick & Easy',
    mainIngredients: ['Ingredient 1', 'Ingredient 2']
  };

  // Make a direct PATCH request
  try {
    console.log('Sending test PATCH request to /api/meal-plan/30');
    console.log('Request payload:', { updatedMeal, mealId });

    const response = await fetch('http://localhost:5000/api/meal-plan/30', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        updatedMeal: updatedMeal,
        mealId: mealId
      })
    });

    const responseStatus = response.status;
    const responseText = await response.text();

    console.log('Response status:', responseStatus);
    console.log('Response text:', responseText);

    if (responseStatus === 200) {
      console.log('Successfully patched meal!');
    } else {
      console.log('Failed to patch meal.');
    }
  } catch (error) {
    console.error('Error making PATCH request:', error);
  }
}

// Run the test
testPatchMeal();
