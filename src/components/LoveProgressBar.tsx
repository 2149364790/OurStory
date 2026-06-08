import React from 'react';
import { Heart } from 'lucide-react';

interface LoveProgressBarProps {
  count: number;
  label: string;
}

export const LoveProgressBar: React.FC<LoveProgressBarProps> = ({ count, label }) => {
  const progressPercentage = Math.min((count / 100) * 100, 100);
  return (
    <div className="space-y-1.5 mb-3.5 bg-rose-50/30 p-3 rounded-2xl border border-rose-100/50">
      <div className="flex justify-between items-center text-[10px] font-bold text-rose-800">
        <span className="flex items-center space-x-1">
          <Heart size={12} className="text-rose-500 animate-pulse" fill="currentColor" />
          <span>{label}：喜欢 Ta 的第 {count} / 100 个理由</span>
        </span>
        <span className="bg-rose-100/60 px-1.5 py-0.2 rounded-full text-rose-600 font-mono text-[9px]">
          {progressPercentage.toFixed(0)}%
        </span>
      </div>
      <div className="relative w-full h-2 bg-rose-100/40 rounded-full border border-rose-200/30 overflow-visible">
        {/* Filled progress track */}
        <div 
          className="h-full rounded-full bg-gradient-to-r from-pink-300 via-rose-400 to-rose-500 transition-all duration-700 ease-out relative"
          style={{ width: `${progressPercentage}%` }}
        >
          {/* Heart knob sliding at the end of progress */}
          {count > 0 && (
            <div 
              className="absolute right-[-6px] top-1/2 transform -translate-y-1/2 z-10 transition-all duration-700"
            >
              <Heart size={12} className="text-rose-600 filter drop-shadow-sm animate-heartbeat" fill="currentColor" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoveProgressBar;
