import { Link } from "wouter";
import { MessageSquare, Utensils, ShoppingBasket, User } from "lucide-react";

interface MobileNavProps {
  activeTab: string;
}

export default function MobileNav({ activeTab }: MobileNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-[#E2E2E2] z-50 flex justify-around py-3">
      <Link href="/">
        <a className="flex flex-col items-center text-[#21706D]">
          <MessageSquare className={`text-lg ${activeTab === 'chat' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`} />
          <span className={`text-xs mt-1 ${activeTab === 'chat' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`}>Chat</span>
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
          <User className={`text-lg ${activeTab === 'profile' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`} />
          <span className={`text-xs mt-1 ${activeTab === 'profile' ? 'text-[#21706D]' : 'text-[#8A8A8A]'}`}>Profile</span>
        </a>
      </Link>
    </div>
  );
}
