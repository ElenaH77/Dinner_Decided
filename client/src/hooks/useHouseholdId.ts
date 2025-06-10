import { useState, useEffect } from 'react';

const HOUSEHOLD_ID_KEY = 'dinner-decided-household-id';

export function useHouseholdId() {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get household ID - no fallbacks, no backups
    let storedId = localStorage.getItem(HOUSEHOLD_ID_KEY);
    
    if (storedId) {
      console.log('[HOUSEHOLD ID] Using stored ID:', storedId);
      setHouseholdId(storedId);
      setIsLoading(false);
      return;
    }
    
    // If no stored ID, create a new one
    console.log('[HOUSEHOLD ID] No stored ID found, creating new household');
    const newId = crypto.randomUUID();
    localStorage.setItem(HOUSEHOLD_ID_KEY, newId);
    setHouseholdId(newId);
    setIsLoading(false);
  }, []);

  const resetHouseholdId = () => {
    const newId = crypto.randomUUID();
    localStorage.setItem(HOUSEHOLD_ID_KEY, newId);
    setHouseholdId(newId);
    console.log('[HOUSEHOLD ID] Reset to new household ID:', newId);
    return newId;
  };

  return {
    householdId,
    isLoading,
    resetHouseholdId
  };
}