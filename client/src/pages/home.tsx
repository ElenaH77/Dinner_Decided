import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Users, CookingPot, ListChecks } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function Home() {
  const [, navigate] = useLocation();
  
  // Get active meal plan from API instead of context
  const { data: currentMealPlan } = useQuery({
    queryKey: ['/api/meal-plan/current'],
  });

  // If there's an active meal plan, redirect to it
  useEffect(() => {
    if (currentMealPlan) {
      navigate('/show-meal-plan');
    }
  }, [currentMealPlan, navigate]);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-6xl">
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-teal-primary mb-4">Welcome to Dinner, Decided</h1>
        <p className="text-xl max-w-2xl mx-auto mb-8">
          Your personal meal planning assistant that makes weekly dinners easy for busy families.
        </p>
        <Button 
          size="lg" 
          className="bg-teal-primary hover:bg-teal-light text-white"
          onClick={() => navigate('/show-meal-plan')}
        >
          View This Week's Meals
        </Button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="bg-white rounded-xl shadow-sm p-8 flex flex-col items-center text-center">
          <img 
            src="https://source.unsplash.com/random/300x200/?family-cooking" 
            alt="Family cooking together" 
            className="w-full h-48 object-cover rounded-lg mb-6" 
          />
          <h2 className="text-2xl font-semibold text-teal-primary mb-4">Personalized Meal Plans</h2>
          <p className="text-neutral-text mb-6">
            Get meal suggestions tailored to your family's preferences, dietary needs, and schedule.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 flex flex-col items-center text-center">
          <img 
            src="https://source.unsplash.com/random/300x200/?grocery-shopping" 
            alt="Organized grocery shopping" 
            className="w-full h-48 object-cover rounded-lg mb-6" 
          />
          <h2 className="text-2xl font-semibold text-teal-primary mb-4">Smart Grocery Lists</h2>
          <p className="text-neutral-text mb-6">
            Automatically generate organized shopping lists grouped by store department.
          </p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Users className="h-12 w-12 text-teal-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Create Your Profile</h3>
              <p className="text-neutral-text">Tell us about your household, dietary needs, and preferences.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <CookingPot className="h-12 w-12 text-teal-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Set Kitchen Details</h3>
              <p className="text-neutral-text">Let us know what equipment you have and your cooking comfort level.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Clock className="h-12 w-12 text-teal-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Plan Your Week</h3>
              <p className="text-neutral-text">Tell us how many meals you need and any special considerations.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <ListChecks className="h-12 w-12 text-teal-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Get Organized</h3>
              <p className="text-neutral-text">Receive your personalized plan and grocery list, ready to use.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="text-center mb-16">
        <h2 className="text-2xl font-bold mb-6">Ready to simplify dinner planning?</h2>
        <Button 
          size="lg" 
          className="bg-orange-accent hover:bg-orange-light text-white"
          onClick={() => navigate('/meal-plan')}
        >
          Create Your Meal Plan Now
        </Button>
      </section>
    </div>
  );
}
