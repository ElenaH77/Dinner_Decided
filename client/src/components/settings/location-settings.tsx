import { useState, useEffect } from "react";
import { useHousehold } from "@/contexts/household-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function LocationSettings() {
  const { refreshHouseholdData } = useHousehold();
  const [location, setLocation] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchLocation() {
      try {
        setIsLoading(true);
        const response = await apiRequest("GET", "/api/settings/location");
        const data = await response.json();
        
        if (data.location) {
          setLocation(data.location);
        }
      } catch (error) {
        console.error("Failed to fetch location:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchLocation();
  }, []);

  const updateLocation = async () => {
    if (!location || location.trim() === "") {
      toast({
        title: "Location Required",
        description: "Please enter a location for weather-based meal suggestions.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      await apiRequest("POST", "/api/settings/location", { location });
      await refreshHouseholdData();
      
      toast({
        title: "Location Updated",
        description: "Your location has been updated for weather-based meal suggestions.",
      });
    } catch (error) {
      console.error("Failed to update location:", error);
      toast({
        title: "Update Failed",
        description: "There was an error updating your location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <MapPin className="h-5 w-5 text-teal-primary" />
          Location Settings
        </CardTitle>
        <CardDescription>
          Set your location to get weather-based meal suggestions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-3 bg-gray-200 animate-pulse rounded"></div>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="location" className="text-sm font-medium">
                Your Location
              </label>
              <Input
                id="location"
                placeholder="City, State or City, Country (e.g., Seattle, WA)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Enter a city or region to receive weather-appropriate meal suggestions
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={updateLocation} 
          disabled={isUpdating || isLoading}
          className="w-full"
        >
          {isUpdating ? "Updating..." : "Update Location"}
        </Button>
      </CardFooter>
    </Card>
  );
}