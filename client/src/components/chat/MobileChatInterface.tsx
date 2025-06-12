import { useState, useRef, FormEvent } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { useChatState } from '@/hooks/useChatState';

export default function MobileChatInterface() {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { messages, handleUserMessage, isGenerating, loading } = useChatState();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if ((!input.trim() && !selectedFile) || isGenerating) return;

    try {
      let imageData = null;
      if (selectedFile) {
        const reader = new FileReader();
        imageData = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(selectedFile);
        });
      }

      await handleUserMessage(input.trim(), imageData);
      setInput('');
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col bg-gray-50 border-4 border-red-500" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">DinnerBot</h1>
        <p className="text-sm text-gray-500">Enhanced with your family context</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
        {Array.isArray(messages) && messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-3xl">🍽️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to DinnerBot!</h2>
            <p className="text-gray-600 mb-4 px-4">
              I'm setting up your personalized meal assistant...
            </p>
          </div>
        )}
        
        {isGenerating && (
          <div className="flex justify-start mt-4">
            <div className="bg-white text-gray-900 border border-gray-200 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        {/* File Preview */}
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
              disabled={isGenerating}
            />
            
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
              className="absolute right-2 bottom-2 text-gray-400 hover:text-orange-500"
              aria-label="Attach file"
              onClick={handleFileUploadClick}
              disabled={isGenerating}
            >
              <Paperclip className="h-5 w-5" />
            </button>
          </div>
          
          <button 
            type="submit" 
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-12 h-12 flex items-center justify-center disabled:opacity-50 flex-shrink-0"
            disabled={(!input.trim() && !selectedFile) || isGenerating}
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}