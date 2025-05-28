import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Check, User, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

export default function Profile() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const { data: household, isLoading } = useQuery({
    queryKey: ['/api/household'],
  });

  const handleSaveProfile = async () => {
    try {
      await apiRequest("PATCH", "/api/household", household);
      queryClient.invalidateQueries({ queryKey: ['/api/household'] });
      
      toast({
        title: "Profile updated",
        description: "Your household profile has been saved successfully.",
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const addFamilyMember = () => {
    if (!household) return;
    
    const updatedHousehold = {
      ...household,
      members: [
        ...(household.members || []),
        { id: `temp-${Date.now()}`, name: "", age: "", dietaryRestrictions: [] }
      ]
    };
    
    queryClient.setQueryData(['/api/household'], updatedHousehold);
  };

  const removeFamilyMember = (id: string) => {
    if (!household) return;
    
    const updatedHousehold = {
      ...household,
      members: (household.members || []).filter(member => member.id !== id)
    };
    
    queryClient.setQueryData(['/api/household'], updatedHousehold);
  };

  const updateFamilyMember = (id: string, field: string, value: any) => {
    if (!household) return;
    
    const updatedHousehold = {
      ...household,
      members: household.members.map(member => 
        member.id === id ? { ...member, [field]: value } : member
      )
    };
    
    queryClient.setQueryData(['/api/household'], updatedHousehold);
  };

  const handleResetProfile = async () => {
    if (!confirm("Are you sure you want to reset your profile? This will clear all your information and you'll need to start over.")) {
      return;
    }
    
    setIsResetting(true);
    try {
      // Reset the household to onboarding state
      await apiRequest("PATCH", "/api/household", {
        onboardingComplete: false,
        members: [],
        preferences: "",
        challenges: null,
        location: null,
        appliances: [],
        cookingSkill: 1
      });
      
      // Clear all cached data
      queryClient.invalidateQueries({ queryKey: ['/api/household'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plan/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/grocery-list/current'] });
      
      toast({
        title: "Profile reset complete",
        description: "Your profile has been reset. You can now start the onboarding process again.",
      });
    } catch (error) {
      toast({
        title: "Reset failed",
        description: "There was an error resetting your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const updateAppliance = (id: string, checked: boolean) => {
    if (!household) return;
    
    const updatedHousehold = {
      ...household,
      appliances: checked 
        ? [...household.appliances, id]
        : household.appliances.filter(a => a !== id)
    };
    
    queryClient.setQueryData(['/api/household'], updatedHousehold);
  };

  const appliances = [
    { id: "slowCooker", name: "Slow Cooker" },
    { id: "instantPot", name: "Instant Pot" },
    { id: "airFryer", name: "Air Fryer" },
    { id: "standMixer", name: "Stand Mixer" },
    { id: "blender", name: "Blender" },
    { id: "foodProcessor", name: "Food Processor" },
  ];

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121]">Household Profile</h1>
          <p className="text-gray-600">Customize your information to get more personalized meal suggestions.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              if (confirm("Are you sure you want to reset your profile? This will clear all your data and restart onboarding.")) {
                fetch('/api/household', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    onboardingComplete: false,
                    members: [],
                    preferences: "",
                    challenges: null,
                    location: null,
                    appliances: [],
                    cookingSkill: 1
                  })
                }).then(() => {
                  alert("Profile reset! Please refresh the page.");
                  window.location.reload();
                });
              }
            }}
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          >
            Reset Profile
          </Button>
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)}
              className="bg-[#21706D] hover:bg-[#195957]"
            >
              Edit Profile
            </Button>
          ) : (
            <Button 
              onClick={handleSaveProfile}
              className="bg-[#21706D] hover:bg-[#195957]"
            >
              <Check className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {isLoading || !household ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[1, 2].map(i => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-[#21706D]" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="householdName">Household Name</Label>
                  <Input 
                    id="householdName" 
                    value={household?.name || ""}
                    onChange={(e) => queryClient.setQueryData(['/api/household'], {...household, name: e.target.value})}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Location (for weather-based meal suggestions)</Label>
                  <Input 
                    id="location" 
                    value={household?.location || ""}
                    onChange={(e) => queryClient.setQueryData(['/api/household'], {...household, location: e.target.value})}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="City, State or Zip Code"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cookingSkill">Cooking Skill Level</Label>
                  <Select 
                    disabled={!isEditing} 
                    value={household?.cookingSkill?.toString() || "3"}
                    onValueChange={(value) => queryClient.setQueryData(['/api/household'], {...household, cookingSkill: parseInt(value)})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select skill level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Beginner</SelectItem>
                      <SelectItem value="2">2 - Basic</SelectItem>
                      <SelectItem value="3">3 - Intermediate</SelectItem>
                      <SelectItem value="4">4 - Advanced</SelectItem>
                      <SelectItem value="5">5 - Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="preferences">Dietary Preferences & Notes</Label>
                  <Textarea 
                    id="preferences" 
                    value={household?.preferences || ""}
                    onChange={(e) => queryClient.setQueryData(['/api/household'], {...household, preferences: e.target.value})}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="Any dietary preferences, restrictions, or foods your family particularly loves or dislikes?"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-[#21706D]" />
                Family Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {household?.members.map((member, index) => (
                  <div key={member.id} className="p-4 border border-[#E2E2E2] rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">Family Member {index + 1}</h3>
                      {isEditing && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeFamilyMember(member.id)}
                          className="h-8 w-8 p-0 text-[#F25C05]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`name-${member.id}`}>Name</Label>
                        <Input 
                          id={`name-${member.id}`} 
                          value={member.name}
                          onChange={(e) => updateFamilyMember(member.id, "name", e.target.value)}
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`age-${member.id}`}>Age</Label>
                        <Input 
                          id={`age-${member.id}`} 
                          value={member.age}
                          onChange={(e) => updateFamilyMember(member.id, "age", e.target.value)}
                          disabled={!isEditing}
                          className="mt-1"
                          type="text"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {isEditing && (
                  <Button 
                    variant="outline" 
                    onClick={addFamilyMember}
                    className="w-full border-dashed border-[#21706D] text-[#21706D]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Family Member
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Kitchen Appliances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appliances.map((appliance) => (
                  <div key={appliance.id} className="flex items-center space-x-2">
                    <Switch 
                      id={`appliance-${appliance.id}`}
                      checked={household?.appliances.includes(appliance.id)}
                      onCheckedChange={(checked) => updateAppliance(appliance.id, checked)}
                      disabled={!isEditing}
                    />
                    <Label htmlFor={`appliance-${appliance.id}`}>{appliance.name}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reset Profile Section */}
      <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-medium text-red-800 mb-2">Reset Profile</h3>
        <p className="text-red-600 mb-4">
          This will clear all your profile data and restart the onboarding process. This action cannot be undone.
        </p>
        <Button 
          onClick={handleResetProfile}
          disabled={isResetting}
          variant="destructive"
          className="bg-red-600 hover:bg-red-700"
        >
          {isResetting ? "Resetting..." : "Reset My Profile"}
        </Button>
      </div>
    </div>
  );
}
