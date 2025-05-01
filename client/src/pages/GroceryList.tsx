import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Plus, RefreshCw, Trash2, PlusCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function GroceryList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [clearListOpen, setClearListOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', section: 'Produce' });
  
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
      queryClient.invalidateQueries({ queryKey: ['/api/grocery-list/current'] });
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

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide an item name",
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real app, you'd make an API call here to add the item to the grocery list
      // For now, we'll simulate this with a mock function that simply adds the item to the local list
      const updatedList = { ...groceryList };
      const sectionIndex = updatedList.sections.findIndex(s => s.name === newItem.section);
      
      if (sectionIndex === -1) {
        // Create a new section if it doesn't exist
        updatedList.sections.push({
          name: newItem.section,
          items: [{
            id: `item-${Date.now()}`,
            name: newItem.name,
            quantity: newItem.quantity || undefined
          }]
        });
      } else {
        // Add to existing section
        updatedList.sections[sectionIndex].items.push({
          id: `item-${Date.now()}`,
          name: newItem.name,
          quantity: newItem.quantity || undefined
        });
      }
      
      // Replace the existing data with our updated list
      queryClient.setQueryData(['/api/grocery-list/current'], updatedList);
      
      // Reset the form
      setNewItem({ name: '', quantity: '', section: 'Produce' });
      setAddItemOpen(false);
      
      toast({
        title: "Item added",
        description: `${newItem.name} has been added to your grocery list`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to the grocery list",
        variant: "destructive"
      });
    }
  };

  const handleClearList = async () => {
    try {
      // Call the API to clear the grocery list
      const response = await apiRequest("POST", "/api/grocery-list/clear", {});
      
      if (response.ok) {
        // Update the query cache with the empty list returned from the server
        const clearedList = await response.json();
        queryClient.setQueryData(['/api/grocery-list/current'], clearedList);
        
        // Reset checked items
        setCheckedItems({});
        setClearListOpen(false);
        
        toast({
          title: "List cleared",
          description: "Your grocery list has been cleared. Add some items or refresh the list from your meal plan."
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to clear the grocery list",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error clearing grocery list:", error);
      toast({
        title: "Error",
        description: "Failed to clear the grocery list",
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
          <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="border-[#21706D] text-[#21706D]"
                disabled={isLoading}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add to Grocery List</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Item
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. Milk"
                    className="col-span-3"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">
                    Quantity
                  </Label>
                  <Input
                    id="quantity"
                    placeholder="e.g. 1 gallon"
                    className="col-span-3"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="section" className="text-right">
                    Section
                  </Label>
                  <Select 
                    value={newItem.section}
                    onValueChange={(value) => setNewItem({...newItem, section: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Produce">Produce</SelectItem>
                      <SelectItem value="Dairy">Dairy</SelectItem>
                      <SelectItem value="Meat">Meat</SelectItem>
                      <SelectItem value="Bakery">Bakery</SelectItem>
                      <SelectItem value="Pantry">Pantry</SelectItem>
                      <SelectItem value="Frozen">Frozen</SelectItem>
                      <SelectItem value="Snacks">Snacks</SelectItem>
                      <SelectItem value="Beverages">Beverages</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAddItem} 
                  className="bg-[#21706D] hover:bg-[#195957]"
                >
                  Add Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={clearListOpen} onOpenChange={setClearListOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="border-red-500 text-red-500 hover:bg-red-50"
                disabled={isLoading || sections.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Clear Grocery List</DialogTitle>
              </DialogHeader>
              <p className="py-4">Are you sure you want to clear your entire grocery list? This action cannot be undone.</p>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setClearListOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleClearList} 
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Clear List
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
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
