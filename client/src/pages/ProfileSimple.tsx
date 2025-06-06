import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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

  const handleSaveProfile = async () => {
    try {
      console.log("Saving profile data:", editedHousehold);
      const result = await apiRequest("PATCH", "/api/household", editedHousehold);
      console.log("Save result:", result);
      
      // Force a refetch of the data
      await queryClient.invalidateQueries({ queryKey: ['/api/household'] });
      await queryClient.refetchQueries({ queryKey: ['/api/household'] });
      
      toast({
        title: "Profile updated",
        description: "Your household profile has been saved successfully.",
      });
      
      setIsEditing(false);
      setEditedHousehold(null);
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

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  if (!household) {
    return <div>No household data found</div>;
  }

  const displayData = isEditing ? editedHousehold : (household as any);

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
          {!isEditing ? (
            <Button 
              onClick={startEditing}
              className="bg-[#21706D] hover:bg-[#195957]"
            >
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={cancelEditing} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} className="bg-[#21706D] hover:bg-[#195957]">
                Save Changes
              </Button>
            </div>
          )}
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
                <Label className="text-sm font-medium">Household Size</Label>
                {isEditing ? (
                  <Textarea
                    value={displayData.members?.join(", ") || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const members = value ? value.split(",").map(m => m.trim()).filter(m => m) : [];
                      setEditedHousehold({
                        ...editedHousehold,
                        members: members
                      });
                    }}
                    placeholder="e.g., 3 people or 2 adults, 1 child"
                    rows={2}
                  />
                ) : (
                  <p className="text-gray-600">{displayData.members?.join(", ") || "Not set"}</p>
                )}
              </div>
              
              <div>
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
                  <p className="text-gray-600">{displayData.location || "Not set"}</p>
                )}
              </div>
              
              <div>
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
              
              <div>
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
                  <p className="text-gray-600">{displayData.preferences || "None specified"}</p>
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {availableAppliances.map((appliance) => (
                  <div key={appliance.id} className="flex items-center space-x-2">
                    <Switch
                      checked={displayData.appliances?.includes(appliance.id) || false}
                      onCheckedChange={(checked) => {
                        const currentAppliances = displayData.appliances || [];
                        const newAppliances = checked
                          ? [...currentAppliances, appliance.id]
                          : currentAppliances.filter(a => a !== appliance.id);
                        setEditedHousehold({
                          ...editedHousehold,
                          appliances: newAppliances
                        });
                      }}
                    />
                    <Label className="text-sm">{appliance.name}</Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {displayData.appliances?.length > 0 ? displayData.appliances.map((applianceId: string) => {
                  const appliance = availableAppliances.find(a => a.id === applianceId);
                  return (
                    <div key={applianceId} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
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
  );
}