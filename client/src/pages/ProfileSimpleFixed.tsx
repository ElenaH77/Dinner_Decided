import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProfileSimpleFixed() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  
  const { data: household, isLoading, error } = useQuery({
    queryKey: ['/api/household'],
  });

  const handleSave = async () => {
    try {
      await apiRequest("PATCH", "/api/household", editedData);
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const startEdit = () => {
    setEditedData(household || {});
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-screen-sm mx-auto text-center py-12">
          <div className="w-8 h-8 border-2 border-[#21706D] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-screen-sm mx-auto text-center py-12">
          <h1 className="text-2xl font-semibold mb-4">Error Loading Profile</h1>
          <p className="text-gray-600 mb-4">Unable to load your profile data.</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-screen-sm mx-auto text-center py-12">
          <h1 className="text-2xl font-semibold mb-4">No Profile Found</h1>
          <p className="text-gray-600 mb-4">Set up your household profile to get started.</p>
          <Button onClick={() => window.location.href = '/onboarding'}>
            Set Up Profile
          </Button>
        </div>
      </div>
    );
  }

  const data = isEditing ? editedData : household;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-screen-sm mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Profile</h1>
          {!isEditing ? (
            <Button onClick={startEdit} className="bg-[#21706D] hover:bg-[#195957]">
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-[#21706D] hover:bg-[#195957]">
                Save
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Household Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              {isEditing ? (
                <Input
                  value={data.ownerName || ""}
                  onChange={(e) => setEditedData({...editedData, ownerName: e.target.value})}
                  placeholder="Your name"
                />
              ) : (
                <p className="text-gray-600 mt-1">{data.ownerName || "Not set"}</p>
              )}
            </div>

            <div>
              <Label>Household Name</Label>
              {isEditing ? (
                <Input
                  value={data.name || ""}
                  onChange={(e) => setEditedData({...editedData, name: e.target.value})}
                  placeholder="Household name"
                />
              ) : (
                <p className="text-gray-600 mt-1">{data.name || "Not set"}</p>
              )}
            </div>

            <div>
              <Label>Cooking Skill</Label>
              {isEditing ? (
                <Select
                  value={data.cookingSkill?.toString() || "1"}
                  onValueChange={(value) => setEditedData({...editedData, cookingSkill: parseInt(value)})}
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
                <p className="text-gray-600 mt-1">Level {data.cookingSkill || 1}</p>
              )}
            </div>

            <div>
              <Label>Dietary Preferences</Label>
              {isEditing ? (
                <Textarea
                  value={data.preferences || ""}
                  onChange={(e) => setEditedData({...editedData, preferences: e.target.value})}
                  placeholder="Any dietary restrictions or preferences"
                  rows={3}
                />
              ) : (
                <p className="text-gray-600 mt-1">{data.preferences || "None specified"}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}