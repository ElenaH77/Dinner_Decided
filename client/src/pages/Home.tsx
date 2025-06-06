import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatInterface from "@/components/chat/ChatInterface";
import { useChatState } from "@/hooks/useChatState";
import { ONBOARDING_WELCOME_MESSAGE } from "@/lib/constants";

export default function Home() {
  const { messages, addMessage, loading, resetChatConversation } = useChatState();
  
  // Get household data to check onboarding status
  const { data: household } = useQuery({
    queryKey: ['/api/household'],
  });

  // Check if household needs onboarding (empty or incomplete profile)
  const householdData = household as any;
  const needsOnboarding = Boolean(householdData && (
    !householdData.members || 
    householdData.members.length === 0 || 
    !householdData.location || 
    !householdData.preferences ||
    householdData.onboardingComplete === false
  ));
  
  // Cast messages to proper type
  const messagesList = Array.isArray(messages) ? messages : [];

  // Clear stale cache if it references non-existent data
  useEffect(() => {
    const clearStaleCache = async () => {
      try {
        // Check if household exists
        const response = await fetch('/api/household');
        if (response.status === 200) {
          const data = await response.json();
          if (!data || !data.id) {
            // No household exists but we might have cached data - clear it
            console.log('No household found, clearing stale cache');
            localStorage.clear();
            window.location.reload();
            return;
          }
        }
      } catch (error) {
        console.log('Clearing cache due to error:', error);
        localStorage.clear();
      }
    };
    
    clearStaleCache();
  }, []);

  // Add welcome message on initial load if no messages exist
  useEffect(() => {
    if (messagesList.length === 0 && !loading) {
      addMessage({
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: ONBOARDING_WELCOME_MESSAGE,
        timestamp: new Date().toISOString(),
      });
    }
  }, [messagesList.length, loading, addMessage]);

  return (
    <div className="flex-grow flex flex-col h-screen md:h-auto overflow-hidden pb-16 md:pb-0">
      <ChatInterface />
    </div>
  );
}
