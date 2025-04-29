import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GrocerySection from '@/components/grocery/grocery-section';
import { useToast } from '@/hooks/use-toast';
import { GroceryDepartment, GroceryItem } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { PrinterIcon, Share2Icon, Search, Plus, FileText } from 'lucide-react';

export default function GroceryList() {
  const { toast } = useToast();
  
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [department, setDepartment] = useState('all');
  const [departments, setDepartments] = useState<GroceryDepartment[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Get grocery items if we have a meal plan
  const { data: groceryItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/meal-plans', mealPlan?.id, 'grocery-items'],
    enabled: !!mealPlan?.id
  });

  // Organize grocery items by department
  useEffect(() => {
    if (groceryItems && Array.isArray(groceryItems)) {
      const deptMap = new Map<string, GroceryItem[]>();
      
      groceryItems.forEach((item: GroceryItem) => {
        if (!deptMap.has(item.department)) {
          deptMap.set(item.department, []);
        }
        deptMap.get(item.department)!.push(item);
      });
      
      const deptArray: GroceryDepartment[] = [];
      deptMap.forEach((items, name) => {
        deptArray.push({ name, items });
      });
      
      // Sort departments alphabetically
      deptArray.sort((a, b) => a.name.localeCompare(b.name));
      
      setDepartments(deptArray);
    }
  }, [groceryItems]);

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
      const response = await apiRequest('POST', '/api/generate-grocery-list', {
        meals: mealPlan.meals
      });

      const data = await response.json();
      
      // Create grocery items in the database
      for (const item of data.groceryItems) {
        // Find related meal ID if possible
        const relatedMeal = mealPlan.meals.find(meal => meal.name === item.relatedMealName);
        
        await apiRequest('POST', '/api/grocery-items', {
          mealPlanId: mealPlan.id,
          name: item.name,
          department: item.department,
          isChecked: false,
          relatedMealId: relatedMeal?.id
        });
      }
      
      // Refresh grocery items
      window.location.reload();
      
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

  const addGroceryItem = async () => {
    if (!newItemName.trim() || !mealPlan) {
      return;
    }

    try {
      await apiRequest('POST', '/api/grocery-items', {
        mealPlanId: mealPlan.id,
        name: newItemName,
        department: 'Other',
        isChecked: false
      });
      
      setNewItemName('');
      
      // Refresh grocery items
      window.location.reload();
    } catch (error) {
      console.error("Error adding grocery item:", error);
      toast({
        title: "Could not add item",
        description: "There was an error adding the grocery item. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Filter displayed departments based on search and department filter
  const filteredDepartments = departments.map(dept => {
    const filteredItems = dept.items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...dept, items: filteredItems };
  }).filter(dept => 
    (department === 'all' || dept.name === department) && dept.items.length > 0
  );

  // Get unique department names for the filter dropdown
  const departmentNames = ['all', ...Array.from(new Set(departments.map(dept => dept.name)))];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl">
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
        <div className="flex space-x-2">
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
        <div className="bg-white rounded-xl shadow-sm p-6">
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
            <GrocerySection key={dept.name} department={dept} />
          ))}

          {/* Add Item Section */}
          <div className="mt-6">
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
    </div>
  );
}
