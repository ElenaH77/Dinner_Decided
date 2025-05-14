import { useRef, useEffect, FormEvent, useState, KeyboardEvent } from "react";
import { Info, Settings, Layers, Paperclip, RefreshCw } from "lucide-react";
import ChatMessage from "./ChatMessage";
import { useChatState } from "@/hooks/useChatState";
import { useQuery } from "@tanstack/react-query";
import MealCard from "../meals/MealCard";
import GroceryListPreview from "../grocery/GroceryListPreview";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ChatInterface() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isResetting, setIsResetting] = useState(false);
  
  const { messages, addMessage, handleUserMessage, resetChatConversation, isGenerating } = useChatState();
  
  const { data: mealPlan } = useQuery({
    queryKey: ['/api/meal-plan/current'],
  });
  
  const { data: groceryList } = useQuery({
    queryKey: ['/api/grocery-list/current'],
  });

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isGenerating) return;
    
    await handleUserMessage(input);
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  // Handle chat reset with confirmation
  const handleResetChat = async () => {
    setIsResetting(true);
    try {
      await resetChatConversation();
    } catch (error) {
      console.error("Error resetting chat:", error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex-grow overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E2E2] py-3 px-4 md:px-6">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">Meal Planning Assistant</h2>
          <div className="flex space-x-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button 
                  className="p-2 text-[#8A8A8A] hover:text-[#21706D] rounded-full" 
                  aria-label="Reset chat" 
                  disabled={isResetting || messages.length <= 1}
                >
                  <RefreshCw className={`h-5 w-5 ${isResetting ? 'animate-spin' : ''}`} />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Chat</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear your conversation history with DinnerBot. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleResetChat}
                    disabled={isResetting}
                    className="bg-[#F25C05] hover:bg-[#D14D01]"
                  >
                    {isResetting ? 'Resetting...' : 'Reset Chat'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <button className="p-2 text-[#8A8A8A] hover:text-[#21706D] rounded-full" aria-label="Info">
              <Info className="h-5 w-5" />
            </button>
            <button className="p-2 text-[#8A8A8A] hover:text-[#21706D] rounded-full" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Chat Messages Area */}
      <div className="flex-grow overflow-y-auto p-4 custom-scrollbar" id="chat-messages">
        <div className="flex flex-col space-y-4 max-w-3xl mx-auto">
          {messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              mealPlan={message.role === 'assistant' && mealPlan ? mealPlan : undefined}
              groceryList={message.role === 'assistant' && groceryList ? groceryList : undefined}
            />
          ))}
          
          {/* Loading indicator */}
          {isGenerating && (
            <div className="flex items-start max-w-3xl">
              <div className="w-8 h-8 rounded-full bg-[#21706D] text-white flex items-center justify-center mr-2 flex-shrink-0">
                <span className="animate-pulse">🤖</span>
              </div>
              <div className="bg-white p-3 rounded-lg chat-bubble-assistant shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-[#21706D] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-[#21706D] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-[#21706D] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input Area */}
      <div className="bg-white border-t border-[#E2E2E2] p-3">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end">
            <div className="flex-grow relative">
              <textarea 
                ref={textareaRef}
                placeholder="Type your message..." 
                className="w-full border border-[#E2E2E2] rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#21706D] resize-none text-[#212121]"
                rows={1}
                style={{ minHeight: '60px' }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isGenerating}
              />
              <button 
                type="button" 
                className="absolute right-2 bottom-2 text-[#8A8A8A] hover:text-[#21706D]"
                aria-label="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </div>
            <button 
              type="submit" 
              className="ml-2 bg-[#21706D] hover:bg-[#195957] text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50"
              disabled={!input.trim() || isGenerating}
              aria-label="Send message"
            >
              <Layers className="h-5 w-5" />
            </button>
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#8A8A8A] px-2">
            <span>Try: "What can I make with chicken and pasta?"</span>
            <span>Shift+Enter for new line</span>
          </div>
        </form>
      </div>
    </div>
  );
}
