import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ResetButtonProps {
  onReset: () => void;
  label?: string;
  confirmMessage?: string;
  className?: string;
}

/**
 * A button component that asks for confirmation before triggering a reset action
 */
export function ResetButton({
  onReset,
  label = 'Reset Data',
  confirmMessage = 'Are you sure you want to reset? This action cannot be undone.',
  className = ''
}: ResetButtonProps) {
  const { toast } = useToast();
  
  const handleReset = () => {
    // Ask for confirmation
    if (window.confirm(confirmMessage)) {
      try {
        // Call the provided reset function
        onReset();
        
        toast({
          title: 'Reset Successful',
          description: 'Data has been reset successfully.',
        });
      } catch (error) {
        console.error('Reset failed:', error);
        toast({
          title: 'Reset Failed',
          description: error instanceof Error ? error.message : 'An unknown error occurred',
          variant: 'destructive'
        });
      }
    }
  };
  
  return (
    <Button
      onClick={handleReset}
      variant="destructive"
      className={className}
      size="sm"
    >
      <Trash2 className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}
