import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Tasks } from './pages/Tasks';
import { Whispers } from './pages/Whispers';
import { MonthlyReview } from './pages/MonthlyReview';
import { Checklist } from './pages/Checklist';
import { PartnerWiki } from './pages/PartnerWiki';
import { Navbar } from './components/Navbar';
import { CustomModal } from './components/CustomModal';
import { RoleSelectionModal } from './components/RoleSelectionModal';
import { Heart, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

const ServiceWorkerNavigator: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NAVIGATE') {
          navigate(event.data.url);
        }
      };
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [navigate]);
  return null;
};

export const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('sunset');
  const [hasUnreadWhispers, setHasUnreadWhispers] = useState(false);
  const [hasUnreadChecklist, setHasUnreadChecklist] = useState(false);
  const [hasReviewProposal, setHasReviewProposal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const profilesRef = React.useRef<any[]>([]);

  // Polaroid Love Card states
  const [unreadLoveCard, setUnreadLoveCard] = useState<any | null>(null);
  const [showQuickReturn, setShowQuickReturn] = useState(false);
  const [isTeaRoomActive, setIsTeaRoomActive] = useState(false);

  // Role selection states
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  // PWA 一键更新 Banner
  const [pwaUpdateFn, setPwaUpdateFn] = useState<(() => void) | null>(null);

  // Global custom styled dialog state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  useEffect(() => {
    (window as any).showCustomConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
      setModalConfig({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        onConfirm: () => {
          onConfirm();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          if (onCancel) onCancel();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      });
    };

    (window as any).showCustomAlert = (title: string, message: string) => {
      setModalConfig({
        isOpen: true,
        title,
        message,
        type: 'alert',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    };
  }, []);

  useEffect(() => {
    const handleTeaRoomStatus = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsTeaRoomActive(!!customEvent.detail);
    };
    window.addEventListener('tea-room-status', handleTeaRoomStatus);
    return () => {
      window.removeEventListener('tea-room-status', handleTeaRoomStatus);
    };
  }, []);

  // ── PWA 新版本更新检测 ─────────────────────────────────────────────
  useEffect(() => {
    const handlePwaUpdate = (e: Event) => {
      const { updateSW } = (e as CustomEvent).detail;
      setPwaUpdateFn(() => () => updateSW(true));
    };
    window.addEventListener('pwa-update-available', handlePwaUpdate);
    return () => window.removeEventListener('pwa-update-available', handlePwaUpdate);
  }, []);

  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  useEffect(() => {
    if (!session?.user) {
      setProfiles([]);
      return;
    }

    const fetchProfiles = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) setProfiles(data);
    };

    fetchProfiles();

    // Listen for profiles changes (realtime)
    const profilesChannel = supabase
      .channel('app:profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, [session]);

  // Detect role selection status
  useEffect(() => {
    if (!session?.user || profiles.length === 0) return;
    const myProfile = profiles.find(p => p.id === session.user.id);
    if (myProfile && !myProfile.gender) {
      setShowRoleSelection(true);
    }
  }, [profiles, session]);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoading(false);
      if (currentSession?.user) {
        checkUnreadWhispers(currentSession.user.id);
        checkUnreadChecklist(currentSession.user.id);
        checkReviewProposal(currentSession.user.id);
      }
    });

    // Listen for auth status changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        checkUnreadWhispers(currentSession.user.id);
        checkUnreadChecklist(currentSession.user.id);
        checkReviewProposal(currentSession.user.id);
      } else {
        setHasUnreadWhispers(false);
        setHasUnreadChecklist(false);
        setHasReviewProposal(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    // Query initial theme config
    supabase.from('couple_config')
      .select('bg_theme')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single()
      .then(({ data }) => {
        if (data) setTheme(data.bg_theme);
      });

    // Scan initial unread notifications & interactions
    checkUnreadWhispers(session.user.id);
    checkUnreadChecklist(session.user.id);
    fetchUnreadInteractions(session.user.id);
    checkReviewProposal(session.user.id);

    // Listen for realtime review changes
    const reviewChannel = supabase
      .channel('app:monthly_reviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_reviews' },
        () => {
          checkReviewProposal(session.user.id);
        }
      )
      .subscribe();

    // Listen for config changes
    const configChannel = supabase
      .channel('app:couple_config')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_config' },
        (payload) => {
          if (payload.new) {
            setTheme((payload.new as any).bg_theme);
          }
        }
      )
      .subscribe();

    // Listen for realtime unread changes
    const whisperChannel = supabase
      .channel('app:whispers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whispers' },
        () => {
          checkUnreadWhispers(session.user.id);
        }
      )
      .subscribe();

    // Listen for incoming hugs/kisses/miss interactions
    const interactionChannel = supabase
      .channel('app:interactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload) => {
          const newInteraction = payload.new as any;
          if (newInteraction.sender_id !== session.user.id) {
            triggerToastNotification(newInteraction.type, newInteraction.sender_id);
            setUnreadLoveCard(newInteraction);
            setShowQuickReturn(false);
          }
        }
      )
      .subscribe();

    // Listen for checklist audit logs (real-time transparency)
    const checklistChannel = supabase
      .channel('app:love_checklist_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'love_checklist_logs' },
        (payload) => {
          const newLog = payload.new as any;
          if (newLog.operator_id !== session.user.id) {
            triggerChecklistNotification(newLog.item_name, newLog.action_type, newLog.operator_id, newLog.details || '');
            setHasUnreadChecklist(true);
          }
        }
      )
      .subscribe();

    // Listen for partner capsule / compliments (real-time advantages)
    const partnerRecordChannel = supabase
      .channel('app:partner_records')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'partner_records' },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord.target_id === session.user.id && newRecord.type === 'advantage') {
            const senderProfile = profilesRef.current.find(p => p.id === newRecord.creator_id);
            const senderName = senderProfile?.nickname || '伴侣';
            
            // Pop nice toast message
            setToastMessage(`${senderName} 在你的优点档案里写下了新的一笔：“${newRecord.content}” 💖`);
            
            // Trigger heart burst confetti
            confetti({
              particleCount: 65,
              spread: 60,
              origin: { y: 0.35 },
              colors: ['#ff4d6d', '#ffb3c1', '#f15bb5', '#fee4e6'],
            });
            
            // Vibrate device
            if ('vibrate' in navigator) {
              navigator.vibrate([100, 80, 100]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
      supabase.removeChannel(whisperChannel);
      supabase.removeChannel(interactionChannel);
      supabase.removeChannel(checklistChannel);
      supabase.removeChannel(partnerRecordChannel);
      supabase.removeChannel(reviewChannel);
    };
  }, [session]);

  const checkUnreadWhispers = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('whispers')
        .select('id')
        .neq('sender_id', userId)
        .eq('is_read', false);
      
      setHasUnreadWhispers(data && data.length > 0 ? true : false);
    } catch (err) {
      console.error('Error scanning unread whispers:', err);
    }
  };

  const checkUnreadChecklist = async (userId: string) => {
    try {
      const lastViewedStr = localStorage.getItem('checklist_logs_last_viewed');
      let query = supabase
        .from('love_checklist_logs')
        .select('created_at')
        .neq('operator_id', userId);
      
      if (lastViewedStr) {
        query = query.gt('created_at', lastViewedStr);
      }
      
      const { data } = await query.limit(1);
      setHasUnreadChecklist(data && data.length > 0 ? true : false);
    } catch (err) {
      console.error('Error scanning unread checklist logs:', err);
    }
  };

  const checkReviewProposal = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('monthly_reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const latest = data[0];
        const isNegotiatingFromPartner = 
          latest.status === 'negotiating' && 
          latest.last_proposer_id !== userId;
        setHasReviewProposal(isNegotiatingFromPartner);
      } else {
        setHasReviewProposal(false);
      }
    } catch (err) {
      console.error('Error scanning review proposal:', err);
    }
  };

  useEffect(() => {
    const handleReadLogs = () => {
      setHasUnreadChecklist(false);
    };
    window.addEventListener('checklist_logs_read', handleReadLogs);
    return () => {
      window.removeEventListener('checklist_logs_read', handleReadLogs);
    };
  }, []);

  const fetchUnreadInteractions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .neq('sender_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      // Retrieve locally read IDs
      const localReadIdsStr = localStorage.getItem('local_read_interaction_ids');
      const localReadIds: string[] = localReadIdsStr ? JSON.parse(localReadIdsStr) : [];

      if (error) {
        // Fallback to localStorage last read time
        console.warn("is_read column may not exist, falling back to localStorage", error);
        const lastReadTime = localStorage.getItem('last_read_interaction_time') || new Date(0).toISOString();
        const { data: fallbackData } = await supabase
          .from('interactions')
          .select('*')
          .neq('sender_id', userId)
          .gt('created_at', lastReadTime)
          .order('created_at', { ascending: false });

        if (fallbackData && fallbackData.length > 0) {
          const unreadFiltered = fallbackData.filter((item: any) => !localReadIds.includes(item.id));
          if (unreadFiltered.length > 0) {
            setUnreadLoveCard(unreadFiltered[0]);
          }
        }
        return;
      }

      if (data && data.length > 0) {
        const unreadFiltered = data.filter((item: any) => !localReadIds.includes(item.id));
        if (unreadFiltered.length > 0) {
          setUnreadLoveCard(unreadFiltered[0]);
        }
      }
    } catch (err) {
      console.error('Error scanning unread interactions:', err);
    }
  };

  const markInteractionAsRead = async (interaction: any) => {
    if (!session?.user || !interaction) return;

    // Cache to local read IDs immediately so it never shows again on this client
    try {
      const localReadIdsStr = localStorage.getItem('local_read_interaction_ids');
      const localReadIds: string[] = localReadIdsStr ? JSON.parse(localReadIdsStr) : [];
      if (!localReadIds.includes(interaction.id)) {
        localReadIds.push(interaction.id);
        if (localReadIds.length > 100) localReadIds.shift();
        localStorage.setItem('local_read_interaction_ids', JSON.stringify(localReadIds));
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const { error } = await supabase
        .from('interactions')
        .update({ is_read: true })
        .eq('id', interaction.id);

      if (error) {
        localStorage.setItem('last_read_interaction_time', interaction.created_at);
      }
    } catch (err) {
      localStorage.setItem('last_read_interaction_time', interaction.created_at);
    }

    setUnreadLoveCard(null);
    setShowQuickReturn(false);
  };

  const handleSendQuickReturn = async (type: 'hug' | 'kiss' | 'miss' | 'pat' | 'heart') => {
    if (!session?.user) return;

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#ff4d6d', '#ff85a1', '#ffccd5'],
      });

      const { error } = await supabase.from('interactions').insert({
        sender_id: session.user.id,
        type,
      });

      if (error) throw error;

      const partnerProfile = profiles.find((p) => p.id !== session.user.id);
      const myProfile = profiles.find((p) => p.id === session.user.id);
      if (partnerProfile) {
        const senderName = myProfile?.nickname || '伴侣';
        let bodyText = '';
        if (type === 'kiss') bodyText = `${senderName} 给你回赠了一个 甜蜜飞吻 💋`;
        else if (type === 'hug') bodyText = `${senderName} 给你回赠了一个 温暖拥抱 🤗`;
        else if (type === 'miss') bodyText = `${senderName} 正在偷偷想你哦 👀`;
        else if (type === 'pat') bodyText = `${senderName} 给你回赠了一个 摸摸头安慰 💆‍♂️`;
        else if (type === 'heart') bodyText = `${senderName} 给你回赠了一个 满满爱意比心 💖`;

        supabase.functions.invoke('send-push', {
          body: {
            recipient_id: partnerProfile.id,
            title: '收到爱意回赠 💖',
            body: bodyText,
            url: '/'
          }
        }).catch(err => console.error('Error invoking send-push:', err));
      }
    } catch (err) {
      console.error('Error sending quick return:', err);
    }

    if (unreadLoveCard) {
      markInteractionAsRead(unreadLoveCard);
    }
  };

  const triggerToastNotification = (type: string, senderId?: string) => {
    let text = '给你送了一个飞吻 💋';
    let emoji = '💋';
    if (type === 'hug') {
      text = '给你的心里话送来了一个 温暖拥抱 🤗';
      emoji = '🤗';
    }
    if (type === 'pat') {
      text = '给你的心里话送来了一个 摸摸头安慰 💆‍♂️';
      emoji = '💆‍♂️';
    }
    if (type === 'heart') {
      text = '给你的心里话送来了一个 满满爱意比心 💖';
      emoji = '💖';
    }
    if (type === 'miss') {
      text = '正在偷偷想你哦 👀';
      emoji = '👀';
    }

    const senderProfile = profilesRef.current.find(p => p.id === senderId);
    const senderName = senderProfile?.nickname || '伴侣';

    setToastMessage(`${senderName} ${text}`);

    // Spark confetti particles
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.35 },
      colors: ['#ff4d6d', '#ffb3c1', '#f15bb5', '#fee4e6'],
    });

    // Spawn 15 staggered floating emojis from bottom
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'heart-particle';
        el.innerText = emoji;
        el.style.left = `${Math.random() * 80 + 10}vw`;
        el.style.fontSize = `${20 + Math.random() * 20}px`;
        el.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
        el.style.setProperty('--rotation', `${Math.random() * 90 - 45}deg`);
        el.style.animationDuration = `${Math.random() * 1.5 + 2.5}s`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
      }, i * 100);
    }

    // Vibrate receiver's device
    if ('vibrate' in navigator) {
      if (type === 'hug') {
        navigator.vibrate(450);
      } else if (type === 'pat') {
        navigator.vibrate([100, 50, 100]);
      } else if (type === 'heart') {
        navigator.vibrate([80, 80, 80]);
      } else if (type === 'kiss') {
        navigator.vibrate([70, 80, 70]);
      } else if (type === 'miss') {
        navigator.vibrate([80, 100, 80, 250, 80, 100, 80]);
      }
    }

    // Reset notification toast after 4s
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);

    return () => clearTimeout(timer);
  };

  const triggerChecklistNotification = (itemName: string, actionType: string, operatorId?: string, details?: string) => {
    let actionText = '';
    if (actionType === 'create') {
      actionText = `新增了清单项：${itemName} ➕`;
    } else if (actionType === 'update') {
      actionText = `修改了清单项：${itemName} ✏️`;
      if (details) {
        actionText += ` (${details})`;
      }
    } else if (actionType === 'delete') {
      actionText = `删除了清单项：${itemName} 🗑️`;
    } else if (actionType === 'complete') {
      actionText = `达成目标：${itemName} 🎉`;
    } else if (actionType === 'uncomplete') {
      actionText = `取消了打卡：${itemName} ↩️`;
    }

    const operatorProfile = profilesRef.current.find(p => p.id === operatorId);
    const operatorName = operatorProfile?.nickname || '伴侣';

    setToastMessage(`${operatorName} ${actionText}`);

    // Spark confetti particles for positive achievements
    if (actionType === 'complete' || actionType === 'create') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.35 },
        colors: ['#ff4d6d', '#ffb3c1', '#f15bb5', '#fee4e6'],
      });
    }

    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);

    return () => clearTimeout(timer);
  };

  const getResolvedTheme = (bgTheme: string) => {
    if (bgTheme !== 'auto') return bgTheme;
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'cherry';
    if (hour >= 12 && hour < 18) return 'sunset';
    return 'starry';
  };

  const resolvedTheme = getResolvedTheme(theme);

  const getBgClass = (bgTheme: string) => {
    const resTheme = getResolvedTheme(bgTheme);
    if (resTheme === 'starry') return 'bg-starry-theme';
    if (resTheme === 'cherry') return 'bg-cherry-theme';
    return 'bg-sunset-theme';
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${getBgClass(theme)}`}>
        <Heart className="text-rose-500 animate-heartbeat" size={48} fill="currentColor" />
        <p className="text-xs text-rose-700/80 font-bold mt-4 tracking-wider">正在开启两人的秘密通道...</p>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <HashRouter>
      <ServiceWorkerNavigator />
      <div className={`min-h-screen ${getBgClass(theme)} pb-24 transition-colors duration-1000 relative overflow-x-hidden`}>
        
        {/* Dynamic Ambient Aurora Orbs Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {resolvedTheme === 'sunset' && (
            <>
              <div className="absolute w-[280px] h-[280px] rounded-full bg-amber-300/20 blur-[60px] animate-float-orb-1 top-[10%] left-[-10%]" />
              <div className="absolute w-[320px] h-[320px] rounded-full bg-rose-400/25 blur-[80px] animate-float-orb-2 bottom-[20%] right-[-15%]" />
            </>
          )}
          {resolvedTheme === 'cherry' && (
            <>
              <div className="absolute w-[320px] h-[320px] rounded-full bg-pink-400/30 blur-[70px] animate-float-orb-1 top-[15%] right-[-10%]" />
              <div className="absolute w-[280px] h-[280px] rounded-full bg-violet-300/25 blur-[60px] animate-float-orb-2 bottom-[30%] left-[-10%]" />
            </>
          )}
          {resolvedTheme === 'starry' && (
            <>
              <div className="absolute w-[300px] h-[300px] rounded-full bg-indigo-500/15 blur-[80px] animate-float-orb-1 top-[20%] left-[-5%]" />
              <div className="absolute w-[340px] h-[340px] rounded-full bg-fuchsia-500/15 blur-[90px] animate-float-orb-2 bottom-[15%] right-[-10%]" />
              {/* Twinkling stars */}
              <div className="star-twinkle absolute top-[15%] left-[20%] w-1 h-1 bg-white rounded-full opacity-60 animate-twinkle" style={{ animationDelay: '0s' }} />
              <div className="star-twinkle absolute top-[30%] left-[80%] w-1.5 h-1.5 bg-white rounded-full opacity-40 animate-twinkle" style={{ animationDelay: '1.5s' }} />
              <div className="star-twinkle absolute top-[65%] left-[15%] w-1 h-1 bg-white rounded-full opacity-80 animate-twinkle" style={{ animationDelay: '0.8s' }} />
              <div className="star-twinkle absolute top-[75%] left-[70%] w-1 h-1 bg-white rounded-full opacity-50 animate-twinkle" style={{ animationDelay: '2.3s' }} />
            </>
          )}
        </div>

        {/* Interaction Pop Toast Alert */}
        {toastMessage && (
          <div className="fixed toast-safe-top left-1/2 transform -translate-x-1/2 z-[999] w-[90%] max-w-xs bg-rose-500 text-white rounded-2xl shadow-xl px-5 py-3 border border-rose-400 flex items-center justify-between space-x-3 transition duration-500">
            <div className="flex items-center space-x-2">
              <Sparkles size={16} className="text-amber-200 animate-pulse" />
              <p className="text-xs font-bold leading-normal">{toastMessage}</p>
            </div>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-white/80 hover:text-white text-[10px] font-extrabold focus:outline-none"
            >
              关闭
            </button>
          </div>
        )}

        <div className="relative z-10 pwa-safe-padding-top">
          <Routes>
            <Route path="/" element={<Home showSettings={showSettings} setShowSettings={setShowSettings} />} />
            <Route path="/checklist" element={<Checklist />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/whispers" element={<Whispers />} />
            <Route path="/review" element={<MonthlyReview />} />
            <Route path="/wiki" element={<PartnerWiki />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Global Bottom Tab Navbar */}
        {!showSettings && !isTeaRoomActive && (
          <Navbar 
            hasUnreadWhispers={hasUnreadWhispers} 
            hasUnreadChecklist={hasUnreadChecklist} 
            hasReviewProposal={hasReviewProposal}
          />
        )}

        {/* Polaroid Love Card Modal */}
        {unreadLoveCard && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex flex-col items-center justify-center p-6 animate-fade-in select-none">
            <div className="w-full max-w-sm bg-white rounded-3xl p-4 pb-6 polaroid-card border border-white/80 flex flex-col items-center animate-slide-up relative">
              
              {/* Top Avatar Group with kiss-贴贴 animation */}
              <div className="w-full flex items-center justify-center space-x-6 py-4 relative mb-2">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-rose-300 shadow-md animate-kiss-left bg-rose-50 flex items-center justify-center">
                    {profiles.find(p => p.id === unreadLoveCard.sender_id)?.avatar_url ? (
                      <img src={profiles.find(p => p.id === unreadLoveCard.sender_id)?.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-rose-400 text-xs">Ta</span>
                    )}
                  </div>
                </div>

                {/* Kiss Heart pop animation */}
                <div className="absolute left-1/2 -translate-x-1/2 top-4 text-2xl animate-heart-pop pointer-events-none">
                  ❤️
                </div>

                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-rose-300 shadow-md animate-kiss-right bg-rose-50 flex items-center justify-center">
                    {profiles.find(p => p.id === session.user.id)?.avatar_url ? (
                      <img src={profiles.find(p => p.id === session.user.id)?.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-rose-400 text-xs">我</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Photo placeholder (AI romantic background image we generated) */}
              <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-inner border border-gray-100 relative mb-4">
                <img 
                  src="/polaroid_bg.png" 
                  className="w-full h-full object-cover"
                  alt="Love background" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 right-3 text-right">
                  <span className="inline-block bg-white/20 backdrop-blur-xs text-[10px] text-white px-2 py-0.5 rounded-md font-mono tracking-wider">
                    {new Date(unreadLoveCard.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                  </span>
                </div>
              </div>

              {/* Polaroid message & timestamp */}
              <div className="w-full px-2 text-center space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-rose-800 tracking-wide">
                    {profiles.find(p => p.id === unreadLoveCard.sender_id)?.nickname || '伴侣'}{' '}
                    {(() => {
                      const type = unreadLoveCard.type;
                      if (type === 'hug') return '送来了一个 温暖拥抱 🤗';
                      if (type === 'pat') return '送来了一个 摸摸头安慰 💆‍♂️';
                      if (type === 'heart') return '送来了一个 满满爱意比心 💖';
                      if (type === 'kiss') return '送来了一个 甜蜜飞吻 💋';
                      return '正在偷偷想你哦 👀';
                    })()}
                  </h3>
                  
                  {/* Dynamic love quote */}
                  <p className="text-[11px] font-medium text-gray-500 italic leading-relaxed pt-2.5 px-4 font-sans select-none">
                    “ {(() => {
                      const quotes = [
                        "浮生三千，吾爱有三。日，月与卿。日为朝，月为暮，卿为朝朝暮暮。",
                        "灶台有烟火，身旁有你，便是最好的人间年华。",
                        "我见众生皆草木，唯独见你意平生。",
                        "纵使日薄西山，与你并肩便是良辰。",
                        "今晚月色真美，而你比月色更动人。",
                        "听闻远方有你，动身跋涉千里，只为看一季花开。"
                      ];
                      const charCodeSum = unreadLoveCard.id ? unreadLoveCard.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 0;
                      return quotes[charCodeSum % quotes.length];
                    })()} ”
                  </p>
                </div>

                {/* Actions container */}
                <div className="space-y-2.5 pt-3">
                  {!showQuickReturn ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => markInteractionAsRead(unreadLoveCard)}
                        className="flex-1 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold transition active:scale-95 shadow-2xs border border-gray-200"
                      >
                        收下爱意
                      </button>
                      <button
                        onClick={() => setShowQuickReturn(true)}
                        className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-extrabold transition active:scale-95 shadow-md flex items-center justify-center space-x-1"
                      >
                        <span>回赠爱意 💘</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-slide-up">
                      <p className="text-[9px] font-extrabold text-rose-500 tracking-wider">选择回赠给 Ta 的爱意：</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => handleSendQuickReturn('kiss')}
                          className="py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-bold transition duration-200 flex flex-col items-center space-y-0.5 shadow-2xs"
                        >
                          <span>💋</span>
                          <span>飞吻</span>
                        </button>
                        <button
                          onClick={() => handleSendQuickReturn('hug')}
                          className="py-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-800 text-[10px] font-bold transition duration-200 flex flex-col items-center space-y-0.5 shadow-2xs"
                        >
                          <span>🤗</span>
                          <span>温暖拥抱</span>
                        </button>
                        <button
                          onClick={() => handleSendQuickReturn('heart')}
                          className="py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-850 text-[10px] font-bold transition duration-200 flex flex-col items-center space-y-0.5 shadow-2xs"
                        >
                          <span>💖</span>
                          <span>比个心</span>
                        </button>
                      </div>
                      <button
                        onClick={() => setShowQuickReturn(false)}
                        className="text-[10px] font-extrabold text-gray-400 hover:text-gray-650 pt-1"
                      >
                        返回
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PWA 更新提示 Banner */}
        {pwaUpdateFn && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] w-[calc(100%-2rem)] max-w-sm">
            <div className="bg-rose-600 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center justify-between gap-3 animate-slide-up">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">✨</span>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-tight">新版本已就绪</p>
                  <p className="text-[10px] text-rose-100 leading-tight truncate">点击立即更新，体验最新功能</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => pwaUpdateFn()}
                  className="px-3 py-1.5 bg-white text-rose-600 rounded-xl text-[11px] font-black transition hover:bg-rose-50 active:scale-95"
                >
                  立即更新
                </button>
                <button
                  onClick={() => setPwaUpdateFn(null)}
                  className="p-1.5 hover:bg-rose-500 rounded-full transition"
                >
                  <span className="text-xs">✕</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Custom Styled Dialog Modal */}
        <CustomModal {...modalConfig} />

        {/* Role Selection Modal (highest z-index) */}
        {showRoleSelection && session?.user && (
          <RoleSelectionModal
            userId={session.user.id}
            onComplete={() => {
              setShowRoleSelection(false);
            }}
          />
        )}
      </div>
    </HashRouter>
  );
};
export default App;
