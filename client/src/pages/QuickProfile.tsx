import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function QuickProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    householdSize: "",
    dietary: "",
    kitchen: "",
    cookingSkill: "",
    location: "",
    challenges: ""
  });

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/household", "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/household"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert form data to household format
    const householdData = {
      onboardingComplete: true,
      members: [{ name: "Household Member", dietaryRestrictions: formData.dietary }],
      appliances: formData.kitchen.split(",").map(k => k.trim()).filter(k => k),
      cookingSkill: formData.cookingSkill === "beginner" ? 1 : 
                   formData.cookingSkill === "intermediate" ? 3 : 5,
      location: formData.location,
      challenges: formData.challenges,
      preferences: formData.dietary
    };

    updateProfile.mutate(householdData);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Quick Profile Setup</CardTitle>
            <CardDescription>
              Let's get your profile set up with the correct information so we can start planning meals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="householdSize">How many people are you cooking for?</Label>
                <Input
                  id="householdSize"
                  value={formData.householdSize}
                  onChange={(e) => setFormData({...formData, householdSize: e.target.value})}
                  placeholder="e.g., 2 adults, 1 child"
                  required
                />
              </div>

              <div>
                <Label htmlFor="dietary">Any food stuff we should know about?</Label>
                <Textarea
                  id="dietary"
                  value={formData.dietary}
                  onChange={(e) => setFormData({...formData, dietary: e.target.value})}
                  placeholder="Allergies, dislikes, dietary restrictions..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="kitchen">What's your kitchen like?</Label>
                <Input
                  id="kitchen"
                  value={formData.kitchen}
                  onChange={(e) => setFormData({...formData, kitchen: e.target.value})}
                  placeholder="e.g., fully stocked, basic appliances, oven, stovetop..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="cookingSkill">How do you feel about cooking?</Label>
                <select
                  id="cookingSkill"
                  value={formData.cookingSkill}
                  onChange={(e) => setFormData({...formData, cookingSkill: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select your cooking level</option>
                  <option value="beginner">Beginner - prefer simple recipes</option>
                  <option value="intermediate">Intermediate - comfortable with most cooking</option>
                  <option value="advanced">Advanced - enjoy complex recipes</option>
                </select>
              </div>

              <div>
                <Label htmlFor="location">Where do you live? (ZIP code)</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., 22301"
                  required
                />
              </div>

              <div>
                <Label htmlFor="challenges">What makes dinner hard at your house?</Label>
                <Textarea
                  id="challenges"
                  value={formData.challenges}
                  onChange={(e) => setFormData({...formData, challenges: e.target.value})}
                  placeholder="Time constraints, picky eaters, busy schedule..."
                  rows={2}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#21706D] hover:bg-[#1a5a57]"
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? "Saving..." : "Save Profile & Start Planning"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}