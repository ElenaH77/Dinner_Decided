import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChefHat, Users, MapPin, Utensils } from "lucide-react";

export default function Onboarding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    ownerName: "",
    householdName: "",
    members: [] as Array<{
      id: string;
      name: string;
      age: string;
      dietaryRestrictions: string[];
    }>,
    cookingSkill: 2,
    preferences: "",
    challenges: "",
    location: "",
    appliances: [] as string[],
  });

  const [memberForm, setMemberForm] = useState({
    name: "",
    age: "adult",
    dietaryRestrictions: [] as string[]
  });

  const appliances = [
    "ovenStovetop",
    "microwave", 
    "slowCooker",
    "airFryer",
    "instantPot",
    "grill",
    "blender",
    "foodProcessor"
  ];

  const dietaryOptions = [
    "vegetarian",
    "vegan", 
    "glutenFree",
    "dairyFree",
    "nutFree",
    "lowCarb",
    "keto"
  ];

  const addMember = () => {
    if (!memberForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a member name",
        variant: "destructive"
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      members: [...prev.members, { 
        id: `member-${Date.now()}`,
        ...memberForm 
      }]
    }));
    
    setMemberForm({
      name: "",
      age: "adult",
      dietaryRestrictions: []
    });
  };

  const removeMember = (id: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== id)
    }));
  };

  const handleApplianceChange = (appliance: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      appliances: checked 
        ? [...prev.appliances, appliance]
        : prev.appliances.filter(a => a !== appliance)
    }));
  };

  const handleDietaryChange = (restriction: string, checked: boolean) => {
    setMemberForm(prev => ({
      ...prev,
      dietaryRestrictions: checked
        ? [...prev.dietaryRestrictions, restriction]
        : prev.dietaryRestrictions.filter(r => r !== restriction)
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.ownerName.trim()) {
        toast({
          title: "Error", 
          description: "Please enter your name",
          variant: "destructive"
        });
        return;
      }

      // Create household
      await apiRequest("POST", "/api/household", {
        name: formData.householdName || `${formData.ownerName}'s Household`,
        ownerName: formData.ownerName,
        members: formData.members,
        cookingSkill: formData.cookingSkill,
        preferences: formData.preferences,
        challenges: formData.challenges || "",
        location: formData.location || "",
        appliances: formData.appliances,
        onboardingComplete: true
      });

      // Invalidate queries to refetch household data
      queryClient.invalidateQueries({ queryKey: ['/api/household'] });

      toast({
        title: "Welcome to Dinner, Decided!",
        description: "Your household profile has been created successfully."
      });

      // Navigate to home page
      navigate("/");
    } catch (error) {
      console.error("Error creating household:", error);
      toast({
        title: "Error",
        description: "Failed to create your household profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fffe] to-[#e8f7f5] py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ChefHat className="h-8 w-8 text-[#21706D]" />
            <h1 className="text-3xl font-bold text-[#212121]">Dinner, Decided</h1>
          </div>
          <p className="text-lg text-gray-600">Let's set up your personalized meal planning experience</p>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full ${
                    step <= currentStep ? 'bg-[#21706D]' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <><Users className="h-5 w-5" /> Tell us about yourself</>}
              {currentStep === 2 && <><MapPin className="h-5 w-5" /> Your household</>}
              {currentStep === 3 && <><Utensils className="h-5 w-5" /> Cooking preferences</>}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Basic information to get started"}
              {currentStep === 2 && "Who's in your household and their dietary needs"}
              {currentStep === 3 && "Your cooking style and available equipment"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ownerName">Your Name *</Label>
                  <Input
                    id="ownerName"
                    value={formData.ownerName}
                    onChange={(e) => setFormData(prev => ({...prev, ownerName: e.target.value}))}
                    placeholder="Enter your name"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="householdName">Household Name (optional)</Label>
                  <Input
                    id="householdName"
                    value={formData.householdName}
                    onChange={(e) => setFormData(prev => ({...prev, householdName: e.target.value}))}
                    placeholder="The Smith Family, College House, etc."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location (optional)</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
                    placeholder="City, State or ZIP code"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Add Household Members</Label>
                  <p className="text-sm text-gray-600 mb-4">Add everyone who will be eating these meals</p>
                  
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="memberName">Name</Label>
                        <Input
                          id="memberName"
                          value={memberForm.name}
                          onChange={(e) => setMemberForm(prev => ({...prev, name: e.target.value}))}
                          placeholder="Member name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="memberAge">Age Group</Label>
                        <select
                          id="memberAge"
                          value={memberForm.age}
                          onChange={(e) => setMemberForm(prev => ({...prev, age: e.target.value}))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="child">Child</option>
                          <option value="teen">Teen</option>
                          <option value="adult">Adult</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Dietary Restrictions</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {dietaryOptions.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <Checkbox
                              id={`dietary-${option}`}
                              checked={memberForm.dietaryRestrictions.includes(option)}
                              onCheckedChange={(checked) => handleDietaryChange(option, checked as boolean)}
                            />
                            <Label htmlFor={`dietary-${option}`} className="text-sm">
                              {option.charAt(0).toUpperCase() + option.slice(1).replace(/([A-Z])/g, ' $1')}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Button onClick={addMember} variant="outline" className="w-full">
                      Add Member
                    </Button>
                  </div>

                  {formData.members.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">Current Members:</Label>
                      <div className="space-y-2 mt-2">
                        {formData.members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <div>
                              <span className="font-medium">{member.name}</span>
                              <span className="text-gray-600 ml-2">({member.age})</span>
                              {member.dietaryRestrictions.length > 0 && (
                                <span className="text-sm text-gray-500 ml-2">
                                  • {member.dietaryRestrictions.join(", ")}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMember(member.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Cooking Skill Level</Label>
                  <div className="mt-2">
                    <Slider
                      value={[formData.cookingSkill]}
                      onValueChange={(value) => setFormData(prev => ({...prev, cookingSkill: value[0]}))}
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>Beginner</span>
                      <span>Intermediate</span>
                      <span>Expert</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Available Appliances</Label>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {appliances.map((appliance) => (
                      <div key={appliance} className="flex items-center space-x-2">
                        <Checkbox
                          id={`appliance-${appliance}`}
                          checked={formData.appliances.includes(appliance)}
                          onCheckedChange={(checked) => handleApplianceChange(appliance, checked as boolean)}
                        />
                        <Label htmlFor={`appliance-${appliance}`} className="text-sm">
                          {appliance.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="preferences">Meal Preferences</Label>
                  <Textarea
                    id="preferences"
                    value={formData.preferences}
                    onChange={(e) => setFormData(prev => ({...prev, preferences: e.target.value}))}
                    placeholder="e.g., Quick weeknight meals, Asian cuisine, comfort food, healthy options..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="challenges">Cooking Challenges (optional)</Label>
                  <Textarea
                    id="challenges"
                    value={formData.challenges}
                    onChange={(e) => setFormData(prev => ({...prev, challenges: e.target.value}))}
                    placeholder="e.g., Limited time, picky eaters, budget constraints..."
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                >
                  Previous
                </Button>
              )}
              
              {currentStep < 3 ? (
                <Button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="bg-[#21706D] hover:bg-[#185956] ml-auto"
                  disabled={currentStep === 1 && !formData.ownerName.trim()}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-[#21706D] hover:bg-[#185956] ml-auto"
                  disabled={!formData.ownerName.trim()}
                >
                  Complete Setup
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}