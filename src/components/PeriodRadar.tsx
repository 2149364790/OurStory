import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Activity, Copy, Brain, ShieldAlert, Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PeriodRadarProps {
  currentUser: any;
  profiles: any[];
}

interface PeriodLog {
  id: string;
  user_id: string;
  recorded_by: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

interface PeriodObservation {
  id: string;
  user_id: string;
  recorded_by: string;
  log_date: string;
  symptoms: string[];
  notes: string;
  created_at: string;
}

const ALL_SYMPTOMS = [
  { id: 'backache', label: '💆‍♀️ 腰酸/腰痛' },
  { id: 'acne', label: '✨ 脸上长痘' },
  { id: 'mood', label: '🦄 情绪波动' },
  { id: 'cravings', label: '🍪 疯狂嗜甜' },
  { id: 'cramps', label: '🩺 小腹冷疼' },
  { id: 'fatigue', label: '😴 疲惫嗜睡' }
];

export const PeriodRadar: React.FC<PeriodRadarProps> = ({ currentUser, profiles }) => {
  const navigate = useNavigate();
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [logs, setLogs] = useState<PeriodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);
  const [savingObs, setSavingObs] = useState(false);

  // Observation Form States for Today
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [noteText, setNoteText] = useState('');
  const [observationId, setObservationId] = useState<string | null>(null);

  // Success Feedback Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Backlog Form States
  const [showBacklogForm, setShowBacklogForm] = useState(false);
  const [backlogStartDate, setBacklogStartDate] = useState('');
  const [backlogEndDate, setBacklogEndDate] = useState('');

  // AI Countdown & Verification States
  const [aiCountdownDate, setAiCountdownDate] = useState<string | null>(null);
  const [aiLastChecked, setAiLastChecked] = useState<string | null>(null);
  const [aiChecking, setAiChecking] = useState(false);



  // Custom Date Picker States
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());



  // Find partner
  useEffect(() => {
    if (currentUser && profiles.length > 0) {
      const partner = profiles.find(p => p.id !== currentUser.id);
      setPartnerProfile(partner);
    }
  }, [currentUser, profiles]);

  const myProfile = useMemo(() => profiles.find(p => p.id === currentUser?.id), [profiles, currentUser]);
  const isPrincess = useMemo(() => myProfile?.gender === 'princess', [myProfile]);
  const targetProfile = useMemo(() => {
    if (isPrincess) {
      return myProfile;
    }
    return partnerProfile;
  }, [myProfile, partnerProfile, isPrincess]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Daily AI check to calibrate countdown
  const triggerDailyAiCheck = async (recentLogs: PeriodLog[], recentObs: PeriodObservation[]) => {
    if (!targetProfile || recentLogs.length === 0) return;

    const todayStr = new Date().toDateString();
    const cachedDataStr = localStorage.getItem('ourstory_period_ai_cache');
    let needsUpdate = false;

    if (cachedDataStr) {
      try {
        const cached = JSON.parse(cachedDataStr);
        if (cached.lastChecked !== todayStr) {
          needsUpdate = true;
        } else {
          setAiCountdownDate(cached.predictedDate);
          setAiLastChecked(cached.lastChecked);
          return;
        }
      } catch {
        needsUpdate = true;
      }
    } else {
      needsUpdate = true;
    }

    if (needsUpdate) {
      setAiChecking(true);
      try {
        const todayDateStr = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase.functions.invoke('predict-period', {
          body: {
            logs: recentLogs.slice(0, 6),
            observations: recentObs.slice(0, 10),
            currentDate: todayDateStr
          }
        });

        if (!error && data && data.predicted_start_date) {
          localStorage.setItem('ourstory_period_ai_cache', JSON.stringify({
            lastChecked: todayStr,
            predictedDate: data.predicted_start_date,
            probability: data.probability,
            analysis: data.analysis,
            careTips: data.care_tips
          }));
          setAiCountdownDate(data.predicted_start_date);
          setAiLastChecked(todayStr);
        }
      } catch (err) {
        console.warn('Daily background AI check failed:', err);
      } finally {
        setAiChecking(false);
      }
    }
  };

  // Fetch data
  const fetchData = async () => {
    if (!targetProfile) return;
    setLoading(true);
    try {
      // 1. Fetch period logs
      const { data: logsData, error: logsError } = await supabase
        .from('period_logs')
        .select('*')
        .eq('user_id', targetProfile.id)
        .order('start_date', { ascending: false });

      if (logsError) {
        if (logsError.code === '42P01') {
          setDbReady(false);
          setLoading(false);
          return;
        }
        throw logsError;
      }
      setLogs(logsData || []);

      // 2. Fetch observations
      const { data: obsData, error: obsError } = await supabase
        .from('period_observations')
        .select('*')
        .eq('user_id', targetProfile.id)
        .order('log_date', { ascending: false });

      if (obsError) throw obsError;

      // 3. Populate today's observation form if exists
      const todayStr = new Date().toISOString().split('T')[0];
      const todayObs = obsData?.find(o => o.log_date === todayStr);
      if (todayObs) {
        setObservationId(todayObs.id);
        setSelectedSymptoms(todayObs.symptoms || []);
        setNoteText(todayObs.notes || '');
      } else {
        setObservationId(null);
        setSelectedSymptoms([]);
        setNoteText('');
      }

      setDbReady(true);

      // Trigger daily AI check (silently in background)
      triggerDailyAiCheck(logsData || [], obsData || []);

    } catch (err) {
      console.error('Error loading Period Radar data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to generate days list for custom calendar
  const getDaysInMonth = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthTotalDays - i,
        isCurrentMonth: false,
        monthOffset: -1
      });
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        monthOffset: 0
      });
    }
    
    // Next month filler days
    const totalSlots = 42;
    const nextDaysNeeded = totalSlots - days.length;
    for (let i = 1; i <= nextDaysNeeded; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        monthOffset: 1
      });
    }
    
    return days;
  };

  useEffect(() => {
    if (targetProfile) {
      fetchData();
    }
  }, [targetProfile]);


  // Derive Current State
  const latestLog = useMemo(() => logs[0] || null, [logs]);
  const isCurrentlyInPeriod = useMemo(() => {
    return latestLog ? latestLog.end_date === null : false;
  }, [latestLog]);

  const currentPeriodDay = useMemo(() => {
    if (!isCurrentlyInPeriod || !latestLog) return 0;
    const start = new Date(latestLog.start_date);
    const today = new Date();
    // Reset time components
    start.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffMs = today.getTime() - start.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }, [isCurrentlyInPeriod, latestLog]);

  // Simple static countdown prediction
  const nextPrediction = useMemo(() => {
    if (isCurrentlyInPeriod || !latestLog) return { daysLeft: -1, dateStr: '' };
    
    // Calculate average cycle length (default 28)
    let cycleLength = 28;
    if (logs.length >= 2) {
      let totalDays = 0;
      let count = 0;
      for (let i = 0; i < logs.length - 1; i++) {
        const currentStart = new Date(logs[i].start_date);
        const prevStart = new Date(logs[i+1].start_date);
        const diff = Math.floor((currentStart.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 15 && diff < 50) { // filter outliers
          totalDays += diff;
          count++;
        }
      }
      if (count > 0) cycleLength = Math.round(totalDays / count);
    }

    const lastStart = new Date(latestLog.start_date);
    const predictedStart = new Date(lastStart.getTime() + cycleLength * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0,0,0,0);
    predictedStart.setHours(0,0,0,0);

    const diffDays = Math.floor((predictedStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      daysLeft: diffDays,
      dateStr: predictedStart.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace(/\//g, '月') + '日'
    };
  }, [isCurrentlyInPeriod, latestLog, logs]);

  const aiCountdownDaysLeft = useMemo(() => {
    if (!aiCountdownDate || isCurrentlyInPeriod) return -1;
    const predicted = new Date(aiCountdownDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    predicted.setHours(0,0,0,0);
    const diffMs = predicted.getTime() - today.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [aiCountdownDate, isCurrentlyInPeriod]);

  // Log past period (backlog)
  const handleSaveBacklog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !targetProfile || !backlogStartDate || !backlogEndDate) {
      (window as any).showCustomAlert('提示', '请完整选择开始和结束日期。');
      return;
    }
    if (new Date(backlogStartDate) > new Date(backlogEndDate)) {
      (window as any).showCustomAlert('提示', '开始日期不能晚于结束日期。');
      return;
    }

    try {
      const { error } = await supabase.from('period_logs').insert({
        user_id: targetProfile.id,
        recorded_by: currentUser.id,
        start_date: backlogStartDate,
        end_date: backlogEndDate
      });

      if (error) throw error;

      showToast('📦 历史生理期补录成功！');
      setShowBacklogForm(false);
      setBacklogStartDate('');
      setBacklogEndDate('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Log period start


  const handleStartPeriod = async () => {
    if (!currentUser || !targetProfile) return;

    // Safety checks: Enforce only one active period and minimum 15-day gap to prevent duplicate clicks
    if (latestLog && !latestLog.end_date) {
      (window as any).showCustomAlert('提示 💡', '当前已有正在进行中的生理期记录，请先结束当前记录。');
      return;
    }
    if (latestLog) {
      const lastStart = new Date(latestLog.start_date);
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 15) {
        (window as any).showCustomAlert('提示 💡', '距离上次经期开始时间太近（不足15天），请避免重复记录。如有偏差请在历史手账中修改。');
        return;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];


    try {
      const { error } = await supabase.from('period_logs').insert({
        user_id: targetProfile.id,
        recorded_by: currentUser.id,
        start_date: todayStr,
        end_date: null
      });

      if (error) throw error;
      
      confetti({
        particleCount: 50,
        spread: 60,
        colors: ['#ff4d6d', '#ff758f', '#ffccd5']
      });

      showToast('🩸 生理期记录成功！开启求生关怀模式！');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Log period end
  const handleEndPeriod = async () => {
    if (!latestLog) return;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('period_logs')
        .update({ end_date: todayStr })
        .eq('id', latestLog.id);

      if (error) throw error;

      showToast('🌸 生理期已结束！系统已记录本次周期长度。');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Save Observation log
  const handleSaveObservation = async () => {
    if (!currentUser || !targetProfile) return;
    setSavingObs(true);
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const payload = {
        user_id: targetProfile.id,
        recorded_by: currentUser.id,
        log_date: todayStr,
        symptoms: selectedSymptoms,
        notes: noteText
      };

      let error;
      if (observationId) {
        const { error: err } = await supabase
          .from('period_observations')
          .update(payload)
          .eq('id', observationId);
        error = err;
      } else {
        const { data, error: err } = await supabase
          .from('period_observations')
          .insert(payload)
          .select()
          .single();
        error = err;
        if (data) setObservationId(data.id);
      }

      if (error) throw error;

      confetti({
        particleCount: 20,
        spread: 30,
        colors: ['#2ec4b6', '#cbf3f0']
      });
      showToast('💾 观察记录已成功保存，这有助于 AI 精准预测！');
      fetchData();
    } catch (err) {
      console.error(err);
      (window as any).showCustomAlert('保存失败', '数据库操作异常。');
    } finally {
      setSavingObs(false);
    }
  };

  const handleToggleSymptom = (sId: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };

  // Copy SQL script
  const sqlScript = `-- 生理期数据库表初始化脚本
-- 您可在 Supabase 控制台的 SQL Editor 中一键复制并运行：

create table if not exists public.period_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  recorded_by uuid references public.profiles(id) on delete cascade not null,
  start_date date not null,
  end_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.period_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  recorded_by uuid references public.profiles(id) on delete cascade not null,
  log_date date not null default current_date,
  symptoms text[] not null default '{}'::text[],
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_obs_date unique (user_id, log_date)
);

alter table public.period_logs enable row level security;
alter table public.period_observations enable row level security;

create policy "Allow auth users full access to period_logs"
  on public.period_logs for all using (auth.role() = 'authenticated');

create policy "Allow auth users full access to period_observations"
  on public.period_observations for all using (auth.role() = 'authenticated');

alter publication supabase_realtime add table public.period_logs;
alter publication supabase_realtime add table public.period_observations;`;

  // Return null if gender is not selected
  if (!myProfile?.gender) {
    return null;
  }

  if (!dbReady) {
    return (
      <div className="glass-panel p-6 rounded-3xl border border-rose-200 bg-rose-50/10 text-center space-y-4 shadow-xl select-none">
        <div className="w-14 h-14 bg-rose-100/50 rounded-full flex items-center justify-center mx-auto text-rose-500 animate-pulse">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-sm font-extrabold text-rose-800">生理期关怀雷达数据库尚未部署</h2>
        <p className="text-xs text-rose-700/80 leading-relaxed">
          检测到生理期功能所依赖的数据库表（\`period_logs\` 和 \`period_observations\`）尚未创建。
        </p>
        <div className="space-y-2 text-left">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400">SQL 初始化命令</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(sqlScript);
                showToast('📋 SQL 脚本已复制');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-extrabold flex items-center space-x-1"
            >
              <Copy size={12} />
              <span>复制 SQL</span>
            </button>
          </div>
          <pre className="text-[9px] font-mono bg-gray-900 text-gray-200 p-3 rounded-2xl overflow-x-auto max-h-36 shadow-inner leading-normal">
            {sqlScript}
          </pre>
        </div>
        <button 
          onClick={() => fetchData()} 
          className="w-full py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition duration-300"
        >
          完成执行后，刷新页面
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-[32px] p-6 border border-white/60 custom-shadow space-y-6 bg-white/45 relative overflow-hidden select-none">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-[10px] font-bold shadow-lg border bg-rose-50 text-rose-800 border-rose-200 animate-bounce-in">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col space-y-3 pb-3.5 border-b border-rose-100/55">
        <h3 className="text-sm font-black text-rose-800 flex items-center tracking-wider space-x-1.5">
          <Activity size={14} className="text-rose-500 animate-pulse" />
          <span>{isPrincess ? '我的生理期记录手账' : '女朋友生理期关怀雷达'}</span>
        </h3>
        <div className="flex items-center space-x-2">
          <button 
            type="button"
            onClick={() => setShowBacklogForm(!showBacklogForm)}
            className="flex-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50/60 hover:bg-rose-100/80 border border-rose-200 hover:border-rose-300 py-2 rounded-full transition-all duration-300 active:scale-95 flex items-center justify-center space-x-1 shadow-2xs whitespace-nowrap"
          >
            <Calendar size={11} className="text-rose-500" />
            <span>补录历史</span>
          </button>
          <button 
            type="button"
            onClick={() => navigate('/period/predict')}
            disabled={logs.length === 0}
            className="flex-1 text-[11px] font-extrabold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 py-2 rounded-full shadow-sm shadow-rose-500/20 hover:shadow transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none active:scale-95 flex items-center justify-center space-x-1 whitespace-nowrap"
          >
            <Brain size={11} className="animate-glow-breath" />
            <span>AI 预测分析</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-[10px] font-bold text-rose-700/80 animate-pulse">
          正在读取雷达监测数据...
        </div>
      ) : (
        <div className="space-y-5">
          
          {/* Backlog Form */}
          {showBacklogForm && (
            <form onSubmit={handleSaveBacklog} className="bg-gradient-to-br from-pink-50/20 via-white/80 to-rose-50/30 border border-rose-100/70 rounded-3xl p-4 space-y-3.5 animate-slide-up shadow-inner relative z-30">
              <span className="block text-[10px] font-black text-rose-800 tracking-wider">
                📥 补录过往生理期
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 mb-1">开始日期</label>
                  <button
                    type="button"
                    onClick={() => setActiveDatePicker(activeDatePicker === 'start' ? null : 'start')}
                    className="w-full text-[10px] border border-rose-100/50 rounded-xl px-3 py-2 bg-white/70 text-left font-mono text-gray-700 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-300 transition-all flex items-center justify-between"
                  >
                    <span>{backlogStartDate || '年 / 月 / 日'}</span>
                    <Calendar size={12} className="text-rose-400" />
                  </button>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 mb-1">结束日期</label>
                  <button
                    type="button"
                    onClick={() => setActiveDatePicker(activeDatePicker === 'end' ? null : 'end')}
                    className="w-full text-[10px] border border-rose-100/50 rounded-xl px-3 py-2 bg-white/70 text-left font-mono text-gray-700 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-300 transition-all flex items-center justify-between"
                  >
                    <span>{backlogEndDate || '年 / 月 / 日'}</span>
                    <Calendar size={12} className="text-rose-400" />
                  </button>
                </div>
              </div>

              {/* Custom Date Picker Dropdown Popover */}
              {activeDatePicker && (
                <div className="bg-white/95 backdrop-blur-md border border-rose-100 rounded-2xl p-4 shadow-xl animate-fade-in space-y-3 mt-1.5 z-40 relative">
                  {/* Header */}
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (pickerMonth === 0) {
                          setPickerMonth(11);
                          setPickerYear(pickerYear - 1);
                        } else {
                          setPickerMonth(pickerMonth - 1);
                        }
                      }}
                      className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition-all font-bold"
                    >
                      ◀
                    </button>
                    <div className="text-xs font-black text-rose-800">
                      {pickerYear}年 {pickerMonth + 1}月
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (pickerMonth === 11) {
                          setPickerMonth(0);
                          setPickerYear(pickerYear + 1);
                        } else {
                          setPickerMonth(pickerMonth + 1);
                        }
                      }}
                      className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition-all font-bold"
                    >
                      ▶
                    </button>
                  </div>
                  {/* Week Labels */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-rose-500">
                    {['日', '一', '二', '三', '四', '五', '六'].map(w => (
                      <div key={w} className="py-0.5">{w}</div>
                    ))}
                  </div>
                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(pickerYear, pickerMonth).map((item, idx) => {
                      const targetDate = new Date(pickerYear, pickerMonth + item.monthOffset, item.day);
                      const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
                      const isSelected = activeDatePicker === 'start' ? backlogStartDate === dateStr : backlogEndDate === dateStr;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (activeDatePicker === 'start') {
                              setBacklogStartDate(dateStr);
                            } else {
                              setBacklogEndDate(dateStr);
                            }
                            setActiveDatePicker(null);
                          }}
                          className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                            isSelected
                              ? 'bg-rose-500 text-white font-black shadow-3xs'
                              : item.isCurrentMonth
                              ? 'text-gray-700 hover:bg-rose-50'
                              : 'text-gray-300'
                          }`}
                        >
                          {item.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowBacklogForm(false)}
                  className="px-3.5 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold transition active:scale-95"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-[10px] font-black transition shadow-xs shadow-rose-200/50 active:scale-95"
                >
                  确认补录
                </button>
              </div>
            </form>
          )}

          {/* Main Status Display */}
          <div className="bg-gradient-to-br from-rose-50/40 via-white/70 to-pink-50/20 border border-white/80 rounded-3xl p-5 shadow-3xs relative overflow-hidden flex flex-col space-y-4">
            
            <div className="flex items-center justify-between relative z-10">
              <div className="space-y-1">
                {isCurrentlyInPeriod ? (
                  <>
                    <span className="inline-flex items-center space-x-1 bg-rose-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full mb-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      <span>生理期中</span>
                    </span>
                    <div className="text-sm font-black text-rose-800">
                      目前处于生理期第 <span className="text-rose-600 text-base font-mono">{currentPeriodDay}</span> 天
                    </div>
                    <p className="text-[10px] text-gray-400">
                      开始时间: {latestLog?.start_date}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="inline-block bg-emerald-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full mb-1">
                      🌸 守护与备忘期
                    </span>
                    <div className="text-sm font-black text-rose-800">
                      {nextPrediction.daysLeft > 0 ? (
                        <>
                          常规周期预测还有 <span className="text-rose-600 text-base font-mono">{nextPrediction.daysLeft}</span> 天
                        </>
                      ) : nextPrediction.daysLeft === 0 ? (
                        <span className="text-amber-600 animate-pulse">💡 预计今天即将来临，保持关注！</span>
                      ) : logs.length === 0 ? (
                        <span className="text-gray-400">暂无记录，请补录历史或开启记录</span>
                      ) : (
                        <span className="text-rose-500 animate-pulse font-extrabold">⚠️ 已过常规预测期，可能随时到来</span>
                      )}
                    </div>
                    {latestLog && (
                      <p className="text-[10px] text-gray-400">
                        上次生理期: {latestLog.start_date} 至 {latestLog.end_date || '进行中'}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Action Button */}
              <div className="flex-shrink-0 ml-4">
                {isCurrentlyInPeriod ? (
                  <button
                    onClick={handleEndPeriod}
                    className="px-4 py-2.5 rounded-full bg-slate-500 hover:bg-slate-600 text-white text-[11px] font-extrabold transition shadow-md shadow-slate-200/50 hover:scale-105 active:scale-95 whitespace-nowrap"
                  >
                    记录已结束
                  </button>
                ) : (
                  <button
                    onClick={handleStartPeriod}
                    className="px-4 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-[11px] font-extrabold transition shadow-md shadow-rose-200/50 hover:scale-105 active:scale-95 flex items-center space-x-1 whitespace-nowrap"
                  >
                    <span>🩸 生理期开始了</span>
                  </button>
                )}
              </div>
            </div>

            {/* AI countdown (Only shown when not in period and logs exist) */}
            {!isCurrentlyInPeriod && logs.length > 0 && (
              <div className="pt-4 border-t border-rose-100/50 flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-rose-100/60 flex items-center justify-center text-rose-500">
                    {aiChecking ? (
                      <div className="w-4 h-4 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
                    ) : (
                      <Brain size={16} className="animate-glow-breath" />
                    )}
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-400 font-extrabold tracking-wide uppercase flex items-center space-x-1">
                      <span>下个月预测倒计时</span>
                      <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] text-emerald-600 lowercase font-normal" title={`上次校验: ${aiLastChecked || '今天'}`}>(AI 每日校验)</span>
                    </span>
                    <span className="block text-xs font-black text-rose-800 mt-0.5">
                      {aiCountdownDate ? (
                        <>预计于 <span className="font-mono">{aiCountdownDate.replace(/-/g, '.')}</span> 来临</>
                      ) : (
                        <span className="text-gray-400 italic">正在计算 AI 预测值...</span>
                      )}
                    </span>
                  </div>
                </div>

                {aiCountdownDate && aiCountdownDaysLeft >= 0 && (
                  <div className="bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-2xl px-3 py-1 font-mono text-center flex flex-col justify-center shadow-3xs animate-timer-beat">
                    <span className="text-sm font-black leading-none">{aiCountdownDaysLeft}</span>
                    <span className="text-[7px] leading-none mt-0.5 font-sans font-bold">天</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Soft background glow */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-[30px] ${isCurrentlyInPeriod ? 'bg-rose-500/10' : 'bg-emerald-500/5'}`} />
          </div>

          {/* Observations Form */}
          <div className="bg-white/45 border border-white/55 rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-rose-800 tracking-wider flex items-center space-x-1">
                <span>{isPrincess ? '📝 我的今日身体与情绪体征记录' : '📝 今日身体与情绪体征观察'}</span>
              </span>
              {observationId && (
                <span className="text-[8px] font-black text-rose-500 bg-rose-50 border border-rose-100/50 px-2 py-0.5 rounded-full">
                  今日已记录
                </span>
              )}
            </div>

            {/* Symptom chips */}
            <div className="grid grid-cols-3 gap-2">
              {ALL_SYMPTOMS.map((s) => {
                const active = selectedSymptoms.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleToggleSymptom(s.id)}
                    className={`py-2 px-1.5 rounded-2xl text-[10px] font-bold border transition-all duration-300 flex items-center justify-center space-x-1 ${
                      active
                        ? 'bg-rose-500 text-white border-rose-500 shadow-3xs scale-98 animate-card-glow'
                        : 'bg-white/60 text-gray-600 border-rose-100/40 hover:bg-white/95 hover:border-rose-300'
                    }`}
                  >
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Personal memo/note */}
            <div>
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={isPrincess ? "在此输入今天我的细节" : "在此输入今天她的细节"}
                className="w-full text-xs border border-rose-100/60 rounded-2xl px-4 py-2.5 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 placeholder-gray-400 transition"
              />
            </div>

            {/* Save obs button */}
            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => navigate('/period/history')}
                className="text-[11px] font-bold text-rose-500/80 hover:text-rose-600 hover:underline transition-all flex items-center space-x-1"
              >
                <span>📊 查看历史记录 ({logs.length}次)</span>
              </button>
              <button
                type="button"
                onClick={handleSaveObservation}
                disabled={savingObs}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold tracking-wider transition shadow-md shadow-rose-200/50 hover:scale-102 active:scale-98 button-shimmer-container"
              >
                {savingObs ? <span>保存中...</span> : <span>保存今日观察</span>}
              </button>
            </div>
          </div>

        </div>
      )}





    </div>
  );
};

