import { useState } from 'react';
import { useLocation } from 'wouter';
import { useHousehold } from '@/contexts/household-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { OnboardingStep } from '@/lib/types';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setMembers, setEquipment, setPreferences } = useHousehold();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  
  // Member state
  const [name, setName] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  
  // Equipment state
  const [equipmentItems, setEquipmentItems] = useState<{ name: string; isOwned: boolean }[]>([
    { name: 'Oven', isOwned: true },
    { name: 'Stovetop', isOwned: true },
    { name: 'Slow Cooker', isOwned: false },
    { name: 'Instant Pot', isOwned: false },
    { name: 'Food Processor', isOwned: false },
    { name: 'Air Fryer', isOwned: false },
    { name: 'Microwave', isOwned: true }
  ]);
  
  // Preferences state
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [weekdayCookingTime, setWeekdayCookingTime] = useState('30-45 minutes');
  const [weekendCookingStyle, setWeekendCookingStyle] = useState('More time for special meals');
  const [cuisines, setCuisines] = useState<string[]>(['Italian', 'American']);
  
  const availableCuisines = ['Italian', 'Mexican', 'American', 'Indian', 'Chinese', 'Japanese', 'Thai', 'Mediterranean', 'French', 'Greek'];

  const toggleCuisine = (cuisine: string) => {
    setCuisines(prev => 
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const toggleEquipment = (equipmentName: string) => {
    setEquipmentItems(prev => 
      prev.map(item => 
        item.name === equipmentName 
          ? { ...item, isOwned: !item.isOwned } 
          : item
      )
    );
  };

  const handleNext = async () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('household');
        break;
        
      case 'household':
        if (!name.trim()) {
          toast({
            title: "Name required",
            description: "Please enter your name before continuing.",
            variant: "destructive"
          });
          return;
        }
        
        try {
          // Create the main household member
          const response = await apiRequest('POST', '/api/household-members', {
            userId: 1, // Using hardcoded user ID for simplicity
            name,
            dietaryRestrictions: dietaryRestrictions || undefined,
            isMainUser: true
          });
          
          const member = await response.json();
          setMembers([member]);
          setCurrentStep('equipment');
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to save household information. Please try again.",
            variant: "destructive"
          });
        }
        break;
        
      case 'equipment':
        try {
          // Save all owned equipment
          const ownedEquipment = equipmentItems.filter(item => item.isOwned);
          const savedEquipment = [];
          
          for (const item of ownedEquipment) {
            const response = await apiRequest('POST', '/api/kitchen-equipment', {
              userId: 1,
              name: item.name,
              isOwned: true
            });
            
            savedEquipment.push(await response.json());
          }
          
          setEquipment(savedEquipment);
          setCurrentStep('preferences');
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to save equipment information. Please try again.",
            variant: "destructive"
          });
        }
        break;
        
      case 'preferences':
        try {
          const response = await apiRequest('POST', '/api/cooking-preferences', {
            userId: 1,
            confidenceLevel,
            weekdayCookingTime,
            weekendCookingStyle,
            preferredCuisines: cuisines,
            location: ''
          });
          
          const prefs = await response.json();
          setPreferences(prefs);
          setCurrentStep('complete');
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to save preferences. Please try again.",
            variant: "destructive"
          });
        }
        break;
        
      case 'complete':
        navigate('/meal-plan');
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'household':
        setCurrentStep('welcome');
        break;
      case 'equipment':
        setCurrentStep('household');
        break;
      case 'preferences':
        setCurrentStep('equipment');
        break;
      case 'complete':
        setCurrentStep('preferences');
        break;
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-2xl">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between">
          <span className={`text-sm ${currentStep !== 'welcome' ? 'text-teal-primary font-medium' : 'text-neutral-text'}`}>
            Household
          </span>
          <span className={`text-sm ${currentStep === 'equipment' || currentStep === 'preferences' || currentStep === 'complete' ? 'text-teal-primary font-medium' : 'text-neutral-text'}`}>
            Equipment
          </span>
          <span className={`text-sm ${currentStep === 'preferences' || currentStep === 'complete' ? 'text-teal-primary font-medium' : 'text-neutral-text'}`}>
            Preferences
          </span>
          <span className={`text-sm ${currentStep === 'complete' ? 'text-teal-primary font-medium' : 'text-neutral-text'}`}>
            Complete
          </span>
        </div>
        <div className="w-full bg-neutral-gray h-2 mt-2 rounded-full overflow-hidden">
          <div 
            className="bg-teal-primary h-full transition-all duration-300"
            style={{ 
              width: currentStep === 'welcome' ? '0%' : 
                     currentStep === 'household' ? '25%' : 
                     currentStep === 'equipment' ? '50%' : 
                     currentStep === 'preferences' ? '75%' : '100%' 
            }}
          ></div>
        </div>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          {currentStep === 'welcome' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <svg className="w-16 h-16 text-teal-primary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.92 3.845a1 1 0 10-1.84-.77l-1.2 2.86-3.02-1.51a1 1 0 00-1.38 1.37l1.56 3.12-2.58 1.29a1 1 0 00-.17 1.7l2.36 2.36a4 4 0 105.66-5.66l-2.38-2.38 2.55-1.29a1 1 0 00.44-1.18zM10.5 16a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-teal-primary mb-4">Welcome to Dinner, Decided!</h2>
              <p className="mb-4">
                Let's personalize your experience so we can help you plan delicious, stress-free dinners for your family.
              </p>
              <p className="mb-6">
                We'll ask you a few questions about your household, kitchen equipment, and cooking preferences.
              </p>
            </div>
          )}

          {currentStep === 'household' && (
            <div>
              <h2 className="text-2xl font-bold text-teal-primary mb-4">Tell us about yourself</h2>
              <p className="mb-6">
                We'll use this information to tailor meal suggestions to your dietary needs.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Your Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Dietary Restrictions (Optional)</label>
                <Input
                  type="text"
                  value={dietaryRestrictions}
                  onChange={(e) => setDietaryRestrictions(e.target.value)}
                  placeholder="e.g., Vegetarian, Gluten-free, No nuts"
                  className="w-full"
                />
                <p className="text-xs mt-1 text-neutral-text">
                  You can add other household members after setup.
                </p>
              </div>
            </div>
          )}

          {currentStep === 'equipment' && (
            <div>
              <h2 className="text-2xl font-bold text-teal-primary mb-4">Kitchen Equipment</h2>
              <p className="mb-6">
                Select the cooking equipment you have available in your kitchen.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {equipmentItems.map((item) => (
                  <div key={item.name} className="flex items-center">
                    <Checkbox
                      id={`equipment-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      checked={item.isOwned}
                      onCheckedChange={() => toggleEquipment(item.name)}
                      className="mr-2"
                    />
                    <label htmlFor={`equipment-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {item.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'preferences' && (
            <div>
              <h2 className="text-2xl font-bold text-teal-primary mb-4">Cooking Preferences</h2>
              <p className="mb-6">
                Let us know about your cooking style and preferences.
              </p>
              
              <div className="mb-6">
                <label className="block mb-2 font-medium">Cooking Confidence</label>
                <div className="flex items-center">
                  <span className="text-sm mr-2">Beginner</span>
                  <Slider
                    value={[confidenceLevel]}
                    onValueChange={(value) => setConfidenceLevel(value[0])}
                    max={5}
                    step={1}
                    className="flex-1 mx-2"
                  />
                  <span className="text-sm ml-2">Expert</span>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block mb-2 font-medium">Time for Weekday Cooking</label>
                <Select value={weekdayCookingTime} onValueChange={setWeekdayCookingTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cooking time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Less than 30 minutes">Less than 30 minutes</SelectItem>
                    <SelectItem value="30-45 minutes">30-45 minutes</SelectItem>
                    <SelectItem value="45-60 minutes">45-60 minutes</SelectItem>
                    <SelectItem value="More than 60 minutes">More than 60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mb-6">
                <label className="block mb-2 font-medium">Weekend Cooking Style</label>
                <Select value={weekendCookingStyle} onValueChange={setWeekendCookingStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cooking style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Keep it simple">Keep it simple</SelectItem>
                    <SelectItem value="More time for special meals">More time for special meals</SelectItem>
                    <SelectItem value="Batch cooking for the week">Batch cooking for the week</SelectItem>
                    <SelectItem value="Mix of quick and elaborate">Mix of quick and elaborate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Preferred Cuisines</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableCuisines.map(cuisine => (
                    <div className="flex items-center" key={cuisine}>
                      <Checkbox
                        id={`cuisine-${cuisine}`}
                        checked={cuisines.includes(cuisine)}
                        onCheckedChange={() => toggleCuisine(cuisine)}
                        className="mr-2"
                      />
                      <label htmlFor={`cuisine-${cuisine}`}>{cuisine}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <CheckCircle2 className="w-16 h-16 text-teal-primary" />
              </div>
              <h2 className="text-2xl font-bold text-teal-primary mb-4">You're all set!</h2>
              <p className="mb-6">
                Your profile has been created. Now let's start planning some delicious meals for your family.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        {currentStep !== 'welcome' ? (
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ) : (
          <div></div>
        )}
        
        <Button 
          onClick={handleNext}
          className="bg-teal-primary hover:bg-teal-light text-white"
        >
          {currentStep === 'complete' ? (
            <>Start Planning Meals</>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
