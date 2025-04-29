import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Message } from "@/types";
import { sendMessage } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

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
  
  // Add a message to the chat
  const addMessage = useCallback((message: Message) => {
    const allMessages = [...messages, message];
    queryClient.setQueryData(['/api/chat/messages'], allMessages);
    return message;
  }, [messages, queryClient]);
  
  // Handle sending a user message and getting a response
  const handleUserMessage = useCallback(async (content: string) => {
    // Add user message to the chat
    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    
    addMessage(userMessage);
    setIsGenerating(true);
    
    // Use the message mutation to send to backend
    try {
      await messageMutation.mutateAsync([...messages, userMessage]);
    } catch (error) {
      console.error("Error in handleUserMessage:", error);
    }
  }, [messages, addMessage, messageMutation]);
  
  return {
    messages,
    addMessage,
    handleUserMessage,
    isGenerating,
    loading,
  };
}
