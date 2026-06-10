import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import confetti from 'canvas-confetti';

interface RoleSelectionModalProps {
  userId: string;
  onComplete: (gender: 'prince' | 'princess') => void;
}

// Floating star particle config
const starParticles = Array.from({ length: 18 }).map((_, i) => ({
  id: i,
  left: Math.random() * 100,
  size: Math.random() * 10 + 6,
  delay: Math.random() * -15,
  duration: Math.random() * 8 + 10,
  opacity: Math.random() * 0.3 + 0.15,
  drift: Math.random() * 60 - 30,
  emoji: ['✨', '⭐', '💫', '🌟', '💖'][Math.floor(Math.random() * 5)],
}));

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ userId, onComplete }) => {
  const [selectedRole, setSelectedRole] = useState<'prince' | 'princess' | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    if (!selectedRole || saving) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ gender: selectedRole })
        .eq('id', userId);

      if (error) throw error;

      // Fire confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#a78bfa', '#f472b6', '#fbbf24', '#c084fc', '#fb7185'],
      });

      setConfirmed(true);

      // Delay then close
      setTimeout(() => {
        onComplete(selectedRole);
      }, 1800);
    } catch (err: any) {
      console.error('Error saving role:', err);
      alert('选择失败，请重试: ' + err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center select-none animate-fade-in">
      {/* Full-screen gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/95 via-pink-900/90 to-rose-900/95 backdrop-blur-sm" />

      {/* Floating star particles */}
      {starParticles.map((p) => (
        <div
          key={p.id}
          className="absolute pointer-events-none animate-login-heart"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--op': p.opacity,
            '--drift': `${p.drift}px`,
            '--rot': `${Math.random() * 60 - 30}deg`,
          } as React.CSSProperties}
        >
          {p.emoji}
        </div>
      ))}

      {/* Main content */}
      <div className="relative z-10 w-full max-w-sm px-6 space-y-8">
        {!confirmed ? (
          <>
            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-extrabold text-white tracking-wide">
                选择你在故事里的角色
              </h1>
              <p className="text-sm text-pink-200/80 font-medium">
                这个选择只有一次哦~
              </p>
            </div>

            {/* Role Cards */}
            <div className="flex gap-4">
              {/* Prince Card */}
              <button
                type="button"
                onClick={() => setSelectedRole('prince')}
                className={`flex-1 rounded-3xl p-6 flex flex-col items-center space-y-3 transition-all duration-500 ${
                  selectedRole === 'prince'
                    ? 'bg-gradient-to-br from-blue-400/80 to-purple-500/80 border-4 border-purple-300 scale-105 shadow-[0_0_30px_rgba(167,139,250,0.8)]'
                    : 'bg-gradient-to-br from-blue-400/40 to-purple-500/40 border-2 border-white/10 hover:border-purple-300/50 hover:scale-[1.03]'
                }`}
              >
                <span className="text-6xl animate-[swing_3s_ease-in-out_infinite]">👑</span>
                <span className="text-lg font-extrabold text-white tracking-wider">王子</span>
                {selectedRole === 'prince' && (
                  <span className="text-xs text-purple-200 font-bold animate-pulse">已选中 ✨</span>
                )}
              </button>

              {/* Princess Card */}
              <button
                type="button"
                onClick={() => setSelectedRole('princess')}
                className={`flex-1 rounded-3xl p-6 flex flex-col items-center space-y-3 transition-all duration-500 ${
                  selectedRole === 'princess'
                    ? 'bg-gradient-to-br from-pink-400/80 to-rose-500/80 border-4 border-pink-300 scale-105 shadow-[0_0_30px_rgba(244,114,182,0.8)]'
                    : 'bg-gradient-to-br from-pink-400/40 to-rose-500/40 border-2 border-white/10 hover:border-pink-300/50 hover:scale-[1.03]'
                }`}
              >
                <span className="text-6xl animate-[swing_3s_ease-in-out_infinite_0.5s]">👸</span>
                <span className="text-lg font-extrabold text-white tracking-wider">公主</span>
                {selectedRole === 'princess' && (
                  <span className="text-xs text-pink-200 font-bold animate-pulse">已选中 ✨</span>
                )}
              </button>
            </div>

            {/* Confirm button */}
            {selectedRole && (
              <div className="animate-slide-up">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white font-extrabold text-base tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-lg"
                >
                  {saving ? '正在记录...' : `确认选择 ${selectedRole === 'prince' ? '👑 王子' : '👸 公主'}`}
                </button>
              </div>
            )}
          </>
        ) : (
          /* Confirmed celebration screen */
          <div className="text-center space-y-4 animate-slide-up">
            <span className="text-7xl block animate-bounce">
              {selectedRole === 'prince' ? '👑' : '👸'}
            </span>
            <h2 className="text-2xl font-extrabold text-white">
              欢迎，{selectedRole === 'prince' ? '王子' : '公主'}！
            </h2>
            <p className="text-pink-200/90 text-sm font-medium">
              你的故事从这里开始 💖
            </p>
          </div>
        )}
      </div>

      {/* Swing animation keyframes (injected via style tag) */}
      <style>{`
        @keyframes swing {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  );
};

export default RoleSelectionModal;
