import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Save, X, User, Users, ChefHat, MapPin } from "lucide-react";

export default function WorkingProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);

  // Fetch household data with proper error handling
  const { data: household, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/household'],
    queryFn: async () => await apiRequest("GET", "/api/household"),
    retry: false,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", "/api/household", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/household'] });
      setIsEditing(false);
      setEditedData(null);
      toast({
        title: "Profile updated",
        description: "Your household profile has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const startEditing = () => {
    setEditedData({
      name: household?.name || "",
      ownerName: household?.ownerName || "",
      cookingSkill: household?.cookingSkill || 1,
      preferences: household?.preferences || "",
      challenges: household?.challenges || "",
      location: household?.location || "",
      appliances: household?.appliances || [],
      members: household?.members || []
    });
    setIsEditing(true);
  };

  const saveChanges = () => {
    updateMutation.mutate(editedData);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedData(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading your profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Unable to load profile. Please check your connection and try again.
            </div>
            <Button onClick={() => refetch()} className="mt-4 w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentData = isEditing ? editedData : household;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="h-8 w-8" />
          Household Profile
        </h1>
        {!isEditing ? (
          <Button onClick={startEditing} variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={saveChanges} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button onClick={cancelEditing} variant="outline">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ownerName">Your Name</Label>
              {isEditing ? (
                <Input
                  id="ownerName"
                  value={editedData?.ownerName || ""}
                  onChange={(e) => setEditedData({...editedData, ownerName: e.target.value})}
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{currentData?.ownerName || "Not set"}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="name">Household Name</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={editedData?.name || ""}
                  onChange={(e) => setEditedData({...editedData, name: e.target.value})}
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{currentData?.name || "Not set"}</p>
              )}
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              {isEditing ? (
                <Input
                  id="location"
                  value={editedData?.location || ""}
                  onChange={(e) => setEditedData({...editedData, location: e.target.value})}
                  placeholder="City, State"
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{currentData?.location || "Not set"}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cooking Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Cooking Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cookingSkill">Cooking Skill Level</Label>
              {isEditing ? (
                <Select
                  value={editedData?.cookingSkill?.toString() || "1"}
                  onValueChange={(value) => setEditedData({...editedData, cookingSkill: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Beginner</SelectItem>
                    <SelectItem value="2">Some Experience</SelectItem>
                    <SelectItem value="3">Intermediate</SelectItem>
                    <SelectItem value="4">Advanced</SelectItem>
                    <SelectItem value="5">Expert</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {currentData?.cookingSkill === 1 ? "Beginner" :
                   currentData?.cookingSkill === 2 ? "Some Experience" :
                   currentData?.cookingSkill === 3 ? "Intermediate" :
                   currentData?.cookingSkill === 4 ? "Advanced" :
                   currentData?.cookingSkill === 5 ? "Expert" : "Not set"}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="preferences">Food Preferences</Label>
              {isEditing ? (
                <Textarea
                  id="preferences"
                  value={editedData?.preferences || ""}
                  onChange={(e) => setEditedData({...editedData, preferences: e.target.value})}
                  placeholder="Any dietary restrictions, favorite cuisines, etc."
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{currentData?.preferences || "None specified"}</p>
              )}
            </div>

            <div>
              <Label htmlFor="challenges">Cooking Challenges</Label>
              {isEditing ? (
                <Textarea
                  id="challenges"
                  value={editedData?.challenges || ""}
                  onChange={(e) => setEditedData({...editedData, challenges: e.target.value})}
                  placeholder="Time constraints, picky eaters, etc."
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{currentData?.challenges || "None specified"}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Household Members */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Household Members ({currentData?.members?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentData?.members?.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {currentData.members.map((member: any, index: number) => (
                <div key={index} className="p-3 border rounded-lg">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">Age: {member.age}</p>
                  {member.dietaryRestrictions?.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Restrictions: {member.dietaryRestrictions.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No household members added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Kitchen Appliances */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Kitchen Equipment ({currentData?.appliances?.length || 0} items)</CardTitle>
        </CardHeader>
        <CardContent>
          {currentData?.appliances?.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
              {currentData.appliances.map((appliance: string, index: number) => (
                <div key={index} className="flex items-center p-2 bg-muted rounded">
                  <span className="text-sm">{appliance}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No kitchen equipment specified.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}