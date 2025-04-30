import { Link } from "wouter";
import { MessageSquare, Calendar, ShoppingBasket, User, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  activeTab: string;
}

export default function Sidebar({ activeTab }: SidebarProps) {
  const { data: household } = useQuery({
    queryKey: ['/api/household'],
  });

  return (
    <div className="hidden md:flex md:w-64 bg-white border-r border-[#E2E2E2] flex-col h-full">
      <div className="p-4 border-b border-[#E2E2E2]">
        <h1 className="font-bold text-xl text-[#21706D] flex items-center">
          <span className="mr-2 text-[#21706D]">🍽️</span> Dinner, Decided
        </h1>
      </div>
      
      <nav className="flex-grow">
        <ul className="p-2">
          <li className="mb-1">
            <Link href="/">
              <a className={`flex items-center p-3 rounded-lg ${activeTab === 'chat' ? 'bg-[#21706D] text-white' : 'text-[#212121] hover:bg-[#F9F9F9]'}`}>
                <MessageSquare className="w-5 h-5 mr-2" />
                <span>Chat Assistant</span>
              </a>
            </Link>
          </li>
          <li className="mb-1">
            <Link href="/this-week">
              <a className={`flex items-center p-3 rounded-lg ${activeTab === 'meals' ? 'bg-[#21706D] text-white' : 'text-[#212121] hover:bg-[#F9F9F9]'}`}>
                <Calendar className="w-5 h-5 mr-2" />
                <span>This Week</span>
              </a>
            </Link>
          </li>
          <li className="mb-1">
            <Link href="/grocery">
              <a className={`flex items-center p-3 rounded-lg ${activeTab === 'grocery' ? 'bg-[#21706D] text-white' : 'text-[#212121] hover:bg-[#F9F9F9]'}`}>
                <ShoppingBasket className="w-5 h-5 mr-2" />
                <span>Grocery List</span>
              </a>
            </Link>
          </li>
          <li className="mb-1">
            <Link href="/profile">
              <a className={`flex items-center p-3 rounded-lg ${activeTab === 'profile' ? 'bg-[#21706D] text-white' : 'text-[#212121] hover:bg-[#F9F9F9]'}`}>
                <User className="w-5 h-5 mr-2" />
                <span>Household Profile</span>
              </a>
            </Link>
          </li>
        </ul>
      </nav>
      
      {household && (
        <div className="p-4 border-t border-[#E2E2E2]">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-[#F25C05] text-white flex items-center justify-center">
              <span className="font-medium">{household.name?.slice(0, 2) || "HD"}</span>
            </div>
            <div className="ml-3">
              <p className="font-medium text-sm">{household.name || "Your Household"}</p>
              <p className="text-xs text-[#8A8A8A]">
                {household.members?.length || 0} {household.members?.length === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
