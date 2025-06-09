import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

export default function ProfileSimple() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedHousehold, setEditedHousehold] = useState<any>(null);
  
  // Clear cache on component mount to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/household'] });
    queryClient.removeQueries({ queryKey: ['/api/household'] });
  }, []);
  
  const { data: household, isLoading, refetch } = useQuery({
    queryKey: ['/api/household'],
    staleTime: 0,
    gcTime: 0, // Garbage collect immediately
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: true,
    queryFn: async () => {
      console.log("ProfileSimple - executing custom query function");
      const response = await fetch('/api/household', {
        headers: {
          'X-Household-Id': localStorage.getItem('dinner-decided-household-id') || 'unknown'
        }
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      console.log("ProfileSimple - raw response text:", text);
      
      if (!text.trim()) {
        console.log("ProfileSimple - empty response, returning null");
        return null;
      }
      
      const data = JSON.parse(text);
      console.log("ProfileSimple - parsed data:", data);
      return data;
    }
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

  const handleSaveProfile = async () => {
    try {
      console.log("Saving profile data:", editedHousehold);
      const result = await apiRequest("PATCH", "/api/household", editedHousehold);
      console.log("Save result:", result);
      
      // Force an immediate refetch of fresh data
      await refetch();
      
      // Clear the editing state after successful save and refetch
      setIsEditing(false);
      setEditedHousehold(null);
      
      toast({
        title: "Profile updated",
        description: "Your household profile has been saved successfully.",
      });
      
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const startEditing = () => {
    const h = household as any;
    setEditedHousehold({
      ...h,
      members: h?.members || [],
      appliances: h?.appliances || [],
      preferences: h?.preferences || "",
      location: h?.location || "",
      cookingSkill: h?.cookingSkill || 1,
      challenges: h?.challenges || "",
      name: h?.name || "New Household"
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedHousehold(null);
    setIsEditing(false);
  };

  const availableAppliances = [
    { id: "ovenStovetop", name: "Oven/Stovetop" },
    { id: "microwave", name: "Microwave" },
    { id: "slowCooker", name: "Slow Cooker" },
    { id: "instantPot", name: "Instant Pot/Pressure Cooker" },
    { id: "airFryer", name: "Air Fryer" },
    { id: "grill", name: "Grill" },
    { id: "blender", name: "Blender" },
    { id: "foodProcessor", name: "Food Processor" },
    { id: "standMixer", name: "Stand Mixer" },
  ];

  console.log("ProfileSimple - household data:", household);
  console.log("ProfileSimple - household type:", typeof household);
  console.log("ProfileSimple - household is null:", household === null);
  console.log("ProfileSimple - household is undefined:", household === undefined);
  console.log("ProfileSimple - household keys:", household ? Object.keys(household) : 'N/A');
  console.log("ProfileSimple - isLoading:", isLoading);

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  if (!household || Object.keys(household).length === 0) {
    console.log("ProfileSimple - showing no data message");
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Household Profile</h1>
          <div className="bg-white p-6 rounded-lg shadow">
            <p>No household data found. Please complete onboarding first.</p>
            <button 
              onClick={() => window.location.href = '/chat-onboarding'}
              className="mt-4 bg-[#21706D] text-white px-4 py-2 rounded hover:bg-[#195957]"
            >
              Start Onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log("ProfileSimple - proceeding to render with data:", household);

  const displayData = isEditing ? editedHousehold : (household as any);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-screen-sm mx-auto space-y-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#212121]">Household Profile</h1>
            <p className="text-gray-600">Customize your information to get more personalized meal suggestions.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <Button 
              onClick={handleResetProfile}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white py-2 px-4"
            >
              Reset Profile
            </Button>
            {!isEditing ? (
              <Button 
                onClick={startEditing}
                className="bg-[#21706D] hover:bg-[#195957] py-2 px-4"
              >
                Edit Profile
              </Button>
            ) : (
              <div className="flex flex-col md:flex-row gap-2">
                <Button onClick={cancelEditing} variant="outline" className="py-2 px-4">
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile} className="bg-[#21706D] hover:bg-[#195957] py-2 px-4">
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Household Size</Label>
                {isEditing ? (
                  <Textarea
                    value={displayData.members?.[0]?.name || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditedHousehold({
                        ...editedHousehold,
                        members: [{
                          id: "member-1",
                          name: value,
                          age: "adult",
                          dietaryRestrictions: displayData.members?.[0]?.dietaryRestrictions || []
                        }]
                      });
                    }}
                    placeholder="e.g., 2 adults 1 child"
                    rows={2}
                  />
                ) : (
                  <p className="text-gray-600 mt-1">{displayData.members?.[0]?.name || "Not set"}</p>
                )}
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm font-medium">Location (Zip Code)</Label>
                {isEditing ? (
                  <Input
                    value={displayData.location || ""}
                    onChange={(e) => setEditedHousehold({
                      ...editedHousehold,
                      location: e.target.value
                    })}
                    placeholder="e.g., 22301"
                  />
                ) : (
                  <p className="text-gray-600 mt-1">{displayData.location || "Not set"}</p>
                )}
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm font-medium">Cooking Skill Level</Label>
                {isEditing ? (
                  <Select
                    value={displayData.cookingSkill?.toString() || "1"}
                    onValueChange={(value) => setEditedHousehold({
                      ...editedHousehold,
                      cookingSkill: parseInt(value)
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Beginner</SelectItem>
                      <SelectItem value="2">Intermediate</SelectItem>
                      <SelectItem value="3">Advanced</SelectItem>
                      <SelectItem value="4">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-gray-600">Level {displayData.cookingSkill || 1}</p>
                )}
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm font-medium">Dietary Preferences</Label>
                {isEditing ? (
                  <Textarea
                    value={displayData.preferences || ""}
                    onChange={(e) => setEditedHousehold({
                      ...editedHousehold,
                      preferences: e.target.value
                    })}
                    placeholder="e.g., vegetarian, no nuts, low sodium"
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-600 mt-1">{displayData.preferences || "None specified"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kitchen Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                {availableAppliances.map((appliance) => (
                  <div key={appliance.id} className="flex items-center space-x-3 py-2">
                    <Switch
                      checked={displayData.appliances?.includes(appliance.id) || false}
                      onCheckedChange={(checked) => {
                        const currentAppliances = displayData.appliances || [];
                        const newAppliances = checked
                          ? [...currentAppliances, appliance.id]
                          : currentAppliances.filter((a: string) => a !== appliance.id);
                        setEditedHousehold({
                          ...editedHousehold,
                          appliances: newAppliances
                        });
                      }}
                    />
                    <Label className="text-sm cursor-pointer flex-1">{appliance.name}</Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {displayData.appliances?.length > 0 ? displayData.appliances.map((applianceId: string) => {
                  const appliance = availableAppliances.find((a: any) => a.id === applianceId);
                  return (
                    <div key={applianceId} className="flex items-center space-x-3 py-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="text-sm">{appliance?.name || applianceId}</span>
                    </div>
                  );
                }) : <p className="text-gray-600">No equipment selected</p>}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}