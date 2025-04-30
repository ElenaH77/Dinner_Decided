import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  
  // Determine active tab based on current location
  const getActiveTab = () => {
    if (location === "/") return "chat";
    if (location === "/this-week" || location === "/meals" || location === "/meal-plan") return "meals";
    if (location === "/grocery") return "grocery";
    if (location === "/profile") return "profile";
    if (location === "/settings") return "settings";
    return "chat";
  };
  
  const activeTab = getActiveTab();

  return (
    <div className="flex flex-col h-screen md:flex-row">
      {/* Sidebar Navigation (hidden on mobile) */}
      <Sidebar activeTab={activeTab} />
      
      {/* Mobile Navigation (visible only on small screens) */}
      <MobileNav activeTab={activeTab} />
      
      {/* Main Content */}
      <main className="flex-grow overflow-hidden">
        {children}
      </main>
    </div>
  );
}
