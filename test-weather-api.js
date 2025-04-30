import fetch from 'node-fetch';

async function testWeatherContext() {
  try {
    console.log('Testing weather context API...');
    const response = await fetch('http://localhost:5000/api/weather/context');
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Weather context response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error testing weather API:', error);
  }
}

testWeatherContext();