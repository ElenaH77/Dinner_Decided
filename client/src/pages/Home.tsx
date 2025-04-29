import { useEffect } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import { useChatState } from "@/hooks/useChatState";
import { WELCOME_MESSAGE } from "@/lib/constants";

export default function Home() {
  const { messages, addMessage, loading } = useChatState();

  // Add welcome message on initial load if no messages exist
  useEffect(() => {
    if (messages.length === 0 && !loading) {
      addMessage({
        id: "welcome",
        role: "assistant",
        content: WELCOME_MESSAGE,
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
