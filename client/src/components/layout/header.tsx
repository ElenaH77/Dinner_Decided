import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useMealPlan } from '@/contexts/meal-plan-context';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [location] = useLocation();
  const { currentMealPlan } = useMealPlan();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="bg-white border-b border-neutral-gray shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/">
            <a className="flex items-center">
              <svg className="w-8 h-8 text-teal-primary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.92 3.845a1 1 0 10-1.84-.77l-1.2 2.86-3.02-1.51a1 1 0 00-1.38 1.37l1.56 3.12-2.58 1.29a1 1 0 00-.17 1.7l2.36 2.36a4 4 0 105.66-5.66l-2.38-2.38 2.55-1.29a1 1 0 00.44-1.18zM10.5 16a2 2 0 110-4 2 2 0 010 4z"/>
              </svg>
              <h1 className="ml-2 text-xl font-semibold text-teal-primary">Dinner, Decided</h1>
            </a>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6">
          <Link href="/meal-plan">
            <a className={`${location === '/meal-plan' ? 'text-teal-primary font-medium' : 'text-neutral-text hover:text-teal-primary'} transition-colors`}>
              This Week's Plan
            </a>
          </Link>
          <Link href="/grocery-list">
            <a className={`${location === '/grocery-list' ? 'text-teal-primary font-medium' : 'text-neutral-text hover:text-teal-primary'} transition-colors`}>
              Grocery List
            </a>
          </Link>
          <Link href="/household-profile">
            <a className={`${location === '/household-profile' ? 'text-teal-primary font-medium' : 'text-neutral-text hover:text-teal-primary'} transition-colors`}>
              Household Profile
            </a>
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button variant="ghost" size="sm" onClick={toggleMobileMenu} className="text-teal-primary p-1">
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-gray">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            <Link href="/meal-plan">
              <a 
                className={`${location === '/meal-plan' ? 'text-teal-primary font-medium' : 'text-neutral-text'} py-2`}
                onClick={() => setMobileMenuOpen(false)}
              >
                This Week's Plan
              </a>
            </Link>
            <Link href="/grocery-list">
              <a 
                className={`${location === '/grocery-list' ? 'text-teal-primary font-medium' : 'text-neutral-text'} py-2`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Grocery List
              </a>
            </Link>
            <Link href="/household-profile">
              <a 
                className={`${location === '/household-profile' ? 'text-teal-primary font-medium' : 'text-neutral-text'} py-2`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Household Profile
              </a>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
