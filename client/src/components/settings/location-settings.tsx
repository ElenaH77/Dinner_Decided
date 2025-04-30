import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { useHousehold } from "@/contexts/household-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function LocationSettings() {
  const { refreshHouseholdData } = useHousehold();
  const [location, setLocation] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchLocation() {
      try {
        setIsLoading(true);
        const response = await apiRequest("GET", "/api/household");
        const data = await response.json();
        
        setLocation(data.location || "");
      } catch (error) {
        console.error("Failed to fetch location:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchLocation();
  }, []);

  const handleSaveLocation = async () => {
    if (!location.trim()) {
      toast({
        title: "Location Required",
        description: "Please enter a location",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/settings/location", { location });
      
      // Refresh household data to update UI
      await refreshHouseholdData();
      
      toast({
        title: "Location Updated",
        description: "Your location has been saved successfully",
      });
    } catch (error) {
      console.error("Failed to save location:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update your location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <MapPin className="h-5 w-5 text-teal-primary" />
          Location
        </CardTitle>
        <CardDescription>
          Set your location for weather-based meal suggestions
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
                Enter your city or region for weather-appropriate meal suggestions.
                For example, get lighter meals for hot days and comfort food for cold or rainy weather.
              </p>
              <p className="text-sm text-gray-500">
                Examples: "New York", "London", "Sydney, Australia"
              </p>
            </div>
            <Input
              placeholder="Enter your location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSaveLocation} 
          disabled={isSaving || isLoading}
          className="w-full"
        >
          {isSaving ? "Saving..." : "Save Location"}
        </Button>
      </CardFooter>
    </Card>
  );
}