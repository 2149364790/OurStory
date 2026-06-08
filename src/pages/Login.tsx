import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [quote, setQuote] = useState('两人的私密专属回忆录');
  
  // Floating particles
  const [particles, setParticles] = useState<{
    id: number;
    left: number;
    size: number;
    delay: number;
    duration: number;
    op: number;
    rot: number;
    drift: number;
    color: string;
  }[]>([]);
  
  // Heart bursts on button click
  const [bursts, setBursts] = useState<{ id: number; tx: number; ty: number; scale: number; rot: number }[]>([]);

  useEffect(() => {
    // Randomize romance quote on mount
    const SWEET_QUOTES = [
      "两人的私密专属回忆录 💑",
      "今天也是超级想你的一天 💖",
      "让每一帧甜蜜都有迹可循 ✨",
      "记录我们的故事，锁进时光里 🔒",
      "解锁属于我们两个人的宇宙 🌌",
      "愿得一人心，白首不相离 🌹",
      "爱是细水长流的陪伴 🌸",
      "你是我今天、明天、以及未来的所有期待 🎈"
    ];
    const randomIndex = Math.floor(Math.random() * SWEET_QUOTES.length);
    setQuote(SWEET_QUOTES[randomIndex]);

    // Generate floating hearts
    const newParticles = Array.from({ length: 22 }).map((_, i) => {
      const isRose = Math.random() > 0.5;
      return {
        id: i,
        left: Math.random() * 100, // percentage width
        size: Math.random() * 16 + 10, // 10px to 26px
        delay: Math.random() * -20, // starts fully distributed on screen
        duration: Math.random() * 10 + 10, // 10s to 20s drift speed
        op: Math.random() * 0.25 + 0.15, // Opacity
        rot: Math.random() * 90 - 45, // Rotation direction at the end
        drift: Math.random() * 80 - 40, // Horizontal drift offset in px
        color: isRose ? 'text-rose-400' : 'text-pink-400',
      };
    });
    setParticles(newParticles);
  }, []);

  const triggerHeartBurst = () => {
    const newBursts = Array.from({ length: 12 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.4;
      const distance = Math.random() * 90 + 70; // explosion spread radius
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 25; // upwards bias
      return {
        id: Date.now() + i,
        tx,
        ty,
        scale: Math.random() * 0.5 + 0.6,
        rot: Math.random() * 90 - 45,
      };
    });
    setBursts(newBursts);
    setTimeout(() => {
      setBursts([]);
    }, 950);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHeartBurst();
    setLoading(true);
    setError('');
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message === 'Invalid login credentials') {
          setError('账号或密码错误，请检查后再试哦~');
        } else {
          setError(signInError.message);
        }
      }
    } catch (err: any) {
      setError(err?.message || '登录遇到了一些问题');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sunset-theme px-4 relative overflow-hidden">
      {/* Background drifting hearts */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none animate-login-heart"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--op': p.op,
            '--rot': `${p.rot}deg`,
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        >
          <Heart fill="currentColor" className={`w-full h-full ${p.color}`} />
        </div>
      ))}
      
      {/* Ambient floating glowing light blobs */}
      <div className="absolute w-80 h-80 bg-pink-300/25 rounded-full blur-3xl -top-20 -left-20 animate-login-blob pointer-events-none"></div>
      <div className="absolute w-96 h-96 bg-amber-100/20 rounded-full blur-3xl -bottom-20 -right-20 animate-login-blob pointer-events-none" style={{ animationDelay: '-6s' }}></div>
      <div className="absolute w-72 h-72 bg-purple-300/15 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-login-blob pointer-events-none" style={{ animationDelay: '-12s' }}></div>

      {/* Main Glass Card */}
      <div className="w-full max-w-sm glass-panel p-8 rounded-3xl shadow-xl z-10 border border-white/60 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-400/10 hover:translate-y-[-2px]">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="relative w-20 h-20 mb-3 flex items-center justify-center group">
            {/* Soft pink glow rings */}
            <div className="absolute inset-0 bg-rose-400/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute inset-2 bg-pink-200/40 rounded-full blur-md animate-pulse" style={{ animationDuration: '3.5s' }}></div>
            
            {/* White Crystal Icon Wrapper */}
            <div className="relative w-16 h-16 bg-white/80 rounded-2xl shadow-md border border-white/80 flex items-center justify-center z-10 transition-transform duration-500 group-hover:scale-105">
              {/* Floating dual hearts inside the crystal wrapper */}
              <div className="relative w-12 h-12 flex items-center justify-center">
                {/* Back heart - larger, lighter, beats slower */}
                <Heart
                  size={28}
                  fill="rgba(244, 63, 94, 0.45)"
                  className="absolute text-pink-300 pointer-events-none"
                  style={{
                    animation: 'login-heart-pulse-slow 2.4s ease-in-out infinite',
                  }}
                />
                {/* Front heart - smaller, bright red, beats faster */}
                <Heart
                  size={24}
                  fill="currentColor"
                  className="absolute text-rose-500 pointer-events-none z-20"
                  style={{
                    animation: 'login-heart-pulse-fast 1.6s ease-in-out infinite',
                    animationDelay: '0.2s',
                  }}
                />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-800 to-pink-700 bg-clip-text text-transparent tracking-widest font-sans">
            CoupleSpace
          </h1>
          <p className="text-[13px] text-rose-600/80 mt-1.5 font-medium transition-all duration-500 animate-fade-in text-center px-2">
            {quote}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50/90 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 mb-5 font-semibold shadow-sm animate-shake-swing">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email field */}
          <div>
            <label className="block text-xs font-bold text-rose-800/80 mb-1.5 ml-1 select-none">专属邮箱</label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-rose-400/80 group-focus-within:text-rose-600 transition-colors duration-300">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="him@couplespace.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-rose-950 placeholder-rose-300/80 text-sm focus:border-rose-400 focus:bg-white/80 focus:ring-4 focus:ring-rose-200/20"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-bold text-rose-800/80 mb-1.5 ml-1 select-none">专属密码</label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-rose-400/80 group-focus-within:text-rose-600 transition-colors duration-300">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入您的密码"
                className="w-full pl-10 pr-10 py-3 rounded-2xl glass-input text-rose-950 placeholder-rose-300/80 text-sm focus:border-rose-400 focus:bg-white/80 focus:ring-4 focus:ring-rose-200/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-rose-400/80 hover:text-rose-600 active:scale-90 transition-all"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Unlock Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full relative bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 px-4 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-rose-400/30 active:scale-95 disabled:opacity-50 text-sm mt-3 button-shimmer-container overflow-visible"
          >
            {loading ? '正在解锁空间...' : '解锁私密空间'}
            
            {/* Heart Pop Bursts */}
            {bursts.map((b) => (
              <span
                key={b.id}
                className="absolute pointer-events-none text-rose-500 animate-heart-pop z-50"
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: '-8px',
                  marginTop: '-8px',
                  '--tx': `${b.tx}px`,
                  '--ty': `${b.ty}px`,
                  '--scale': b.scale,
                  '--rot': `${b.rot}deg`,
                } as React.CSSProperties}
              >
                <Heart size={16} fill="currentColor" />
              </span>
            ))}
          </button>
        </form>
      </div>
    </div>
  );
};
