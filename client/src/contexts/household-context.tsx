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
      const data = await response.json();
      
      if (data) {
        // Set household members
        if (data.members && Array.isArray(data.members)) {
          setMembers(data.members);
        }
        
        // Set kitchen equipment
        if (data.equipment && Array.isArray(data.equipment)) {
          setEquipment(data.equipment);
        }
        
        // Set cooking preferences
        if (data.preferences) {
          setPreferences(data.preferences);
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