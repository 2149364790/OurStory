import React from 'react';

export const PrinceCrownIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => {
  return (
    <svg
      className={`${className} inline-block filter drop-shadow-[0_1.5px_3px_rgba(167,139,250,0.5)] crown-animate`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="crownGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF9E6" />
          <stop offset="30%" stopColor="#FFE066" />
          <stop offset="70%" stopColor="#F5A623" />
          <stop offset="100%" stopColor="#D48100" />
        </linearGradient>
        <linearGradient id="heartRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF758F" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
        <linearGradient id="basePurple" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>
      
      <style>{`
        @keyframes crownFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-2px) rotate(3deg); }
        }
        .crown-animate {
          animation: crownFloat 3s ease-in-out infinite;
          transform-origin: bottom center;
        }
      `}</style>
      
      {/* Crown base band */}
      <path
        d="M4 16.5C4 15.9477 4.44772 15.5 5 15.5H19C19.5523 15.5 20 15.9477 20 16.5V17.5C20 18.0523 19.5523 18.5 19 18.5H5C4.44772 18.5 4 18.0523 4 17.5V16.5Z"
        fill="url(#basePurple)"
      />
      {/* Base highlights */}
      <circle cx="7" cy="17" r="0.75" fill="#FFF" opacity="0.9" />
      <circle cx="12" cy="17" r="0.75" fill="#FFF" opacity="0.9" />
      <circle cx="17" cy="17" r="0.75" fill="#FFF" opacity="0.9" />

      {/* Main crown body with curved peaks */}
      <path
        d="M4 14.5
           C4.3 12.3 4.7 10.0 5.0 8.0
           C5.1 7.3 6.0 7.2 6.3 7.8
           L9.2 11.5
           C9.5 11.9 10.1 11.9 10.4 11.5
           L11.6 5.0
           C11.7 4.3 12.3 4.3 12.4 5.0
           L13.6 11.5
           C13.9 11.9 14.5 11.9 14.8 11.5
           L17.7 7.8
           C18.0 7.2 18.9 7.3 19.0 8.0
           C19.3 10.0 19.7 12.3 20.0 14.5
           H4Z"
        fill="url(#crownGold)"
      />

      {/* Jewels on outer peaks */}
      <circle cx="5" cy="7.5" r="1" fill="#818CF8" />
      <circle cx="19" cy="7.5" r="1" fill="#818CF8" />

      {/* Center glowing star on center peak */}
      <path
        d="M12 2.0 L12.8 3.3 L14.3 3.8 L12.8 4.3 L12 5.6 L11.2 4.3 L9.7 3.8 L11.2 3.3 Z"
        fill="#FFE066"
        className="animate-pulse"
      />

      {/* Heart at the center of crown body */}
      <path
        d="M12 14.0C12 14.0 9.8 12.0 9.8 10.8C9.8 9.8 10.6 9.0 11.5 9.0C12.0 9.0 12.2 9.3 12.2 9.3C12.2 9.3 12.4 9.0 12.9 9.0C13.8 9.0 14.6 9.8 14.6 10.8C14.6 12.0 12 14.0 12 14.0Z"
        fill="url(#heartRed)"
      />
    </svg>
  );
};

export const PrincessTiaraIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => {
  return (
    <svg
      className={`${className} inline-block filter drop-shadow-[0_1.5px_3px_rgba(244,114,182,0.5)] tiara-animate`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="tiaraPink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF1F2" />
          <stop offset="35%" stopColor="#FBCFE8" />
          <stop offset="70%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="heartRose" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE4E6" />
          <stop offset="50%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#F43F5E" />
        </linearGradient>
      </defs>

      <style>{`
        @keyframes tiaraFloat {
          0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(-2px) scale(1.04) rotate(-2deg); }
        }
        .tiara-animate {
          animation: tiaraFloat 3s ease-in-out infinite;
          transform-origin: bottom center;
        }
      `}</style>

      {/* Headband base line */}
      <path
        d="M3 18C7.5 19.5 16.5 19.5 21 18"
        stroke="url(#tiaraPink)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Side arches */}
      <path
        d="M4.5 17.5C5.8 14.5 7.8 13 9.3 13C10.8 13 11.2 15 12 17.5"
        stroke="url(#tiaraPink)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M19.5 17.5C18.2 14.5 16.2 13 14.7 13C13.2 13 12.8 15 12 17.5"
        stroke="url(#tiaraPink)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Central taller arch */}
      <path
        d="M7.5 17.5C8.5 10.5 10 9 12 9C14 9 15.5 10.5 16.5 17.5"
        stroke="url(#tiaraPink)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Jewels on peaks */}
      <circle cx="9.3" cy="13" r="0.75" fill="#FB7185" />
      <circle cx="14.7" cy="13" r="0.75" fill="#FB7185" />
      
      {/* Sparkle star at the top center peak */}
      <path
        d="M12 6.0 L12.5 7.0 L13.5 7.0 L12.7 7.7 L13 8.7 L12 8.0 L11 8.7 L11.3 7.7 L10.5 7.0 L11.5 7.0 Z"
        fill="#FFE066"
        className="animate-pulse"
      />

      {/* Romantic Rose-Heart in the center */}
      <path
        d="M12 14.8C12 14.8 10.3 13.3 10.3 12.0C10.3 11.0 11.0 10.3 11.8 10.3C12.2 10.3 12.4 10.5 12.1 10.5C12.1 10.5 12.3 10.3 12.7 10.3C13.5 10.3 14.2 11.0 14.2 12.0C14.2 13.3 12 14.8 12 14.8Z"
        fill="url(#heartRose)"
      />
    </svg>
  );
};

interface RoleBadgeProps {
  gender: 'prince' | 'princess';
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ gender, className = "" }) => {
  const isPrince = gender === 'prince';

  return (
    <div
      className={`role-badge-container mt-2 flex items-center space-x-1.5 px-3 py-1 rounded-full border shadow-sm select-none transition-all duration-300 hover:scale-105 active:scale-95 ${
        isPrince
          ? 'bg-gradient-to-r from-purple-50/90 to-indigo-50/90 hover:from-purple-100 hover:to-indigo-100 dark:from-purple-950/40 dark:to-indigo-950/40 text-purple-600 dark:text-purple-300 border-purple-200/70 hover:border-purple-300 hover:shadow-purple-100/80 dark:hover:shadow-none'
          : 'bg-gradient-to-r from-rose-50/90 to-pink-50/90 hover:from-rose-100 hover:to-pink-100 dark:from-rose-950/40 dark:to-pink-950/40 text-rose-600 dark:text-rose-300 border-rose-200/70 hover:border-rose-300 hover:shadow-rose-100/80 dark:hover:shadow-none'
      } ${className}`}
    >
      {isPrince ? (
        <>
          <PrinceCrownIcon className="w-4 h-4 flex-shrink-0" />
          <span className="text-[10px] font-extrabold tracking-wide">王子</span>
        </>
      ) : (
        <>
          <PrincessTiaraIcon className="w-4 h-4 flex-shrink-0" />
          <span className="text-[10px] font-extrabold tracking-wide">公主</span>
        </>
      )}
    </div>
  );
};

export default RoleBadge;
