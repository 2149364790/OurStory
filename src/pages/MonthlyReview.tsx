import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Calendar, Lock, Unlock, CheckCircle2, History, Clock, 
  Plus, Trash2, X, Sparkles, Smile 
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Calendar Date Picker Helpers
const getDaysInMonth = (year: number, month: number) => {
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  
  const days = [];
  
  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      day: prevMonthTotalDays - i,
      isCurrentMonth: false,
      monthOffset: -1,
    });
  }
  
  // Current month
  for (let i = 1; i <= totalDays; i++) {
    days.push({
      day: i,
      isCurrentMonth: true,
      monthOffset: 0,
    });
  }
  
  // Next month padding to 42 cells
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      monthOffset: 1,
    });
  }
  
  return days;
};

const monthsList = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

interface CommunicationLog {
  id: string;
  user_id: string;
  category: 'unhappy' | 'agenda' | 'reflection';
  content: string;
  reflection_action?: string;
  is_private: boolean;
  status: 'pending' | 'discussed';
  review_id?: string;
  created_at: string;
}

export const MonthlyReview: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentReview, setCurrentReview] = useState<any>(null);
  const [historyReviews, setHistoryReviews] = useState<any[]>([]);
  
  // Debug override state
  const [forceUnlock, setForceUnlock] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'logs' | 'plan' | 'history'>('logs');

  // Form states
  const [isChangingDate, setIsChangingDate] = useState(false);
  const [isInitiatingNew, setIsInitiatingNew] = useState(false);
  const [proposedDateInput, setProposedDateInput] = useState('');
  const [countdownText, setCountdownText] = useState('');

  // Custom picker calendar states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedHour, setSelectedHour] = useState(20);
  const [selectedMinute, setSelectedMinute] = useState(0);

  // Daily logs states
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logCategory, setLogCategory] = useState<'unhappy' | 'agenda' | 'reflection'>('unhappy');
  const [logContent, setLogContent] = useState('');
  const [logAction, setLogAction] = useState('');
  const [logIsPrivate, setLogIsPrivate] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Tea room states
  const [inTeaRoom, setInTeaRoom] = useState(false);
  const [teaRoomStep, setTeaRoomStep] = useState<number>(1);
  const [resolvedLogIds, setResolvedLogIds] = useState<string[]>([]);
  const [consensusText, setConsensusText] = useState('');
  const [isSubmittingConsensus, setIsSubmittingConsensus] = useState(false);

  // History logs states
  const [selectedHistoryReview, setSelectedHistoryReview] = useState<any | null>(null);
  const [selectedHistoryLogs, setSelectedHistoryLogs] = useState<any[]>([]);

  // Set default proposal date input to tomorrow at 20:00
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20);
    d.setMinutes(0);
    d.setSeconds(0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    setProposedDateInput(`${year}-${month}-${day}T${hours}:00`);
  }, []);

  // Synchronize calendar selection state from proposedDateInput
  useEffect(() => {
    if (proposedDateInput) {
      const parts = proposedDateInput.split('T');
      if (parts.length === 2) {
        const dateParts = parts[0].split('-');
        const timeParts = parts[1].split(':');
        if (dateParts.length === 3 && timeParts.length >= 2) {
          setCalendarYear(parseInt(dateParts[0], 10));
          setCalendarMonth(parseInt(dateParts[1], 10) - 1);
          setSelectedDay(parseInt(dateParts[2], 10));
          setSelectedHour(parseInt(timeParts[0], 10));
          setSelectedMinute(parseInt(timeParts[1], 10));
        }
      }
    }
  }, [proposedDateInput]);

  const updateProposedDateInput = (y: number, m: number, d: number, h: number, min: number) => {
    const month = String(m + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    const hour = String(h).padStart(2, '0');
    const minute = String(min).padStart(2, '0');
    setProposedDateInput(`${y}-${month}-${day}T${hour}:${minute}`);
  };

  const renderCustomDateTimePicker = (borderColorClass = 'border-rose-100', focusRingClass = 'focus:ring-rose-400') => {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`w-full px-4 py-2.5 text-left text-xs border ${borderColorClass} rounded-xl focus:outline-none focus:ring-2 ${focusRingClass} text-rose-800 bg-white flex items-center justify-between font-bold shadow-inner`}
        >
          <span className="flex items-center space-x-1.5">
            <Calendar size={13} className="text-rose-500 animate-pulse" />
            <span>{proposedDateInput.replace('T', ' ').replace(/-/g, '/')}</span>
          </span>
          <span className="text-[9px] text-rose-500 font-extrabold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100/30">选择时间 📅</span>
        </button>

        {showDatePicker && (
          <>
            <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]" onClick={() => setShowDatePicker(false)} />
            <div className="fixed bottom-[72px] left-4 right-4 md:absolute md:top-full md:bottom-auto md:left-0 md:right-0 mt-1 bg-white border border-rose-100 rounded-2xl p-4 shadow-xl z-50 animate-slide-up space-y-3 max-h-[60vh] overflow-y-auto">
              {/* Calendar Header */}
              <div className="flex justify-between items-center pb-2 border-b border-rose-50/50">
                <button
                  type="button"
                  onClick={() => {
                    let newMonth = calendarMonth - 1;
                    let newYear = calendarYear;
                    if (newMonth < 0) {
                      newMonth = 11;
                      newYear -= 1;
                    }
                    setCalendarMonth(newMonth);
                    setCalendarYear(newYear);
                  }}
                  className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 text-[10px] font-bold"
                >
                  ◀
                </button>
                <div className="flex space-x-1">
                  <span className="text-xs font-black text-rose-800">{calendarYear}年 {monthsList[calendarMonth]}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    let newMonth = calendarMonth + 1;
                    let newYear = calendarYear;
                    if (newMonth > 11) {
                      newMonth = 0;
                      newYear += 1;
                    }
                    setCalendarMonth(newMonth);
                    setCalendarYear(newYear);
                  }}
                  className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 text-[10px] font-bold"
                >
                  ▶
                </button>
              </div>

              {/* Week labels */}
              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-rose-400/80">
                {['日', '一', '二', '三', '四', '五', '六'].map(w => (
                  <div key={w}>{w}</div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(calendarYear, calendarMonth).map((item, idx) => {
                  let targetYear = calendarYear;
                  let targetMonth = calendarMonth + item.monthOffset;
                  if (targetMonth < 0) {
                    targetMonth = 11;
                    targetYear -= 1;
                  } else if (targetMonth > 11) {
                    targetMonth = 0;
                    targetYear += 1;
                  }
                  const isSelected = selectedDay === item.day && calendarMonth === targetMonth && calendarYear === targetYear;
                  
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!item.isCurrentMonth}
                      onClick={() => {
                        setSelectedDay(item.day);
                        updateProposedDateInput(targetYear, targetMonth, item.day, selectedHour, selectedMinute);
                      }}
                      className={`py-1 text-[10px] rounded-lg font-bold transition ${
                        isSelected
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                          : item.isCurrentMonth
                            ? 'text-rose-800 hover:bg-rose-50'
                            : 'text-rose-300 opacity-0 pointer-events-none'
                      }`}
                    >
                      {item.day}
                    </button>
                  );
                })}
              </div>

              {/* Time Selectors */}
              <div className="border-t border-rose-50/50 pt-2 flex flex-col space-y-1.5">
                <span className="text-[9px] font-extrabold text-rose-800 flex items-center">
                  <Clock size={10} className="mr-1 text-rose-500" />
                  时间选择
                </span>
                
                <div className="flex space-x-3 items-center">
                  <div className="flex-1 space-y-0.5">
                    <span className="text-[8px] font-bold text-rose-400 block text-center">小时</span>
                    <select
                      value={selectedHour}
                      onChange={(e) => {
                        const hour = parseInt(e.target.value, 10);
                        setSelectedHour(hour);
                        updateProposedDateInput(calendarYear, calendarMonth, selectedDay, hour, selectedMinute);
                      }}
                      className="w-full bg-rose-50/20 text-rose-800 border border-rose-100/50 rounded-xl py-1 px-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-rose-400"
                    >
                      {Array.from({ length: 24 }).map((_, h) => (
                        <option key={h} value={h}>{String(h).padStart(2, '0')} 点</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <span className="text-[8px] font-bold text-rose-400 block text-center">分钟</span>
                    <select
                      value={selectedMinute}
                      onChange={(e) => {
                        const min = parseInt(e.target.value, 10);
                        setSelectedMinute(min);
                        updateProposedDateInput(calendarYear, calendarMonth, selectedDay, selectedHour, min);
                      }}
                      className="w-full bg-rose-50/20 text-rose-800 border border-rose-100/50 rounded-xl py-1 px-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-rose-400"
                    >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                        <option key={m} value={m}>{String(m).padStart(2, '0')} 分</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowDatePicker(false)}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-[10px] transition active:scale-95 border border-rose-100/50"
              >
                确认选择
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // 1. 获取当前登录状态与账号变化监听 (仅挂载时执行一次)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. 当用户已登录或强制解锁状态变化时，拉取数据并建立实时同步 (绝无死循环)
  useEffect(() => {
    if (!currentUser) return;

    fetchProfiles();
    checkRoomAvailability();
    fetchHistory();
    fetchLogs();

    // Realtime changes listener for reviews
    const reviewChannel = supabase
      .channel('public:monthly_reviews_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_reviews' },
        () => {
          checkRoomAvailability();
          fetchHistory();
        }
      )
      .subscribe();

    // Realtime changes listener for logs
    const logsChannel = supabase
      .channel('public:communication_logs_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'communication_logs' },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reviewChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [currentUser, forceUnlock]);

  // Handle countdown updates
  useEffect(() => {
    if (!currentReview || currentReview.status !== 'agreed' || isRoomOpen) {
      setCountdownText('');
      return;
    }

    const calcAndSet = () => {
      const now = new Date().getTime();
      const target = new Date(currentReview.scheduled_date).getTime();
      const distance = target - now;

      if (distance <= 0) {
        // Time has passed - recheck room availability
        checkRoomAvailability();
        return false; // signal: stop interval
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setCountdownText(
        `${days > 0 ? `${days}天 ` : ''}${hours}小时 ${minutes}分 ${seconds}秒`
      );
      return true; // signal: keep going
    };

    // Run immediately so text shows at once (no 1-second blank flash)
    calcAndSet();

    const timer = setInterval(() => {
      const shouldContinue = calcAndSet();
      if (!shouldContinue) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentReview, isRoomOpen]);

  // Selected history review logs fetcher
  useEffect(() => {
    if (selectedHistoryReview) {
      supabase
        .from('communication_logs')
        .select('*')
        .eq('review_id', selectedHistoryReview.id)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (data) setSelectedHistoryLogs(data);
        });
    } else {
      setSelectedHistoryLogs([]);
    }
  }, [selectedHistoryReview]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data);
  };

  const fetchLogs = async () => {
    if (!currentUser) return;
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('communication_logs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setCommunicationLogs(data);
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchHistory = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('monthly_reviews')
      .select('*')
      .eq('status', 'agreed')
      .order('scheduled_date', { ascending: false });

    if (data) {
      // Filter only fully completed (submitted by both) reviews
      const history = data.filter(
        (r) => r.user_a_submitted && r.user_b_submitted
      );
      setHistoryReviews(history);
    }
  };

  const checkRoomAvailability = async () => {
    if (!currentUser) return;

    // Fetch the single latest review record overall
    const { data: list, error } = await supabase
      .from('monthly_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching latest review:', error);
      return;
    }

    const data = list && list.length > 0 ? list[0] : null;

    if (data) {
      setCurrentReview(data);
      const agreed = data.status === 'agreed';
      const scheduledTime = new Date(data.scheduled_date).getTime();
      const now = new Date().getTime();
      const hasTimePassed = now >= scheduledTime;
      const isCompleted = data.user_a_submitted && data.user_b_submitted;

      setIsRoomOpen(((agreed && hasTimePassed && !isCompleted) || forceUnlock));
    } else {
      setCurrentReview(null);
      setIsRoomOpen(forceUnlock);
    }
  };

  const formatProposedDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleProposeDate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !proposedDateInput) return;

    try {
      const parsedDate = new Date(proposedDateInput);
      if (isNaN(parsedDate.getTime())) {
        alert('请输入有效的日期与时间');
        return;
      }

      if (currentReview && currentReview.status === 'negotiating') {
        const updates: any = {
          proposed_date: parsedDate.toISOString(),
          last_proposer_id: currentUser.id,
        };

        if (currentReview.user_a_id !== currentUser.id && !currentReview.user_b_id) {
          updates.user_b_id = currentUser.id;
        }

        const { data, error } = await supabase
          .from('monthly_reviews')
          .update(updates)
          .eq('id', currentReview.id)
          .select()
          .single();

        if (error) throw error;
        setCurrentReview(data);
        setIsChangingDate(false);
      } else {
        // Create new review negotiation
        const newRecord = {
          scheduled_date: parsedDate.toISOString(),
          proposed_date: parsedDate.toISOString(),
          status: 'negotiating',
          last_proposer_id: currentUser.id,
          user_a_id: currentUser.id,
          user_a_submitted: false,
          user_b_submitted: false,
        };

        const { data, error } = await supabase
          .from('monthly_reviews')
          .insert(newRecord)
          .select()
          .single();

        if (error) throw error;
        setCurrentReview(data);
        setIsInitiatingNew(false);
      }
      checkRoomAvailability();

      // Send push notification to partner
      const partnerProfile = profiles.find((p) => p.id !== currentUser.id);
      const myProfile = profiles.find((p) => p.id === currentUser.id);
      if (partnerProfile) {
        const senderName = myProfile?.nickname || '伴侣';
        const formattedDate = formatProposedDateTime(parsedDate.toISOString());
        supabase.functions.invoke('send-push', {
          body: {
            recipient_id: partnerProfile.id,
            title: '约定时间变动 📅',
            body: `${senderName} 提议了新的约定时间：${formattedDate}，快去表态吧！`,
            url: '/review'
          }
        }).catch(err => console.error('Error invoking send-push:', err));
      }
    } catch (err: any) {
      alert('发送约定邀请失败: ' + err.message);
    }
  };

  const handleAcceptProposal = async () => {
    if (!currentReview || !currentUser) return;
    try {
      const updates: any = {
        status: 'agreed',
        scheduled_date: currentReview.proposed_date,
      };

      if (currentReview.user_a_id !== currentUser.id && !currentReview.user_b_id) {
        updates.user_b_id = currentUser.id;
      }

      const { data, error } = await supabase
        .from('monthly_reviews')
        .update(updates)
        .eq('id', currentReview.id)
        .select()
        .single();

      if (error) throw error;

      confetti({
        particleCount: 120,
        spread: 70,
        colors: ['#ffb3c1', '#ffc6ff', '#fee4e6', '#ff85a1'],
      });

      setCurrentReview(data);
      checkRoomAvailability();

      // Send push notification to partner
      const partnerProfile = profiles.find((p) => p.id !== currentUser.id);
      const myProfile = profiles.find((p) => p.id === currentUser.id);
      if (partnerProfile) {
        const senderName = myProfile?.nickname || '伴侣';
        supabase.functions.invoke('send-push', {
          body: {
            recipient_id: partnerProfile.id,
            title: '约定时间锁定 🎉',
            body: `${senderName} 同意了你提议的约定时间，已锁定倒计时！`,
            url: '/review'
          }
        }).catch(err => console.error('Error invoking send-push:', err));
      }
    } catch (err: any) {
      alert('同意约定失败: ' + err.message);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('确定要删除这条手记吗？')) return;
    try {
      const { error } = await supabase
        .from('communication_logs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchLogs();
    } catch (e: any) {
      alert('删除失败: ' + e.message);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !logContent.trim()) return;

    setIsSubmittingLog(true);
    try {
      const newLog = {
        user_id: currentUser.id,
        category: logCategory,
        content: logContent.trim(),
        reflection_action: logCategory === 'reflection' ? logAction.trim() : null,
        is_private: logCategory === 'agenda' ? false : logIsPrivate,
        status: 'pending',
      };

      const { error } = await supabase.from('communication_logs').insert(newLog);
      if (error) throw error;

      setLogContent('');
      setLogAction('');
      setLogIsPrivate(false);
      setShowLogModal(false);

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#a7f3d0', '#ffb3c1', '#fbcfe8'],
      });

      fetchLogs();
    } catch (e: any) {
      alert('记录失败: ' + e.message);
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const handleFinishReview = async () => {
    if (!currentUser || !currentReview || !consensusText.trim()) return;

    setIsSubmittingConsensus(true);
    try {
      // 1. Update review to completed
      const { error: reviewError } = await supabase
        .from('monthly_reviews')
        .update({
          suggestions: consensusText.trim(),
          user_a_submitted: true,
          user_b_submitted: true,
        })
        .eq('id', currentReview.id);

      if (reviewError) throw reviewError;

      // 2. Archive all current pending logs
      const { error: logsError } = await supabase
        .from('communication_logs')
        .update({
          status: 'discussed',
          review_id: currentReview.id,
        })
        .eq('status', 'pending');

      if (logsError) throw logsError;

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#fb7185', '#fbcfe8', '#fbbf24', '#34d399', '#60a5fa'],
      });

      setInTeaRoom(false);
      setTeaRoomStep(1);
      setConsensusText('');
      setResolvedLogIds([]);

      checkRoomAvailability();
      fetchHistory();
      fetchLogs();
    } catch (e: any) {
      alert('保存约定失败: ' + e.message);
    } finally {
      setIsSubmittingConsensus(false);
    }
  };

  const getProfileNickname = (userId: string) => {
    const prof = profiles.find((p) => p.id === userId);
    return prof ? prof.nickname : '伴侣';
  };

  const formatReviewDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 约定日`;
  };

  const getLogCategoryDetails = (cat: 'unhappy' | 'agenda' | 'reflection') => {
    switch (cat) {
      case 'unhappy':
        return { label: '💔 摩擦与委屈', border: 'border-rose-100 bg-rose-50/20', badge: 'bg-rose-100 text-rose-700' };
      case 'reflection':
        return { label: '🌱 自省与改正', border: 'border-emerald-100 bg-emerald-50/20', badge: 'bg-emerald-100 text-emerald-700' };
      case 'agenda':
        return { label: '📋 下期议题', border: 'border-indigo-100 bg-indigo-50/20', badge: 'bg-indigo-100 text-indigo-700' };
    }
  };

  return (
    <div className="px-4 pt-4 pb-24 relative z-10">
      
      {/* Dev Switch */}
      <div className="max-w-md mx-auto mb-4 flex justify-end">
        <label className="inline-flex items-center cursor-pointer bg-white/40 border border-white/50 px-3 py-1.5 rounded-full text-[10px] text-rose-700 font-bold shadow-sm">
          <input
            type="checkbox"
            checked={forceUnlock}
            onChange={(e) => setForceUnlock(e.target.checked)}
            className="sr-only peer"
          />
          <span className="mr-2">🔧 开发者调试解锁</span>
          <div className="relative w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500"></div>
        </label>
      </div>

      <div className="max-w-md mx-auto space-y-6">

        {/* Global Banner for Active Tea Room */}
        {isRoomOpen && !inTeaRoom && (
          <div className="bg-gradient-to-r from-amber-500 to-rose-500 text-white p-4 rounded-3xl text-center space-y-2.5 shadow-lg shadow-rose-200/50 animate-glow-breath">
            <div className="flex items-center justify-center space-x-1.5">
              <Sparkles size={14} className="text-amber-200 animate-pulse" />
              <p className="text-xs font-black">🛋️ 约定日已开启！双人沟通茶室就绪</p>
            </div>
            <button
              onClick={() => setInTeaRoom(true)}
              className="bg-white text-rose-600 hover:bg-rose-50 px-5 py-2 rounded-full text-[10px] font-black shadow-md transition active:scale-95 flex items-center justify-center space-x-1 mx-auto"
            >
              <span>开启双人沟通茶室 ➔</span>
            </button>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex border border-rose-100/50 bg-white/40 backdrop-blur-md rounded-2xl p-1 shadow-inner">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition duration-300 ${
              activeTab === 'logs' ? 'bg-rose-500 text-white shadow-md' : 'text-rose-800 hover:bg-rose-50/50'
            }`}
          >
            📝 沟通手记
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition duration-300 ${
              activeTab === 'plan' ? 'bg-rose-500 text-white shadow-md' : 'text-rose-800 hover:bg-rose-50/50'
            }`}
          >
            🗓️ 约定计划
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition duration-300 ${
              activeTab === 'history' ? 'bg-rose-500 text-white shadow-md' : 'text-rose-800 hover:bg-rose-50/50'
            }`}
          >
            📜 时光约定墙
          </button>
        </div>

        {/* Tab 1: Daily Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            
            {/* Create Trigger Card */}
            <div className="glass-panel rounded-2xl p-4 flex justify-between items-center bg-white/50 shadow-inner">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-rose-800 block">📝 沟通手记</span>
                <span className="text-[9px] text-rose-600/70 font-medium block">随时记录不快、议题或自我反思</span>
              </div>
              <button
                onClick={() => setShowLogModal(true)}
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold p-2.5 rounded-full transition active:scale-95 shadow-md shadow-rose-200 flex items-center justify-center"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Logs List */}
            {isLoadingLogs ? (
              <div className="text-center py-8 text-xs text-rose-500 font-bold">
                正在加载手记...
              </div>
            ) : (
              <div className="space-y-4">
                {communicationLogs.length === 0 ? (
                  <div className="glass-panel rounded-2xl p-8 text-center space-y-3 bg-white/40">
                    <div className="text-3xl animate-bounce">✍️</div>
                    <p className="text-xs text-rose-700/60 font-black">平时有什么不开心、自省或议题吗？</p>
                    <p className="text-[10px] text-rose-500/80">点击上方的“+”记录下来，在约定日一同解开温情心结。</p>
                  </div>
                ) : (
                  communicationLogs.map((log) => {
                    const isMine = log.user_id === currentUser?.id;
                    const writerProfile = profiles.find((p) => p.id === log.user_id);
                    const writerNickname = isMine ? '我' : (writerProfile?.nickname || '伴侣');
                    const isPartnerPrivate = !isMine && log.is_private;

                    if (isPartnerPrivate) {
                      return (
                        <div key={log.id} className="glass-panel rounded-2xl p-4 border border-dashed border-rose-200 text-center relative overflow-hidden bg-white/40 min-h-[90px] flex flex-col justify-center items-center">
                          <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center z-10">
                            <Lock size={14} className="text-rose-400 mb-1 animate-pulse" />
                            <span className="text-[10px] text-rose-800 font-extrabold">{writerNickname} 记下了一篇神秘手记</span>
                            <span className="text-[8px] text-rose-500/80">🔒 约定日当天自动解锁</span>
                          </div>
                          <div className="opacity-10 pointer-events-none select-none text-[8px] text-left w-full space-y-1">
                            <div>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</div>
                            <div>Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</div>
                          </div>
                        </div>
                      );
                    }

                    const details = getLogCategoryDetails(log.category);

                    return (
                      <div key={log.id} className={`glass-panel rounded-2xl p-4 border ${details.border} space-y-2.5 transition duration-300 hover:shadow-md bg-white/50 relative overflow-hidden`}>
                        
                        {/* Header */}
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded-full ${details.badge} text-[8px] font-black`}>
                              {details.label}
                            </span>
                            <span className="text-rose-700/60">
                              由 <span className="text-rose-800">{writerNickname}</span> 记录
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {log.is_private && isMine && (
                              <span className="text-[8px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 flex items-center">
                                <Clock size={8} className="mr-0.5" />
                                🤫 约定日可见
                              </span>
                            )}
                            {isMine && (
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition"
                                title="删除"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <p className="text-xs text-rose-900 leading-relaxed whitespace-pre-wrap font-medium">
                          {log.content}
                        </p>

                        {/* Action Details */}
                        {log.category === 'reflection' && log.reflection_action && (
                          <div className="bg-emerald-50/30 border border-emerald-100/45 rounded-xl p-2.5 text-[10px] space-y-1">
                            <span className="font-extrabold text-emerald-800 block">💡 我的改正计划：</span>
                            <p className="text-emerald-700 font-medium whitespace-pre-wrap leading-relaxed">{log.reflection_action}</p>
                          </div>
                        )}

                        {/* Created time */}
                        <div className="text-[8px] text-rose-500/50 text-right font-medium">
                          {new Date(log.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Scheduling (Plan) */}
        {activeTab === 'plan' && (
          <div className={`space-y-6 max-w-sm mx-auto relative ${showDatePicker ? 'z-50' : ''}`}>
            
            {/* Negotiation Card */}
            {!currentReview || isInitiatingNew || (currentReview.user_a_submitted && currentReview.user_b_submitted) ? (
              <div className="glass-panel rounded-3xl p-6 text-center space-y-4 custom-shadow bg-white/70">
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto animate-float-left">
                  <Calendar size={28} />
                </div>
                <h2 className="text-sm font-extrabold text-rose-800">🗓️ 商定约定时间</h2>
                <p className="text-[10px] text-rose-600/80 leading-relaxed font-medium">
                  请选择一个彼此都舒服的时间，向 Ta 发起下一次约定邀约吧！
                </p>
                <form onSubmit={handleProposeDate} className="space-y-3 pt-2">
                  {renderCustomDateTimePicker('border-rose-100', 'focus:ring-rose-400')}
                  <div className="flex space-x-2">
                    {isInitiatingNew && (
                      <button
                        type="button"
                        onClick={() => setIsInitiatingNew(false)}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl transition text-xs"
                      >
                        返回
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 px-4 rounded-xl transition active:scale-95 text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-rose-200"
                    >
                      <span>🚀 发起邀约</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : currentReview.status === 'negotiating' ? (
              <div className="glass-panel rounded-3xl p-6 text-center space-y-4 custom-shadow bg-white/70">
                {currentReview.last_proposer_id === currentUser?.id ? (
                  // Waiting for partner
                  <>
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <Clock size={28} />
                    </div>
                    <h2 className="text-sm font-extrabold text-amber-800">⏳ 等待伴侣答复中</h2>
                    <div className="text-[10px] text-amber-700/80 leading-relaxed font-medium">
                      你已发送邀约，提议在以下时间见面：
                      <span className="block mt-1 bg-amber-100/50 text-amber-800 py-1.5 px-3 rounded-lg font-bold">
                        {formatProposedDateTime(currentReview.proposed_date)}
                      </span>
                      正在等候 Ta 的答复。
                    </div>
                    
                    {!isChangingDate ? (
                      <button
                        onClick={() => setIsChangingDate(true)}
                        className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold py-2.5 px-4 rounded-xl transition active:scale-95 text-xs flex items-center justify-center space-x-1.5"
                      >
                        <span>✏️ 修改提议时间</span>
                      </button>
                    ) : (
                      <form onSubmit={handleProposeDate} className="space-y-3 pt-2">
                        {renderCustomDateTimePicker('border-amber-100/70', 'focus:ring-amber-400')}
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setIsChangingDate(false)}
                            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl transition text-xs"
                          >
                            取消
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition text-xs shadow-md shadow-amber-200"
                          >
                            提交修改
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                ) : (
                  // Received proposal
                  <>
                    <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                      <Unlock size={28} />
                    </div>
                    <h2 className="text-sm font-extrabold text-rose-800">💞 收到伴侣的邀约！</h2>
                    <div className="text-[10px] text-rose-700/80 leading-relaxed font-medium">
                      伴侣 **{getProfileNickname(currentReview.last_proposer_id)}** 提议了约定时间：
                      <span className="block mt-1 bg-rose-50 text-rose-800 py-1.5 px-3 rounded-lg font-bold border border-rose-100">
                        {formatProposedDateTime(currentReview.proposed_date)}
                      </span>
                    </div>

                    {!isChangingDate ? (
                      <div className="space-y-2 pt-2">
                        <button
                          onClick={handleAcceptProposal}
                          className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-4 rounded-xl transition active:scale-95 text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-rose-200"
                        >
                          <span>👍 欣然应邀</span>
                        </button>
                        <button
                          onClick={() => setIsChangingDate(true)}
                          className="w-full bg-white border border-rose-200 hover:bg-rose-50/50 text-rose-600 font-bold py-2.5 px-4 rounded-xl transition active:scale-95 text-xs"
                        >
                          <span>⏰ 换个时间</span>
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleProposeDate} className="space-y-3 pt-2">
                        {renderCustomDateTimePicker('border-rose-100', 'focus:ring-rose-400')}
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setIsChangingDate(false)}
                            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl transition text-xs"
                          >
                            取消
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition text-xs shadow-md shadow-rose-200"
                          >
                            提交反建议
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            ) : (
              // Status === 'agreed' (locked countdown / active screen)
              <div className="glass-panel rounded-3xl p-6 text-center space-y-4 custom-shadow bg-white/70">
                
                {isRoomOpen ? (
                  // Room Active View
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                      <Unlock size={28} className="text-rose-500" />
                    </div>
                    <h2 className="text-sm font-extrabold text-rose-800">🛋️ 双人沟通时刻到啦！</h2>
                    <p className="text-[10px] text-rose-600/80 leading-relaxed font-medium">
                      这是属于你们的静心沟通时间。去一个安静放松的地方，抱着抱容的心，点击下方开启茶室吧。
                    </p>
                    <button
                      onClick={() => setInTeaRoom(true)}
                      className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-4 rounded-xl transition active:scale-95 text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-rose-200 animate-timer-beat"
                    >
                      <span>🛋️ 开启双人沟通茶室</span>
                    </button>
                  </div>
                ) : (
                  // Countdown View
                  <>
                    <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto animate-glow-breath">
                      <Lock size={28} />
                    </div>
                    <h2 className="text-sm font-extrabold text-rose-800">🔒 约定达成，静候开启</h2>
                    <div className="text-[10px] text-rose-600/80 leading-relaxed font-medium">
                      约定已达成！约定于以下时间见面：
                      <span className="block mt-1 bg-rose-50 text-rose-800 py-1.5 px-3 rounded-lg font-bold border border-rose-100">
                        {formatProposedDateTime(currentReview.scheduled_date)}
                      </span>
                    </div>
                    
                    {/* Countdown display */}
                    <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-2xl py-3 px-4 text-center shadow-inner">
                      <span className="text-[9px] text-rose-500 font-bold block mb-1">⏱️ 距离见面还有</span>
                      <span className="text-xs font-black text-rose-600 tracking-wider font-mono">
                        {countdownText || '正在计算...'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: History Wall */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-rose-800 flex items-center pl-1">
              <History size={14} className="mr-1.5" />
              过往约定足迹 ({historyReviews.length})
            </h3>

            {historyReviews.length === 0 ? (
              <div className="glass-panel rounded-2xl p-6 text-center text-rose-700/60 text-xs font-medium">
                暂无历史约定足迹。
              </div>
            ) : (
              <div className="space-y-3">
                {historyReviews.map((rev) => (
                  <button
                    key={rev.id}
                    onClick={() => setSelectedHistoryReview(rev)}
                    className="w-full glass-panel rounded-2xl p-4 flex justify-between items-center text-xs font-bold text-rose-800 bg-white/40 hover:bg-white/60 transition duration-200 text-left border border-rose-100/50 shadow-sm"
                  >
                    <span className="flex items-center">
                      <CheckCircle2 size={14} className="mr-2 text-green-500" />
                      {formatReviewDate(rev.scheduled_date)}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[9px] text-rose-500 font-extrabold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100/30">
                        已达成 🎉
                      </span>
                      <span className="text-[9px] text-rose-400">查看 ➔</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ================================================= */}
      {/* 弹出层: 记一笔 (Daily Log Editor) */}
      {/* ================================================= */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 shadow-2xl w-full max-w-sm border border-rose-100 animate-slide-up space-y-4">
            
            {/* Title */}
            <div className="flex justify-between items-center pb-2 border-b border-rose-50">
              <span className="text-xs font-black text-rose-800 flex items-center">
                <Smile size={14} className="mr-1 text-rose-500 animate-bounce" />
                记下此刻的想法
              </span>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-rose-50 rounded-lg"
              >
                <X size={14} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddLog} className="space-y-4">
              
              {/* Category selector */}
              <div className="space-y-1">
                <span className="text-[9px] font-black text-rose-500 block">选择分类：</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { cat: 'unhappy', label: '💔 委屈摩擦', desc: '发生摩擦或不舒服' },
                    { cat: 'reflection', label: '🌱 自我反思', desc: '反思改正自身问题' },
                    { cat: 'agenda', label: '📋 讨论议题', desc: '下次想商量的大事' }
                  ].map((item) => (
                    <button
                      key={item.cat}
                      type="button"
                      onClick={() => {
                        setLogCategory(item.cat as any);
                        if (item.cat === 'agenda') setLogIsPrivate(false);
                      }}
                      className={`py-2 px-1 text-[10px] font-bold border rounded-xl flex flex-col items-center justify-center space-y-0.5 transition active:scale-95 ${
                        logCategory === item.cat 
                          ? 'border-rose-450 bg-rose-50 text-rose-700 shadow-inner' 
                          : 'border-gray-100 text-gray-500 hover:bg-gray-50/50'
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content textarea */}
              <div className="space-y-1">
                <span className="text-[9px] font-black text-rose-500 block">具体内容：</span>
                <textarea
                  value={logContent}
                  onChange={(e) => setLogContent(e.target.value)}
                  placeholder={
                    logCategory === 'unhappy' 
                      ? '这一个月中什么事情让你感到不舒服了，或者对方说了什么话让你觉得委屈？在这写下，约定日一同商量解决...' 
                      : logCategory === 'reflection' 
                        ? '突然发现自己哪些地方做得不对，或者在相处时有些任性？在这里反思一下...'
                        : '有什么大事是想要下个约定日面对面重点商量决定的？（如金钱管理、坏习惯改掉、出游计划等）'
                  }
                  required
                  rows={4}
                  className="w-full bg-rose-50/15 border border-rose-100 rounded-xl p-3 text-xs text-rose-950 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white shadow-inner"
                />
              </div>

              {/* Reflection action input (if reflection) */}
              {logCategory === 'reflection' && (
                <div className="space-y-1 animate-slide-up">
                  <span className="text-[9px] font-black text-emerald-600 block">🤔 我打算怎么改正：</span>
                  <textarea
                    value={logAction}
                    onChange={(e) => setLogAction(e.target.value)}
                    placeholder="写下具体改进方案，如：下次情绪上来时，先深呼吸并离开现场5分钟，不口不择言..."
                    required
                    rows={2}
                    className="w-full bg-emerald-50/15 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:bg-white shadow-inner"
                  />
                </div>
              )}

              {/* Private toggle (except agenda) */}
              {logCategory !== 'agenda' && (
                <div className="flex items-center justify-between bg-rose-50/30 p-2.5 rounded-xl border border-rose-100/40">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-rose-700 block">🤫 约定日才让 Ta 看到</span>
                    <span className="text-[8px] text-rose-500/70 block">开启后平时隐藏，防止即时微信吵架</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={logIsPrivate}
                      onChange={(e) => setLogIsPrivate(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl transition text-xs"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLog || !logContent.trim()}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-350 text-white font-bold py-2 px-4 rounded-xl transition active:scale-95 text-xs shadow-md shadow-rose-200"
                >
                  {isSubmittingLog ? '记录中...' : '记录下来 💖'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* 全屏全沉浸模式: 双人沟通茶室 (Tea Room) */}
      {/* ================================================= */}
      {inTeaRoom && (
        <div className="fixed inset-0 z-[150] bg-gradient-to-br from-[#fdf6f0] via-[#fee4e6] to-[#fceade] overflow-y-auto p-4 flex flex-col items-center justify-between pb-8 select-none">
          
          {/* Tea Room Header */}
          <div className="w-full max-w-md flex justify-between items-center py-4 border-b border-rose-200/50">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🛋️</span>
              <div className="text-left">
                <h2 className="text-xs font-black text-rose-900">约定沟通茶室</h2>
                <span className="text-[8px] text-rose-600/70 block">放下杂念，倾听彼此的心声</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (window.confirm('确定退出茶室吗？日常手记仍会保存，不会丢失数据。')) {
                  setInTeaRoom(false);
                  setTeaRoomStep(1);
                }
              }}
              className="px-2.5 py-1 bg-white/50 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-full text-[9px] font-black transition active:scale-95 shadow-2xs"
            >
              退出茶室
            </button>
          </div>

          {/* Tea Room Main Container */}
          <div className="w-full max-w-md flex-1 py-6 flex flex-col justify-start">
            
            {/* Steps Guide Indicator */}
            <div className="flex justify-between items-center mb-6 px-4">
              {[
                { step: 1, label: '🌱 聆听自省' },
                { step: 2, label: '💔 探讨议题' },
                { step: 3, label: '✍️ 达成共识' }
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center space-y-1 flex-1 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                    teaRoomStep >= s.step ? 'bg-rose-500 text-white shadow-md' : 'bg-rose-200/50 text-rose-700/60'
                  }`}>
                    {s.step}
                  </div>
                  <span className={`text-[8px] font-black transition-all ${
                    teaRoomStep === s.step ? 'text-rose-800 scale-105' : 'text-rose-700/50'
                  }`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 1: Reflections */}
            {teaRoomStep === 1 && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="bg-white/50 border border-emerald-100 rounded-2xl p-4 text-center space-y-1.5 shadow-inner">
                    <span className="text-xl animate-bounce block">🌱</span>
                    <h3 className="text-xs font-black text-emerald-800">第一阶段：聆听自省</h3>
                    <p className="text-[9px] text-emerald-700/80 leading-relaxed font-medium">
                      以真诚的自省开场，倾听彼此在相处中反思出的不足以及改进的具体行动。
                    </p>
                  </div>

                  {communicationLogs.filter(l => l.category === 'reflection').length === 0 ? (
                    <div className="glass-panel border border-dashed border-emerald-150 rounded-2xl p-8 text-center text-[10px] font-black text-emerald-800 bg-white/40">
                      本期暂无自省记录。可以直接进行下一步。
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                      {communicationLogs.filter(l => l.category === 'reflection').map((log) => {
                        const isMine = log.user_id === currentUser?.id;
                        const writerProfile = profiles.find(p => p.id === log.user_id);
                        const writerNickname = isMine ? '我' : (writerProfile?.nickname || '伴侣');
                        
                        return (
                          <div key={log.id} className="glass-panel border border-emerald-250 rounded-2xl p-4 space-y-2.5 bg-white/60 font-love-letter text-left shadow-2xs">
                            <div className="flex justify-between items-center text-[8px] font-black text-emerald-700/70 border-b border-emerald-100 pb-1.5">
                              <span>🌱 {writerNickname} 的反思</span>
                              <span>{new Date(log.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-emerald-950 leading-relaxed whitespace-pre-wrap font-medium">{log.content}</p>
                            {log.reflection_action && (
                              <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-2.5 text-[9px] mt-2 space-y-1 shadow-inner">
                                <span className="font-extrabold text-emerald-850 block">💡 改进的具体行动：</span>
                                <p className="text-emerald-700 font-medium whitespace-pre-wrap leading-relaxed">{log.reflection_action}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setTeaRoomStep(2)}
                  className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs transition active:scale-95 shadow-md shadow-rose-200/50"
                >
                  下一步：探讨议题与心结 (共 {communicationLogs.filter(l => l.category !== 'reflection').length} 条) ➔
                </button>
              </div>
            )}

            {/* Step 2: Unhappy / Agenda */}
            {teaRoomStep === 2 && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="bg-white/50 border border-rose-100 rounded-2xl p-4 text-center space-y-1.5 shadow-inner">
                    <span className="text-xl animate-bounce block">💔</span>
                    <h3 className="text-xs font-black text-rose-800">第二阶段：探讨议题与心结</h3>
                    <p className="text-[9px] text-rose-700/80 leading-relaxed font-medium">
                      平时隐藏的手记均已解锁。面对面沟通这些卡片，讨论并释怀后，将其标记为“达成一致”。
                    </p>
                  </div>

                  {communicationLogs.filter(l => l.category !== 'reflection').length === 0 ? (
                    <div className="glass-panel border border-dashed border-rose-150 rounded-2xl p-8 text-center text-[10px] font-black text-rose-800 bg-white/40">
                      本期暂无摩擦心结与商议议题记录。可以直接进行下一步。
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                      {communicationLogs.filter(l => l.category !== 'reflection').map((log) => {
                        const isMine = log.user_id === currentUser?.id;
                        const writerProfile = profiles.find(p => p.id === log.user_id);
                        const writerNickname = isMine ? '我' : (writerProfile?.nickname || '伴侣');
                        const isResolved = resolvedLogIds.includes(log.id);

                        let cardBorder = log.category === 'unhappy' ? 'border-rose-200' : 'border-indigo-200';
                        let logTypeLabel = log.category === 'unhappy' ? '💔 委屈' : '📋 议题';
                        let badgeColor = log.category === 'unhappy' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700';

                        return (
                          <div
                            key={log.id}
                            className={`glass-panel border rounded-2xl p-4 space-y-2 bg-white/60 transition duration-300 relative text-left shadow-2xs ${cardBorder} ${
                              isResolved ? 'opacity-40 grayscale-[40%] line-through scale-[0.98]' : ''
                            }`}
                          >
                            <div className="flex justify-between items-center text-[8px] font-black border-b border-black/5 pb-1.5">
                              <div className="flex items-center space-x-1.5">
                                <span className={`px-1.5 py-0.5 rounded-full ${badgeColor} text-[7px]`}>{logTypeLabel}</span>
                                <span className="text-rose-800">{writerNickname} 的记录</span>
                              </div>
                              <button
                                onClick={() => {
                                  if (isResolved) {
                                    setResolvedLogIds(resolvedLogIds.filter(id => id !== log.id));
                                  } else {
                                    setResolvedLogIds([...resolvedLogIds, log.id]);
                                    confetti({
                                      particleCount: 15,
                                      spread: 30,
                                      origin: { y: 0.8 },
                                      colors: ['#ff85a1', '#ffccd5'],
                                    });
                                  }
                                }}
                                className={`px-2 py-0.5 rounded-full text-[8px] font-black transition ${
                                  isResolved ? 'bg-green-500 text-white' : 'bg-rose-50 text-rose-600 border border-rose-200'
                                }`}
                              >
                                {isResolved ? '✓ 已达成' : '标记达成'}
                              </button>
                            </div>
                            <p className="text-xs text-rose-950 leading-relaxed whitespace-pre-wrap font-medium">{log.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setTeaRoomStep(1)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs transition"
                  >
                    返回第一步
                  </button>
                  <button
                    onClick={() => setTeaRoomStep(3)}
                    className="flex-2 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs transition active:scale-95 shadow-md shadow-rose-200/50"
                  >
                    下一步：落笔新约定 ➔
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Shared Consensus */}
            {teaRoomStep === 3 && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="bg-white/50 border border-amber-100 rounded-2xl p-4 text-center space-y-1.5 shadow-inner">
                    <span className="text-xl animate-bounce block">✍️</span>
                    <h3 className="text-xs font-black text-amber-800">第三阶段：共同敲定新共识</h3>
                    <p className="text-[9px] text-amber-700/80 leading-relaxed font-medium">
                      沟通完毕！写下属于你们两人的“新共识与约定”，确认后它将被永久锁入时光墙中。
                    </p>
                  </div>

                  <div className="space-y-1 text-left">
                    <span className="text-[10px] font-black text-rose-900 block pl-1">📝 我们的约定共识：</span>
                    <textarea
                      value={consensusText}
                      onChange={(e) => setConsensusText(e.target.value)}
                      placeholder="例如：
1. 相处中有误会先给对方一个拥抱，不以冷战或愤怒文字收尾。
2. 以后每个周末两人分工做一次大扫除，不再为家务推脱。
3. 发生不开心时，说出“我感到不舒服”而不是埋怨对方做错了什么。"
                      required
                      className="w-full bg-white/70 border border-rose-100 rounded-2xl p-4 text-xs font-medium text-rose-955 focus:outline-none focus:ring-2 focus:ring-rose-450 focus:bg-white shadow-inner h-[220px]"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setTeaRoomStep(2)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs transition animate-active"
                  >
                    返回上一步
                  </button>
                  <button
                    onClick={handleFinishReview}
                    disabled={isSubmittingConsensus || !consensusText.trim()}
                    className="flex-2 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-bold rounded-2xl text-xs transition active:scale-95 shadow-md shadow-rose-200/50 flex items-center justify-center space-x-2"
                  >
                    {isSubmittingConsensus ? (
                      <span>正在锁入时光墙...</span>
                    ) : (
                      <span>🤝 确认并归档约定</span>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* 弹出层: 时光约定信件 (History Footprint Detail Modal) */}
      {/* ================================================= */}
      {selectedHistoryReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
          <div className="w-full max-w-md letter-theme-vintage rounded-3xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto font-love-letter text-left border border-[#e6d3af] bg-gradient-to-b from-[#fcf8f2] to-[#f5ecd8]">
            
            {/* Close */}
            <button
              onClick={() => setSelectedHistoryReview(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 p-1.5 hover:bg-black/5 rounded-full transition"
            >
              <X size={15} />
            </button>

            <div className="space-y-5 pt-2">
              
              {/* Header */}
              <div className="text-center space-y-1">
                <span className="text-[9px] text-amber-800 font-black block tracking-widest">📜 时光约定信件</span>
                <h3 className="text-sm font-black text-amber-950">
                  {formatReviewDate(selectedHistoryReview.scheduled_date)}
                </h3>
              </div>

              {/* Suggestions / Agreements */}
              <div className="space-y-2 border-t border-dashed border-amber-900/20 pt-4">
                <span className="text-xs font-black text-amber-900 flex items-center">
                  🤝 两人的新约定与共识
                </span>
                <div className="bg-white/50 border border-amber-900/10 rounded-2xl p-4 text-xs text-amber-955 whitespace-pre-wrap leading-relaxed font-sans shadow-inner">
                  {selectedHistoryReview.suggestions || '本次约定没有记录具体的新约定文本。'}
                </div>
              </div>

              {/* Logs associated */}
              <div className="space-y-3 border-t border-dashed border-amber-900/20 pt-4">
                <span className="text-xs font-black text-amber-900 flex items-center">
                  🌱 当期探讨的沟通手记 ({selectedHistoryLogs.length})
                </span>
                
                {selectedHistoryLogs.length === 0 ? (
                  <p className="text-[10px] text-amber-800/60 text-center py-2">无关联的手记记录。</p>
                ) : (
                  <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
                    {selectedHistoryLogs.map((log) => {
                      const isMine = log.user_id === currentUser?.id;
                      const writerProfile = profiles.find((p) => p.id === log.user_id);
                      const writerNickname = isMine ? '我' : (writerProfile?.nickname || '伴侣');
                      
                      let details = getLogCategoryDetails(log.category);

                      return (
                        <div key={log.id} className={`border rounded-xl p-2.5 text-[10px] leading-relaxed space-y-1 bg-white/40 shadow-2xs font-sans ${details.border}`}>
                          <div className="flex justify-between items-center text-[8px] font-black border-b border-black/5 pb-1 mb-1">
                            <span className="text-rose-900">[{details.label}] 由 {writerNickname} 记录</span>
                            <span>{new Date(log.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="font-medium text-rose-950">{log.content}</p>
                          {log.category === 'reflection' && log.reflection_action && (
                            <div className="mt-1 pt-1 border-t border-dashed border-emerald-900/15 font-black text-emerald-850">
                              改正行动: {log.reflection_action}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MonthlyReview;
