import { useState, useEffect } from 'react';

const HOUSEHOLD_ID_KEY = 'dinner-decided-household-id';
const BACKUP_HOUSEHOLD_ID_KEY = 'dinner-decided-household-backup';

export function useHouseholdId() {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get household ID with fallback mechanisms
    let storedId = localStorage.getItem(HOUSEHOLD_ID_KEY);
    let backupId = localStorage.getItem(BACKUP_HOUSEHOLD_ID_KEY);
    
    // Try primary storage first
    if (storedId) {
      console.log('[HOUSEHOLD ID] Using primary stored ID:', storedId);
      // Ensure backup is in sync
      if (backupId !== storedId) {
        localStorage.setItem(BACKUP_HOUSEHOLD_ID_KEY, storedId);
      }
      setHouseholdId(storedId);
      setIsLoading(false);
      return;
    }
    
    // Try backup storage
    if (backupId) {
      console.log('[HOUSEHOLD ID] Recovering from backup ID:', backupId);
      localStorage.setItem(HOUSEHOLD_ID_KEY, backupId);
      setHouseholdId(backupId);
      setIsLoading(false);
      return;
    }
    
    // Generate new unique household ID for fresh users
    console.log('[HOUSEHOLD ID] Generating new household ID for fresh user');
    const newId = crypto.randomUUID();
    localStorage.setItem(HOUSEHOLD_ID_KEY, newId);
    localStorage.setItem(BACKUP_HOUSEHOLD_ID_KEY, newId);
    setHouseholdId(newId);
    setIsLoading(false);
  }, []);

  const resetHouseholdId = () => {
    const newId = crypto.randomUUID();
    localStorage.setItem(HOUSEHOLD_ID_KEY, newId);
    localStorage.setItem(BACKUP_HOUSEHOLD_ID_KEY, newId);
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