import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { HouseholdMember, KitchenEquipment, CookingPreference } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface HouseholdContextType {
  members: HouseholdMember[];
  equipment: KitchenEquipment[];
  preferences: CookingPreference | null;
  isLoading: boolean;
  setMembers: (members: HouseholdMember[]) => void;
  setEquipment: (equipment: KitchenEquipment[]) => void;
  setPreferences: (preferences: CookingPreference) => void;
  refreshHouseholdData: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [equipment, setEquipment] = useState<KitchenEquipment[]>([]);
  const [preferences, setPreferences] = useState<CookingPreference | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Function to fetch household data from the API
  const fetchHouseholdData = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', '/api/household');
      
      // Handle empty responses (when household doesn't exist)
      const text = await response.text();
      let data = null;
      
      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch (error) {
          console.error('Failed to parse household JSON response:', text);
          data = null;
        }
      }
      
      console.log('Fetched household data:', data);
      
      if (data) {
        // Set household members - handle both onboarding format and full member objects
        if (data.members && Array.isArray(data.members)) {
          console.log('Setting members:', data.members);
          
          // Check if members are simple strings from onboarding (like ["3 people"])
          if (data.members.length > 0 && typeof data.members[0] === 'string') {
            // Convert onboarding format to member objects
            const memberStrings = data.members;
            const convertedMembers = memberStrings.map((memberStr: string, index: number) => ({
              id: `onboarding-${index}`,
              userId: 1,
              name: memberStr,
              dietaryRestrictions: data.preferences || '',
              isMainUser: index === 0
            }));
            setMembers(convertedMembers);
          } else {
            // Already in member object format
            setMembers(data.members);
          }
        } else {
          console.log('No members data or invalid format:', data.members);
          setMembers([]);
        }
        
        // Set kitchen equipment
        if (data.equipment && Array.isArray(data.equipment)) {
          setEquipment(data.equipment);
        } else if (data.appliances && Array.isArray(data.appliances)) {
          // Convert appliance strings to KitchenEquipment objects
          const equipmentList = data.appliances.map((appName: string) => ({
            id: Date.now() + Math.floor(Math.random() * 1000),
            userId: 1,
            name: appName.charAt(0).toUpperCase() + appName.slice(1),
            isOwned: true
          }));
          setEquipment(equipmentList);
        } else {
          setEquipment([]);
        }
        
        // Set cooking preferences
        if (data.preferences) {
          try {
            // Check if preferences is a string that needs parsing
            if (typeof data.preferences === 'string') {
              const parsedPreferences = JSON.parse(data.preferences);
              
              // Create a complete preferences object
              const completePreferences = {
                id: data.id || 1,
                userId: 1,
                confidenceLevel: data.cookingSkill || 3,
                weekdayCookingTime: parsedPreferences.weekdayCookingTime || '30-45 minutes',
                weekendCookingStyle: parsedPreferences.weekendCookingStyle || 'Keep it simple',
                preferredCuisines: parsedPreferences.preferredCuisines || [],
                location: parsedPreferences.location || data.location || '',
                appliances: data.appliances || []
              };
              
              setPreferences(completePreferences);
            } else {
              // It's already an object, use it directly
              setPreferences({
                ...data.preferences,
                appliances: data.appliances || []
              });
            }
          } catch (error) {
            console.error('Error parsing preferences:', error);
            // Create default preferences using available data
            setPreferences({
              id: data.id || 1,
              userId: 1,
              confidenceLevel: data.cookingSkill || 3,
              weekdayCookingTime: '30-45 minutes',
              weekendCookingStyle: 'Keep it simple',
              preferredCuisines: [],
              location: data.location || '',
              appliances: data.appliances || []
            });
          }
        } else if (data.location || data.appliances) {
          // Create minimal preferences from the household data
          setPreferences({
            id: data.id || 1,
            userId: 1,
            confidenceLevel: data.cookingSkill || 3,
            weekdayCookingTime: '30-45 minutes',
            weekendCookingStyle: 'Keep it simple',
            preferredCuisines: [],
            location: data.location || '',
            appliances: data.appliances || []
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch household data:', error);
      toast({
        title: 'Error loading household data',
        description: 'There was a problem loading your household information.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load household data on component mount
  useEffect(() => {
    fetchHouseholdData();
  }, []);

  return (
    <HouseholdContext.Provider value={{ 
      members, 
      equipment, 
      preferences,
      isLoading,
      setMembers, 
      setEquipment, 
      setPreferences,
      refreshHouseholdData: fetchHouseholdData
    }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    console.error('useHousehold must be used within a HouseholdProvider');
    // Return a default context with empty values
    return {
      members: [],
      equipment: [],
      preferences: null,
      isLoading: false,
      setMembers: () => {},
      setEquipment: () => {},
      setPreferences: () => {},
      refreshHouseholdData: async () => {}
    };
  }
  return context;
}