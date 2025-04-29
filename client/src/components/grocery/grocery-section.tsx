import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingBasket } from 'lucide-react';
import { GroceryDepartment, GroceryItem } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';

interface GrocerySectionProps {
  department: GroceryDepartment;
  onItemCheck?: (item: GroceryItem, isChecked: boolean) => void;
}

export default function GrocerySection({ department, onItemCheck }: GrocerySectionProps) {
  // Filter out checked items for display
  const uncheckedItems = department.items.filter(item => !item.isChecked);
  
  const handleToggleItem = async (item: GroceryItem, checked: boolean) => {
    try {
      // Notify parent component about check state change
      if (onItemCheck) {
        onItemCheck(item, checked);
      }
      
      // Update in backend
      await apiRequest('PUT', `/api/grocery-items/${item.id}`, {
        isChecked: checked
      });
    } catch (error) {
      console.error("Error updating grocery item:", error);
    }
  };

  return (
    <Card className="mb-4 border border-gray-200">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-md font-medium flex items-center">
          <ShoppingBasket className="h-5 w-5 mr-2 text-teal-primary" />
          {department.name}
          <span className="ml-2 text-sm font-normal text-neutral-text">
            ({uncheckedItems.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ul className="space-y-3">
          {uncheckedItems.map(item => (
            <li key={item.id} className="flex items-start gap-2">
              <Checkbox 
                id={`item-${item.id}`} 
                checked={false}
                onCheckedChange={(checked) => handleToggleItem(item, !!checked)}
                className="mt-0.5 mr-1"
              />
              <div className="flex-1">
                <label 
                  htmlFor={`item-${item.id}`} 
                  className="text-sm cursor-pointer text-gray-800"
                >
                  {item.name}
                </label>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}