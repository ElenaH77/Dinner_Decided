import { useState } from 'react';
import { 
  Card,
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, CheckCircle, X } from 'lucide-react';
import { HouseholdMember } from '@/lib/types';

interface MemberCardProps {
  member: HouseholdMember;
  onUpdate: (member: HouseholdMember) => void;
  onRemove: (id: number) => void;
}

export default function MemberCard({ member, onUpdate, onRemove }: MemberCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [dietaryRestrictions, setDietaryRestrictions] = useState(member.dietaryRestrictions || '');
  
  const handleSave = () => {
    if (!name.trim()) return;
    
    onUpdate({
      ...member,
      name,
      dietaryRestrictions: dietaryRestrictions || undefined
    });
    
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setName(member.name);
    setDietaryRestrictions(member.dietaryRestrictions || '');
    setIsEditing(false);
  };
  
  return (
    <Card className="bg-white border border-neutral-gray">
      <CardContent className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dietary Restrictions</label>
              <Input
                type="text"
                value={dietaryRestrictions}
                onChange={(e) => setDietaryRestrictions(e.target.value)}
                placeholder="e.g., Vegetarian, No nuts"
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
                className="flex items-center"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                className="flex items-center bg-teal-primary hover:bg-teal-light text-white"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-lg">{member.name}</h4>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4 text-neutral-text" />
                </Button>
                {!member.isMainUser && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onRemove(member.id)}
                    className="h-8 w-8 p-0 text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {member.dietaryRestrictions && (
              <div className="text-sm text-neutral-text">
                <span className="font-medium">Dietary Restrictions:</span> {member.dietaryRestrictions}
              </div>
            )}
            {member.isMainUser && (
              <div className="mt-2">
                <span className="inline-block bg-teal-light/10 text-teal-primary text-xs px-2 py-1 rounded-full">
                  Primary Member
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}