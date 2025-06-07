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
  
  // Get stored messages from API
  const { data: messages = [], isLoading: loading } = useQuery({
    queryKey: ['/api/chat/messages'],
  });
  
  // Mutation for sending messages
  const messageMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
      
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
    
    // If we have image data, send directly to backend with image
    if (imageData) {
      try {
        await messageMutation.mutateAsync({
          role: "user",
          content,
          image: imageData
        } as any);
      } catch (error) {
        console.error("Error sending image message:", error);
      }
    } else {
      // Regular text message - add to chat and send to backend
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      };
      
      addMessage(userMessage);
      
      try {
        const currentMessages = Array.isArray(messages) ? [...messages, userMessage] : [userMessage];
        await messageMutation.mutateAsync(currentMessages);
      } catch (error) {
        console.error("Error in handleUserMessage:", error);
      }
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
