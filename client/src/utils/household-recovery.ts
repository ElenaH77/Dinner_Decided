/**
 * Household ID recovery utilities for data isolation
 */

const HOUSEHOLD_ID_KEY = 'dinner-decided-household-id';
const BACKUP_HOUSEHOLD_ID_KEY = 'dinner-decided-household-backup';
const SESSION_HOUSEHOLD_ID_KEY = 'dinner-decided-session-household';

export function setHouseholdId(householdId: string) {
  console.log('[HOUSEHOLD RECOVERY] Setting household ID:', householdId);
  
  // Set in multiple storage locations for redundancy
  localStorage.setItem(HOUSEHOLD_ID_KEY, householdId);
  localStorage.setItem(BACKUP_HOUSEHOLD_ID_KEY, householdId);
  sessionStorage.setItem(SESSION_HOUSEHOLD_ID_KEY, householdId);
  
  // Force page reload to use new ID
  window.location.reload();
}

export function getStoredHouseholdId(): string | null {
  // Try multiple storage locations
  const primary = localStorage.getItem(HOUSEHOLD_ID_KEY);
  const backup = localStorage.getItem(BACKUP_HOUSEHOLD_ID_KEY);
  const session = sessionStorage.getItem(SESSION_HOUSEHOLD_ID_KEY);
  
  console.log('[HOUSEHOLD RECOVERY] Storage check - Primary:', primary, 'Backup:', backup, 'Session:', session);
  
  return primary || backup || session;
}

export function forceHouseholdId(householdId: string) {
  console.log('[HOUSEHOLD RECOVERY] Force setting household ID:', householdId);
  setHouseholdId(householdId);
}

// Add global recovery function for console usage
if (typeof window !== 'undefined') {
  (window as any).setHouseholdId = setHouseholdId;
  (window as any).forceHouseholdId = forceHouseholdId;
  (window as any).getStoredHouseholdId = getStoredHouseholdId;
}