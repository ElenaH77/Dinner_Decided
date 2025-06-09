import { User } from "lucide-react";

interface ProfileIconProps {
  ownerName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProfileIcon({ ownerName, size = "md", className = "" }: ProfileIconProps) {
  const getInitials = (name?: string): string => {
    if (!name || name.trim() === "") return "";
    
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    return words
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join("");
  };

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base"
  };

  const initials = getInitials(ownerName);

  if (!initials) {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-gray-200 rounded-full flex items-center justify-center`}>
        <User className="w-4 h-4 text-gray-500" />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${className} bg-[#21706D] text-white rounded-full flex items-center justify-center font-medium`}>
      {initials}
    </div>
  );
}