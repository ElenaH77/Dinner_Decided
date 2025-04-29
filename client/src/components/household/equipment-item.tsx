import { 
  Card,
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';
import { KitchenEquipment } from '@/lib/types';

interface EquipmentItemProps {
  equipment: KitchenEquipment;
  onToggle: (isOwned: boolean) => void;
  onRemove: () => void;
}

export default function EquipmentItem({ equipment, onToggle, onRemove }: EquipmentItemProps) {
  return (
    <Card className="bg-white border border-neutral-gray">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center flex-1">
            <Switch 
              id={`equipment-${equipment.id}`}
              checked={equipment.isOwned}
              onCheckedChange={onToggle}
              className="mr-3"
            />
            <label 
              htmlFor={`equipment-${equipment.id}`}
              className={equipment.isOwned ? 'font-medium' : 'text-neutral-text'}
            >
              {equipment.name}
            </label>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRemove}
            className="h-8 w-8 p-0 text-red-500 ml-2"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}