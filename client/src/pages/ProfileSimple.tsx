import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProfileSimple() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: household, isLoading } = useQuery({
    queryKey: ['/api/household'],
  });

  const handleResetProfile = async () => {
    if (confirm("Are you sure you want to reset your profile? This will clear all your data and restart onboarding.")) {
      try {
        await apiRequest("PATCH", "/api/household", {
          onboardingComplete: false,
          members: [],
          preferences: "",
          challenges: null,
          location: null,
          appliances: [],
          cookingSkill: 1
        });
        
        toast({
          title: "Profile reset",
          description: "Your profile has been reset. Redirecting to onboarding...",
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to reset profile",
          variant: "destructive"
        });
      }
    }
  };

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  if (!household) {
    return <div>No household data found</div>;
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121]">Household Profile</h1>
          <p className="text-gray-600">Customize your information to get more personalized meal suggestions.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleResetProfile}
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          >
            Reset Profile
          </Button>
          <Button 
            onClick={() => setIsEditing(!isEditing)}
            className="bg-[#21706D] hover:bg-[#195957]"
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Household Size</label>
                <p className="text-gray-600">{household.members?.join(", ") || "Not set"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <p className="text-gray-600">{household.location || "Not set"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Cooking Skill Level</label>
                <p className="text-gray-600">Level {household.cookingSkill || 1}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Dietary Preferences</label>
                <p className="text-gray-600">{household.preferences || "None specified"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kitchen Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {household.appliances?.map((appliance: string) => (
                <div key={appliance} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">{appliance}</span>
                </div>
              )) || <p className="text-gray-600">No equipment listed</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}