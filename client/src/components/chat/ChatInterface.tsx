import { useRef, useEffect, FormEvent, useState, KeyboardEvent, ChangeEvent } from "react";
import { Layers, Paperclip, RefreshCw, Image, X } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";

export default function ChatInterface() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const { messages, addMessage, handleUserMessage, resetChatConversation, isGenerating, loading } = useChatState();
  
  // Debug logging for mobile
  console.log("[MOBILE DEBUG] Messages:", messages);
  console.log("[MOBILE DEBUG] Loading:", loading);
  console.log("[MOBILE DEBUG] IsArray:", Array.isArray(messages));
  console.log("[MOBILE DEBUG] Length:", Array.isArray(messages) ? messages.length : 'N/A');
  
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
  
  // Clean up file preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type (only allow images)
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Only image files are supported",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    // Create preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
  };
  
  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if ((!input.trim() && !selectedFile) || isGenerating) return;
    
    // Handle message with or without image
    try {
      if (selectedFile) {
        // Convert image to base64 and send with message
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64Image = event.target?.result as string;
          const imageData = base64Image.split(',')[1]; // Remove data URL prefix
          
          // Create the user message with image
          const messageText = input.trim() || "What can I make with this?";
          
          setInput("");
          handleRemoveFile();
          
          // Send to backend with image data (hook handles adding message to chat)
          try {
            await handleUserMessage(messageText, imageData);
          } catch (error) {
            console.error("Error sending image message:", error);
            toast({
              title: "Error",
              description: "Failed to analyze your image. Please try again.",
              variant: "destructive",
            });
          }
          
          // Reset textarea height
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
          }
        };
        reader.readAsDataURL(selectedFile);
      } else {
        // Send text message normally
        await handleUserMessage(input);
        setInput("");
        
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send your message. Please try again.",
        variant: "destructive",
      });
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Simplified Mobile Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">DinnerBot</h1>
      </div>

      {/* Mobile-Optimized Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages Area - Mobile Optimized */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Always show welcome for now - mobile debugging */}
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-3xl">🍽️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to DinnerBot!</h2>
            <p className="text-gray-600 mb-4 px-4">
              I'm here to help you decide what to cook tonight. Just ask me anything about recipes or cooking!
            </p>
            <div className="text-sm text-gray-400">
              Enhanced with your family context • Gluten-free aware
            </div>
          </div>
          
          {/* Messages would go here */}
          {isGenerating && (
            <div className="flex justify-center py-4">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Area - Mobile Optimized */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
          {/* File preview area */}
          {previewUrl && (
            <div className="mb-3 relative">
              <div className="relative rounded-lg overflow-hidden border border-gray-200 w-full max-h-60">
                <img 
                  src={previewUrl} 
                  alt="File preview" 
                  className="max-w-full max-h-60 object-contain mx-auto"
                />
                <button 
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute top-2 right-2 bg-black bg-opacity-70 rounded-full p-1 text-white hover:bg-opacity-90"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex items-end space-x-2">
            <div className="flex-grow relative">
              <textarea 
                ref={textareaRef}
                placeholder="Ask me about recipes or cooking..." 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-gray-900 text-base"
                rows={1}
                style={{ minHeight: '50px' }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isGenerating}
              />
              {/* Hidden file input */}
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={isGenerating}
              />
              <button 
                type="button" 
                className="absolute right-2 bottom-2 text-[#8A8A8A] hover:text-[#21706D]"
                aria-label="Attach file"
                onClick={handleFileUploadClick}
                disabled={isGenerating}
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </div>
            <button 
              type="submit" 
              className="ml-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full w-12 h-12 flex items-center justify-center disabled:opacity-50 flex-shrink-0"
              disabled={(!input.trim() && !selectedFile) || isGenerating}
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
