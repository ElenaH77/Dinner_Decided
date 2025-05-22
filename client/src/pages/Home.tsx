import { useEffect } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import { useChatState } from "@/hooks/useChatState";
import { ONBOARDING_WELCOME_MESSAGE } from "@/lib/constants";

export default function Home() {
  const { messages, addMessage, loading } = useChatState();

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
    if (messages.length === 0 && !loading) {
      addMessage({
        id: "welcome",
        role: "assistant",
        content: ONBOARDING_WELCOME_MESSAGE,
        timestamp: new Date().toISOString(),
      });
    }
  }, [messages.length, loading, addMessage]);

  return (
    <div className="flex-grow flex flex-col h-screen md:h-auto overflow-hidden pb-16 md:pb-0">
      <ChatInterface />
    </div>
  );
}
