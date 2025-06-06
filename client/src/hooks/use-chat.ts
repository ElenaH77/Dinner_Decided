import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import type { ChatMessage } from "@/lib/types";

// Function to send message to API
async function sendMessageToApi(message: ChatMessage): Promise<ChatMessage> {
  return apiRequest('/api/chat/messages', {
    method: 'POST',
    body: JSON.stringify(message),
  });
}

export function useChat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get messages from API
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/chat/messages'],
  });
  
  // Mutation for sending messages
  const messageMutation = useMutation({
    mutationFn: sendMessageToApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
      // Also invalidate related data
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plan/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/grocery-list/current'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });
  
  // Send a message and get response
  const sendMessage = useCallback(async (content: string, mealPlanId?: number) => {
    // Check for reset commands and handle immediately
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('reset my profile') || 
        lowerContent.includes('start over') || 
        lowerContent.includes('reset onboarding') ||
        lowerContent.includes('restart my profile') ||
        lowerContent.includes('reset profile')) {
      
      console.log("[RESET] Detected reset command, calling reset API...");
      
      try {
        // Call the actual reset API to clear profile data
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'user',
            content: content
          })
        });
        
        if (response.ok) {
          const resetResponse = await response.json();
          console.log("[RESET] Profile reset successful, server response:", resetResponse);
          
          // Clear all cached data
          queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
          queryClient.invalidateQueries({ queryKey: ['/api/household'] });
          queryClient.invalidateQueries({ queryKey: ['/api/meal-plan/current'] });
          queryClient.invalidateQueries({ queryKey: ['/api/grocery-list/current'] });
          
          return;
        }
      } catch (error) {
        console.error("[RESET] Failed to reset profile:", error);
      }
      
      return true;
    }
    
    // Create user message
    const userMessage: ChatMessage = {
      id: Date.now(),
      userId: 1, // Default user ID
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
      mealPlanId
    };
    
    // Update local messages immediately for UI responsiveness
    const updatedMessages = Array.isArray(messages) ? [...messages, userMessage] : [userMessage];
    queryClient.setQueryData(['/api/chat/messages'], updatedMessages);
    
    setIsLoading(true);
    
    try {
      // Send message to API
      await messageMutation.mutateAsync(userMessage);
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }, [messages, queryClient, messageMutation]);

  return {
    messages,
    sendMessage,
    isLoading
  };
}