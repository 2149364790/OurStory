import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Edit3, Trash2, ShieldAlert, Copy, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';

interface MoodLog {
  id: string;
  user_id: string;
  log_date: string;
  my_mood: string;
  partner_mood: string;
  diary_title: string;
  diary_content: string;
  diary_color?: string;
  created_at: string;
}

const MOODS = [
  { id: 'happy', label: '😊 开心/超棒' },
  { id: 'neutral', label: '😐 平静/一般' },
  { id: 'sad', label: '😢 难过/失落' },
  { id: 'angry', label: '😠 生气/郁闷' },
  { id: 'anxious', label: '😰 焦虑/烦躁' }
];



export const MoodJournalPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'calendar' | 'chart'>('calendar');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  // Calendar States
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);



  // Fetch current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fetch data
  const fetchLogs = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('log_date', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setDbReady(false);
          setLoading(false);
          return;
        }
        throw error;
      }
      setLogs(data || []);
      setDbReady(true);
    } catch (err) {
      console.error('Error fetching mood logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchLogs();
    }
  }, [currentUser]);

  // Selected date log helper
  const selectedLog = useMemo(() => {
    return logs.find(log => log.log_date === selectedDateStr) || null;
  }, [selectedDateStr, logs]);



  // Delete log
  const handleDeleteLog = async () => {
    if (!selectedLog) return;

    const confirmDelete = window.confirm('确定要删除这一天的心情日记吗？这不可恢复哦。');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('mood_logs')
        .delete()
        .eq('id', selectedLog.id);

      if (error) throw error;
      showToast('🗑️ 日记已删除');
      await fetchLogs();
    } catch (err) {
      console.error('Error deleting log:', err);
      showToast('❌ 删除失败');
    }
  };

  // Days list helper for calendar grid
  const getDaysInMonth = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { day: number; isCurrentMonth: boolean; monthOffset: number }[] = [];

    // Prev month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, monthOffset: -1 });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, isCurrentMonth: true, monthOffset: 0 });
    }

    // Next month padding days to make it a full week grid (6 rows total = 42 grid cells)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, monthOffset: 1 });
    }

    return days;
  };

  // SVG Line Chart calculations with Week, Month, and Year filtering/aggregation
  const chartData = useMemo(() => {
    const moodScore: Record<string, number> = {
      happy: 5,
      neutral: 3,
      sad: 1,
      angry: 2,
      anxious: 2
    };

    const getDaysAgo = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d;
    };

    let filtered = [...logs];

    if (timeRange === 'week') {
      const limitDate = getDaysAgo(7);
      filtered = filtered.filter(log => new Date(log.log_date) >= limitDate);
      filtered.sort((a, b) => a.log_date.localeCompare(b.log_date));
      
      return filtered.map(log => ({
        id: log.id,
        log_date: log.log_date,
        display_date: log.log_date.substring(5).replace('-', '.'), // e.g. "06.28"
        my_score: moodScore[log.my_mood] || 3,
        partner_score: moodScore[log.partner_mood] || 3
      }));
    } else if (timeRange === 'month') {
      const limitDate = getDaysAgo(30);
      filtered = filtered.filter(log => new Date(log.log_date) >= limitDate);
      filtered.sort((a, b) => a.log_date.localeCompare(b.log_date));

      return filtered.map(log => ({
        id: log.id,
        log_date: log.log_date,
        display_date: log.log_date.substring(5).replace('-', '.'),
        my_score: moodScore[log.my_mood] || 3,
        partner_score: moodScore[log.partner_mood] || 3
      }));
    } else {
      // 'year' range: aggregate by month to prevent layout clutter
      const limitDate = getDaysAgo(365);
      filtered = filtered.filter(log => new Date(log.log_date) >= limitDate);
      filtered.sort((a, b) => a.log_date.localeCompare(b.log_date));

      const monthlyGroups: Record<string, { mySum: number; partnerSum: number; count: number }> = {};
      filtered.forEach(log => {
        const monthKey = log.log_date.substring(0, 7); // "YYYY-MM"
        if (!monthlyGroups[monthKey]) {
          monthlyGroups[monthKey] = { mySum: 0, partnerSum: 0, count: 0 };
        }
        monthlyGroups[monthKey].mySum += moodScore[log.my_mood] || 3;
        monthlyGroups[monthKey].partnerSum += moodScore[log.partner_mood] || 3;
        monthlyGroups[monthKey].count += 1;
      });

      const sortedMonths = Object.keys(monthlyGroups).sort();
      return sortedMonths.map(monthKey => {
        const group = monthlyGroups[monthKey];
        return {
          id: monthKey,
          log_date: `${monthKey}-01`,
          display_date: monthKey.substring(2).replace('-', '.'), // e.g. "26.06"
          my_score: Math.round((group.mySum / group.count) * 10) / 10,
          partner_score: Math.round((group.partnerSum / group.count) * 10) / 10
        };
      });
    }
  }, [logs, timeRange]);

  const svgChart = useMemo(() => {
    if (chartData.length < 2) return null;
    const width = 300;
    const height = 150;
    const paddingLeft = 30;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 20;

    const getX = (index: number) => {
      const workableWidth = width - paddingLeft - paddingRight;
      return paddingLeft + (index / (chartData.length - 1)) * workableWidth;
    };

    const getY = (score: number) => {
      const workableHeight = height - paddingTop - paddingBottom;
      // score runs from 1 to 5
      return height - paddingBottom - ((score - 1) / 4) * workableHeight;
    };

    let myPath = '';
    let partnerPath = '';

    chartData.forEach((d, idx) => {
      const x = getX(idx);
      const myY = getY(d.my_score);
      const partnerY = getY(d.partner_score);

      if (idx === 0) {
        myPath = `M ${x} ${myY}`;
        partnerPath = `M ${x} ${partnerY}`;
      } else {
        myPath += ` L ${x} ${myY}`;
        partnerPath += ` L ${x} ${partnerY}`;
      }
    });

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      getX,
      getY,
      myPath,
      partnerPath
    };
  }, [chartData]);

  const sqlScript = `
-- 如果 mood_logs 表不存在，请在 Supabase SQL Editor 中运行此脚本初始化数据库：
create table public.mood_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null,
  my_mood text not null,
  partner_mood text not null,
  diary_title text,
  diary_content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, log_date)
);

alter table public.mood_logs enable row level security;

create policy "Allow individuals to access own logs" on public.mood_logs for select using (auth.uid() = user_id);
create policy "Allow individuals to insert own logs" on public.mood_logs for insert with check (auth.uid() = user_id);
create policy "Allow individuals to update own logs" on public.mood_logs for update using (auth.uid() = user_id);
create policy "Allow individuals to delete own logs" on public.mood_logs for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.mood_logs;`;

  // DB Missing Fallback
  if (!dbReady) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="glass-panel p-6 rounded-3xl border border-rose-200 bg-rose-50/10 text-center space-y-4 shadow-xl select-none">
          <div className="w-14 h-14 bg-rose-100/50 rounded-full flex items-center justify-center mx-auto text-rose-500 animate-pulse">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-sm font-extrabold text-rose-800">情绪手账数据库尚未部署</h2>
          <p className="text-xs text-rose-700/80 leading-relaxed">
            检测到心情日志功能所依赖的数据库表（`mood_logs`）尚未创建。请将以下代码段复制并在您的 Supabase SQL 编辑器中运行：
          </p>
          <div className="space-y-2 text-left font-sans">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-400">SQL 初始化命令</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(sqlScript);
                  showToast('📋 SQL 已复制');
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
            onClick={() => fetchLogs()} 
            className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition duration-300 flex items-center justify-center space-x-1"
          >
            <RefreshCw size={12} className="animate-spin" />
            <span>已部署，刷新检测</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 select-none">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-[10px] font-bold shadow-lg border bg-rose-50 text-rose-800 border-rose-200 animate-bounce-in">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex justify-between items-center bg-white/45 glass-panel rounded-3xl px-4 py-3 border border-white/60 shadow-xs flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 hover:bg-rose-50 rounded-xl text-rose-700 transition"
          >
            <ArrowLeft size={16} />
          </button>
          <h3 className="text-xs font-black text-rose-800 flex items-center space-x-1.5 tracking-wider">
            <BookOpen size={14} className="text-rose-500 animate-pulse" />
            <span>📖 私密心情日志</span>
          </h3>
        </div>

        {/* Toggle tab */}
        <div className="flex bg-rose-50/50 p-0.5 rounded-full border border-rose-100/40">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1 text-[9px] font-bold rounded-full transition-all ${
              activeTab === 'calendar' ? 'bg-white text-rose-700 shadow-2xs font-extrabold' : 'text-gray-450 hover:text-rose-500'
            }`}
          >
            情绪历
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chart')}
            className={`px-3 py-1 text-[9px] font-bold rounded-full transition-all ${
              activeTab === 'chart' ? 'bg-white text-rose-700 shadow-2xs font-extrabold' : 'text-gray-450 hover:text-rose-500'
            }`}
          >
            趋势图
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white/45 glass-panel rounded-[32px] p-5 border border-white/60 shadow-xs space-y-4">
        
        {loading ? (
          <div className="py-16 text-center text-[10px] font-bold text-rose-700/80 animate-pulse">
            正在读取心情手账中...
          </div>
        ) : (
          <React.Fragment>
            {/* TAB 1: CALENDAR VIEW */}
            {activeTab === 'calendar' && (
              <div className="space-y-3">
                {/* Calendar Selector Header */}
                <div className="flex justify-between items-center px-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentMonth === 0) {
                        setCurrentMonth(11);
                        setCurrentYear(currentYear - 1);
                      } else {
                        setCurrentMonth(currentMonth - 1);
                      }
                    }}
                    className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="text-[11px] font-black text-rose-800">
                    {currentYear}年 {currentMonth + 1}月
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentMonth === 11) {
                        setCurrentMonth(0);
                        setCurrentYear(currentYear + 1);
                      } else {
                        setCurrentMonth(currentMonth + 1);
                      }
                    }}
                    className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition-all"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white/60 border border-white/80 rounded-3xl p-3 shadow-3xs">
                  {/* Weekdays */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-black text-rose-455 mb-1.5">
                    {['日', '一', '二', '三', '四', '五', '六'].map(w => (
                      <div key={w} className="py-0.5">{w}</div>
                    ))}
                  </div>
                  {/* Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(currentYear, currentMonth).map((item, idx) => {
                      const targetDate = new Date(currentYear, currentMonth + item.monthOffset, item.day);
                      const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
                      const hasLog = logs.find(log => log.log_date === dateStr);
                      const isSelected = selectedDateStr === dateStr;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedDateStr(dateStr)}
                          className={`h-10 rounded-xl transition-all relative flex flex-col items-center justify-between p-1 border ${
                            isSelected
                              ? 'bg-rose-100/40 border-rose-350 shadow-3xs scale-98'
                              : item.isCurrentMonth
                              ? 'bg-white/50 border-rose-100/20 hover:bg-white/90 text-gray-700'
                              : 'bg-transparent border-transparent text-gray-300'
                          }`}
                        >
                          <span className="text-[9px] font-black leading-none">{item.day}</span>
                          {hasLog && (
                            <div className="flex -space-x-0.5">
                              <span className="text-[8px] leading-none" title="我的情绪">
                                {hasLog.my_mood === 'happy' && '😊'}
                                {hasLog.my_mood === 'neutral' && '😐'}
                                {hasLog.my_mood === 'sad' && '😢'}
                                {hasLog.my_mood === 'angry' && '😠'}
                                {hasLog.my_mood === 'anxious' && '😰'}
                              </span>
                              <span className="text-[8px] leading-none" title="伴侣情绪">
                                {hasLog.partner_mood === 'happy' && '😊'}
                                {hasLog.partner_mood === 'neutral' && '😐'}
                                {hasLog.partner_mood === 'sad' && '😢'}
                                {hasLog.partner_mood === 'angry' && '😠'}
                                {hasLog.partner_mood === 'anxious' && '😰'}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CHART TREND VIEW */}
            {activeTab === 'chart' && (
              <div className="bg-white/60 border border-white/80 rounded-3xl p-3.5 shadow-3xs space-y-3">
                <div className="flex flex-col space-y-2 pb-1 border-b border-rose-100/30">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-rose-800 flex items-center space-x-1">
                      <span>📊 心情趋势走势</span>
                      <span className="text-[8px] font-bold text-gray-400">({timeRange === 'week' ? '本周' : timeRange === 'month' ? '本月' : '全年'})</span>
                    </span>

                    <div className="flex space-x-2 text-[7px] font-bold">
                      <span className="flex items-center space-x-0.5">
                        <span className="w-2 h-0.5 bg-pink-500 rounded-full" />
                        <span>我</span>
                      </span>
                      <span className="flex items-center space-x-0.5">
                        <span className="w-2 h-0.5 bg-sky-500 rounded-full" />
                        <span>伴侣</span>
                      </span>
                    </div>
                  </div>

                  {/* Filter Switcher Tabs */}
                  <div className="flex justify-between items-center">
                    <div className="flex bg-rose-50/70 p-0.5 rounded-lg border border-rose-100/30">
                      {(['week', 'month', 'year'] as const).map(range => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setTimeRange(range)}
                          className={`px-3 py-0.5 text-[8px] font-bold rounded-md transition-all ${
                            timeRange === range
                              ? 'bg-white text-rose-700 shadow-3xs font-extrabold'
                              : 'text-gray-400 hover:text-rose-500'
                          }`}
                        >
                          {range === 'week' && '周'}
                          {range === 'month' && '月'}
                          {range === 'year' && '年'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {chartData.length < 2 ? (
                  <div className="py-12 text-center text-[10px] text-gray-400 italic">
                    数据较少，至少记录 2 天才可绘制走势 📈
                  </div>
                ) : (
                  <div className="relative">
                    <svg 
                      viewBox={`0 0 ${svgChart?.width} ${svgChart?.height}`} 
                      className="w-full h-36 overflow-visible"
                    >
                      {/* Y Axis Guide Lines */}
                      {[1, 2, 3, 4, 5].map(score => {
                        const y = svgChart!.getY(score);
                        return (
                          <g key={score}>
                            <line 
                              x1={svgChart!.paddingLeft} 
                              y1={y} 
                              x2={svgChart!.width - svgChart!.paddingRight} 
                              y2={y} 
                              stroke="#ffe4e6" 
                              strokeWidth="0.5" 
                              strokeDasharray="2 3" 
                            />
                            <text 
                              x={svgChart!.paddingLeft - 6} 
                              y={y + 2.5} 
                              className="text-[6px] fill-gray-400 font-bold"
                              textAnchor="end"
                            >
                              {score === 5 && '😊'}
                              {score === 3 && '😐'}
                              {score === 1 && '😢'}
                            </text>
                          </g>
                        );
                      })}

                      {/* Lines */}
                      <path 
                        d={svgChart!.myPath} 
                        fill="none" 
                        stroke="#ec4899" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="drop-shadow-[0_1.5px_3px_rgba(236,72,153,0.15)]"
                      />
                      <path 
                        d={svgChart!.partnerPath} 
                        fill="none" 
                        stroke="#0ea5e9" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="drop-shadow-[0_1.5px_3px_rgba(14,165,233,0.15)]"
                      />

                      {/* Dots */}
                      {chartData.map((d, idx) => {
                        const x = svgChart!.getX(idx);
                        const myY = svgChart!.getY(d.my_score);
                        const partnerY = svgChart!.getY(d.partner_score);

                        return (
                          <g key={d.id}>
                            <circle cx={x} cy={myY} r="3" fill="#ffffff" stroke="#ec4899" strokeWidth="2" />
                            <circle cx={x} cy={partnerY} r="3" fill="#ffffff" stroke="#0ea5e9" strokeWidth="2" />
                          </g>
                        );
                      })}

                      {/* X Axis Dates */}
                      {chartData.map((d, idx) => {
                        if (timeRange === 'month') {
                          if (idx % 6 !== 0 && idx !== chartData.length - 1) return null;
                        } else if (timeRange === 'year') {
                          if (idx % 2 !== 0 && idx !== chartData.length - 1) return null;
                        }
                        const x = svgChart!.getX(idx);
                        return (
                          <text 
                            key={d.id} 
                            x={x} 
                            y={svgChart!.height - 3} 
                            className="text-[6px] fill-gray-400 font-bold font-mono" 
                            textAnchor="middle"
                          >
                            {d.display_date}
                          </text>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3: APPLE NOTES DIARY OR DISPLAY */}
            <div 
              onClick={() => navigate(`/mood/edit?date=${selectedDateStr}`)}
              className="bg-white border border-gray-200 rounded-3xl p-4 shadow-3xs relative overflow-hidden flex-shrink-0 cursor-pointer hover:scale-[1.01] transition-all duration-300 w-full"
            >
              <div className="absolute inset-0 bg-repeating-lines opacity-10 pointer-events-none" />

              <div className="relative z-10 space-y-3">
                <div className="flex justify-between items-center border-b border-black/5 pb-2">
                  <span className="text-[10px] font-black opacity-75 font-sans tracking-wide">
                    📝 {selectedDateStr.replace(/-/g, '.')} 心情日记
                  </span>
                  {selectedLog ? (
                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => navigate(`/mood/edit?date=${selectedDateStr}`)}
                        className="text-[9px] font-extrabold text-rose-600 hover:underline flex items-center space-x-0.5"
                      >
                        <Edit3 size={10} />
                        <span>编辑</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteLog}
                        className="text-[9px] font-extrabold text-red-500 hover:underline flex items-center space-x-0.5"
                      >
                        <Trash2 size={10} />
                        <span>删除</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[9px] font-black text-rose-500 animate-pulse">✍️ 点击写日记</span>
                  )}
                </div>

                {selectedLog ? (
                  <div className="space-y-2.5 font-sans">
                    {/* Mood Badges display */}
                    <div className="flex space-x-2">
                      <span className="text-[8px] bg-white/60 border border-black/5 px-2 py-0.5 rounded-full font-bold">
                        我的心情: {MOODS.find(m => m.id === selectedLog.my_mood)?.label || '未知'}
                      </span>
                      <span className="text-[8px] bg-white/60 border border-black/5 px-2 py-0.5 rounded-full font-bold">
                        伴侣: {MOODS.find(m => m.id === selectedLog.partner_mood)?.label || '未知'}
                      </span>
                    </div>

                    {/* Diary Detail block */}
                    <div className="space-y-1 pt-0.5">
                      <h4 className="text-xs font-black">
                        {selectedLog.diary_title || '📖 无标题日记'}
                      </h4>
                      {/* Render HTML content exactly to preserve highlights */}
                      <div 
                        className="text-xs opacity-80 leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: selectedLog.diary_content || '这一天还没有留下任何日记内容。' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs opacity-60 italic">
                    今天还没有记录心情日记，点击这里写下回忆吧 ✍️
                  </div>
                )}
              </div>
            </div>

          </React.Fragment>
        )}
      </div>

    </div>
  );
};
