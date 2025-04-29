import React from 'react';
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
  const handleToggleItem = async (item: GroceryItem, checked: boolean) => {
    try {
      // First notify parent component about check state change for immediate UI update
      if (onItemCheck) {
        onItemCheck(item, checked);
      }
      
      // Then update in backend
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
            ({department.items.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {department.items.length > 0 ? (
          <ul className="space-y-3">
            {department.items.map(item => (
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
        ) : (
          <p className="text-sm text-gray-500 italic">No items in this category</p>
        )}
      </CardContent>
    </Card>
  );
}