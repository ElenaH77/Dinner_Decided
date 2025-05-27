import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MessageBubble from './message-bubble';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/hooks/use-chat';
import { useMealPlan } from '@/contexts/meal-plan-context';
import { ChatMessage } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';

interface ChatInterfaceProps {
  standalone?: boolean;
}

export default function ChatInterface({ standalone = false }: ChatInterfaceProps) {
  const { toast } = useToast();
  const { messages, sendMessage, isLoading } = useChat();
  const { currentMealPlan, meals } = useMealPlan();
  const [inputValue, setInputValue] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    try {
      await sendMessage(inputValue);
      setInputValue('');
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "There was a problem sending your message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleResetProfile = async () => {
    if (!confirm("Are you sure you want to reset your profile? This will clear all your information and start fresh with onboarding.")) {
      return;
    }

    setIsResetting(true);
    try {
      // Call the reset endpoint directly
      await apiRequest('/api/reset-all', {
        method: 'POST'
      });
      
      // Clear the page and reload to restart onboarding
      window.location.reload();
      
      toast({
        title: "Profile Reset Complete",
        description: "Your profile has been reset. Starting fresh!",
      });
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "There was a problem resetting your profile. Please try again.",
        variant: "destructive"
      });
      setIsResetting(false);
    }
  };

  return (
    <div className={`flex flex-col ${standalone ? 'h-full' : 'h-[360px]'}`}>
      <div className="flex-grow overflow-y-auto p-4 conversation-container">
        {messages.length === 0 ? (
          <MessageBubble
            message={{
              id: 0,
              userId: 1,
              content: "Hi there! I'm your meal planning assistant. How can I help you with your weekly meal plan?",
              role: 'assistant',
              timestamp: new Date().toISOString()
            }}
          />
        ) : (
          messages.map((message: ChatMessage) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {isLoading && (
          <div className="ai-bubble conversation-bubble flex items-center gap-2">
            <div className="w-2 h-2 bg-neutral-text rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-neutral-text rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-neutral-text rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center border border-neutral-gray rounded-lg p-2 bg-neutral-background m-4">
        <Input
          type="text"
          placeholder="Ask me anything about your meal plan..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-grow p-2 bg-transparent border-none focus:outline-none shadow-none"
          disabled={isLoading || !currentMealPlan}
        />
        <Button 
          type="submit" 
          className="bg-teal-primary hover:bg-teal-light text-white p-2 rounded-md ml-2 flex items-center justify-center"
          disabled={isLoading || !inputValue.trim() || !currentMealPlan}
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
