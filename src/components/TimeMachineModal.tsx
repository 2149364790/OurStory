import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Sparkles, Award, Mail, Lock, Calendar, ChevronLeft, ChevronRight, X, Image, FileText, Send } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TimeMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  profiles: any[];
  completions: any[];
  items: any[];
}

interface PeriodOption {
  value: string;
  label: string;
  type: 'month' | 'year';
  start: string;
  end: string;
}

export const TimeMachineModal: React.FC<TimeMachineModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  profiles,
  completions,
  items,
}) => {
  const [togetherDate, setTogetherDate] = useState<string>('2024-05-20');
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  
  // Theme state: 'handbook' (复古手账) | 'glass' (流光毛玻璃) | 'ticket' (回忆车票根)
  const [theme, setTheme] = useState<'handbook' | 'glass' | 'ticket'>('handbook');
  
  // Envelope wax seal state
  const [isSealed, setIsSealed] = useState<boolean>(true);
  const [activePage, setActivePage] = useState<number>(0);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [isSavingLetter, setIsSavingLetter] = useState<boolean>(false);

  // Statistics state
  const [stats, setStats] = useState({
    completionsCount: 0,
    activeCategory: '无',
    photoUrls: [] as string[],
    hugsCount: 0,
    kissesCount: 0,
    missesCount: 0,
    whispersCount: 0,
    whispersVoiceCount: 0,
    wordsCount: 0,
    userAComps: 0,
    userBComps: 0,
  });

  // Letters state
  const [userLetter, setUserLetter] = useState<string>('');
  const [partnerLetter, setPartnerLetter] = useState<string>('');
  const [userHasLetter, setUserHasLetter] = useState<boolean>(false);
  const [partnerHasLetter, setPartnerHasLetter] = useState<boolean>(false);
  
  // Share Card Overlay state
  const [showShareCard, setShowShareCard] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Fetch Anniversary Config
  useEffect(() => {
    if (!isOpen) return;
    const fetchAnniversary = async () => {
      const { data } = await supabase
        .from('couple_config')
        .select('anniversary_date')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();
      if (data && data.anniversary_date) {
        setTogetherDate(data.anniversary_date);
        generatePeriodsList(data.anniversary_date);
      } else {
        generatePeriodsList('2024-05-20');
      }
    };
    fetchAnniversary();
  }, [isOpen]);

  // 2. Generate period options from anniversary to now
  const generatePeriodsList = (anniversaryStr: string) => {
    const start = new Date(anniversaryStr);
    const now = new Date();
    const options: PeriodOption[] = [];

    // A. Generate Years
    const startYear = start.getFullYear();
    const currentYear = now.getFullYear();
    for (let y = currentYear; y >= startYear; y--) {
      options.push({
        value: `${y}`,
        label: `💖 ${y}年 年度回顾`,
        type: 'year',
        start: `${y}-01-01`,
        end: `${y}-12-31`,
      });
    }

    // B. Generate Months
    const startM = start.getMonth(); // 0-indexed
    const startY = start.getFullYear();
    const currentM = now.getMonth();
    const currentY = now.getFullYear();

    let tempY = currentY;
    let tempM = currentM;
    while (tempY > startY || (tempY === startY && tempM >= startM)) {
      const yearStr = tempY;
      const monthStr = (tempM + 1).toString().padStart(2, '0');
      const lastDay = new Date(tempY, tempM + 1, 0).getDate();

      options.push({
        value: `${yearStr}-${monthStr}`,
        label: `📅 ${yearStr}年${monthStr}月 月度回顾`,
        type: 'month',
        start: `${yearStr}-${monthStr}-01`,
        end: `${yearStr}-${monthStr}-${lastDay}`,
      });

      tempM--;
      if (tempM < 0) {
        tempM = 11;
        tempY--;
      }
    }

    setPeriodOptions(options);
    if (options.length > 0) {
      setSelectedPeriod(options[0].value);
    }
  };

  // 3. Load Stats and Letters when period selection changes
  useEffect(() => {
    if (!isOpen || !selectedPeriod || periodOptions.length === 0) return;
    const currentOpt = periodOptions.find((o) => o.value === selectedPeriod);
    if (currentOpt) {
      loadPeriodData(currentOpt.start, currentOpt.end, currentOpt.value);
    }
  }, [selectedPeriod, isOpen, periodOptions]);

  // Realtime subscription for letters
  useEffect(() => {
    if (!isOpen || !selectedPeriod) return;

    const lettersChannel = supabase
      .channel('public:love_time_machine_letters_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'love_time_machine_letters', filter: `period=eq.${selectedPeriod}` },
        () => {
          fetchLettersOnly(selectedPeriod);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(lettersChannel);
    };
  }, [selectedPeriod, isOpen]);

  const fetchLettersOnly = async (periodVal: string) => {
    try {
      const { data: lettersData } = await supabase
        .from('love_time_machine_letters')
        .select('*')
        .eq('period', periodVal);

      if (lettersData) {
        processLetters(lettersData);
      }
    } catch (err) {
      console.error('Error refreshing letters:', err);
    }
  };

  const processLetters = (lettersData: any[]) => {
    const userLetterObj = lettersData.find((l) => l.user_id === currentUser.id);
    const partnerLetterObj = lettersData.find((l) => l.user_id !== currentUser.id);

    setUserLetter(userLetterObj ? userLetterObj.content : '');
    setUserHasLetter(!!userLetterObj);
    setPartnerHasLetter(!!partnerLetterObj);

    // Double blind check
    if (userLetterObj && partnerLetterObj) {
      setPartnerLetter(partnerLetterObj.content);
    } else {
      setPartnerLetter('');
    }
  };

  const loadPeriodData = async (start: string, end: string, periodVal: string) => {
    setLoadingData(true);
    try {
      // A. Filter completions
      const filteredComps = completions.filter((c) => c.completed_at >= start && c.completed_at <= end);
      const compCount = filteredComps.length;

      // Extract photo urls
      const photos: string[] = [];
      let totalWords = 0;
      let uAComps = 0;
      let uBComps = 0;

      filteredComps.forEach((c) => {
        if (c.media && Array.isArray(c.media)) {
          photos.push(...c.media);
        }
        if (c.notes) {
          totalWords += c.notes.length;
        }
        if (currentUser && c.completed_by === currentUser.id) {
          uAComps++;
        } else {
          uBComps++;
        }
      });

      // Find top active category
      const catCounts: { [key: string]: number } = {};
      filteredComps.forEach((c) => {
        const item = items.find((i) => i.id === c.item_id);
        if (item) {
          catCounts[item.category] = (catCounts[item.category] || 0) + 1;
        }
      });

      let topCategory = '无';
      let maxCount = 0;
      Object.entries(catCounts).forEach(([cat, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topCategory = cat;
        }
      });

      // B. Fetch Interactions
      const { data: interactions } = await supabase
        .from('interactions')
        .select('*')
        .gte('created_at', `${start}T00:00:00Z`)
        .lte('created_at', `${end}T23:59:59Z`);

      let hugs = 0;
      let kisses = 0;
      let misses = 0;
      if (interactions) {
        interactions.forEach((i) => {
          if (i.type === 'hug') hugs++;
          else if (i.type === 'kiss') kisses++;
          else if (i.type === 'miss') misses++;
        });
      }

      // C. Fetch Whispers
      const { data: whispers } = await supabase
        .from('whispers')
        .select('*')
        .gte('created_at', `${start}T00:00:00Z`)
        .lte('created_at', `${end}T23:59:59Z`);

      let whisperTotal = 0;
      let whisperVoice = 0;
      if (whispers) {
        whisperTotal = whispers.length;
        whispers.forEach((w) => {
          if (w.audio_path) whisperVoice++;
        });
      }

      // D. Fetch Letters
      const { data: letters } = await supabase
        .from('love_time_machine_letters')
        .select('*')
        .eq('period', periodVal);

      setStats({
        completionsCount: compCount,
        activeCategory: topCategory,
        photoUrls: photos.slice(0, 9), // limit to 9 photos for review collage
        hugsCount: hugs,
        kissesCount: kisses,
        missesCount: misses,
        whispersCount: whisperTotal,
        whispersVoiceCount: whisperVoice,
        wordsCount: totalWords,
        userAComps: uAComps,
        userBComps: uBComps,
      });

      if (letters) {
        processLetters(letters);
      } else {
        setUserLetter('');
        setPartnerLetter('');
        setUserHasLetter(false);
        setPartnerHasLetter(false);
      }
    } catch (err) {
      console.error('Error fetching period stats:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // 4. Open Envelope Seal
  const handleBreakSeal = () => {
    setIsSealed(false);
    // Boom confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff4d6d', '#ff758f', '#ffccd5', '#f15bb5', '#fee4e6'],
    });
  };

  // 5. Submit double blind letter
  const handleSaveLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userLetter.trim() || isSavingLetter) return;
    setIsSavingLetter(true);

    try {
      // Upsert letter
      const { error } = await supabase
        .from('love_time_machine_letters')
        .upsert(
          {
            period: selectedPeriod,
            user_id: currentUser.id,
            content: userLetter.trim(),
          },
          { onConflict: 'period,user_id' }
        );

      if (error) throw error;
      
      showToast('真心话提交成功！');
      fetchLettersOnly(selectedPeriod);
    } catch (err: any) {
      showToast('提交失败: ' + err.message, 'error');
    } finally {
      setIsSavingLetter(false);
    }
  };

  // Helpers to calculate together days since anniversary
  const getTogetherDays = () => {
    const start = new Date(togetherDate);
    const opt = periodOptions.find((o) => o.value === selectedPeriod);
    let end = opt ? new Date(opt.end) : new Date();
    
    // Cap at current date if the period end is in the future
    const today = new Date();
    if (end.getTime() > today.getTime()) {
      end = today;
    }
    
    // Clear hours to make calculations date-accurate
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getNickname = (userId: string) => {
    const p = profiles.find((prof) => prof.id === userId);
    return p ? p.nickname : '伴侣';
  };

  const getPartnerNickname = () => {
    if (!currentUser) return '伴侣';
    const partner = profiles.find((p) => p.id !== currentUser.id);
    return partner ? partner.nickname : '小冤家';
  };


  // 6. Theme Styling Helpers
  const getThemeWrapperClasses = () => {
    if (theme === 'glass') {
      return 'bg-slate-950 text-slate-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-950/30 via-slate-950 to-slate-950 border border-white/10 shadow-2xl';
    }
    if (theme === 'ticket') {
      return 'bg-slate-50 text-slate-800 border-2 border-slate-300 shadow-md relative before:content-[""] before:absolute before:left-[-12px] before:top-1/2 before:-translate-y-1/2 before:w-6 before:h-6 before:bg-black/85 before:rounded-full after:content-[""] after:absolute after:right-[-12px] after:top-1/2 after:-translate-y-1/2 after:w-6 after:h-6 after:bg-black/85 after:rounded-full';
    }
    // Handbook (default)
    return 'bg-[#FAF7F2] text-[#4A3B32] border-4 border-[#E7DEC9] shadow-lg shadow-amber-900/10 font-sans';
  };

  const getCardClasses = () => {
    if (theme === 'glass') {
      return 'bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4.5';
    }
    if (theme === 'ticket') {
      return 'bg-white border-2 border-dashed border-[#D84B6B]/40 rounded-xl p-4';
    }
    return 'bg-white/95 border border-[#E3D8C2] rounded-2xl p-4.5 shadow-sm';
  };

  const getTitleClasses = () => {
    if (theme === 'glass') {
      return 'text-rose-400 font-extrabold tracking-wider drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]';
    }
    if (theme === 'ticket') {
      return 'text-[#D84B6B] font-mono font-black';
    }
    return 'text-[#8C6D58] font-bold font-serif';
  };

  const getButtonClasses = () => {
    if (theme === 'glass') {
      return 'bg-rose-500 hover:bg-rose-600 disabled:bg-rose-800 text-white rounded-xl shadow-md shadow-rose-500/20';
    }
    if (theme === 'ticket') {
      return 'bg-[#D84B6B] hover:bg-[#C23C5C] disabled:bg-gray-400 text-white rounded-lg font-mono';
    }
    return 'bg-[#8C6D58] hover:bg-[#785E4B] disabled:bg-[#B3A69C] text-white rounded-2xl';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[1000] flex items-center justify-center p-3 animate-fade-in">
      {/* 1. Envelope wax seal view */}
      {isSealed ? (
        <div className="w-full max-w-sm aspect-[4/5] bg-[#FAF8F5] border-4 border-amber-900/10 rounded-[32px] shadow-2xl p-6 flex flex-col justify-between items-center text-center relative overflow-hidden animate-scale-up select-none">
          {/* Envelope background flaps */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 to-[#EAE2D5] pointer-events-none z-0" />
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-[#FAF7F2] rounded-full border border-amber-200/40 pointer-events-none" />
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#FAF7F2] rounded-full border border-amber-200/40 pointer-events-none" />

          {/* Envelope Header */}
          <div className="relative z-10 space-y-2 pt-6">
            <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-500 shadow-sm animate-pulse">
              <Mail size={22} fill="currentColor" className="opacity-90" />
            </div>
            <h2 className="text-base font-black text-rose-800 tracking-wide mt-2">小超 & 艳艳的恋爱信封</h2>
            <p className="text-[10px] text-amber-800/60 font-semibold max-w-[200px] mx-auto leading-relaxed">
              这里封存着我们打卡印记、高光时刻、爱心共鸣以及给彼此手写的真心话。
            </p>
          </div>

          {/* Wax Seal Centerpiece */}
          <div className="relative z-10 my-6 flex flex-col items-center">
            <button
              onClick={handleBreakSeal}
              className="w-20 h-20 bg-rose-600 active:scale-90 border-4 border-rose-500 rounded-full flex flex-col items-center justify-center shadow-lg hover:shadow-rose-500/20 active:shadow-inner cursor-pointer transition-transform duration-200 relative group animate-bounce-slow"
              title="双击或点击火漆印章拆开信件"
            >
              {/* Glow breath */}
              <span className="absolute inset-0 bg-rose-500/40 rounded-full animate-ping pointer-events-none scale-105" />
              
              <div className="w-14 h-14 border-2 border-dashed border-rose-400/50 rounded-full flex items-center justify-center text-white/95 font-bold font-serif text-xs select-none">
                <Heart size={18} fill="currentColor" className="text-rose-100 animate-pulse" />
              </div>
            </button>
            <span className="text-[9px] text-rose-600/80 font-black tracking-wider mt-4 animate-pulse">
              👈 点击火漆拆封信件 👉
            </span>
          </div>

          {/* Envelope Footer */}
          <div className="relative z-10 pb-4 flex flex-col space-y-1">
            <span className="text-[9px] text-amber-800/40 font-bold">CoupleSpace Time Machine</span>
            <button
              onClick={onClose}
              className="text-[10px] font-bold text-gray-500 hover:text-gray-700 bg-gray-100/60 hover:bg-gray-100 px-3 py-1 rounded-full transition"
            >
              暂不拆阅，返回
            </button>
          </div>
        </div>
      ) : (
        /* 2. Main Slideshow review container */
        <div className={`w-full max-w-sm aspect-[4/5] rounded-[32px] flex flex-col justify-between p-5 select-none relative overflow-hidden animate-scale-up ${getThemeWrapperClasses()}`}>
          
          {/* Header Row */}
          <div className="flex justify-between items-center pb-2.5 border-b border-rose-100/20 z-10">
            {/* Period selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setActivePage(0);
              }}
              className={`text-[10px] font-bold border border-rose-100/30 rounded-xl px-2 py-1 focus:outline-none cursor-pointer ${
                theme === 'glass' ? 'bg-slate-900/80 text-white' : 'bg-white text-rose-800 shadow-2xs'
              }`}
            >
              {periodOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* Theme switcher */}
            <div className="flex items-center space-x-1">
              {(['handbook', 'glass', 'ticket'] as const).map((t) => {
                const icons = { handbook: '📜', glass: '✨', ticket: '🎟️' };
                const titles = { handbook: '手账', glass: '流光', ticket: '票根' };
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-1.5 py-0.5 text-[8px] font-extrabold rounded-md border transition-all ${
                      theme === t
                        ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                        : theme === 'glass'
                          ? 'bg-slate-900/50 text-slate-300 border-slate-800'
                          : 'bg-white text-rose-700 border-rose-100 hover:bg-rose-50'
                    }`}
                    title={titles[t]}
                  >
                    {icons[t]} {titles[t]}
                  </button>
                );
              })}
              
              {/* Close */}
              <button
                onClick={onClose}
                className="p-1 hover:bg-rose-100/10 text-gray-400 hover:text-gray-600 rounded-full transition ml-1"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Loader Overlay */}
          {loadingData ? (
            <div className="flex-1 flex flex-col items-center justify-center z-10 space-y-2">
              <span className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-[9px] font-bold tracking-wider">回忆装载中...</p>
            </div>
          ) : (
            /* Slide Page Body */
            <div className="flex-1 py-4 flex flex-col justify-between overflow-y-auto z-10 scrollbar-none">
              
              {/* PAGE 0: Together anniversary */}
              {activePage === 0 && (
                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 animate-fade-in px-2">
                  <div className="space-y-1">
                    <h3 className={`text-sm uppercase tracking-wider font-extrabold opacity-80`}>第一站 · 起航</h3>
                    <h2 className={`text-lg leading-snug ${getTitleClasses()}`}>时光开始的地方</h2>
                  </div>

                  {/* Anniversary calendar visual card */}
                  <div className={`${getCardClasses()} w-48 text-center space-y-3 relative group overflow-hidden`}>
                    <div className="border-b border-rose-100/30 pb-2">
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest flex items-center justify-center">
                        <Calendar size={10} className="mr-1" /> Anniversary
                      </span>
                    </div>
                    <div>
                      <p className="text-[22px] font-black tracking-tight text-rose-500 animate-pulse">{getTogetherDays()} 天</p>
                      <p className="text-[9px] text-gray-400 font-semibold mt-1">累积相伴时光</p>
                    </div>
                    <div className="border-t border-rose-100/10 pt-2 text-[8px] text-gray-400 font-medium">
                      始于 {togetherDate.replace(/-/g, '/')}
                    </div>
                  </div>

                  <p className="text-[10px] leading-relaxed max-w-[240px] font-medium opacity-85">
                    从定情的那天起，细水长流的爱都在悄悄生根。截止至本报告期末，我们已经度过了 <span className="text-rose-500 font-bold">{getTogetherDays()}</span> 天的浪漫岁月。
                  </p>
                </div>
              )}

              {/* PAGE 1: Check-ins metrics */}
              {activePage === 1 && (
                <div className="flex-1 flex flex-col justify-between space-y-4 animate-fade-in px-2">
                  <div className="text-center space-y-0.5">
                    <h3 className="text-[10px] font-extrabold opacity-75">第二站 · 打卡印记</h3>
                    <h2 className={`text-base leading-snug ${getTitleClasses()}`}>我们共同做过的小事</h2>
                  </div>

                  <div className="space-y-3">
                    <div className={getCardClasses()}>
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-bold text-gray-400">本期解锁恋爱项目</p>
                          <p className="text-base font-black text-rose-500">{stats.completionsCount} 件</p>
                        </div>
                        <Award size={24} className="text-amber-500" />
                      </div>
                    </div>

                    <div className={getCardClasses()}>
                      <div className="space-y-1">
                        <p className="text-[8px] font-bold text-gray-400">本期最活跃的清单主题</p>
                        <p className="text-[11px] font-black text-rose-700 flex items-center">
                          <Sparkles size={11} className="text-rose-500 mr-1 animate-pulse" />
                          {stats.activeCategory}
                        </p>
                      </div>
                    </div>

                    <div className={`${getCardClasses()} space-y-2`}>
                      <div className="flex justify-between items-baseline text-[8px] font-bold text-gray-400">
                        <span>打卡先锋统计</span>
                        <span>共打卡 {stats.completionsCount} 次</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-2 bg-gray-200/40 rounded-full overflow-hidden flex">
                          <div
                            className="bg-pink-400 h-full rounded-l-full transition-all duration-500"
                            style={{ width: `${stats.completionsCount > 0 ? (stats.userAComps / stats.completionsCount) * 100 : 50}%` }}
                          />
                          <div
                            className="bg-rose-500 h-full rounded-r-full transition-all duration-500"
                            style={{ width: `${stats.completionsCount > 0 ? (stats.userBComps / stats.completionsCount) * 100 : 50}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-[8px] font-bold text-rose-800/80">
                        <span>{getNickname(currentUser.id)}: {stats.userAComps}次</span>
                        <span>{getPartnerNickname()}: {stats.userBComps}次</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] leading-relaxed text-center opacity-80 max-w-[260px] mx-auto font-semibold">
                    {stats.completionsCount > 0
                      ? `每一次打卡都是生活浪漫的宣誓，我们在【${stats.activeCategory}】类别中有着绝佳的甜蜜默契！`
                      : '这期间还没有记录打卡哦，快去恋爱清单打卡一件事，留下你们的第一次吧！'}
                  </p>
                </div>
              )}

              {/* PAGE 2: Photos Collage */}
              {activePage === 2 && (
                <div className="flex-1 flex flex-col justify-between space-y-3 animate-fade-in px-1">
                  <div className="text-center space-y-0.5">
                    <h3 className="text-[10px] font-extrabold opacity-75">第三站 · 高光瞬间</h3>
                    <h2 className={`text-base leading-snug ${getTitleClasses()}`}>我们的浪漫胶卷</h2>
                  </div>

                  {stats.photoUrls.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-rose-100/30 rounded-2xl p-6 bg-rose-50/5 text-center text-rose-700/60">
                      <Image size={24} className="mb-2 opacity-50" />
                      <p className="text-[9px] font-bold">没有上传照片记录哦</p>
                      <p className="text-[8px] opacity-75 mt-0.5">打卡恋爱清单时上传原图，照片就会出现在这！</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="grid grid-cols-3 gap-1.5 max-w-[260px]">
                        {stats.photoUrls.map((url, idx) => {
                          // Random rotations for scrapbook feel
                          const rotations = ['rotate-2', '-rotate-3', 'rotate-1', '-rotate-1', 'rotate-3', '-rotate-2'];
                          const rot = theme === 'handbook' ? rotations[idx % rotations.length] : '';
                          return (
                            <div
                              key={idx}
                              className={`aspect-square bg-white rounded-lg overflow-hidden border border-rose-100 shadow-2xs p-1 select-none transition transform hover:scale-105 active:scale-95 duration-200 ${rot}`}
                            >
                              <img src={url} className="w-full h-full object-cover rounded-md" alt="collage" loading="lazy" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <p className="text-[8px] text-gray-400 text-center font-medium leading-relaxed max-w-[200px] mx-auto">
                    每一帧相片都是无声的情书，原画质直传，替我们定格了高清又完美的微笑。
                  </p>
                </div>
              )}

              {/* PAGE 3: Interactions and Whispers metrics */}
              {activePage === 3 && (
                <div className="flex-1 flex flex-col justify-between space-y-4 animate-fade-in px-2">
                  <div className="text-center space-y-0.5">
                    <h3 className="text-[10px] font-extrabold opacity-75">第四站 · 爱意共鸣</h3>
                    <h2 className={`text-base leading-snug ${getTitleClasses()}`}>心跳与密语统计</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className={`${getCardClasses()} flex flex-col justify-between aspect-video`}>
                      <span className="text-[8px] font-bold text-gray-400 flex items-center">
                        💋 飞吻与拥抱
                      </span>
                      <div>
                        <p className="text-base font-black text-rose-500 leading-tight">
                          {stats.kissesCount + stats.hugsCount} 次
                        </p>
                        <p className="text-[7px] text-gray-400 mt-1">
                          包含 {stats.kissesCount} 飞吻 · {stats.hugsCount} 拥抱
                        </p>
                      </div>
                    </div>

                    <div className={`${getCardClasses()} flex flex-col justify-between aspect-video`}>
                      <span className="text-[8px] font-bold text-gray-400 flex items-center">
                        🤫 悄悄话密语
                      </span>
                      <div>
                        <p className="text-base font-black text-rose-500 leading-tight">
                          {stats.whispersCount} 条
                        </p>
                        <p className="text-[7px] text-gray-400 mt-1">
                          包含 {stats.whispersVoiceCount} 条录音倾听
                        </p>
                      </div>
                    </div>

                    <div className={`${getCardClasses()} col-span-2 py-3`}>
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-bold text-gray-400">打卡纪念册备注总字数</span>
                          <p className="text-xs font-black text-rose-700">累计写下 {stats.wordsCount} 字的深情笔录</p>
                        </div>
                        <FileText size={16} className="text-rose-400" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] leading-relaxed text-center opacity-85 max-w-[260px] mx-auto font-semibold">
                    *“心跳波动图与指尖的点击，都化作了这里无声的数据，见证着艳艳与小超不期而遇的心动。”*
                  </p>
                </div>
              )}

              {/* PAGE 4: Double-blind Letter Box */}
              {activePage === 4 && (
                <div className="flex-1 flex flex-col justify-between space-y-3.5 animate-fade-in px-2">
                  <div className="text-center space-y-0.5">
                    <h3 className="text-[10px] font-extrabold opacity-75">终点站 · 真心话信箱</h3>
                    <h2 className={`text-base leading-snug ${getTitleClasses()}`}>致伴侣的专属寄语</h2>
                  </div>

                  {/* Letter display side-by-side if both wrote, otherwise lock screen */}
                  {userHasLetter && partnerHasLetter ? (
                    <div className="flex-1 grid grid-cols-2 gap-2 max-h-52 overflow-hidden">
                      {/* User Letter */}
                      <div className="bg-[#FCFBF8] border border-rose-100/30 p-2.5 rounded-xl flex flex-col justify-between text-left overflow-y-auto scrollbar-none shadow-3xs">
                        <p className="text-[7px] text-[#8C6D58] font-black border-b border-[#E7DEC9] pb-1 flex items-center">
                          💌 {getNickname(currentUser.id)} 写给对方
                        </p>
                        <p className="text-[9px] text-rose-950 font-medium leading-normal italic pt-1 flex-1">
                          "{userLetter}"
                        </p>
                      </div>
                      {/* Partner Letter */}
                      <div className="bg-[#FFF5F6] border border-rose-100/30 p-2.5 rounded-xl flex flex-col justify-between text-left overflow-y-auto scrollbar-none shadow-3xs">
                        <p className="text-[7px] text-rose-700 font-black border-b border-rose-200 pb-1 flex items-center">
                          💌 {getPartnerNickname()} 写给对方
                        </p>
                        <p className="text-[9px] text-rose-950 font-medium leading-normal italic pt-1 flex-1">
                          "{partnerLetter}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Letter Form Input */
                    <div className="flex-1 flex flex-col justify-between space-y-2">
                      {/* Self Letter Editor */}
                      <form onSubmit={handleSaveLetter} className="space-y-2">
                        <label className="block text-[8px] font-black text-rose-700 flex items-center justify-between">
                          <span>✍️ 留下你在本周期的真心话寄语：</span>
                          <span className="text-gray-400 font-normal">提交后无法退回</span>
                        </label>
                        <textarea
                          value={userLetter}
                          disabled={userHasLetter}
                          onChange={(e) => setUserLetter(e.target.value)}
                          placeholder="写下这一个月/这一年对伴侣的心里话吧，文字里有最深的情意..."
                          className="w-full px-2.5 py-1.5 text-[10px] border border-rose-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-800 bg-white"
                          rows={2.5}
                          required
                        />
                        {!userHasLetter && (
                          <button
                            type="submit"
                            disabled={isSavingLetter}
                            className={`w-full py-1.5 text-[9px] font-bold flex items-center justify-center space-x-1 ${getButtonClasses()}`}
                          >
                            <Send size={9} />
                            <span>提交我写的信件</span>
                          </button>
                        )}
                      </form>

                      {/* Partner Letter Lock Box */}
                      <div className="border border-dashed border-rose-200/50 rounded-xl p-2.5 bg-rose-50/5 flex items-center space-x-2 relative overflow-hidden">
                        <div className="p-1.5 bg-rose-100/50 text-rose-600 rounded-lg shrink-0">
                          {partnerHasLetter ? <Lock size={12} className="animate-pulse" /> : <Lock size={12} />}
                        </div>
                        <div className="text-left">
                          <p className="text-[8px] font-bold text-rose-900/80">
                            {getPartnerNickname()} 的专属信件
                          </p>
                          <p className="text-[7px] text-gray-400 mt-0.5 leading-tight font-medium">
                            {partnerHasLetter 
                              ? "🔒 伴侣已写好信件。您提交自己的信件后，将秒级同时解密开启！" 
                              : "⏳ 伴侣还在落笔手写中... 双方写完即可解密。"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[7px] text-gray-400 text-center font-medium leading-relaxed">
                    双盲锁：为了保护惊喜，只有在双方都落笔提交后，情书内容才会呈现在这里哦。
                  </p>
                </div>
              )}

            </div>
          )}

          {/* Navigation Control Footer */}
          <div className="flex justify-between items-center pt-3 border-t border-rose-100/10 z-10">
            <button
              onClick={() => setActivePage((p) => Math.max(0, p - 1))}
              disabled={activePage === 0 || loadingData}
              className={`p-1.5 rounded-full border border-rose-100/20 active:scale-90 disabled:opacity-30 disabled:scale-100 transition ${
                theme === 'glass' ? 'bg-white/5 text-white' : 'bg-white text-rose-700 shadow-3xs'
              }`}
            >
              <ChevronLeft size={14} />
            </button>

            {/* Pagination dots */}
            <div className="flex space-x-1.5">
              {[0, 1, 2, 3, 4].map((p) => (
                <button
                  key={p}
                  onClick={() => !loadingData && setActivePage(p)}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    activePage === p 
                      ? 'bg-rose-500 scale-125' 
                      : theme === 'glass' 
                        ? 'bg-white/20' 
                        : 'bg-rose-200/50'
                  }`}
                />
              ))}
            </div>

            {/* Next or Share Poster Button */}
            <div className="flex items-center space-x-1.5">
              {activePage === 4 ? (
                <button
                  onClick={() => setShowShareCard(true)}
                  disabled={loadingData}
                  className={`px-3 py-1 text-[9px] font-bold flex items-center space-x-1 ${getButtonClasses()}`}
                >
                  <Image size={9} />
                  <span>生成海报</span>
                </button>
              ) : (
                <button
                  onClick={() => setActivePage((p) => Math.min(4, p + 1))}
                  disabled={loadingData}
                  className={`p-1.5 rounded-full border border-rose-100/20 active:scale-90 disabled:opacity-30 disabled:scale-100 transition ${
                    theme === 'glass' ? 'bg-white/5 text-white' : 'bg-white text-rose-700 shadow-3xs'
                  }`}
                >
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 3. Share Poster Screen Capture overlay */}
          {showShareCard && (
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FFF0F2] via-[#FFF8F8] to-[#FFECEF] z-50 flex flex-col justify-between p-6 animate-fade-in overflow-hidden">
              {/* Background romantic sparkles */}
              <div className="absolute top-1/4 left-6 text-rose-200/50 rotate-12 pointer-events-none scale-75">
                <Sparkles size={24} fill="currentColor" />
              </div>
              <div className="absolute bottom-1/4 right-6 text-rose-200/50 -rotate-12 pointer-events-none scale-75">
                <Sparkles size={24} fill="currentColor" />
              </div>

              <div className="flex justify-between items-center pb-2.5 border-b border-rose-200/50 relative z-10">
                <span className="text-[10px] font-extrabold text-rose-800">📸 恋爱回忆卡片已生成</span>
                <button
                  onClick={() => setShowShareCard(false)}
                  className="p-1 hover:bg-rose-100/60 text-rose-400 hover:text-rose-600 rounded-full transition"
                >
                  <X size={14} />
                </button>
              </div>

              {/* The poster representation designed for screenshots */}
              <div className="flex-grow flex items-center justify-center my-4 relative z-10">
                <div className="w-64 bg-white text-[#4A3B32] rounded-3xl p-5 shadow-2xl border-4 border-[#FAF7F2] font-sans flex flex-col justify-between space-y-4 aspect-[2/3] relative">
                  
                  {/* Floating heart background */}
                  <div className="absolute right-3 bottom-3 text-rose-100 scale-150 pointer-events-none rotate-6">
                    <Heart size={40} fill="currentColor" />
                  </div>

                  <div className="space-y-3.5 relative z-10">
                    <div className="flex items-baseline justify-between border-b border-amber-100 pb-2">
                      <h4 className="text-[11px] font-serif font-black text-rose-700 uppercase tracking-widest">
                        {selectedPeriod.includes('-') ? 'Monthly Review' : 'Yearly Review'}
                      </h4>
                      <span className="text-[8px] text-[#8C6D58] font-bold font-mono bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        {selectedPeriod}
                      </span>
                    </div>

                    <div className="text-center space-y-1 py-1">
                      <p className="text-[8px] font-bold text-gray-400 tracking-wider">小超 & 艳艳在此期间相伴</p>
                      <p className="text-[20px] font-serif font-black text-rose-500">{getTogetherDays()} 天</p>
                    </div>

                    {/* Stats List */}
                    <div className="space-y-2.5 text-[9px] text-[#4A3B32]/95 font-semibold">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">🏆 达成恋爱清单目标</span>
                        <span className="font-bold text-rose-700">{stats.completionsCount} 件</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">🍲 最具默契清单类别</span>
                        <span className="font-bold text-rose-700">{stats.activeCategory}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">💋 发射飞吻与拥抱</span>
                        <span className="font-bold text-rose-700">{stats.kissesCount + stats.hugsCount} 次</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">🤫 密语悄悄话交流</span>
                        <span className="font-bold text-rose-700">{stats.whispersCount} 条</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">✍️ 记录字数</span>
                        <span className="font-bold text-rose-700">{stats.wordsCount} 字</span>
                      </div>
                    </div>
                  </div>

                  {/* Collage placeholder for poster */}
                  {stats.photoUrls.length > 0 && (
                    <div className="flex justify-center space-x-1 border-t border-amber-50 pt-3 select-none">
                      {stats.photoUrls.slice(0, 3).map((url, i) => (
                        <div key={i} className="w-12 h-12 rounded-md overflow-hidden border border-amber-100/60 p-0.5 bg-white shadow-3xs transform rotate-2">
                          <img src={url} className="w-full h-full object-cover rounded-sm" alt="poster-collage" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-center border-t border-[#E7DEC9] pt-2 text-[7px] text-[#8C6D58] font-bold">
                    💑 CoupleSpace · 时光印记
                  </div>
                </div>
              </div>

              {/* Instructions and back */}
              <div className="text-center space-y-2.5 relative z-10">
                <p className="text-[10px] text-rose-700/80 font-bold leading-relaxed max-w-[220px] mx-auto">
                  ✨ 截图提示：直接对手机进行截屏，即可保存这份专属的回忆海报分享给伴侣或发朋友圈啦！
                </p>
                <button
                  onClick={() => setShowShareCard(false)}
                  className="px-6 py-2 text-xs font-bold text-rose-800 bg-white hover:bg-rose-50 border border-rose-200/40 rounded-full transition shadow-xs active:scale-95"
                >
                  返回报告，继续阅读
                </button>
              </div>
            </div>
          )}

          {/* Custom Toast inside modal */}
          {toast && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[2100] max-w-xs w-full px-3 animate-fade-in pointer-events-none">
              <div className={`glass-panel p-2.5 rounded-xl shadow-xl border flex items-center justify-center space-x-2 backdrop-blur-md transition-all duration-300 pointer-events-auto ${
                toast.type === 'error' 
                  ? 'border-red-200 bg-red-50/90 text-red-800' 
                  : 'border-rose-200 bg-rose-50/95 text-rose-800'
              }`}>
                <span className="text-sm">
                  {toast.type === 'error' ? '❌' : '✨'}
                </span>
                <p className="text-[9px] font-black leading-snug">{toast.message}</p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
