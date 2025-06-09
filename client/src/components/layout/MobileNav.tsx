import { Link } from "wouter";
import { MessageSquare, Utensils, ShoppingBasket, User, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ProfileIcon } from "@/components/ui/profile-icon";

interface MobileNavProps {
  activeTab: string;
}

export default function MobileNav({ activeTab }: MobileNavProps) {
  const { data: household } = useQuery({
    queryKey: ['/api/household'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  return (
    <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-[#E2E2E2] z-50 flex justify-around py-3">
      <Link href="/">
        <a className="flex flex-col items-center text-[#21706D]">
          <MessageSquare className={`text-lg ${activeTab === 'chat' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`} />
          <span className={`text-xs mt-1 ${activeTab === 'chat' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`}>DinnerBot</span>
        </a>
      </Link>
      
      <Link href="/this-week">
        <a className="flex flex-col items-center">
          <Utensils className={`text-lg ${activeTab === 'meals' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`} />
          <span className={`text-xs mt-1 ${activeTab === 'meals' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`}>This Week</span>
        </a>
      </Link>
      
      <Link href="/grocery">
        <a className="flex flex-col items-center">
          <ShoppingBasket className={`text-lg ${activeTab === 'grocery' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`} />
          <span className={`text-xs mt-1 ${activeTab === 'grocery' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`}>Groceries</span>
        </a>
      </Link>
      
      <Link href="/profile">
        <a className="flex flex-col items-center">
          <div className="mb-1">
            <ProfileIcon 
              ownerName={(household as any)?.ownerName} 
              size="sm"
              className={activeTab === 'profile' ? 'ring-2 ring-[#21706D] ring-offset-1' : ''}
            />
          </div>
          <span className={`text-xs ${activeTab === 'profile' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`}>
            {(household as any)?.ownerName || 'Profile'}
          </span>
        </a>
      </Link>
      
      {/* Settings hidden for MVP */}
      {/* <Link href="/settings">
        <a className="flex flex-col items-center">
          <Settings className={`text-lg ${activeTab === 'settings' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`} />
          <span className={`text-xs mt-1 ${activeTab === 'settings' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`}>Settings</span>
        </a>
      </Link> */}
    </div>
  );
}
