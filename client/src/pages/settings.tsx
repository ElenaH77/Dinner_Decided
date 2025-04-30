import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Settings } from "lucide-react";
import { Link } from "wouter";
import { useHousehold } from "@/contexts/household-context";
import LocationSettings from "@/components/settings/location-settings";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ask_secrets } from "@/lib/secrets";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { refreshHouseholdData } = useHousehold();
  const [weatherApiKey, setWeatherApiKey] = useState<string | null>(null);
  const [openAiKey, setOpenAiKey] = useState<string | null>(null);
  const [isCheckingApiKeys, setIsCheckingApiKeys] = useState(true);

  useEffect(() => {
    // Check if API keys are set
    const checkApiKeys = async () => {
      try {
        const response = await apiRequest("GET", "/api/settings/api-keys");
        const data = await response.json();
        
        setWeatherApiKey(data.weatherApiKey || null);
        setOpenAiKey(data.openAiKey || null);
      } catch (error) {
        console.error("Failed to check API keys:", error);
      } finally {
        setIsCheckingApiKeys(false);
        setIsLoading(false);
      }
    };

    checkApiKeys();
  }, []);

  const setupWeatherApi = async () => {
    try {
      const key = await ask_secrets("Please provide your Weather API key from weatherapi.com. This will be used to get local weather conditions for meal suggestions.");
      if (!key) return;

      await apiRequest("POST", "/api/settings/weather-api-key", { key });
      setWeatherApiKey(key);
      toast({
        title: "Weather API Key Set",
        description: "Your Weather API key has been saved. You'll now get weather-based meal suggestions.",
      });
    } catch (error) {
      console.error("Failed to set Weather API key:", error);
      toast({
        title: "Setup Failed",
        description: "There was an error setting up your Weather API key. Please try again.",
        variant: "destructive",
      });
    }
  };

  const setupOpenAiKey = async () => {
    try {
      const key = await ask_secrets("Please provide your OpenAI API key. This will be used for meal generation and customization.");
      if (!key) return;

      await apiRequest("POST", "/api/settings/openai-api-key", { key });
      setOpenAiKey(key);
      toast({
        title: "OpenAI API Key Set",
        description: "Your OpenAI API key has been saved. You'll now get AI-powered meal suggestions.",
      });
    } catch (error) {
      console.error("Failed to set OpenAI API key:", error);
      toast({
        title: "Setup Failed",
        description: "There was an error setting up your OpenAI API key. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-teal-primary" />
              Settings
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">API Settings</h2>
            
            <div className="bg-white rounded-lg shadow p-4 border">
              <h3 className="text-lg font-medium mb-2">OpenAI API</h3>
              <p className="text-sm text-gray-600 mb-4">
                An OpenAI API key is required for meal generation and customization.
              </p>
              <Button 
                onClick={setupOpenAiKey}
                variant={openAiKey ? "outline" : "default"}
                className="w-full"
              >
                {openAiKey ? "Update OpenAI API Key" : "Set Up OpenAI API Key"}
              </Button>
              {openAiKey && (
                <p className="text-xs text-green-600 mt-2">✓ OpenAI API key is set up</p>
              )}
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 border">
              <h3 className="text-lg font-medium mb-2">Weather API</h3>
              <p className="text-sm text-gray-600 mb-4">
                Set up a Weather API key to get weather-appropriate meal suggestions.
                Get your free API key from <a href="https://weatherapi.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">weatherapi.com</a>.
              </p>
              <Button 
                onClick={setupWeatherApi}
                variant={weatherApiKey ? "outline" : "default"}
                className="w-full"
              >
                {weatherApiKey ? "Update Weather API Key" : "Set Up Weather API"}
              </Button>
              {weatherApiKey && (
                <p className="text-xs text-green-600 mt-2">✓ Weather API key is set up</p>
              )}
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">User Settings</h2>
            <LocationSettings />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}