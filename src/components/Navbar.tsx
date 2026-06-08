import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Calendar, MessageSquare, Compass, ListTodo } from 'lucide-react';

interface NavbarProps {
  hasUnreadWhispers?: boolean;
  hasUnreadChecklist?: boolean;
  hasReviewProposal?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  hasUnreadWhispers = false, 
  hasUnreadChecklist = false,
  hasReviewProposal = false 
}) => {
  const location = useLocation();
  
  // Calculate active index based on route path
  const getActiveIndex = () => {
    switch (location.pathname) {
      case '/':
        return 0;
      case '/checklist':
        return 1;
      case '/tasks':
        return 2;
      case '/whispers':
        return 3;
      case '/review':
        return 4;
      default:
        return 0;
    }
  };

  const activeIndex = getActiveIndex();

  return (
    <nav className="fixed bottom-5 left-4 right-4 z-50 glass-panel rounded-[24px] shadow-lg border border-white/50 max-w-md mx-auto p-1.5 select-none">
      <div className="flex justify-around items-center h-12 relative">
        
        {/* Apple style sliding active pill background (5 items, 20% width each) */}
        <div 
          className="absolute top-0 bottom-0 rounded-[18px] bg-white/70 shadow-sm border border-white/60 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] z-0"
          style={{
            left: `${activeIndex * 20 + 1}%`,
            width: '18%',
          }}
        />

        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-1/5 h-full relative z-10 transition-colors duration-300 ${
            activeIndex === 0 ? 'text-rose-600 font-bold scale-105' : 'text-gray-400 hover:text-rose-400'
          }`}
        >
          <Heart size={18} fill={activeIndex === 0 ? "currentColor" : "none"} className="transition-transform duration-300 active:scale-125" />
          <span className="text-[9px] font-semibold mt-0.5">在一起</span>
        </Link>

        <Link 
          to="/checklist" 
          className={`flex flex-col items-center justify-center w-1/5 h-full relative z-10 transition-colors duration-300 ${
            activeIndex === 1 ? 'text-rose-600 font-bold scale-105' : 'text-gray-400 hover:text-rose-400'
          }`}
        >
          <ListTodo size={18} className="transition-transform duration-300 active:scale-125" />
          {hasUnreadChecklist && (
            <span className="absolute top-1.5 right-4 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
          )}
          {hasUnreadChecklist && (
            <span className="absolute top-1.5 right-4 w-1.5 h-1.5 bg-rose-500 rounded-full" />
          )}
          <span className="text-[9px] font-semibold mt-0.5">恋爱清单</span>
        </Link>
        
        <Link 
          to="/tasks" 
          className={`flex flex-col items-center justify-center w-1/5 h-full relative z-10 transition-colors duration-300 ${
            activeIndex === 2 ? 'text-rose-600 font-bold scale-105' : 'text-gray-400 hover:text-rose-400'
          }`}
        >
          <Compass size={18} className="transition-transform duration-300 active:scale-125" />
          <span className="text-[9px] font-semibold mt-0.5">打卡河流</span>
        </Link>
        
        <Link 
          to="/whispers" 
          className={`flex flex-col items-center justify-center w-1/5 h-full relative z-10 transition-colors duration-300 ${
            activeIndex === 3 ? 'text-rose-600 font-bold scale-105' : 'text-gray-400 hover:text-rose-400'
          }`}
        >
          <MessageSquare size={18} fill={activeIndex === 3 ? "currentColor" : "none"} className="transition-transform duration-300 active:scale-125" />
          {hasUnreadWhispers && (
            <span className="absolute top-1.5 right-4 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
          )}
          {hasUnreadWhispers && (
            <span className="absolute top-1.5 right-4 w-1.5 h-1.5 bg-rose-500 rounded-full" />
          )}
          <span className="text-[9px] font-semibold mt-0.5">心事箱</span>
        </Link>
        
        <Link 
          to="/review" 
          className={`flex flex-col items-center justify-center w-1/5 h-full relative z-10 transition-colors duration-300 ${
            activeIndex === 4 ? 'text-rose-600 font-bold scale-105' : 'text-gray-400 hover:text-rose-400'
          }`}
        >
          <Calendar size={18} className="transition-transform duration-300 active:scale-125" />
          {hasReviewProposal && (
            <span className="absolute top-1.5 right-4 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
          )}
          {hasReviewProposal && (
            <span className="absolute top-1.5 right-4 w-1.5 h-1.5 bg-rose-500 rounded-full" />
          )}
          <span className="text-[9px] font-semibold mt-0.5">约定日</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
