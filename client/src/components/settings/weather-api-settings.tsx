import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ask_secrets } from "@/lib/secrets";

export default function WeatherApiSettings() {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function checkApiKey() {
      try {
        setIsLoading(true);
        const response = await apiRequest("GET", "/api/settings/api-keys");
        const data = await response.json();
        
        setHasApiKey(data.weatherApiKey || false);
      } catch (error) {
        console.error("Failed to check Weather API key:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkApiKey();
  }, []);

  const setupWeatherApi = async () => {
    setIsSettingUp(true);
    try {
      // Ask user for Weather API key
      const message = `To provide weather-appropriate meal suggestions, we need a Weather API key.
Please get a free API key from weatherapi.com and enter it here.`;
      
      const key = await ask_secrets(message);
      
      if (!key) {
        toast({
          title: "Setup Cancelled",
          description: "You cancelled the Weather API setup process.",
          variant: "destructive",
        });
        setIsSettingUp(false);
        return;
      }
      
      await apiRequest("POST", "/api/settings/weather-api-key", { key });
      setHasApiKey(true);
      toast({
        title: "Weather API Setup Complete",
        description: "Your Weather API key has been saved. You'll now get weather-appropriate meal suggestions.",
      });
    } catch (error) {
      console.error("Failed to set Weather API key:", error);
      toast({
        title: "Setup Failed",
        description: "There was an error setting up your Weather API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Cloud className="h-5 w-5 text-teal-primary" />
          Weather API
        </CardTitle>
        <CardDescription>
          Add weather-based meal suggestions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 bg-gray-200 animate-pulse rounded w-5/6"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                Get weather-appropriate meal suggestions with a Weather API key.
                For example, lighter meals for hot days and comfort food for cold or rainy weather.
              </p>
              <p className="text-sm text-gray-500">
                You can get a free API key from{" "}
                <a 
                  href="https://www.weatherapi.com/signup.aspx" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  weatherapi.com
                </a>
              </p>
              {hasApiKey && (
                <p className="text-xs text-green-600 mt-1">✓ Weather API is set up</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={setupWeatherApi} 
          disabled={isSettingUp || isLoading}
          className="w-full"
          variant={hasApiKey ? "outline" : "default"}
        >
          {isSettingUp ? "Setting up..." : hasApiKey ? "Update Weather API Key" : "Set Up Weather API"}
        </Button>
      </CardFooter>
    </Card>
  );
}