import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Plus, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function GroceryList() {
  const { toast } = useToast();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  
  const { data: groceryList, isLoading } = useQuery({
    queryKey: ['/api/grocery-list/current'],
  });

  const handleCheckItem = (itemId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleRegenerateList = async () => {
    try {
      await apiRequest("POST", "/api/grocery-list/regenerate", {});
      toast({
        title: "List regenerated",
        description: "Your grocery list has been updated based on your current meal plan."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate grocery list",
        variant: "destructive"
      });
    }
  };

  const sections = groceryList?.sections || [];
  const allChecked = sections.every(section => 
    section.items.every(item => checkedItems[item.id])
  );

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#212121]">Grocery List</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleRegenerateList}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((section) => (
                <div key={section}>
                  <Skeleton className="h-6 w-24 mb-2" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex items-center">
                        <Skeleton className="h-4 w-4 mr-2" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : sections.length > 0 ? (
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl">
              <div className="flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2 text-[#21706D]" />
                Shopping List
              </div>
            </CardTitle>
            <div className="text-sm text-[#8A8A8A]">
              {Object.values(checkedItems).filter(Boolean).length} of {sections.reduce((acc, section) => acc + section.items.length, 0)} items checked
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.name}>
                  <h3 className="font-medium text-[#212121] mb-2">{section.name}</h3>
                  <Separator className="mb-2" />
                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <div key={item.id} className="flex items-center">
                        <Checkbox 
                          id={item.id} 
                          checked={!!checkedItems[item.id]}
                          onCheckedChange={() => handleCheckItem(item.id)}
                          className="mr-2 text-[#21706D]"
                        />
                        <label 
                          htmlFor={item.id} 
                          className={`text-sm ${checkedItems[item.id] ? 'line-through text-[#8A8A8A]' : 'text-[#212121]'}`}
                        >
                          {item.name} {item.quantity && `(${item.quantity})`}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {allChecked && (
              <div className="mt-8 text-center">
                <p className="text-sm text-[#8A8A8A] mb-2">All items have been checked</p>
                <Button 
                  variant="outline" 
                  className="border-[#21706D] text-[#21706D]"
                  onClick={() => setCheckedItems({})}
                >
                  Clear All Checks
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full bg-white shadow-sm">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <ShoppingBag className="h-12 w-12 text-[#21706D] mb-4" />
            <h3 className="text-lg font-medium mb-2">No grocery list available</h3>
            <p className="text-sm text-[#8A8A8A] mb-4">
              Create a meal plan first to generate your shopping list.
            </p>
            <Link href="/">
              <Button className="bg-[#21706D] hover:bg-[#195957]">
                <Plus className="mr-2 h-4 w-4" />
                Create Meal Plan
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
