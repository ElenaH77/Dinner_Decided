import { useEffect, useState } from "react";
import { Message, MealPlan, GroceryList } from "@/types";
import MealCard from "../meals/MealCard";
import GroceryListPreview from "../grocery/GroceryListPreview";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  message: Message;
  mealPlan?: MealPlan;
  groceryList?: GroceryList;
}

export default function ChatMessage({ message, mealPlan, groceryList }: ChatMessageProps) {
  const [content, setContent] = useState("");
  const [shouldRenderMealPlan, setShouldRenderMealPlan] = useState(false);
  const [shouldRenderGroceryList, setShouldRenderGroceryList] = useState(false);
  
  // Process message content to find special tags
  useEffect(() => {
    if (!message.content) return;
    
    const processedContent = message.content;
    setContent(processedContent);
    
    // Check if we're in the DinnerBot chat by looking at the URL
    const isDinnerBotChat = window.location.pathname === "/" || window.location.pathname === "/dinnerbot";
    
    // Check if message should render meal plan (but not in DinnerBot chat)
    const shouldShowMealPlan = 
      !isDinnerBotChat &&
      message.role === 'assistant' && 
      (processedContent.includes("meal plan") || processedContent.includes("dinner plan")) &&
      mealPlan && 
      mealPlan.meals?.length > 0;
      
    setShouldRenderMealPlan(shouldShowMealPlan);
    
    // Check if message should render grocery list (but not in DinnerBot chat)
    const shouldShowGroceryList = 
      !isDinnerBotChat &&
      message.role === 'assistant' && 
      processedContent.includes("grocery list") && 
      groceryList && 
      groceryList.sections && 
      groceryList.sections.length > 0;
      
    setShouldRenderGroceryList(shouldShowGroceryList);
    
  }, [message.content, mealPlan, groceryList, message.role]);

  const formatContent = (text: string) => {
    // Handle images in markdown format ![alt](url)
    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    let parts = [];
    let lastIndex = 0;
    let match;
    
    // Find all image markdown in the text
    while ((match = imageRegex.exec(text)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        const textBefore = text.substring(lastIndex, match.index);
        parts.push({
          type: 'text',
          content: textBefore
        });
      }
      
      // Add the image
      parts.push({
        type: 'image',
        url: match[1] // This is the captured URL from the regex
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text after the last image
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    // If no images were found, return the text as is
    if (parts.length === 0) {
      return text.split("\n").map((line, i) => (
        <p key={i} className={i > 0 ? "mt-2" : ""}>
          {line}
        </p>
      ));
    }
    
    // Otherwise, render the mix of text and images
    return (
      <div>
        {parts.map((part, index) => (
          part.type === 'text' ? (
            <div key={index}>
              {part.content.split("\n").map((line, i) => (
                <p key={i} className={i > 0 ? "mt-2" : ""}>
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <div key={index} className="my-4">
              <img 
                src={part.url} 
                alt="Uploaded content" 
                className="rounded-md max-w-full max-h-[400px]" 
              />
            </div>
          )
        ))}
      </div>
    );
  };

  if (message.role === 'user') {
    return (
      <div className="flex items-start justify-end max-w-3xl ml-auto">
        <div className="bg-[#21706D] p-3 rounded-lg chat-bubble-user text-white shadow-sm">
          {formatContent(message.content)}
        </div>
        <div className="w-8 h-8 rounded-full bg-[#F25C05] text-white flex items-center justify-center ml-2 flex-shrink-0">
          <span className="font-medium text-sm">ME</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start max-w-3xl">
      <div className="w-8 h-8 rounded-full bg-[#21706D] text-white flex items-center justify-center mr-2 flex-shrink-0">
        <span className="text-sm">🤖</span>
      </div>
      <div className="bg-white p-3 rounded-lg chat-bubble-assistant shadow-sm">
        <div className="text-[#212121]">
          {formatContent(content)}
        </div>
        
        {/* Conditionally render meal plan */}
        {shouldRenderMealPlan && (
          <div className="mt-4 space-y-4">
            {mealPlan.meals.slice(0, 3).map((meal) => (
              <MealCard key={meal.id} meal={meal} compact={true} />
            ))}
            
            {mealPlan.meals.length > 3 && (
              <div className="text-center">
                <Link href="/meals">
                  <Button variant="link" className="text-[#21706D]">
                    View all {mealPlan.meals.length} meals
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
        
        {/* Conditionally render grocery list preview */}
        {shouldRenderGroceryList && (
          <div className="mt-4">
            <GroceryListPreview groceryList={groceryList} />
          </div>
        )}
      </div>
    </div>
  );
}
