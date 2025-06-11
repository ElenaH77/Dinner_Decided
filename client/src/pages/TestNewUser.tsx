import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useHouseholdId } from '@/hooks/useHouseholdId';
import { clearCachedHouseholdId } from '@/lib/queryClient';

export default function TestNewUser() {
  const [, setLocation] = useLocation();
  const [isCleared, setIsCleared] = useState(false);
  const [newHouseholdId, setNewHouseholdId] = useState('');
  const { resetHouseholdId } = useHouseholdId();

  const clearStorageAndTest = () => {
    // Clear all localStorage to simulate fresh user
    localStorage.clear();
    
    // Clear cached household ID in queryClient
    clearCachedHouseholdId();
    
    // Force reset household ID in the hook
    const freshId = resetHouseholdId();
    setNewHouseholdId(freshId);
    setIsCleared(true);
    
    console.log('[TEST] Cleared localStorage, cache, and reset household ID:', freshId);
  };

  const navigateToApp = () => {
    // Navigate to main app to test household isolation
    setLocation('/');
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Test New User Household Isolation
          </CardTitle>
          <CardDescription>
            This page tests that new users get their own unique household profile instead of accessing existing ones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Problem Fixed:</h3>
            <p className="text-sm text-muted-foreground">
              Previously, all users were forced to share the same hardcoded household ID, causing new users to see and modify existing profiles.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Solution:</h3>
            <p className="text-sm text-muted-foreground">
              Now each new user gets a unique household ID generated with crypto.randomUUID().
            </p>
          </div>

          {!isCleared ? (
            <Button onClick={clearStorageAndTest} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Storage & Simulate Fresh User
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Storage cleared successfully</span>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-green-800">New Household ID Generated:</p>
                <p className="text-xs font-mono text-green-700 mt-1">{newHouseholdId}</p>
              </div>

              <Button onClick={navigateToApp} className="w-full">
                Go to App (Should Create Fresh Household)
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-4 p-3 bg-gray-50 rounded">
            <strong>Test Instructions:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Click "Clear Storage" to simulate a fresh user</li>
              <li>Click "Go to App" to test the household isolation</li>
              <li>Verify you get a fresh profile setup, not an existing one</li>
              <li>Check that your changes don't affect other users</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}