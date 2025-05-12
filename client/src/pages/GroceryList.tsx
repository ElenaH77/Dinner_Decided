import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Plus, RefreshCw, Trash2, PlusCircle, FileText, ListFilter, CheckSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef } from "react";
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
  const [plainTextOpen, setPlainTextOpen] = useState(false);
  const [organizingItems, setOrganizingItems] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', section: 'Other' });
  const plainTextRef = useRef<HTMLTextAreaElement>(null);
  
  const { data: groceryList, isLoading } = useQuery({
    queryKey: ['/api/grocery-list/current'],
    refetchOnWindowFocus: true, // Refresh when window regains focus
    refetchOnMount: true, // Always refetch when component mounts
    staleTime: 10000, // Consider data stale after 10 seconds
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
        title: "Success",
        description: "Your grocery list has been refreshed from your meal plan."
      });
    } catch (error) {
      console.error("Error regenerating grocery list:", error);
      toast({
        title: "Error",
        description: "Failed to refresh the grocery list",
        variant: "destructive"
      });
    }
  };

  const handleAddItem = async () => {
    try {
      // Validate input
      if (!newItem.name.trim()) {
        toast({
          title: "Error",
          description: "Please enter an item name",
          variant: "destructive"
        });
        return;
      }
      
      // Call API to add the item
      const response = await apiRequest("POST", "/api/grocery-list/add-item", {
        name: newItem.name,
        quantity: newItem.quantity,
        section: newItem.section
      });
      
      if (response.ok) {
        // Get the updated grocery list
        const updatedList = await response.json();
        
        // Update the query cache with the latest data
        queryClient.setQueryData(['/api/grocery-list/current'], updatedList);
        
        // Reset the form and close the dialog
        setNewItem({ name: '', quantity: '', section: 'Other' });
        setAddItemOpen(false);
        
        toast({
          title: "Item added",
          description: `"${newItem.name}" has been added to your grocery list.`
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to add item to the grocery list",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error adding item to grocery list:", error);
      toast({
        title: "Error",
        description: "Failed to add item to the grocery list. Please try again.",
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

  // Organize items into grocery departments
  const handleOrganizeItems = async () => {
    try {
      setOrganizingItems(true);
      
      // Call API to organize items into departments (we'll add this endpoint later)
      const response = await apiRequest("POST", "/api/grocery-list/organize", {
        excludeCheckedItems: true // Don't include checked items in organization
      });
      
      if (response.ok) {
        const organizedList = await response.json();
        queryClient.setQueryData(['/api/grocery-list/current'], organizedList);
        
        toast({
          title: "List organized",
          description: "Your grocery list has been organized into departments."
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to organize the grocery list",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error organizing grocery list:", error);
      toast({
        title: "Error",
        description: "Failed to organize the grocery list",
        variant: "destructive"
      });
    } finally {
      setOrganizingItems(false);
    }
  };
  
  // Generate plain text version of the grocery list
  const generatePlainTextList = () => {
    if (!groceryList?.sections) return "";
    
    // Filter out checked items and generate plain text
    let plainText = "MY GROCERY LIST\n\n";
    
    groceryList.sections.forEach(section => {
      const uncheckedItems = section.items.filter(item => !checkedItems[item.id]);
      
      if (uncheckedItems.length > 0) {
        plainText += `${section.name}:\n`;
        uncheckedItems.forEach(item => {
          plainText += `• ${item.name}\n`;
        });
        plainText += "\n";
      }
    });
    
    return plainText;
  };
  
  // Copy plain text to clipboard
  const handleCopyPlainText = () => {
    if (plainTextRef.current) {
      plainTextRef.current.select();
      document.execCommand('copy');
      
      toast({
        title: "Copied to clipboard",
        description: "Your grocery list has been copied to the clipboard."
      });
      
      setPlainTextOpen(false);
    }
  };

  // Separate checked and unchecked items for display
  const separateCheckedItems = () => {
    if (!groceryList?.sections) return { activeSections: [], completedItems: [] };
    
    const activeSections = [];
    const completedItems = [];
    
    groceryList.sections.forEach(section => {
      const activeItems = section.items.filter(item => !checkedItems[item.id]);
      const checkedSectionItems = section.items.filter(item => checkedItems[item.id]);
      
      if (activeItems.length > 0) {
        activeSections.push({
          name: section.name,
          items: activeItems
        });
      }
      
      completedItems.push(...checkedSectionItems);
    });
    
    return { activeSections, completedItems };
  };
  
  const { activeSections, completedItems } = separateCheckedItems();
  const hasCompletedItems = completedItems.length > 0;
  const allChecked = activeSections.length === 0 && groceryList?.sections?.length > 0;

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-[#212121]">Grocery List</h1>
        <div className="flex flex-wrap gap-2">
          <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="border-[#21706D] text-[#21706D]"
                disabled={isLoading}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Add Grocery Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="item-name">Item Name</Label>
                  <Input 
                    id="item-name" 
                    value={newItem.name} 
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    placeholder="e.g. Milk"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="item-quantity">Quantity (optional)</Label>
                  <Input 
                    id="item-quantity" 
                    value={newItem.quantity} 
                    onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                    placeholder="e.g. 1 gallon"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="item-section">Section</Label>
                  <Select 
                    value={newItem.section} 
                    onValueChange={(value) => setNewItem({...newItem, section: value})}
                  >
                    <SelectTrigger id="item-section">
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Produce">Produce</SelectItem>
                      <SelectItem value="Dairy">Dairy</SelectItem>
                      <SelectItem value="Meat">Meat</SelectItem>
                      <SelectItem value="Bakery">Bakery</SelectItem>
                      <SelectItem value="Frozen">Frozen</SelectItem>
                      <SelectItem value="Canned Goods">Canned Goods</SelectItem>
                      <SelectItem value="Dry Goods">Dry Goods</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="ghost" 
                  onClick={() => setAddItemOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddItem} 
                  disabled={!newItem.name}
                  className="bg-[#21706D] hover:bg-[#185956]"
                >
                  Add to List
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button
            variant="outline"
            className="border-[#21706D] text-[#21706D]"
            onClick={handleOrganizeItems}
            disabled={isLoading || organizingItems}
            size="sm"
          >
            <ListFilter className="h-4 w-4 mr-1" /> Organize by Department
          </Button>
          
          <Dialog open={plainTextOpen} onOpenChange={setPlainTextOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-[#21706D] text-[#21706D]"
                disabled={isLoading}
                size="sm"
              >
                <FileText className="h-4 w-4 mr-1" /> Plain Text
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Plain Text Grocery List</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="mb-2 text-sm text-gray-600">Copy this list to use in other apps (unchecked items only)</p>
                <textarea
                  ref={plainTextRef}
                  className="w-full h-60 p-2 border rounded-md font-mono text-sm"
                  value={generatePlainTextList()}
                  readOnly
                />
              </div>
              <DialogFooter>
                <Button 
                  variant="ghost" 
                  onClick={() => setPlainTextOpen(false)}
                >
                  Close
                </Button>
                <Button 
                  onClick={handleCopyPlainText}
                  className="bg-[#21706D] hover:bg-[#185956]"
                >
                  Copy to Clipboard
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button
            variant="outline"
            className="border-[#21706D] text-[#21706D]"
            onClick={handleRegenerateList}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh List
          </Button>
          
          <Dialog open={clearListOpen} onOpenChange={setClearListOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-50"
                disabled={isLoading}
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Clear
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Clear Grocery List</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p>Are you sure you want to clear your entire grocery list? This action cannot be undone.</p>
              </div>
              <DialogFooter>
                <Button 
                  variant="ghost" 
                  onClick={() => setClearListOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleClearList}
                  variant="destructive"
                >
                  Clear List
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {isLoading ? (
        <Card className="bg-white shadow-sm">
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
      ) : groceryList?.sections?.length > 0 ? (
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl">
              <div className="flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2 text-[#21706D]" />
                Shopping List
              </div>
            </CardTitle>
            <div className="text-sm text-[#8A8A8A]">
              {completedItems.length} of {completedItems.length + activeSections.reduce((acc, section) => acc + section.items.length, 0)} items checked
            </div>
          </CardHeader>
          <CardContent>
            {/* Active Items */}
            {activeSections.length > 0 && (
              <div className="space-y-6">
                {activeSections.map((section) => (
                  <div key={section.name}>
                    <h3 className="font-medium text-[#212121] mb-2">{section.name}</h3>
                    <Separator className="mb-2" />
                    <div className="space-y-2">
                      {section.items.map((item) => (
                        <div key={item.id} className="flex items-center">
                          <Checkbox 
                            id={item.id} 
                            checked={false}
                            onCheckedChange={() => handleCheckItem(item.id)}
                            className="mr-2 text-[#21706D]"
                          />
                          <label 
                            htmlFor={item.id} 
                            className="text-[#212121]"
                          >
                            {item.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Completed Items */}
            {hasCompletedItems && (
              <div className="mt-8">
                <div className="flex items-center mb-2">
                  <CheckSquare className="h-4 w-4 mr-2 text-gray-400" />
                  <h3 className="font-medium text-gray-500">Completed Items</h3>
                </div>
                <Separator className="mb-4" />
                <div className="space-y-2">
                  {completedItems.map((item) => (
                    <div key={item.id} className="flex items-center">
                      <Checkbox 
                        id={`checked-${item.id}`} 
                        checked={true}
                        onCheckedChange={() => handleCheckItem(item.id)}
                        className="mr-2 text-gray-400"
                      />
                      <label 
                        htmlFor={`checked-${item.id}`} 
                        className="line-through text-gray-400"
                      >
                        {item.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeSections.length === 0 && !hasCompletedItems && (
              <div className="py-8 text-center">
                <p className="text-gray-500">All items have been checked off!</p>
              </div>
            )}
            
            <div className="mt-8 flex justify-center">
              <Link href="/this-week" className="text-[#21706D] text-sm hover:underline">
                Return to meal plan
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-sm">
          <ShoppingBag className="h-12 w-12 text-[#21706D] mb-4 opacity-50" />
          <h2 className="text-xl font-medium text-[#212121] mb-2">Your grocery list is empty</h2>
          <p className="text-[#8A8A8A] text-center mb-6">
            Add items manually or generate a list from your meal plan
          </p>
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
            <Button onClick={() => setAddItemOpen(true)} className="bg-[#21706D] hover:bg-[#185956]">
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
            <Button 
              onClick={handleRegenerateList} 
              variant="outline" 
              className="border-[#21706D] text-[#21706D]"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Generate from Meal Plan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}