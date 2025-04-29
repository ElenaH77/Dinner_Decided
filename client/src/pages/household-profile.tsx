import { useState, useEffect } from 'react';
import { useHousehold } from '@/contexts/household-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import MemberCard from '@/components/household/member-card';
import EquipmentItem from '@/components/household/equipment-item';
import { PlusCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { HouseholdMember, KitchenEquipment } from '@/lib/types';

export default function HouseholdProfile() {
  const { toast } = useToast();
  const { 
    members, 
    equipment, 
    preferences,
    isLoading,
    setMembers,
    setEquipment,
    setPreferences,
    refreshHouseholdData
  } = useHousehold();

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberDietary, setNewMemberDietary] = useState('');
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState<number>(3);
  const [weekdayCookingTime, setWeekdayCookingTime] = useState<string>('30-45 minutes');
  const [weekendCookingStyle, setWeekendCookingStyle] = useState<string>('More time for special meals');
  
  // Update form values when preferences are loaded
  useEffect(() => {
    if (preferences) {
      setConfidenceLevel(preferences.confidenceLevel);
      setWeekdayCookingTime(preferences.weekdayCookingTime);
      setWeekendCookingStyle(preferences.weekendCookingStyle);
    }
  }, [preferences]);
  
  // Available cuisines for selection
  const availableCuisines = ['Italian', 'Mexican', 'American', 'Indian', 'Chinese', 'Japanese', 'Thai', 'Mediterranean', 'French', 'Greek'];
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(preferences?.preferredCuisines || []);

  const addMember = async () => {
    if (!newMemberName.trim()) return;

    try {
      const response = await apiRequest('POST', '/api/household-members', {
        userId: 1, // Using hardcoded user ID for simplicity
        name: newMemberName,
        dietaryRestrictions: newMemberDietary || undefined,
        isMainUser: members.length === 0
      });

      const newMember = await response.json();
      setMembers([...members, newMember]);
      setNewMemberName('');
      setNewMemberDietary('');
      
      toast({
        title: "Member added",
        description: `${newMember.name} has been added to your household.`
      });
    } catch (error) {
      toast({
        title: "Failed to add member",
        description: "There was an error adding the household member.",
        variant: "destructive"
      });
    }
  };

  const removeMember = async (id: number) => {
    try {
      await apiRequest('DELETE', `/api/household-members/${id}`);
      setMembers(members.filter(member => member.id !== id));
      
      toast({
        title: "Member removed",
        description: "The household member has been removed."
      });
    } catch (error) {
      toast({
        title: "Failed to remove member",
        description: "There was an error removing the household member.",
        variant: "destructive"
      });
    }
  };

  const updateMember = async (member: HouseholdMember) => {
    try {
      await apiRequest('PUT', `/api/household-members/${member.id}`, member);
      setMembers(members.map(m => m.id === member.id ? member : m));
      
      toast({
        title: "Member updated",
        description: `${member.name}'s information has been updated.`
      });
    } catch (error) {
      toast({
        title: "Failed to update member",
        description: "There was an error updating the household member.",
        variant: "destructive"
      });
    }
  };

  const addEquipment = async () => {
    if (!newEquipmentName.trim()) return;

    try {
      const response = await apiRequest('POST', '/api/kitchen-equipment', {
        userId: 1, // Using hardcoded user ID for simplicity
        name: newEquipmentName,
        isOwned: true
      });

      const newEquipment = await response.json();
      setEquipment([...equipment, newEquipment]);
      setNewEquipmentName('');
      
      toast({
        title: "Equipment added",
        description: `${newEquipment.name} has been added to your kitchen.`
      });
    } catch (error) {
      toast({
        title: "Failed to add equipment",
        description: "There was an error adding the kitchen equipment.",
        variant: "destructive"
      });
    }
  };

  const toggleEquipment = async (id: number, isOwned: boolean) => {
    try {
      await apiRequest('PUT', `/api/kitchen-equipment/${id}`, { isOwned });
      setEquipment(equipment.map(e => e.id === id ? { ...e, isOwned } : e));
    } catch (error) {
      toast({
        title: "Failed to update equipment",
        description: "There was an error updating the kitchen equipment.",
        variant: "destructive"
      });
    }
  };

  const removeEquipment = async (id: number) => {
    try {
      await apiRequest('DELETE', `/api/kitchen-equipment/${id}`);
      setEquipment(equipment.filter(e => e.id !== id));
      
      toast({
        title: "Equipment removed",
        description: "The kitchen equipment has been removed."
      });
    } catch (error) {
      toast({
        title: "Failed to remove equipment",
        description: "There was an error removing the kitchen equipment.",
        variant: "destructive"
      });
    }
  };

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev => 
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const savePreferences = async () => {
    try {
      // If preferences already exist, update them
      if (preferences?.id) {
        await apiRequest('PUT', `/api/cooking-preferences/${preferences.id}`, {
          confidenceLevel,
          weekdayCookingTime,
          weekendCookingStyle,
          preferredCuisines: selectedCuisines
        });
      } else {
        // Otherwise create new preferences
        const response = await apiRequest('POST', '/api/cooking-preferences', {
          userId: 1,
          confidenceLevel,
          weekdayCookingTime,
          weekendCookingStyle,
          preferredCuisines: selectedCuisines,
          location: ''
        });
        
        const newPreferences = await response.json();
        setPreferences(newPreferences);
      }
      
      toast({
        title: "Preferences saved",
        description: "Your cooking preferences have been updated."
      });
    } catch (error) {
      toast({
        title: "Failed to save preferences",
        description: "There was an error saving your cooking preferences.",
        variant: "destructive"
      });
    }
  };

  // Update cuisines list when preferences change
  useEffect(() => {
    if (preferences?.preferredCuisines) {
      setSelectedCuisines(preferences.preferredCuisines);
    }
  }, [preferences]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-12 w-12 border-4 border-teal-primary border-t-transparent rounded-full mb-4"></div>
          <h3 className="text-xl font-medium text-neutral-text">Loading household data...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl">
      <div className="sticky top-4 z-10 mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-text">Household Profile</h2>
            <p className="text-neutral-text mt-1">Customize your information to get more personalized meal suggestions.</p>
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={refreshHouseholdData}
            className="mt-2 sm:mt-0"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Household Members Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h3 className="text-lg font-medium mb-4 text-teal-primary">Household Members</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {members.map(member => (
            <MemberCard 
              key={member.id} 
              member={member} 
              onUpdate={updateMember}
              onRemove={removeMember}
            />
          ))}
        </div>
        
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Enter name"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Dietary Restrictions (Optional)</label>
            <Input
              type="text"
              value={newMemberDietary}
              onChange={(e) => setNewMemberDietary(e.target.value)}
              placeholder="e.g., Vegetarian, No nuts"
            />
          </div>
          <Button 
            onClick={addMember}
            className="bg-teal-primary hover:bg-teal-light text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Kitchen Equipment Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h3 className="text-lg font-medium mb-4 text-teal-primary">Kitchen Equipment</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {equipment.map(item => (
            <EquipmentItem 
              key={item.id} 
              equipment={item} 
              onToggle={(isOwned) => toggleEquipment(item.id, isOwned)}
              onRemove={() => removeEquipment(item.id)}
            />
          ))}
        </div>
        
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Equipment Name</label>
            <Input
              type="text"
              value={newEquipmentName}
              onChange={(e) => setNewEquipmentName(e.target.value)}
              placeholder="e.g., Slow Cooker, Air Fryer"
            />
          </div>
          <Button 
            onClick={addEquipment}
            className="bg-teal-primary hover:bg-teal-light text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Cooking Preferences Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h3 className="text-lg font-medium mb-4 text-teal-primary">Cooking Preferences</h3>
        
        <div className="mb-6">
          <label className="block mb-2 font-medium">Cooking Confidence</label>
          <div className="flex items-center">
            <span className="text-sm mr-2">Beginner</span>
            <Slider
              value={[confidenceLevel]}
              onValueChange={(value) => setConfidenceLevel(value[0])}
              max={5}
              step={1}
              className="flex-1 mx-2"
            />
            <span className="text-sm ml-2">Expert</span>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block mb-2 font-medium">Time for Weekday Cooking</label>
          <Select value={weekdayCookingTime} onValueChange={setWeekdayCookingTime}>
            <SelectTrigger>
              <SelectValue placeholder="Select cooking time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Less than 30 minutes">Less than 30 minutes</SelectItem>
              <SelectItem value="30-45 minutes">30-45 minutes</SelectItem>
              <SelectItem value="45-60 minutes">45-60 minutes</SelectItem>
              <SelectItem value="More than 60 minutes">More than 60 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="mb-6">
          <label className="block mb-2 font-medium">Weekend Cooking Style</label>
          <Select value={weekendCookingStyle} onValueChange={setWeekendCookingStyle}>
            <SelectTrigger>
              <SelectValue placeholder="Select cooking style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Keep it simple">Keep it simple</SelectItem>
              <SelectItem value="More time for special meals">More time for special meals</SelectItem>
              <SelectItem value="Batch cooking for the week">Batch cooking for the week</SelectItem>
              <SelectItem value="Mix of quick and elaborate">Mix of quick and elaborate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="mb-6">
          <label className="block mb-2 font-medium">Preferred Cuisines</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {availableCuisines.map(cuisine => (
              <div className="flex items-center" key={cuisine}>
                <Checkbox
                  id={`cuisine-${cuisine}`}
                  checked={selectedCuisines.includes(cuisine)}
                  onCheckedChange={() => toggleCuisine(cuisine)}
                  className="mr-2"
                />
                <label htmlFor={`cuisine-${cuisine}`}>{cuisine}</label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-md z-10">
        <div className="container mx-auto max-w-6xl flex justify-end">
          <Button 
            onClick={savePreferences}
            className="bg-teal-primary hover:bg-teal-light text-white py-2 px-6 font-medium"
          >
            Save Changes
          </Button>
        </div>
      </div>
      
      {/* Add padding at the bottom to prevent content from being hidden behind the fixed button */}
      <div className="h-20"></div>
    </div>
  );
}
