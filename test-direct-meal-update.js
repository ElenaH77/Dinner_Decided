// Direct script to test the meal update PATCH endpoint
// Run this with node test-direct-meal-update.js

async function testMealUpdate() {
  const planId = 30; // Use the most recent active plan ID
  const mealId = 'meal-1746194554495-258'; // Use an actual meal ID from your plan
  
  // Create a simple meal update with minimal properties
  const updatedMeal = {
    id: mealId,
    name: 'Updated Test Meal Name',
    day: 'Monday',
    mealCategory: 'Quick & Easy'
  };

  // Log what we're about to send
  console.log('Sending PATCH request to:', `/api/meal-plan/${planId}`);
  console.log('Payload:', JSON.stringify({
    mealId,
    updatedMeal
  }, null, 2));

  try {
    // Make the API call with exactly the format the server expects
    const response = await fetch(`http://localhost:3000/api/meal-plan/${planId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        mealId,
        updatedMeal
      })
    });

    // Get the response
    const responseStatus = response.status;
    
    // Try to parse JSON, but handle text responses too
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Show the results
    console.log('Response status:', responseStatus);
    console.log('Response data:', typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2));
    
    if (responseStatus === 200) {
      console.log('✅ Success! Meal updated successfully');
    } else {
      console.log('❌ Failed to update meal');
    }
  } catch (error) {
    console.error('Error making request:', error.message);
  }
}

// Execute the test
testMealUpdate();
