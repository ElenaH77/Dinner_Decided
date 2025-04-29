import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingBasket } from 'lucide-react';

interface GrocerySectionProps {
  title: string;
  items: Array<{
    id: string;
    name: string;
    quantity?: string;
    checked?: boolean;
    mealId?: string;
  }>;
  onToggleItem: (itemId: string, checked: boolean) => void;
}

export default function GrocerySection({ title, items, onToggleItem }: GrocerySectionProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium flex items-center">
          <ShoppingBasket className="h-5 w-5 mr-2 text-teal-primary" />
          {title}
          <span className="ml-2 text-sm font-normal text-neutral-text">
            ({items.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.id} className="flex items-start">
              <Checkbox 
                id={`item-${item.id}`} 
                checked={item.checked} 
                onCheckedChange={(checked) => onToggleItem(item.id, !!checked)}
                className="mt-1 mr-2"
              />
              <div className="flex-1">
                <label 
                  htmlFor={`item-${item.id}`} 
                  className={`text-sm ${item.checked ? 'line-through text-neutral-gray' : ''}`}
                >
                  {item.name}
                  {item.quantity && <span className="text-neutral-text ml-1">({item.quantity})</span>}
                </label>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}