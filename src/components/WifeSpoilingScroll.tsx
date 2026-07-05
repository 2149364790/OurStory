import React, { useState, useEffect, useRef } from 'react';
import { Heart, X, Award, CheckCircle2, Plus, Trash2, Edit3, Save } from 'lucide-react';

interface Rule {
  id: number | string;
  text: string;
}

const DEFAULT_RULES: Rule[] = [
  { id: 1, text: '不准挂老婆电话' },
  { id: 2, text: '不准对老婆发脾气' },
  { id: 3, text: '不准在外面勾三搭四' },
  { id: 4, text: '不能敷衍老婆' },
  { id: 5, text: '老婆生气要哄' },
  { id: 6, text: '纪念日要给老婆准备礼物' },
  { id: 7, text: '出门及时跟老婆汇报' },
  { id: 8, text: '答应老婆的事要办到' },
  { id: 9, text: '当老婆无聊时要陪护' },
  { id: 10, text: '挣钱要给老婆花' }
];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  tx: number;
  ty: number;
}

const ScrollSvgIcon: React.FC<{ className?: string; isCompleted: boolean }> = ({ className = "w-6 h-6", isCompleted }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFDF0" />
        <stop offset="40%" stopColor="#F5A623" />
        <stop offset="100%" stopColor="#D48100" />
      </linearGradient>
      <linearGradient id="paperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFDF7" />
        <stop offset="100%" stopColor="#FAF2DB" />
      </linearGradient>
      <linearGradient id="roseRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF758F" />
        <stop offset="100%" stopColor="#E11D48" />
      </linearGradient>
      <linearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    {/* Background Glow */}
    <circle cx="32" cy="32" r="28" fill={isCompleted ? "#10B981" : "#F43F5E"} opacity="0.06" className="animate-pulse" />

    {/* Left scroll roller shaft */}
    <rect x="10" y="8" width="5" height="48" rx="2" fill="url(#goldGrad)" stroke="#B37000" strokeWidth="1" />
    <circle cx="12.5" cy="8" r="3.5" fill="#FFE066" stroke="#9E6000" strokeWidth="0.8" />
    <circle cx="12.5" cy="56" r="3.5" fill="#FFE066" stroke="#9E6000" strokeWidth="0.8" />
    
    {/* Right scroll roller shaft */}
    <rect x="49" y="8" width="5" height="48" rx="2" fill="url(#goldGrad)" stroke="#B37000" strokeWidth="1" />
    <circle cx="51.5" cy="8" r="3.5" fill="#FFE066" stroke="#9E6000" strokeWidth="0.8" />
    <circle cx="51.5" cy="56" r="3.5" fill="#FFE066" stroke="#9E6000" strokeWidth="0.8" />

    {/* Paper body */}
    <rect x="15" y="12" width="34" height="40" rx="1" fill="url(#paperGrad)" stroke="#D4C4A8" strokeWidth="0.8" />
    
    {/* Ornamental border on paper */}
    <rect x="18" y="15" width="28" height="34" rx="0.5" fill="none" stroke="#D4C4A8" strokeWidth="0.5" strokeDasharray="2 1" opacity="0.6" />

    {/* Heart or check icon in the center */}
    {isCompleted ? (
      <>
        {/* Checkmark icon indicating completed review */}
        <circle cx="32" cy="32" r="10" fill="url(#checkGrad)" />
        <path d="M28 32 L31 35 L37 29" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        {/* Glowing Heart indicating loving duties */}
        <path d="M32 38 C32 38 25 32 25 28 C25 25 27.5 22.5 30.5 22.5 C31.8 22.5 32 23.5 32 23.5 C32 23.5 32.2 22.5 33.5 22.5 C36.5 22.5 39 25 39 28 C39 32 32 38 32 38 Z" fill="url(#roseRibbon)" />
        <circle cx="28" cy="22" r="1" fill="#FFF" opacity="0.6" className="animate-ping" />
      </>
    )}

    {/* Tiny ribbon ties */}
    <rect x="30" y="12" width="4" height="40" fill={isCompleted ? "#059669" : "#E11D48"} opacity="0.1" />
  </svg>
);

export const WifeSpoilingScroll: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompletedToday, setIsCompletedToday] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  // Custom rules dynamic list state
  const [rules, setRules] = useState<Rule[]>(() => {
    const saved = localStorage.getItem('wife_spoiling_rules');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to default rules
      }
    }
    return DEFAULT_RULES;
  });

  const [isEditingRules, setIsEditingRules] = useState(false);
  const [newRuleText, setNewRuleText] = useState('');
  
  // Hiding state for 10s
  const [isHiddenTemp, setIsHiddenTemp] = useState(false);
  const [showHideToast, setShowHideToast] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);

  // Position state (defaults to top-right edge)
  const [position, setPosition] = useState({ x: window.innerWidth - 64, y: window.innerHeight * 0.25 });
  const [shouldAnimateSnapping, setShouldAnimateSnapping] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  
  const pressTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const pressStartTimeRef = useRef<number>(0);
  const longPressDuration = 800; // ms required to trigger long press hide

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const lastChecked = localStorage.getItem('wife_spoiling_checked_date');
    if (lastChecked === todayStr) {
      setIsCompletedToday(true);
    }
  }, [todayStr]);

  // Handle Window Resize to keep the button inside constraints
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const isRight = prev.x > window.innerWidth / 2;
        const newX = isRight ? window.innerWidth - 60 : 12;
        const newY = Math.max(80, Math.min(window.innerHeight - 150, prev.y));
        return { x: newX, y: newY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      clearPressTimers();
    };
  }, []);

  const clearPressTimers = () => {
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    pressTimerRef.current = null;
    progressTimerRef.current = null;
  };

  // Helper to get client coords for mouse or touch
  const getCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      if (e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      if ('changedTouches' in e && e.changedTouches.length > 0) {
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      }
    }
    return { x: (e as React.MouseEvent | MouseEvent).clientX, y: (e as React.MouseEvent | MouseEvent).clientY };
  };

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoords(e);
    dragStartRef.current = { x: coords.x, y: coords.y };
    posStartRef.current = { x: position.x, y: position.y };
    hasMovedRef.current = false;
    setShouldAnimateSnapping(false);

    clearPressTimers();
    pressStartTimeRef.current = Date.now();
    setPressProgress(0);

    // Progress updates every 40ms for long-press visual
    const intervalTime = 40;
    let currentProgress = 0;
    progressTimerRef.current = window.setInterval(() => {
      currentProgress += (intervalTime / longPressDuration) * 100;
      if (currentProgress >= 100) {
        currentProgress = 100;
        window.clearInterval(progressTimerRef.current!);
      }
      setPressProgress(currentProgress);
    }, intervalTime);

    // Trigger long press hide
    pressTimerRef.current = window.setTimeout(() => {
      if (hasMovedRef.current) return;
      clearPressTimers();
      setIsHiddenTemp(true);
      setShowHideToast(true);
      setPressProgress(0);

      setTimeout(() => setShowHideToast(false), 2500);

      setTimeout(() => {
        setIsHiddenTemp(false);
      }, 10000);
    }, longPressDuration);

    window.addEventListener('mousemove', handleDragMove, { passive: false });
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchend', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    const coords = getCoords(e);
    const dx = coords.x - dragStartRef.current.x;
    const dy = coords.y - dragStartRef.current.y;
    
    if (Math.hypot(dx, dy) > 8) {
      if (!hasMovedRef.current) {
        hasMovedRef.current = true;
        clearPressTimers();
        setPressProgress(0);
      }
    }

    if (hasMovedRef.current) {
      if (e.cancelable) e.preventDefault();
      
      const newX = posStartRef.current.x + dx;
      const newY = posStartRef.current.y + dy;
      
      const boundedX = Math.max(10, Math.min(window.innerWidth - 60, newX));
      const boundedY = Math.max(60, Math.min(window.innerHeight - 120, newY));

      setPosition({ x: boundedX, y: boundedY });
    }
  };

  const handleDragEnd = () => {
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('touchmove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('touchend', handleDragEnd);

    const pressDuration = Date.now() - pressStartTimeRef.current;
    clearPressTimers();
    setPressProgress(0);

    if (hasMovedRef.current) {
      setShouldAnimateSnapping(true);
      
      const snapToRight = position.x > window.innerWidth / 2;
      const targetX = snapToRight ? window.innerWidth - 60 : 12;
      
      setPosition((prev) => ({
        x: targetX,
        y: prev.y
      }));
    } else {
      if (pressDuration < longPressDuration && pressDuration > 50) {
        setIsOpen(true);
      }
    }
  };

  const handleCheckIn = (e: React.MouseEvent) => {
    if (isCompletedToday) return;

    localStorage.setItem('wife_spoiling_checked_date', todayStr);
    setIsCompletedToday(true);

    const buttonRect = (e.target as HTMLElement).getBoundingClientRect();
    const centerX = buttonRect.left + buttonRect.width / 2;
    const centerY = buttonRect.top + buttonRect.height / 2;

    const newParticles: Particle[] = Array.from({ length: 24 }).map((_, idx) => {
      const angle = (idx * (360 / 24) * Math.PI) / 180;
      const velocity = 80 + Math.random() * 80;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;
      const colors = ['#F43F5E', '#EC4899', '#FB7185', '#F472B6', '#F5A623', '#FFE066'];
      return {
        id: Math.random(),
        x: centerX - 10,
        y: centerY - 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 10,
        tx,
        ty
      };
    });
    setParticles(newParticles);

    setTimeout(() => {
      setParticles([]);
    }, 1200);
  };

  // Add rule function
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleText.trim()) return;

    const updated = [...rules, { id: Date.now().toString(), text: newRuleText.trim() }];
    setRules(updated);
    localStorage.setItem('wife_spoiling_rules', JSON.stringify(updated));
    setNewRuleText('');
  };

  // Delete rule function
  const handleDeleteRule = (id: number | string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    localStorage.setItem('wife_spoiling_rules', JSON.stringify(updated));
  };

  if (isHiddenTemp) {
    return (
      <>
        {showHideToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1200] max-w-xs w-full px-4 animate-fade-in pointer-events-none">
            <div className="glass-panel py-2.5 px-4 rounded-xl shadow-lg border border-rose-200 bg-rose-50/95 text-rose-800 text-xs font-bold flex items-center justify-center space-x-2">
              <span>🙈 秘籍已隐蔽 10 秒...</span>
            </div>
          </div>
        )}
      </>
    );
  }

  const radius = 22;
  const stroke = 3;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (pressProgress / 100) * circumference;

  // Convert numbers to Chinese text count helper
  const getChineseNumber = (num: number): string => {
    const dict = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    if (num <= 10) return dict[num];
    if (num < 20) return "十" + (num % 10 !== 0 ? dict[num % 10] : "");
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const single = num % 10;
      return dict[ten] + "十" + (single !== 0 ? dict[single] : "");
    }
    return num.toString();
  };

  return (
    <>
      {/* Floating Scroll Button (Prince's entry point) */}
      <div 
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: pressProgress > 0 ? `scale(${1 - (pressProgress / 100) * 0.12})` : undefined,
          transition: shouldAnimateSnapping ? 'left 0.3s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
        }}
        className="fixed z-[90] flex flex-col items-center select-none touch-none"
      >
        <button
          onMouseDown={handlePressStart}
          onTouchStart={handlePressStart}
          className={`relative p-1.5 rounded-full backdrop-blur-md border shadow-xl cursor-grab active:cursor-grabbing ${
            isCompletedToday
              ? 'bg-gradient-to-tr from-amber-50 to-white text-amber-700 border-amber-300 shadow-amber-100/50'
              : 'bg-white text-rose-500 border-rose-200 hover:border-rose-300 shadow-rose-100/50'
          }`}
          title="可拖拽。长按隐蔽10秒，单击查看"
        >
          {pressProgress > 0 && (
            <svg className="absolute inset-0 w-full h-full -rotate-90 z-20 pointer-events-none" viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
              <circle
                stroke={isCompletedToday ? "#D97706" : "#E11D48"}
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>
          )}

          {!isCompletedToday && pressProgress === 0 && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 border border-white rounded-full animate-ping z-30" />
          )}
          {!isCompletedToday && pressProgress === 0 && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 border border-white rounded-full z-30" />
          )}

          <div className="w-10 h-10 flex items-center justify-center pointer-events-none">
            <ScrollSvgIcon className="w-9 h-9" isCompleted={isCompletedToday} />
          </div>

          <span className="absolute right-14 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-rose-950/90 text-white text-[9px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none shadow-md backdrop-blur-xs flex flex-col items-center gap-0.5 z-45">
            <span className="flex items-center gap-1">📜 {isCompletedToday ? '今日已省察' : '宠妻自省录'}</span>
            <span className="text-[7.5px] text-rose-200/80 font-normal">⏱️ 长按隐蔽 | 🖐️ 自由拖拽</span>
          </span>
        </button>
      </div>

      {/* Scroll Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="scroll-container max-w-sm w-full relative overflow-hidden transition-all duration-500 animate-scroll-open">
            {/* Ancient Scroll Top Handle Roller */}
            <div className="relative h-4 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 rounded-full shadow-md z-20 flex justify-between px-6">
              <div className="w-2.5 h-6 -mt-1 bg-amber-500 rounded-full shadow-inner border border-amber-600" />
              <div className="w-2.5 h-6 -mt-1 bg-amber-500 rounded-full shadow-inner border border-amber-600" />
            </div>

            {/* Scroll Content Paper Body */}
            <div className="mx-2 bg-gradient-to-b from-[#FAF6E9] to-[#F3EAD3] border-x-4 border-amber-900/40 px-6 py-7 shadow-2xl relative min-h-[380px] flex flex-col justify-between">
              {/* Elegant Close Button */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsEditingRules(false);
                }}
                className="absolute top-3 right-3 p-1 rounded-full text-amber-900/60 hover:text-amber-900 hover:bg-amber-950/5 transition z-30"
              >
                <X size={16} />
              </button>

              {/* Scroll Inner Decorative Borders */}
              <div className="absolute inset-2 border border-amber-800/10 pointer-events-none rounded-sm" />
              <div className="absolute inset-3 border border-dashed border-amber-800/20 pointer-events-none rounded-sm" />

              {/* Header */}
              <div className="text-center space-y-1.5 pb-3 border-b border-amber-900/20 relative z-10">
                <div className="flex justify-center items-center space-x-1.5">
                  <Award className="text-amber-700 w-5 h-5 animate-bounce" />
                  <h3 className="font-handwritten text-xl font-extrabold text-amber-950 tracking-widest">
                    宠老婆{getChineseNumber(rules.length)}条守则
                  </h3>
                  <Award className="text-amber-700 w-5 h-5 animate-bounce" />
                </div>
                <p className="text-[10px] text-amber-800/70 font-semibold tracking-wider font-serif">
                  —— 王子每日三省吾身之宝典 ——
                </p>
              </div>

              {/* Rules List Container */}
              <div className="py-4 flex-1 space-y-2.5 relative z-10 max-h-[300px] overflow-y-auto pr-1">
                {rules.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="group/rule flex items-start justify-between py-1.5 px-2 rounded-lg hover:bg-amber-950/5 transition duration-200"
                  >
                    <div className="flex items-start space-x-2.5 flex-1 pr-2">
                      <span className="font-serif font-extrabold text-amber-700 text-xs mt-0.5 min-w-[20px] text-right">
                        {idx + 1}.
                      </span>
                      <span className="text-xs font-bold text-amber-950 font-serif leading-relaxed">
                        {rule.text}
                      </span>
                    </div>
                    {isEditingRules && (
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 rounded text-rose-600 hover:bg-rose-50 transition"
                        title="删除该守则"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add Rule Inline Form */}
                {isEditingRules && (
                  <form onSubmit={handleAddRule} className="flex items-center gap-1.5 mt-4 p-1.5 bg-amber-950/5 rounded-xl border border-amber-900/10 animate-fade-in">
                    <input
                      type="text"
                      value={newRuleText}
                      onChange={(e) => setNewRuleText(e.target.value)}
                      placeholder="写下新的宠妻守则..."
                      className="flex-1 text-xs border border-amber-900/20 rounded-lg px-2.5 py-1.5 bg-white/70 text-amber-950 placeholder-amber-800/40 focus:outline-none focus:ring-1 focus:ring-amber-700"
                    />
                    <button
                      type="submit"
                      className="p-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg transition"
                      title="添加守则"
                    >
                      <Plus size={14} />
                    </button>
                  </form>
                )}
              </div>

              {/* Footer Actions / Self Checkin / Rule Editor Toggle */}
              <div className="pt-3 border-t border-amber-900/20 relative z-10 space-y-2">
                {/* Rule manager button */}
                <div className="flex justify-end px-1">
                  <button
                    onClick={() => setIsEditingRules(!isEditingRules)}
                    className="text-[10px] text-amber-800/60 hover:text-amber-800 font-bold flex items-center gap-1 py-0.5 px-2 rounded-md hover:bg-amber-950/5 transition"
                  >
                    {isEditingRules ? (
                      <>
                        <Save size={10} />
                        <span>保存退出</span>
                      </>
                    ) : (
                      <>
                        <Edit3 size={10} />
                        <span>编辑增删守则</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={handleCheckIn}
                  disabled={isCompletedToday || isEditingRules}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold tracking-widest shadow-md transition-all duration-300 transform active:scale-95 flex items-center justify-center space-x-2 border ${
                    isCompletedToday
                      ? 'bg-amber-100/60 border-amber-200 text-amber-700 cursor-not-allowed shadow-none'
                      : isEditingRules
                      ? 'bg-amber-200/40 border-amber-300/40 text-amber-600/40 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white border-amber-800 hover:shadow-lg'
                  }`}
                >
                  {isCompletedToday ? (
                    <>
                      <CheckCircle2 size={14} className="text-amber-700" />
                      <span>今日已完成省察 💯</span>
                    </>
                  ) : (
                    <>
                      <Heart size={13} fill="currentColor" className="text-rose-200 animate-pulse" />
                      <span>今日已自省，坚决执行！</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Ancient Scroll Bottom Handle Roller */}
            <div className="relative h-4 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 rounded-full shadow-md z-20 flex justify-between px-6">
              <div className="w-2.5 h-6 -mt-1 bg-amber-500 rounded-full shadow-inner border border-amber-600" />
              <div className="w-2.5 h-6 -mt-1 bg-amber-500 rounded-full shadow-inner border border-amber-600" />
            </div>
          </div>
        </div>
      )}

      {/* Floating Particles for Click Celebration */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="fixed pointer-events-none z-[2000] animate-checkin-particle"
          style={{
            left: p.x,
            top: p.y,
            color: p.color,
            fontSize: `${p.size}px`,
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
          } as React.CSSProperties}
        >
          ❤️
        </div>
      ))}
    </>
  );
};
