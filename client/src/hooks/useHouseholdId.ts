import { useState, useEffect } from 'react';

const HOUSEHOLD_ID_KEY = 'dinner-decided-household-id';

export function useHouseholdId() {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get or create household ID
    let storedId = localStorage.getItem(HOUSEHOLD_ID_KEY);
    
    if (!storedId) {
      // Generate new unique household ID
      storedId = crypto.randomUUID();
      localStorage.setItem(HOUSEHOLD_ID_KEY, storedId);
      console.log('[HOUSEHOLD ID] Generated new household ID:', storedId);
    } else {
      console.log('[HOUSEHOLD ID] Using existing household ID:', storedId);
    }
    
    setHouseholdId(storedId);
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