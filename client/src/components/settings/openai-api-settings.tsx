import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ask_secrets } from "@/lib/secrets";

export default function OpenAiApiSettings() {
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
        
        setHasApiKey(data.openAiKey || false);
      } catch (error) {
        console.error("Failed to check OpenAI API key:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkApiKey();
  }, []);

  const setupOpenAiApi = async () => {
    setIsSettingUp(true);
    try {
      // Ask user for OpenAI API key
      const message = `To generate personalized meal plans, we need an OpenAI API key.
Please enter your OpenAI API key to enable AI-powered meal plan creation.`;
      
      const key = await ask_secrets(message);
      
      if (!key) {
        toast({
          title: "Setup Cancelled",
          description: "You cancelled the OpenAI API setup process.",
          variant: "destructive",
        });
        setIsSettingUp(false);
        return;
      }
      
      await apiRequest("POST", "/api/settings/openai-api-key", { key });
      setHasApiKey(true);
      toast({
        title: "OpenAI API Setup Complete",
        description: "Your OpenAI API key has been saved. You'll now get AI-powered meal suggestions.",
      });
    } catch (error) {
      console.error("Failed to set OpenAI API key:", error);
      toast({
        title: "Setup Failed",
        description: "There was an error setting up your OpenAI API key. Please try again.",
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
          <Sparkles className="h-5 w-5 text-teal-primary" />
          OpenAI API
        </CardTitle>
        <CardDescription>
          Power AI meal suggestions
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
                An OpenAI API key is required for meal generation and customization.
                Without this, we can't create personalized meal plans.
              </p>
              <p className="text-sm text-gray-500">
                You can get an API key from{" "}
                <a 
                  href="https://platform.openai.com/account/api-keys" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  platform.openai.com
                </a>
              </p>
              {hasApiKey && (
                <p className="text-xs text-green-600 mt-1">✓ OpenAI API is set up</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={setupOpenAiApi} 
          disabled={isSettingUp || isLoading}
          className="w-full"
          variant={hasApiKey ? "outline" : "default"}
        >
          {isSettingUp ? "Setting up..." : hasApiKey ? "Update OpenAI API Key" : "Set Up OpenAI API"}
        </Button>
      </CardFooter>
    </Card>
  );
}