import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ShoppingBasket, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { GroceryList, GroceryItem } from "@/types";

interface GroceryListPreviewProps {
  groceryList: GroceryList;
}

export default function GroceryListPreview({ groceryList }: GroceryListPreviewProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);
  
  const handleCheckItem = (id: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Count total items
  const totalItems = groceryList.sections.reduce(
    (acc, section) => acc + section.items.length, 
    0
  );
  
  // Get items to display (limited or all)
  const getItemsToShow = () => {
    let count = 0;
    const result: { sectionName: string; items: GroceryItem[] }[] = [];
    
    for (const section of groceryList.sections) {
      const items = showAll 
        ? section.items 
        : section.items.slice(0, Math.min(3, section.items.length));
      
      count += items.length;
      
      if (items.length > 0) {
        result.push({
          sectionName: section.name,
          items
        });
      }
      
      if (!showAll && count >= 6) break;
    }
    
    return result;
  };
  
  const itemsToShow = getItemsToShow();
  const hiddenItems = totalItems - (showAll ? totalItems : Math.min(6, totalItems));

  return (
    <div className="bg-white p-4 border border-[#E2E2E2] rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-base text-[#212121] flex items-center">
          <ShoppingBasket className="h-4 w-4 mr-2 text-[#21706D]" />
          Grocery List
        </h3>
        <Link href="/grocery">
          <Button variant="link" className="text-[#21706D] hover:underline text-sm font-medium p-0">
            View full list
          </Button>
        </Link>
      </div>
      
      <div className="space-y-3">
        {itemsToShow.map(({ sectionName, items }) => (
          <div key={sectionName}>
            <h4 className="font-medium text-sm text-[#212121]">{sectionName}</h4>
            <ul className="mt-1 text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex items-center">
                  <Checkbox 
                    id={item.id} 
                    checked={!!checkedItems[item.id]}
                    onCheckedChange={() => handleCheckItem(item.id)}
                    className="mr-2 h-4 w-4 text-[#21706D] focus:ring-[#21706D] border-[#E2E2E2] rounded"
                  />
                  <label 
                    htmlFor={item.id} 
                    className={`${checkedItems[item.id] ? 'line-through text-[#8A8A8A]' : ''}`}
                  >
                    {item.name} {item.quantity && `(${item.quantity})`}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {hiddenItems > 0 && (
          <div className="text-center">
            <Button 
              variant="link" 
              size="sm" 
              className="text-[#21706D] text-sm p-0"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show less" : `Show more items (${hiddenItems})`} 
              <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
