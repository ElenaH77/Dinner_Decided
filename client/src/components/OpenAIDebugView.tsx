import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useHousehold } from '@/contexts/household-context';

export function OpenAIDebugView() {
  const [showDebug, setShowDebug] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [householdData, setHouseholdData] = useState<any>(null);
  const { members, equipment, preferences } = useHousehold();

  const fetchHousehold = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', '/api/household');
      const data = await response.json();
      setHouseholdData(data);
    } catch (error) {
      console.error('Error fetching household data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showDebug) {
      fetchHousehold();
    }
  }, [showDebug]);

  const formatJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return 'Error formatting JSON';
    }
  };

  // Function to create a sample meal plan prompt based on the household data
  const createSamplePrompt = () => {
    if (!householdData) return '';

    const weatherContext = 'Weather information would be fetched based on your zip code';
    
    // Create a sample prompt similar to what would be sent to OpenAI
    const prompt = `Create a meal plan with 5 dinner ideas for a family with the following profile:
      - Family size: ${householdData.members?.length || 0} people
      - Family members: ${householdData.members?.map((m: any) => 
        `${m.name} (${m.age || 'Adult'}, ${m.dietaryRestrictions || 'No restrictions'})`).join(', ') || 'No members'}
      - Available appliances: ${householdData.appliances?.join(", ") || "Standard kitchen equipment"}
      - Cooking skill level (1-5): ${householdData.cookingSkill || 3}
      - Preferences: ${householdData.preferences || "Family-friendly meals"}
      - Location: ${householdData.location || "Unknown location"}
      - Current weather: ${weatherContext}
      
      Generate unique, practical dinner ideas that this family would enjoy. For each meal, include:
      1. A name for the dish
      2. Brief description of the dish
      3. Categories (e.g., "quick", "vegetarian")
      4. Approximate prep time in minutes
      5. Serving size
      6. 3-4 specific rationales for why this meal is a good fit (each one in a separate string in a "rationales" array):
         - Include dietary considerations based on household members
         - Mention time/effort alignment with their cooking confidence
         - Reference equipment they have available
         - If location and weather data is available, note weather appropriateness`;

    return prompt;
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">Data Sent to OpenAI for Meal Planning</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? (
            <>
              <ArrowUp className="h-4 w-4 mr-2" /> Hide Details
            </>
          ) : (
            <>
              <ArrowDown className="h-4 w-4 mr-2" /> Show Details
            </>
          )}
        </Button>
      </div>

      {showDebug && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Household Data</CardTitle>
            <CardDescription>
              This is the data from your household profile that informs meal planning
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse text-center py-4">Loading household data...</div>
            ) : householdData ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Members:</h4>
                  <ul className="list-disc pl-5">
                    {householdData.members?.map((member: any, index: number) => (
                      <li key={index} className="mb-1">
                        <span className="font-medium">{member.name}</span>
                        {member.age && <span> (Age: {member.age})</span>}
                        {member.dietaryRestrictions && (
                          <span className="text-amber-700"> - {member.dietaryRestrictions}</span>
                        )}
                      </li>
                    )) || 'No members found'}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Kitchen Equipment:</h4>
                  <div className="flex flex-wrap gap-2">
                    {householdData.appliances?.map((appliance: string, index: number) => (
                      <span 
                        key={index} 
                        className="px-2 py-1 bg-teal-50 text-teal-700 rounded-md text-sm"
                      >
                        {appliance}
                      </span>
                    )) || 'No appliances found'}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Location:</h4>
                  <p>{householdData.location || 'No location set'}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Cooking Skill Level:</h4>
                  <p>{householdData.cookingSkill || 'Not specified'}/5</p>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Preferences:</h4>
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                    {householdData.preferences ? formatJSON(JSON.parse(householdData.preferences)) : 'No preferences set'}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">No household data available</div>
            )}
          </CardContent>
        </Card>
      )}

      {showDebug && householdData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sample OpenAI Prompt</CardTitle>
            <CardDescription>
              This is an example of what gets sent to OpenAI when generating meal plans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap">
              {createSamplePrompt()}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
