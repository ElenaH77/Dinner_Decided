import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Calendar, CheckCircle, RefreshCw } from 'lucide-react';
import { useHouseholdId } from '@/hooks/useHouseholdId';
import { clearCachedHouseholdId } from '@/lib/queryClient';

export default function Start() {
  const [, setLocation] = useLocation();
  const [isStarting, setIsStarting] = useState(false);
  const { resetHouseholdId } = useHouseholdId();

  const handleGetStarted = async () => {
    setIsStarting(true);
    
    // Clear any existing data and generate fresh household ID
    localStorage.clear();
    clearCachedHouseholdId();
    const freshId = resetHouseholdId();
    
    console.log('[START] Generated fresh household ID:', freshId);
    
    // Small delay to ensure everything is cleared
    setTimeout(() => {
      setLocation('/profile');
    }, 500);
  };

  const handleStartOver = async () => {
    setIsStarting(true);
    
    // Clear all existing data
    localStorage.clear();
    clearCachedHouseholdId();
    resetHouseholdId();
    
    console.log('[START] Cleared all data for fresh start');
    
    // Small delay then redirect to profile
    setTimeout(() => {
      setLocation('/profile');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-primary">Dinner, Decided</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              One Click, One List, One Less Thing
            </p>
          </div>

          {/* Process Steps */}
          <div className="space-y-6 mb-8">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Get to know your family</h3>
                  <p className="text-muted-foreground text-sm">
                    Tell us about your household, preferences, and kitchen setup
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Understand your week</h3>
                  <p className="text-muted-foreground text-sm">
                    Plan your meals based on your schedule and preferences
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Take the planning off your plate</h3>
                  <p className="text-muted-foreground text-sm">
                    Get your personalized meal plan and grocery list ready to go
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleGetStarted}
              disabled={isStarting}
              className="w-full bg-accent hover:bg-accent/90 text-white py-3 text-lg font-medium rounded-xl"
            >
              {isStarting ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Starting...
                </div>
              ) : (
                'Get Started'
              )}
            </Button>

            <Button 
              onClick={handleStartOver}
              variant="outline" 
              disabled={isStarting}
              className="w-full border-2 border-muted-foreground/20 hover:border-primary/30 py-3 text-base rounded-xl"
            >
              {isStarting ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Clearing...
                </div>
              ) : (
                'Start Over (Clear All Data)'
              )}
            </Button>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Takes less than 3 minutes to set up
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}