import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import GrocerySection from '@/components/grocery/grocery-section';
import { useToast } from '@/hooks/use-toast';
import { GroceryDepartment, GroceryItem } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { PrinterIcon, Share2Icon, Search, Plus, FileText, RefreshCw, Copy, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function GroceryList() {
  const { toast } = useToast();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [department, setDepartment] = useState('all');
  const [departments, setDepartments] = useState<GroceryDepartment[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentlyCheckedItems, setRecentlyCheckedItems] = useState<GroceryItem[]>([]);
  const [showPlainTextDialog, setShowPlainTextDialog] = useState(false);
  const [plainTextList, setPlainTextList] = useState('');

  // Load the meal plan from localStorage
  useEffect(() => {
    try {
      const storedPlan = localStorage.getItem('current_meal_plan');
      if (storedPlan) {
        const parsedPlan = JSON.parse(storedPlan);
        console.log("Found meal plan in localStorage:", parsedPlan);
        setMealPlan(parsedPlan);
        setLoading(false);
      } else {
        console.log("No meal plan found in localStorage");
        toast({
          title: "No meal plan found",
          description: "Please create a meal plan first",
          variant: "destructive"
        });
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading meal plan from localStorage:", error);
      toast({
        title: "Error",
        description: "Failed to load your meal plan",
        variant: "destructive"
      });
      setLoading(false);
    }
  }, [toast]);

  // Get grocery list if we have a meal plan
  const { data: groceryList, isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/grocery-list/by-meal-plan', mealPlan?.id],
    queryFn: async () => {
      if (!mealPlan?.id) return null;
      try {
        const response = await apiRequest('GET', `/api/grocery-list/by-meal-plan/${mealPlan.id}`);
        return response.json();
      } catch (error) {
        console.error("Error fetching grocery list:", error);
        return null;
      }
    },
    enabled: !!mealPlan?.id
  });

  // Process grocery list data when it loads
  useEffect(() => {
    if (groceryList && groceryList.sections) {
      // Convert server format to our local format
      const depts: GroceryDepartment[] = groceryList.sections.map(section => ({
        name: section.name,
        items: section.items.map(item => ({
          id: item.id,
          name: item.name,
          isChecked: item.isChecked || false,
          department: section.name,
          relatedMealId: item.mealId
        }))
      }));
      
      // Sort departments alphabetically
      depts.sort((a, b) => a.name.localeCompare(b.name));
      
      setDepartments(depts);
      
      // Also clear the recently checked items when we load a new list
      setRecentlyCheckedItems([]);
    }
  }, [groceryList]);
  
  // Function to handle item check state changes
  const handleItemCheck = (item: GroceryItem, isChecked: boolean) => {
    // If item is being checked, add to recently checked items
    if (isChecked) {
      setRecentlyCheckedItems(prev => [...prev, item]);
    } else {
      // If item is being unchecked, remove from recently checked
      setRecentlyCheckedItems(prev => {
        // Find if this exact item is in recently checked
        const itemIndex = prev.findIndex(i => i.id === item.id);
        if (itemIndex >= 0) {
          // Remove only this instance
          return [...prev.slice(0, itemIndex), ...prev.slice(itemIndex + 1)];
        }
        return prev;
      });
    }
  };
  
  // Function to completely empty the grocery list
  const resetCheckedItems = async () => {
    if (!mealPlan?.id) return;
    
    try {
      // Clear the departments locally
      setDepartments([]);
      setRecentlyCheckedItems([]);
      
      // Call API to clear the list on the server
      await apiRequest('POST', '/api/grocery-list/generate', {
        mealPlanId: mealPlan.id,
        empty: true
      });
      
      // Notify user
      toast({
        title: "List reset",
        description: "Your grocery list has been completely cleared."
      });
    } catch (error) {
      console.error("Error resetting grocery list:", error);
      toast({
        title: "Error",
        description: "Could not reset your grocery list. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Function to generate plain text version of the grocery list
  const generatePlainText = () => {
    let text = "";
    
    // Create a flat list of all unchecked items without headers or formatting
    departments.forEach(dept => {
      // Skip empty departments
      if (dept.items.length === 0) return;
      
      // Only include unchecked items
      const uncheckedItems = dept.items.filter(item => !item.isChecked);
      if (uncheckedItems.length === 0) return;
      
      // Add each item on its own line without any dashes or formatting
      uncheckedItems.forEach(item => {
        text += `${item.name}\n`;
      });
    });
    
    setPlainTextList(text);
    setShowPlainTextDialog(true);
  };
  
  // Function to copy plain text to clipboard
  const copyToClipboard = () => {
    if (textAreaRef.current) {
      textAreaRef.current.select();
      document.execCommand('copy');
      
      toast({
        title: "Copied to clipboard",
        description: "Your grocery list has been copied."
      });
    }
  };

  // Generate grocery list from meals
  const generateGroceryList = async () => {
    if (!mealPlan || !mealPlan.meals || mealPlan.meals.length === 0) {
      toast({
        title: "No meal plan found",
        description: "Please create a meal plan first to generate a grocery list.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGenerating(true);

      // Call API to generate grocery list
      const response = await apiRequest('POST', '/api/grocery-list/generate', {
        mealPlanId: mealPlan.id
      });

      const groceryList = await response.json();
      
      // The grocery list is already saved on the server
      // We just need to update our state and display it
      if (groceryList && groceryList.sections) {
        // Process sections into our department format
        const newDepartments = groceryList.sections.map(section => ({
          name: section.name,
          items: section.items.map(item => ({
            id: item.id,
            name: item.name,
            isChecked: false,
            department: section.name,
            relatedMealId: item.mealId
          }))
        }));
        
        setDepartments(newDepartments);
      }

      // No need to reload the page
      
      toast({
        title: "Grocery list created!",
        description: "Your grocery list has been generated based on your meal plan."
      });
    } catch (error) {
      console.error("Error generating grocery list:", error);
      toast({
        title: "Could not generate grocery list",
        description: "There was an error creating your grocery list. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addGroceryItem = () => {
    if (!newItemName.trim()) {
      return;
    }

    try {
      // Add item directly to our local state
      const newItemId = crypto.randomUUID();
      const newItem = {
        id: newItemId,
        name: newItemName.trim(),
        isChecked: false,
        department: 'Other',
      };
      
      // Check if we already have an "Other" department
      const otherDept = departments.find(dept => dept.name === 'Other');
      
      if (otherDept) {
        // Add to existing Other department
        const updatedDepartments = departments.map(dept => 
          dept.name === 'Other' 
            ? { ...dept, items: [...dept.items, newItem] }
            : dept
        );
        setDepartments(updatedDepartments);
      } else {
        // Create new Other department
        setDepartments([
          ...departments, 
          { name: 'Other', items: [newItem] }
        ]);
      }
      
      // Clear input field
      setNewItemName('');
      
      toast({
        title: "Item added",
        description: "Your item has been added to the grocery list.",
      });
    } catch (error) {
      console.error("Error adding grocery item:", error);
      toast({
        title: "Could not add item",
        description: "There was an error adding your item. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Filter displayed departments based on search and department filter
  // Only show items that are NOT checked in the main list
  const filteredDepartments = departments.map(dept => {
    const filteredItems = dept.items.filter(item => 
      // Only include items that match search term AND are not checked
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
      !item.isChecked
    );
    return { ...dept, items: filteredItems };
  }).filter(dept => 
    // Only include departments that match filter AND have unchecked items
    (department === 'all' || dept.name === department) && dept.items.length > 0
  );

  // Get unique department names for the filter dropdown
  const departmentNames = ['all', ...Array.from(new Set(departments.map(dept => dept.name)))];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 pb-24 max-w-6xl max-h-screen overflow-y-auto">
      {/* Fixed Action Buttons - Always Visible */}
      <div className="sticky top-4 z-10 mb-6 flex justify-center">
        <div className="bg-white rounded-full shadow-md px-4 py-2 flex gap-3">
          <Button 
            variant="outline"
            onClick={() => {
              window.location.href = '/meal-plan';
            }}
            size="sm"
          >
            <FileText className="w-4 h-4 mr-2" /> Back to Meal Plan
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-neutral-text">Grocery List</h2>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={resetCheckedItems}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={generatePlainText}
          >
            <Copy className="h-4 w-4 mr-2" />
            Text
          </Button>
          <Button variant="outline" size="sm" className="flex items-center">
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" className="flex items-center">
            <Share2Icon className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {loading || isLoadingItems ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-teal-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading your grocery list...</p>
        </div>
      ) : departments.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 max-h-[70vh] overflow-y-auto">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative flex-grow">
              <Input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="w-5 h-5 text-neutral-text absolute left-3 top-3" />
            </div>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                {departmentNames.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grocery Sections */}
          {filteredDepartments.map((dept) => (
            <GrocerySection key={dept.name} department={dept} onItemCheck={handleItemCheck} />
          ))}
          
          {/* Recently Checked Off Items */}
          {recentlyCheckedItems.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <div className="flex items-center mb-4">
                <h3 className="text-lg font-medium">Recently Checked Off</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-2 text-gray-500 hover:text-gray-700"
                  onClick={() => setRecentlyCheckedItems([])}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <ul className="space-y-2">
                  {recentlyCheckedItems.map((item, index) => (
                    <li key={`${item.id}-${index}`} className="flex items-center text-sm text-gray-600">
                      <Checkbox 
                        id={`checked-item-${item.id}-${index}`}
                        checked={true}
                        onCheckedChange={() => {
                          // Uncheck this item by finding it in the main list and toggling it
                          const updatedDepts = departments.map(dept => {
                            if (dept.name === item.department) {
                              const deptItems = dept.items.map(i => 
                                i.id === item.id ? { ...i, isChecked: false } : i
                              );
                              return { ...dept, items: deptItems };
                            }
                            return dept;
                          });
                          setDepartments(updatedDepts);
                          
                          // Also update backend
                          apiRequest('PUT', `/api/grocery-items/${item.id}`, {
                            isChecked: false
                          }).catch(error => {
                            console.error("Error updating grocery item:", error);
                          });
                          
                          // Remove from recently checked
                          handleItemCheck(item, false);
                        }}
                        className="mt-0.5 mr-2"
                      />
                      <span className="line-through">{item.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({item.department})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <h3 className="text-xl font-semibold mb-4">No Grocery List Yet</h3>
          <p className="mb-6">You haven't created a grocery list for this week's meal plan.</p>
          <Button 
            onClick={generateGroceryList}
            disabled={isGenerating}
            className="bg-teal-primary hover:bg-teal-light text-white"
          >
            {isGenerating ? "Generating..." : "Generate Grocery List"}
          </Button>
        </div>
      )}
      
      {/* Add Item Section - Fixed at bottom */}
      {departments.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-md">
          <div className="container mx-auto max-w-6xl">
            <div className="flex">
              <Input
                type="text"
                placeholder="Add an item..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="rounded-r-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addGroceryItem();
                  }
                }}
              />
              <Button 
                className="bg-teal-primary hover:bg-teal-light text-white rounded-l-none"
                onClick={addGroceryItem}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add padding at the bottom to prevent content from being hidden behind the fixed Add Item section */}
      {departments.length > 0 && <div className="h-20"></div>}
      
      {/* Plain Text Export Dialog */}
      <Dialog open={showPlainTextDialog} onOpenChange={setShowPlainTextDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Simple Item List</DialogTitle>
            <DialogDescription>
              Simple list format for pasting into other apps or making a physical list.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <textarea 
                ref={textAreaRef}
                className="w-full rounded-md border border-gray-300 p-3 h-48 text-sm"
                value={plainTextList}
                readOnly
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="default" onClick={copyToClipboard}>
              <Copy className="mr-2 h-4 w-4" />
              Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
