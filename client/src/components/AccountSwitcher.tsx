import { Button } from "@/components/ui/button";
import { setHouseholdId } from "@/lib/queryClient";

export function AccountSwitcher() {
  const switchToKidsElena = () => {
    localStorage.clear();
    setHouseholdId('e971dd06-ce76-49bf-ad89-12b4106e4e7e');
    window.location.reload();
  };

  const switchToAltElena = () => {
    localStorage.clear();
    setHouseholdId('971194b1-c94c-42c5-9b09-c800290fa380');
    window.location.reload();
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <Button 
        onClick={switchToKidsElena}
        variant="outline"
        size="sm"
        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
      >
        Kids Account (4 meals)
      </Button>
      <Button 
        onClick={switchToAltElena}
        variant="outline" 
        size="sm"
        className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
      >
        Fancy Account (4 meals)
      </Button>
    </div>
  );
}