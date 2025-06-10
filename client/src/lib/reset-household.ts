/**
 * Utility to reset household data for testing production onboarding flow
 */
export function resetHouseholdData() {
  // Clear localStorage
  localStorage.removeItem('dinner-decided-household-id');
  
  // Clear any cached data
  if (typeof window !== 'undefined') {
    // Force reload to clear all cached state
    window.location.reload();
  }
}

// Add to global scope for easy testing in console
if (typeof window !== 'undefined') {
  (window as any).resetHouseholdData = resetHouseholdData;
}