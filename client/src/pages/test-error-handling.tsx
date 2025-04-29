import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

export default function TestErrorHandling() {
  const [loading, setLoading] = useState(false);
  
  // Function to test error handling
  const testError = async (errorType: string) => {
    setLoading(true);
    
    try {
      // Call our test endpoint
      const response = await fetch(`/api/test/errors/${errorType}`);
      const data = await response.json();
      
      // This will show our enhanced error message
      if (!response.ok) {
        let errorMessage = data.message || 'An unknown error occurred';
        let helpText = data.helpText || '';
        
        toast({
          title: "Error",
          description: (
            <div>
              <p>{errorMessage}</p>
              {helpText && <p className="mt-2 text-sm font-medium">{helpText}</p>}
            </div>
          ),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing error handling:", error);
      toast({
        title: "Error",
        description: "Failed to test error handling",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Test Error Handling</h1>
      <div className="space-y-4">
        <p className="mb-6">
          This page allows you to test how the application handles different types of OpenAI API errors.
          Click the buttons below to simulate different error scenarios.
        </p>
        
        <div className="flex flex-col gap-4 md:flex-row">
          <Button 
            onClick={() => testError('quota')} 
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Test Quota Exceeded Error
          </Button>
          
          <Button 
            onClick={() => testError('ratelimit')} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Test Rate Limit Error
          </Button>
          
          <Button 
            onClick={() => testError('auth')} 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            Test Authentication Error
          </Button>
          
          <Button 
            onClick={() => testError('generic')} 
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-700"
          >
            Test Generic Error
          </Button>
        </div>
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">What to expect:</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Quota Exceeded:</strong> When OpenAI API usage limit is reached</li>
            <li><strong>Rate Limit:</strong> When too many requests are made in a short period</li>
            <li><strong>Authentication:</strong> When the API key is invalid or missing</li>
            <li><strong>Generic:</strong> For other unspecified errors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}