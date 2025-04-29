import React, { createContext, useContext, useState, ReactNode } from 'react';
import { HouseholdMember, KitchenEquipment, CookingPreference } from '@/lib/types';

interface HouseholdContextType {
  members: HouseholdMember[];
  equipment: KitchenEquipment[];
  preferences: CookingPreference | null;
  setMembers: (members: HouseholdMember[]) => void;
  setEquipment: (equipment: KitchenEquipment[]) => void;
  setPreferences: (preferences: CookingPreference) => void;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [equipment, setEquipment] = useState<KitchenEquipment[]>([]);
  const [preferences, setPreferences] = useState<CookingPreference | null>(null);

  return (
    <HouseholdContext.Provider value={{ 
      members, 
      equipment, 
      preferences, 
      setMembers, 
      setEquipment, 
      setPreferences 
    }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}