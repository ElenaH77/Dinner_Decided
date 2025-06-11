import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowRight, CheckCircle } from "lucide-react";

export default function ProfileSimple() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedHousehold, setEditedHousehold] = useState<any>(null);
  
  const { data: household, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/household'],
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Debug logging
  console.log("ProfileSimple - Debug Info:", {
    household,
    isLoading,
    error,
    householdType: typeof household,
    householdKeys: household ? Object.keys(household) : null
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
      name: h?.name || "New Household",
      ownerName: h?.ownerName || "",
      onboardingComplete: h?.onboardingComplete !== false // Preserve onboarding status
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedHousehold(null);
    setIsEditing(false);
  };

  // Check if profile is complete enough to proceed to meal planning
  const isProfileComplete = (data: any) => {
    return !!(
      data?.ownerName?.trim() &&
      data?.members?.[0]?.name?.trim() &&
      data?.appliances?.length > 0
    );
  };

  const handleNextStep = () => {
    if (isProfileComplete(household)) {
      setLocation('/this-week');
    }
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
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-screen-sm mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21706D] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-screen-sm mx-auto">
          <div className="text-center py-8">
            <h1 className="text-2xl font-semibold text-[#212121] mb-4">Profile Error</h1>
            <p className="text-gray-600 mb-4">Unable to load your profile data.</p>
            <Button 
              onClick={() => refetch()}
              className="bg-[#21706D] hover:bg-[#195957]"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-screen-sm mx-auto">
          <div className="text-center py-8">
            <h1 className="text-2xl font-semibold text-[#212121] mb-4">No Profile Found</h1>
            <p className="text-gray-600 mb-4">Your household profile couldn't be found.</p>
            <Button 
              onClick={() => window.location.href = '/onboarding'}
              className="bg-[#21706D] hover:bg-[#195957]"
            >
              Set Up Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  console.log("ProfileSimple - proceeding to render with data:", household);

  const displayData = isEditing ? editedHousehold : (household as any);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 pb-24 md:pb-6">
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
                <Label className="text-sm font-medium">What should I call you?</Label>
                <p className="text-xs text-muted-foreground">Used in DinnerBot conversations and meal plan personalization</p>
                {isEditing ? (
                  <Input
                    value={displayData.ownerName || ""}
                    onChange={(e) => setEditedHousehold({
                      ...editedHousehold,
                      ownerName: e.target.value
                    })}
                    placeholder="e.g., Sarah, Mike, Chef"
                  />
                ) : (
                  <p className="text-gray-600 mt-1">{displayData.ownerName || "Not set"}</p>
                )}
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm font-medium">Household Size</Label>
                <p className="text-xs text-muted-foreground">Tells us how to size your recipes. If you like leftovers for lunches, include that here too!</p>
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
                    placeholder="e.g., 2 adults 1 child, or 3 people (love leftovers)"
                    rows={2}
                  />
                ) : (
                  <p className="text-gray-600 mt-1">{displayData.members?.[0]?.name || "Not set"}</p>
                )}
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm font-medium">Location (Zip Code)</Label>
                <p className="text-xs text-muted-foreground">So we don't suggest soup when it's 90° out! Weather affects meal recommendations</p>
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
                <p className="text-xs text-muted-foreground">Affects recipe complexity, prep time, and cooking techniques we suggest</p>
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
                      <SelectItem value="1">Beginner - Simple, few ingredients</SelectItem>
                      <SelectItem value="2">Intermediate - Comfortable with basics</SelectItem>
                      <SelectItem value="3">Advanced - Enjoys complex recipes</SelectItem>
                      <SelectItem value="4">Expert - Professional techniques</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-gray-600">Level {displayData.cookingSkill || 1}</p>
                )}
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm font-medium">Dietary Preferences</Label>
                <p className="text-xs text-muted-foreground">Be specific! You can mention individual family members or general preferences. This directly affects every recipe we suggest.</p>
                {isEditing ? (
                  <Textarea
                    value={displayData.preferences || ""}
                    onChange={(e) => setEditedHousehold({
                      ...editedHousehold,
                      preferences: e.target.value
                    })}
                    placeholder="e.g., Sarah is vegetarian, kids hate mushrooms, low sodium for Dad, we love spicy food"
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
            <p className="text-xs text-muted-foreground mt-1">We only suggest recipes using equipment you actually have. Select everything available in your kitchen.</p>
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

        {/* Next Step Button - Desktop */}
        {!isEditing && isProfileComplete(displayData) && (
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 hidden md:block">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Profile Complete!</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  You're all set to start planning your meals
                </p>
                <Button 
                  onClick={handleNextStep}
                  className="bg-accent hover:bg-accent/90 text-white px-6 py-3 text-base font-medium"
                >
                  Next: Plan This Week
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile Sticky CTA */}
        {!isEditing && isProfileComplete(displayData) && (
          <div className="md:hidden fixed bottom-20 left-4 right-4 z-50">
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 shadow-lg">
              <CardContent className="py-4">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium text-sm">Profile Complete!</span>
                  </div>
                  <Button 
                    onClick={handleNextStep}
                    className="bg-accent hover:bg-accent/90 text-white px-8 py-3 text-base font-medium w-full"
                  >
                    Plan This Week
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Incomplete Profile Guidance */}
        {!isEditing && !isProfileComplete(displayData) && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="font-medium text-amber-800">Complete your profile to continue</p>
                <div className="text-sm text-amber-700 space-y-1">
                  {!displayData?.ownerName?.trim() && <p>• Add your name</p>}
                  {!displayData?.members?.[0]?.name?.trim() && <p>• Add household size</p>}
                  {!displayData?.appliances?.length && <p>• Select at least one kitchen appliance</p>}
                </div>
                <Button 
                  onClick={startEditing}
                  variant="outline"
                  className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
                >
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}