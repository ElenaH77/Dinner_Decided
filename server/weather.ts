import fetch from 'node-fetch';

interface WeatherData {
  current: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    is_day: number;
    wind_mph: number;
    precip_mm: number;
    humidity: number;
    feelslike_c: number;
    feelslike_f: number;
  };
  forecast?: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        maxtemp_f: number;
        mintemp_c: number;
        mintemp_f: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
      };
    }>;
  };
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
  };
}

// Default fallback location if user doesn't provide one
const DEFAULT_LOCATION = 'San Francisco';

// Weather API options
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_URL = 'https://api.weatherapi.com/v1';

/**
 * Get current weather data for a location
 */
export async function getCurrentWeather(location: string = DEFAULT_LOCATION): Promise<WeatherData | null> {
  try {
    // If no API key is provided, return null
    if (!WEATHER_API_KEY) {
      console.log("[WEATHER] No API key provided, skipping weather fetch");
      return null;
    }

    const url = `${WEATHER_API_URL}/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&aqi=no`;
    
    console.log(`[WEATHER] Fetching current weather for ${location}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as WeatherData;
    return data;
  } catch (error) {
    console.error("[WEATHER] Error fetching current weather:", error);
    return null;
  }
}

/**
 * Get weather forecast for a location
 * @param days Number of days to forecast (1-10)
 */
export async function getWeatherForecast(location: string = DEFAULT_LOCATION, days: number = 7): Promise<WeatherData | null> {
  try {
    // If no API key is provided, return null
    if (!WEATHER_API_KEY) {
      console.log("[WEATHER] No API key provided, skipping forecast fetch");
      return null;
    }

    const url = `${WEATHER_API_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&days=${days}&aqi=no`;
    
    console.log(`[WEATHER] Fetching ${days}-day forecast for ${location}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as WeatherData;
    return data;
  } catch (error) {
    console.error("[WEATHER] Error fetching weather forecast:", error);
    return null;
  }
}

/**
 * Get weather information formatted for meal planning
 * Returns weather context as a string that can be used in prompts
 */
export async function getWeatherContextForMealPlanning(location: string = DEFAULT_LOCATION): Promise<string> {
  try {
    const weatherData = await getWeatherForecast(location);
    
    if (!weatherData) {
      return "Weather information is not available.";
    }
    
    // Extract current conditions and forecast
    const currentTemp = Math.round(weatherData.current.temp_c);
    const currentCondition = weatherData.current.condition.text.toLowerCase();
    const isHot = currentTemp > 27;
    const isCold = currentTemp < 10;
    
    // Get the next 7 days of forecast if available
    const forecastSummary = weatherData.forecast?.forecastday
      .map(day => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        return `${dayName}: ${Math.round(day.day.maxtemp_c)}°C, ${day.day.condition.text}`;
      })
      .join('; ');
    
    // Generate meal planning context based on weather
    let weatherContext = `The current weather in ${weatherData.location.name} is ${currentTemp}°C and ${currentCondition}.`;
    
    if (isHot) {
      weatherContext += " It's quite warm, so lighter meals, salads, and grilled dishes would be appropriate.";
    } else if (isCold) {
      weatherContext += " It's cold, so hearty soups, stews, and warm comfort food would be ideal.";
    }
    
    if (currentCondition.includes('rain') || currentCondition.includes('shower')) {
      weatherContext += " With the rainy weather, comforting meals that don't require going out for many ingredients might be appreciated.";
    }
    
    if (forecastSummary) {
      weatherContext += ` The weather forecast for the week ahead is: ${forecastSummary}`;
    }
    
    return weatherContext;
  } catch (error) {
    console.error("[WEATHER] Error generating weather context:", error);
    return "Weather information is not available.";
  }
}