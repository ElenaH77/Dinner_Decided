import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Message } from "@/types";
import { sendMessage, resetChat } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { WELCOME_MESSAGE } from "@/lib/constants";

export function useChatState() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get stored messages from API with forced refresh
  const { data: messagesData, isLoading: loading, error } = useQuery({
    queryKey: ['/api/chat/messages'],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
  
  // Ensure messages is always an array
  const messages = Array.isArray(messagesData) ? messagesData : [];
  
  // Debug logging
  console.log('[CHAT DEBUG] Query result:', { messagesData, messages, loading, error, messagesType: typeof messagesData, messagesLength: messages?.length });
  console.log('[CHAT DEBUG] Messages array check:', Array.isArray(messages), messages);
  
  // Also log the household ID being used
  const householdId = localStorage.getItem('dinner-decided-household-id');
  console.log('[CHAT DEBUG] Household ID:', householdId);
  
  // Mutation for sending messages
  const messageMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: (response) => {
      // Add the assistant response to existing messages instead of invalidating
      if (response && response.content) {
        const currentMessages = Array.isArray(messages) ? messages : [];
        const updatedMessages = [...currentMessages, {
          id: response.id || `assistant-${Date.now()}`,
          role: "assistant" as const,
          content: response.content,
          timestamp: response.timestamp || new Date().toISOString()
        }];
        queryClient.setQueryData(['/api/chat/messages'], updatedMessages);
      }
      
      // Also invalidate meal plan and grocery list as they might have changed
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
      setIsGenerating(false);
    }
  });
  
  // Mutation for resetting chat
  const resetMutation = useMutation({
    mutationFn: resetChat,
    onSuccess: (response) => {
      // The server now returns the welcome message, so we should use that directly
      if (response && response.welcomeMessage) {
        // Set the welcome message as the only message
        queryClient.setQueryData(['/api/chat/messages'], [response.welcomeMessage]);
      } else {
        // Fallback to empty messages list if no welcome message is returned
        queryClient.setQueryData(['/api/chat/messages'], []);
      }
      
      toast({
        title: "Chat Reset",
        description: "DinnerBot is ready for a fresh conversation!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reset chat. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    }
  });
  
  // Add a message to the chat
  const addMessage = useCallback((message: Message) => {
    const allMessages = Array.isArray(messages) ? [...messages, message] : [message];
    queryClient.setQueryData(['/api/chat/messages'], allMessages);
    return message;
  }, [messages, queryClient]);
  
  // Handle sending a user message and getting a response
  const handleUserMessage = useCallback(async (content: string, imageData?: string) => {
    setIsGenerating(true);
    
    // Always add user message to chat first (for persistence)
    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
      ...(imageData && { image: `data:image/jpeg;base64,${imageData}` })
    };
    
    addMessage(userMessage);
    
    // Send message to backend (unified format)
    try {
      const messagePayload = {
        message: {
          role: "user",
          content,
          ...(imageData && { image: imageData })
        }
      };
      await messageMutation.mutateAsync(messagePayload);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [messages, addMessage, messageMutation]);
  
  // Reset the chat conversation
  const resetChatConversation = useCallback(async () => {
    try {
      await resetMutation.mutateAsync();
    } catch (error) {
      console.error("Error resetting chat:", error);
    }
  }, [resetMutation]);
  
  return {
    messages,
    addMessage,
    handleUserMessage,
    resetChatConversation,
    isGenerating,
    loading,
  };
}
