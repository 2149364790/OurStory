import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Heart, Settings, User, Calendar, LogOut, Image, ChevronLeft, ChevronRight, Bell, Sparkles, Plus, Trash2, X, Eye, EyeOff, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';


// Helper to spawn a floating heart on the screen
const spawnHeart = (color?: string) => {
  const heart = document.createElement('div');
  heart.className = 'heart-particle';
  // SVG representation of a heart
  heart.innerHTML = `
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" style="color: ${color || '#ff4d6d'}">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  `;
  
  const left = Math.random() * 80 + 10; // Drift from 10vw to 90vw
  const drift = (Math.random() - 0.5) * 120; // Drift offset
  const rotation = Math.random() * 90 - 45; // Rotation angle
  const duration = Math.random() * 1.5 + 2.5; // Duration 2.5s to 4s
  
  heart.style.left = `${left}vw`;
  heart.style.setProperty('--drift', `${drift}px`);
  heart.style.setProperty('--rotation', `${rotation}deg`);
  heart.style.animationDuration = `${duration}s`;
  
  document.body.appendChild(heart);
  
  setTimeout(() => {
    heart.remove();
  }, duration * 1000);
};

const sakuraParams = [
  { left: '8%', size: '8px', delay: '0s', duration: '7s' },
  { left: '22%', size: '12px', delay: '2s', duration: '10s' },
  { left: '42%', size: '6px', delay: '4s', duration: '8s' },
  { left: '58%', size: '10px', delay: '1s', duration: '11s' },
  { left: '72%', size: '14px', delay: '5s', duration: '9s' },
  { left: '88%', size: '7px', delay: '3s', duration: '6s' },
];

interface HomeProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const poetryGroups = {
  morning: [
    [
      "🌸 爱晨雾漫过青瓦",
      "🌸 爱暮色染透篱笆",
      "🌸 更爱与君并肩立",
      "🌸 看遍这人间烟火里的朝暮与年华"
    ],
    [
      "🌅 晓看天色暮看云",
      "🌅 行也思君，坐也思君",
      "🌅 愿执子之手",
      "🌅 赏尽这人间晨曦与落日"
    ],
    [
      "🥣 所求不过是",
      "🥣 清晨有粥，黄昏有光",
      "🥣 灶台有烟火，身旁有你"
    ],
    [
      "🌿 爱春光初破的温柔",
      "🌿 爱秋风渐起的安详",
      "🌿 更爱在每一个平凡的清晨与黄昏",
      "🌿 始终有你相伴"
    ]
  ],
  afternoon: [
    [
      "🌇 我想和你互相浪费",
      "🌇 一起虚度短的泥泞，长的黄昏",
      "🌇 和所有温暖的无所事事"
    ],
    [
      "🌾 晴天携手散步",
      "🌾 雨天共撑小伞",
      "🌾 只想和你分担一日三餐的温暖"
    ],
    [
      "⛺ 愿与君，春踏桃花",
      "⛺ 夏乘凉风，秋扫落叶",
      "⛺ 冬折初雪，有你便是晴天"
    ],
    [
      "🗺️ 山河远阔，人间烟火",
      "🗺️ 往后余生",
      "🗺️ 无一是你，无一不是你"
    ]
  ],
  night: [
    [
      "🌙 浮生三千，吾爱有三",
      "🌙 日为朝，月为暮",
      "🌙 卿为朝朝暮暮"
    ],
    [
      "🍵 愿岁并谢，与长友兮",
      "🍵 食一碗人间烟火",
      "🍵 饮一杯相思清茶",
      "🍵 共度这冗长一生"
    ],
    [
      "✨ 春有百花秋有月",
      "✨ 夏有凉风冬有雪",
      "✨ 若得与你并肩行",
      "✨ 便是人间好时节"
    ]
  ]
};

export const Home: React.FC<HomeProps> = ({ showSettings, setShowSettings }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({
    anniversary_date: '2025-05-20',
    bg_theme: 'sunset',
    together_days_offset: 0,
  });
  
  // Timer States
  const [togetherTime, setTogetherTime] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0, isNow: false });
  
  // Settings Panel States
  const [updating, setUpdating] = useState(false);
  const [newAnniversary, setNewAnniversary] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [theme, setTheme] = useState('sunset');
  
  // Custom Date Picker States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarYear, setCalendarYear] = useState(2025);
  const [calendarMonth, setCalendarMonth] = useState(4);
  
  // File upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [heartbeatActive, setHeartbeatActive] = useState(false);
  const [heartClicked, setHeartClicked] = useState(false);

  // Password change states
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // Checklist States
  const [checklistCount, setChecklistCount] = useState(0);
  const [latestReview, setLatestReview] = useState<any>(null);

  // Poetry states
  const getPoetryPeriod = (): 'morning' | 'afternoon' | 'night' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 19) return 'afternoon';
    return 'night';
  };

  const [poetryPeriod, setPoetryPeriod] = useState<'morning' | 'afternoon' | 'night'>(getPoetryPeriod());
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [poetryFade, setPoetryFade] = useState(true);

  // Custom Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToastNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Custom quotes state from local storage
  const [customQuotes, setCustomQuotes] = useState<typeof poetryGroups>(() => {
    const saved = localStorage.getItem('couplespace_custom_quotes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          morning: Array.isArray(parsed.morning) ? parsed.morning : [],
          afternoon: Array.isArray(parsed.afternoon) ? parsed.afternoon : [],
          night: Array.isArray(parsed.night) ? parsed.night : []
        };
      } catch (e) {
        console.error(e);
      }
    }
    return { morning: [], afternoon: [], night: [] };
  });

  // Active particles state for clicked blast
  const [clickParticles, setClickParticles] = useState<any[]>([]);
  // Custom Quote Manager Modal visibility
  const [showQuoteEditor, setShowQuoteEditor] = useState(false);
  // Form states for custom quote modal
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuotePeriod, setNewQuotePeriod] = useState<'morning' | 'afternoon' | 'night'>('morning');

  // Proposal modal state
  const [showProposalModal, setShowProposalModal] = useState(false);

  const activePoetryGroups = useMemo(() => {
    return {
      morning: [...poetryGroups.morning, ...(customQuotes.morning || [])],
      afternoon: [...poetryGroups.afternoon, ...(customQuotes.afternoon || [])],
      night: [...poetryGroups.night, ...(customQuotes.night || [])],
    };
  }, [customQuotes]);

  const [checklistTotal, setChecklistTotal] = useState(104);
  const [latestChecklistItem, setLatestChecklistItem] = useState<any>(null);

  // Push Notification States
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [subscribingPush, setSubscribingPush] = useState(false);

  const checkSubscriptionStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !currentUser) {
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Double check in database to see if it's saved
        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('endpoint', subscription.endpoint)
          .maybeSingle();

        if (data && !error) {
          setNotificationEnabled(true);
        } else {
          setNotificationEnabled(false);
        }
      } else {
        setNotificationEnabled(false);
      }
    } catch (err) {
      console.error('Error checking push subscription status:', err);
    }
  };

  const handleToggleNotification = async () => {
    if (!currentUser) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      (window as any).showCustomAlert('不支持通知', '抱歉，您的浏览器或设备不支持系统推送通知。');
      return;
    }

    setSubscribingPush(true);
    try {
      if (!notificationEnabled) {
        // Request permissions
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          (window as any).showCustomAlert('权限受限', '需要授权通知权限才能接收消息。请在浏览器或系统设置中允许通知权限。');
          setSubscribingPush(false);
          return;
        }

        // Get active service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Retrieve public VAPID key
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error('未配置 VITE_VAPID_PUBLIC_KEY 环境变量');
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        // Subscribe to push service
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });

        // Extract credentials
        const rawSubscription = JSON.parse(JSON.stringify(subscription));
        const endpoint = rawSubscription.endpoint;
        const p256dh = rawSubscription.keys?.p256dh;
        const auth = rawSubscription.keys?.auth;

        if (!endpoint || !p256dh || !auth) {
          throw new Error('获取推送订阅密钥失败');
        }

        // Save subscription keys to Supabase
        const { error } = await supabase.from('push_subscriptions').upsert({
          user_id: currentUser.id,
          endpoint,
          p256dh,
          auth,
        }, { onConflict: 'endpoint' });

        if (error) throw error;

        setNotificationEnabled(true);
      } else {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Delete from database first
          const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint);

          if (error) console.error('Error deleting subscription from DB:', error);

          // Call unsubscribe on the push subscription object
          await subscription.unsubscribe();
        }
        setNotificationEnabled(false);
      }
    } catch (err: any) {
      console.error('Error toggling push subscription:', err);
      (window as any).showCustomAlert('操作失败', err.message);
    } finally {
      setSubscribingPush(false);
    }
  };

  useEffect(() => {
    if (showSettings && currentUser) {
      checkSubscriptionStatus();
    }
  }, [showSettings, currentUser]);


  useEffect(() => {
    if (newAnniversary) {
      const parts = newAnniversary.split('-');
      if (parts.length === 3) {
        setCalendarYear(parseInt(parts[0], 10));
        setCalendarMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [newAnniversary, showSettings]);

  // Keep refs to avoid stale closure in interval
  const stateRef = useRef<any>({
    period: poetryPeriod,
    quoteIdx: currentQuoteIndex,
    phraseIdx: currentPhraseIndex,
    groups: activePoetryGroups
  });

  useEffect(() => {
    stateRef.current = {
      period: poetryPeriod,
      quoteIdx: currentQuoteIndex,
      phraseIdx: currentPhraseIndex,
      groups: activePoetryGroups
    };
  }, [poetryPeriod, currentQuoteIndex, currentPhraseIndex, activePoetryGroups]);

  const intervalRef = useRef<any>(null);

  const startPoetryInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      triggerNextPhrase();
    }, 4500);
  };

  const triggerNextPhrase = () => {
    const nextPeriod = getPoetryPeriod();
    let nextQuoteIdx = stateRef.current.quoteIdx;
    let nextPhraseIdx = stateRef.current.phraseIdx;
    const currentGroups = stateRef.current.groups;

    setPoetryFade(false);

    setTimeout(() => {
      if (nextPeriod !== stateRef.current.period) {
        setPoetryPeriod(nextPeriod);
        setCurrentQuoteIndex(0);
        setCurrentPhraseIndex(0);
      } else {
        const activeGroup = currentGroups[nextPeriod] || [];
        if (activeGroup.length === 0) {
          setCurrentQuoteIndex(0);
          setCurrentPhraseIndex(0);
          setPoetryFade(true);
          return;
        }

        if (nextQuoteIdx >= activeGroup.length) {
          nextQuoteIdx = 0;
          nextPhraseIdx = 0;
        }

        const activeQuote = activeGroup[nextQuoteIdx] || [];
        if (activeQuote.length === 0) {
          nextPhraseIdx = 0;
          nextQuoteIdx = (nextQuoteIdx + 1) % activeGroup.length;
          setCurrentQuoteIndex(nextQuoteIdx);
          setCurrentPhraseIndex(nextPhraseIdx);
          setPoetryFade(true);
          return;
        }

        if (nextPhraseIdx + 1 < activeQuote.length) {
          nextPhraseIdx += 1;
        } else {
          nextPhraseIdx = 0;
          nextQuoteIdx = (nextQuoteIdx + 1) % activeGroup.length;
        }

        setCurrentQuoteIndex(nextQuoteIdx);
        setCurrentPhraseIndex(nextPhraseIdx);
      }
      setPoetryFade(true);
    }, 600);
  };

  const handleNextPhraseManual = () => {
    triggerNextPhrase();
    startPoetryInterval();
  };

  useEffect(() => {
    startPoetryInterval();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Handle click on the poetry ribbon (tap page turn & particle explosion)
  const handleRibbonClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.quote-edit-btn')) {
      return;
    }

    handleNextPhraseManual();

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const emojis = resolvedTheme === 'cherry' 
      ? ['🌸', '💖', '💕', '💮', '💗'] 
      : resolvedTheme === 'sunset'
      ? ['🌅', '✨', '❤️', '🧡', '🌟']
      : ['🌌', '✨', '⭐', '💜', '💫', '💙'];

    const newParticles = Array.from({ length: 8 }).map((_, i) => {
      const angle = (Math.random() * 360 * Math.PI) / 180;
      const velocity = 20 + Math.random() * 40;
      const tx = Math.cos(angle) * velocity;
      const ty = -30 - Math.random() * 40;
      const scale = 0.5 + Math.random() * 0.8;
      const size = 12 + Math.random() * 10;
      const rot = Math.random() * 180 - 90;
      
      return {
        id: Date.now() + i + Math.random(),
        x: clickX,
        y: clickY,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        tx,
        ty,
        scale,
        size,
        rot
      };
    });

    setClickParticles(prev => [...prev, ...newParticles]);

    setTimeout(() => {
      setClickParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1200);
  };

  // Double click to copy quote to clipboard with toast popup
  const handleDoubleClickCopy = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.quote-edit-btn')) {
      return;
    }

    const activeGroup = activePoetryGroups[poetryPeriod] || [];
    const activeQuote = activeGroup[currentQuoteIndex];
    if (!activeQuote) return;

    const cleanText = activeQuote.map(line => {
      return line.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2600}-\u{27BF}]\s*/u, '');
    }).join('\n');

    navigator.clipboard.writeText(cleanText).then(() => {
      showToastNotification('📋 已复制甜蜜情话到剪贴板，快发给Ta吧~ 💖');
    }).catch(err => {
      console.error('Failed to copy: ', err);
      showToastNotification('复制失败，请重试', 'error');
    });
  };

  // Save new custom quote
  const handleSaveCustomQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteText.trim()) return;

    const sentences = newQuoteText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length === 0) return;

    const emojiMap = {
      morning: '🌸',
      afternoon: '🌇',
      night: '🌙'
    };
    const prefix = emojiMap[newQuotePeriod];
    const formattedSentences = sentences.map(line => {
      if (!/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2600}-\u{27BF}]/u.test(line)) {
        return `${prefix} ${line}`;
      }
      return line;
    });

    const updated = {
      ...customQuotes,
      [newQuotePeriod]: [...(customQuotes[newQuotePeriod] || []), formattedSentences]
    };

    setCustomQuotes(updated);
    localStorage.setItem('couplespace_custom_quotes', JSON.stringify(updated));
    setNewQuoteText('');
    showToastNotification('✨ 专属情话添加成功啦！');
  };

  // Delete custom quote
  const handleDeleteCustomQuote = (period: 'morning' | 'afternoon' | 'night', index: number) => {
    const list = [...(customQuotes[period] || [])];
    list.splice(index, 1);

    const updated = {
      ...customQuotes,
      [period]: list
    };

    setCustomQuotes(updated);
    localStorage.setItem('couplespace_custom_quotes', JSON.stringify(updated));
    showToastNotification('🗑️ 该情话已从您的专属列表删除');
    
    if (poetryPeriod === period) {
      const activeGroup = [...poetryGroups[period], ...list];
      if (currentQuoteIndex >= activeGroup.length) {
        setCurrentQuoteIndex(0);
        setCurrentPhraseIndex(0);
      }
    }
  };

  useEffect(() => {
    // 1. Get auth user

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        fetchData();
      }
    });

    // 2. Subscribe to realtime changes
    const configChannel = supabase
      .channel('public:couple_config')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_config' },
        (payload) => {
          if (payload.new) {
            setConfig(payload.new);
            setTheme((payload.new as any).bg_theme);
          }
        }
      )
      .subscribe();

    const profileChannel = supabase
      .channel('public:profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchProfiles();
        }
      )
      .subscribe();

    const interactionChannel = supabase
      .channel('public:interactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload) => {
          const newInteraction = payload.new as any;
          // Trigger particle animations if from partner
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && newInteraction.sender_id !== user.id) {
              triggerPartnerInteraction(newInteraction.type);
            }
          });
        }
      )
      .subscribe();

    const checklistChannel = supabase
      .channel('public:love_checklist_home')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'love_checklist_items' },
        () => {
          fetchChecklistData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'love_checklist_completions' },
        () => {
          fetchChecklistData();
        }
      )
      .subscribe();

    const reviewChannel = supabase
      .channel('public:monthly_reviews_home')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_reviews' },
        () => {
          fetchLatestReview();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(interactionChannel);
      supabase.removeChannel(checklistChannel);
      supabase.removeChannel(reviewChannel);
    };
  }, []);

  // Update timer loops
  useEffect(() => {
    const interval = setInterval(() => {
      // Together time calculation
      if (config.anniversary_date) {
        const anniv = new Date(config.anniversary_date);
        const now = new Date();
        const diffMs = now.getTime() - anniv.getTime() + (config.together_days_offset || 0) * 24 * 60 * 60 * 1000;
        
        if (diffMs > 0) {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
          setTogetherTime({ days, hours, mins, secs });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [config]);

  // Update review countdown loops
  useEffect(() => {
    if (!latestReview) {
      setCountdown({ days: 0, hours: 0, mins: 0, secs: 0, isNow: false });
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const targetTime = new Date(
        latestReview.status === 'agreed' ? latestReview.scheduled_date : latestReview.proposed_date
      ).getTime();
      const distance = targetTime - now;

      if (distance <= 0) {
        if (latestReview.status === 'agreed') {
          const scheduledDate = new Date(latestReview.scheduled_date);
          const nowDate = new Date();
          const isSameDay = 
            nowDate.getFullYear() === scheduledDate.getFullYear() &&
            nowDate.getMonth() === scheduledDate.getMonth() &&
            nowDate.getDate() === scheduledDate.getDate();
          
          setCountdown({ days: 0, hours: 0, mins: 0, secs: 0, isNow: isSameDay });
        } else {
          setCountdown({ days: 0, hours: 0, mins: 0, secs: 0, isNow: false });
        }
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((distance % (1000 * 60)) / 1000);
        setCountdown({ days, hours, mins, secs, isNow: false });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [latestReview]);

  const fetchData = async () => {
    fetchProfiles();
    fetchConfig();
    fetchChecklistData();
    fetchLatestReview();
  };

  const fetchChecklistData = async () => {
    try {
      // Fetch total items count
      const { count: totalCount, error: totalErr } = await supabase
        .from('love_checklist_items')
        .select('*', { count: 'exact', head: true });
      if (!totalErr && totalCount !== null) {
        setChecklistTotal(totalCount || 1);
      }

      // Fetch completed items count based on unique item coverage
      const { data: compData, error: compErr } = await supabase
        .from('love_checklist_completions')
        .select('item_id');
      if (!compErr && compData) {
        const uniqueCompsCount = new Set(compData.map((c: any) => c.item_id)).size;
        setChecklistCount(uniqueCompsCount);
      }

      // Fetch latest completion with the item's name
      const { data, error: latestError } = await supabase
        .from('love_checklist_completions')
        .select(`
          completed_at,
          notes,
          love_checklist_items (
            name
          )
        `)
        .order('completed_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      if (!latestError && data && data.length > 0) {
        const itemObj = data[0] as any;
        setLatestChecklistItem({
          item_name: itemObj.love_checklist_items?.name || '',
          completed_at: itemObj.completed_at,
          notes: itemObj.notes
        });
      } else {
        setLatestChecklistItem(null);
      }
    } catch (err) {
      console.error('Error fetching checklist data on Home:', err);
    }
  };

  const fetchLatestReview = async () => {
    try {
      const { data, error } = await supabase
        .from('monthly_reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!error && data && data.length > 0) {
        setLatestReview(data[0]);
      } else {
        setLatestReview(null);
      }
    } catch (err) {
      console.error('Error fetching latest review on Home:', err);
    }
  };

  // Trigger proposal modal if partner proposed a time and it's negotiating
  useEffect(() => {
    if (latestReview && currentUser) {
      const isNegotiatingFromPartner = 
        latestReview.status === 'negotiating' && 
        latestReview.last_proposer_id !== currentUser.id;
      if (isNegotiatingFromPartner) {
        const isDismissed = sessionStorage.getItem(`dismissed_proposal_${latestReview.id}`);
        if (!isDismissed) {
          setShowProposalModal(true);
        }
      } else {
        setShowProposalModal(false);
      }
    } else {
      setShowProposalModal(false);
    }
  }, [latestReview, currentUser]);

  const formatProposedDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('updated_at', { ascending: true });
    if (error) {
      console.error('Error fetching profiles:', error);
    } else if (data) {
      setProfiles(data);
      // Preset nickname editor with current user profile
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const userProf = data.find((p) => p.id === user.id);
          if (userProf) {
            setNewNickname(userProf.nickname || '');
            setNewAvatarUrl(userProf.avatar_url || '');
          }
        }
      });
    }
  };

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from('couple_config')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();
    if (error) {
      console.error('Error fetching config:', error);
    } else if (data) {
      setConfig(data);
      setNewAnniversary(data.anniversary_date);
      setTheme(data.bg_theme);
    }
  };

  // Trigger local heart effects when partner sends interaction
  const triggerPartnerInteraction = (type: string) => {
    // 1. Play heart confetti
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#ff4d6d', '#ff758f', '#ffccd5', '#f15bb5'],
    });

    // 2. Spawn 15 floating hearts
    let count = 0;
    const interval = setInterval(() => {
      const colors = {
        hug: '#ffb3c1',
        kiss: '#ff4d6d',
        miss: '#fb8b24',
        pat: '#fcd34d',
        heart: '#ec4899',
      };
      spawnHeart((colors as any)[type] || '#ff4d6d');
      count++;
      if (count > 15) clearInterval(interval);
    }, 150);

    // 3. Vibrate device with type-specific pattern
    if ('vibrate' in navigator) {
      if (type === 'kiss') {
        // Kiss: sweet quick double-tap (lub-dub kiss)
        navigator.vibrate([70, 80, 70]);
      } else if (type === 'hug') {
        // Hug: long warm squeeze
        navigator.vibrate([450]);
      } else if (type === 'miss') {
        // Miss: pulsing dual-heartbeat pattern (lub-dub... lub-dub)
        navigator.vibrate([80, 100, 80, 250, 80, 100, 80]);
      } else if (type === 'pat') {
        // Pat: gentle quick taps
        navigator.vibrate([100, 50, 100]);
      } else if (type === 'heart') {
        // Heart: triple sweet beats
        navigator.vibrate([80, 80, 80]);
      }
    }

    // 4. Boost heartbeat frequency
    setHeartbeatActive(true);
    setTimeout(() => setHeartbeatActive(false), 4000);
  };

  const handleSendInteraction = async (type: 'hug' | 'kiss' | 'miss') => {
    if (!currentUser) return;
    
    // Animate locally first
    confetti({
      particleCount: 30,
      spread: 40,
      origin: { y: 0.85 },
      colors: ['#ff4d6d', '#ff85a1'],
    });
    spawnHeart();

    // Boost heartbeat frequency locally
    setHeartbeatActive(true);
    setTimeout(() => setHeartbeatActive(false), 4000);

    // Insert interaction
    const { error } = await supabase.from('interactions').insert({
      sender_id: currentUser.id,
      type,
    });
    if (error) {
      console.error('Error recording interaction:', error);
    } else {
      // Send push notification to partner
      const partnerProfile = profiles.find((p) => p.id !== currentUser.id);
      const myProfile = profiles.find((p) => p.id === currentUser.id);
      if (partnerProfile) {
        const senderName = myProfile?.nickname || '伴侣';
        let bodyText = '';
        if (type === 'kiss') {
          bodyText = `${senderName} 给你送来了一个 甜蜜飞吻 💋`;
        } else if (type === 'hug') {
          bodyText = `${senderName} 给你送来了一个 温暖拥抱 🤗`;
        } else if (type === 'miss') {
          bodyText = `${senderName} 正在偷偷想你哦 👀`;
        }
        
        supabase.functions.invoke('send-push', {
          body: {
            recipient_id: partnerProfile.id,
            title: '收到新互动 💖',
            body: bodyText,
            url: '/'
          }
        }).catch(err => console.error('Error invoking send-push:', err));
      }
    }
  };

  // Upload Profile Avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentUser) return;
    setUploadingAvatar(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${currentUser.id}_${Math.random()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setNewAvatarUrl(publicUrl);
    } catch (err: any) {
      (window as any).showCustomAlert('上传失败', '上传头像失败: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (!currentUser) return;
    setUpdating(true);

    try {
      // 1. Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nickname: newNickname,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      // 2. Update config (theme, anniversary)
      const { error: configError } = await supabase
        .from('couple_config')
        .update({
          anniversary_date: newAnniversary,
          bg_theme: theme,
          updated_at: new Date().toISOString(),
        })
        .eq('id', '00000000-0000-0000-0000-000000000000');

      if (configError) throw configError;

      setShowSettings(false);
      fetchData();
    } catch (err: any) {
      (window as any).showCustomAlert('更新设置失败', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    (window as any).showCustomConfirm(
      '退出登录 🚪',
      '确定要退出当前私密空间吗？',
      async () => {
        await supabase.auth.signOut();
      }
    );
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showToastNotification('新密码长度不能少于 6 位哦~', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToastNotification('两次输入的密码不一致，请检查哦~', 'error');
      return;
    }

    setPasswordUpdating(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      showToastNotification('密码修改成功，下次登录将生效 🔐', 'success');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
    } catch (err: any) {
      showToastNotification(err.message || '密码修改失败，请重试', 'error');
    } finally {
      setPasswordUpdating(false);
    }
  };

  // Date Picker Helpers
  const getDaysInMonth = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Prev month days padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthTotalDays - i,
        isCurrentMonth: false,
        monthOffset: -1,
      });
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        monthOffset: 0,
      });
    }
    
    // Next month days padding to 42 cells
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

  const yearsList: number[] = [];
  const currY = new Date().getFullYear();
  for (let y = currY + 1; y >= 2000; y--) {
    yearsList.push(y);
  }
  const monthsList = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const getResolvedTheme = (bgTheme: string) => {
    if (bgTheme !== 'auto') return bgTheme;
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'cherry';
    if (hour >= 12 && hour < 18) return 'sunset';
    return 'starry';
  };

  const resolvedTheme = getResolvedTheme(theme);

  // Find partner profile
  const partnerProfile = profiles.find((p) => p.id !== currentUser?.id);
  const myProfile = profiles.find((p) => p.id === currentUser?.id);

  return (
    <div className="relative px-4">
      {/* Top Header */}
      <div className="flex justify-between items-center py-4 max-w-md mx-auto">
        <button 
          onClick={handleLogout} 
          className="p-2.5 rounded-full bg-white/40 hover:bg-white/60 border border-white/40 text-rose-700 transition"
          title="退出登录"
        >
          <LogOut size={18} />
        </button>
        <span className="font-handwritten text-2xl text-rose-600 font-bold select-none">CoupleSpace</span>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="p-2.5 rounded-full bg-white/40 hover:bg-white/60 border border-white/40 text-rose-700 transition"
          title="设置"
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        
        {/* Together Time Card */}
        <div className="glass-panel rounded-3xl p-6 text-center custom-shadow relative overflow-hidden border border-white/50">
          {/* Dynamic Aurora Liquid Backing */}
          <div className="absolute w-[180px] h-[180px] rounded-full bg-gradient-to-tr from-pink-400/25 to-amber-300/20 blur-[45px] animate-float-orb-1 top-[-20%] left-[-20%] pointer-events-none z-0" />
          <div className="absolute w-[200px] h-[200px] rounded-full bg-gradient-to-br from-rose-400/20 to-rose-300/15 blur-[50px] animate-float-orb-2 bottom-[-30%] right-[-10%] pointer-events-none z-0" />

          {/* Metallic Sweep Shimmer */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] skew-x-[-15deg] animate-shimmer pointer-events-none z-10" />

          {/* Gold Sparkles */}
          <Sparkles size={12} className="absolute top-4 left-4 text-amber-400/70 animate-pulse pointer-events-none z-10" />
          <Sparkles size={14} className="absolute top-8 right-5 text-amber-400/50 animate-pulse pointer-events-none z-10" />

          {/* Floating Sakura background */}
          {resolvedTheme === 'cherry' && sakuraParams.map((param, idx) => (
            <div
              key={idx}
              className="sakura-particle"
              style={{
                left: param.left,
                width: param.size,
                height: param.size,
                animationDelay: param.delay,
                animationDuration: param.duration,
              }}
            />
          ))}
          
          <p className="text-xs font-bold text-rose-600/80 mb-2.5 relative z-10 flex items-center justify-center space-x-1 tracking-wider">
            <Heart size={12} fill="currentColor" className="text-rose-500 animate-pulse" />
            <span>我们已经相伴了</span>
            <Heart size={12} fill="currentColor" className="text-rose-500 animate-pulse" />
          </p>
          <div className="flex justify-center items-baseline space-x-1 text-rose-700 relative z-10 mb-1">
            <span className="text-5xl font-extrabold font-sans tracking-tight bg-gradient-to-br from-rose-800 to-rose-600 bg-clip-text text-transparent">{togetherTime.days}</span>
            <span className="text-sm font-bold text-rose-700">天</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-4 max-w-xs mx-auto relative z-10">
            <div className="backdrop-blur-md bg-white/55 border border-white/60 shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_4px_12px_rgba(244,63,94,0.08)] rounded-2xl py-2.5 px-3 transition-all duration-300">
              <span className="block text-xl font-extrabold text-rose-800 tracking-tight">{togetherTime.hours.toString().padStart(2, '0')}</span>
              <span className="text-[10px] text-rose-600 font-bold">小时</span>
            </div>
            <div className="backdrop-blur-md bg-white/55 border border-white/60 shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_4px_12px_rgba(244,63,94,0.08)] rounded-2xl py-2.5 px-3 transition-all duration-300">
              <span className="block text-xl font-extrabold text-rose-800 tracking-tight">{togetherTime.mins.toString().padStart(2, '0')}</span>
              <span className="text-[10px] text-rose-600 font-bold">分钟</span>
            </div>
            <div className="backdrop-blur-md bg-white/55 border border-white/60 shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_4px_12px_rgba(244,63,94,0.08)] rounded-2xl py-2.5 px-3 transition-all duration-300 animate-timer-beat">
              <span className="block text-xl font-extrabold text-rose-800 tracking-tight">{togetherTime.secs.toString().padStart(2, '0')}</span>
              <span className="text-[10px] text-rose-600 font-bold">秒</span>
            </div>
          </div>
        </div>

        {/* Poetic Ribbon with Flowing Neon Border & Particle Burst */}
        <div 
          onClick={handleRibbonClick}
          onDoubleClick={handleDoubleClickCopy}
          className="relative p-[1.5px] rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer max-w-sm mx-auto select-none group"
          title="单击切换下一句，双击复制情话"
        >
          {/* Neon Conic Flowing Edge */}
          <div className="absolute inset-[-100%] bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 animate-spin-slow opacity-80 pointer-events-none" />

          {/* Frosted Container */}
          <div className="relative glass-panel rounded-2xl py-3.5 px-8 text-center flex items-center justify-center min-h-[46px] bg-white/55 backdrop-blur-md">
            {/* Left Quote */}
            <span className="absolute top-1 left-3 text-xl font-serif text-rose-500/25 pointer-events-none select-none">“</span>
            
            {/* Particle Burst Elements */}
            {clickParticles.map(p => (
              <span
                key={p.id}
                className="click-particle select-none pointer-events-none"
                style={{
                  left: p.x,
                  top: p.y,
                  fontSize: `${p.size}px`,
                  '--tx': `${p.tx}px`,
                  '--ty': `${p.ty}px`,
                  '--scale': p.scale,
                  '--rot': `${p.rot}deg`,
                } as React.CSSProperties}
              >
                {p.emoji}
              </span>
            ))}

            <p 
              className={`text-[11px] font-bold tracking-widest bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 bg-clip-text text-transparent transition-all duration-700 ease-in-out transform ${
                poetryFade ? 'opacity-100 translate-y-0 scale-100 blur-0' : 'opacity-0 -translate-y-1.5 scale-95 blur-[2px]'
              }`}
            >
              {activePoetryGroups[poetryPeriod][currentQuoteIndex]?.[currentPhraseIndex] || ''}
            </p>

            {/* Right Quote */}
            <span className="absolute bottom-1 right-3 text-xl font-serif text-rose-500/25 pointer-events-none select-none">”</span>

            {/* Edit Button (Pencil/Settings Icon) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQuoteEditor(true);
              }}
              className="quote-edit-btn absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-rose-400/60 hover:text-rose-600 hover:bg-rose-50/50 transition-all duration-300"
              title="管理专属情话"
            >
              <Settings size={12} className="animate-spin-slow" />
            </button>
          </div>
        </div>

        {/* Double Avatars Leaning and Heartbeat ECG line */}
        <div className="avatar-container flex justify-center items-center py-8 relative group">
          {/* ECG Pulse Connection Line Background */}
          <div className="absolute inset-x-0 h-20 pointer-events-none z-0 flex items-center justify-center">
            <svg className="w-[85%] h-full transition-colors duration-500" viewBox="0 0 200 40" preserveAspectRatio="none">
              <defs>
                <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* 1. Background static faint rhythm line */}
              <path
                d="M 0 20 L 30 20 Q 34 14 38 20 L 44 20 L 48 3 L 52 37 L 56 20 L 62 20 Q 68 11 74 20 L 130 20 Q 134 14 138 20 L 144 20 L 148 3 L 152 37 L 156 20 L 162 20 Q 168 11 174 20 L 200 20"
                fill="none"
                stroke="currentColor"
                style={{ transformOrigin: 'center' }}
                className={`transition-all duration-700 neon-shadow-rose-faint ${
                  heartbeatActive 
                    ? 'text-rose-300/60 stroke-[1.5] scale-y-[1.8]' 
                    : 'text-rose-200/40 stroke-[1] scale-y-[0.7]'
                }`}
              />
              {/* 2. Foreground scanning glowing pulse traveler */}
              <path
                d="M 0 20 L 30 20 Q 34 14 38 20 L 44 20 L 48 3 L 52 37 L 56 20 L 62 20 Q 68 11 74 20 L 130 20 Q 134 14 138 20 L 144 20 L 148 3 L 152 37 L 156 20 L 162 20 Q 168 11 174 20 L 200 20"
                fill="none"
                stroke="currentColor"
                filter="url(#neon-glow)"
                style={{ transformOrigin: 'center' }}
                className={`transition-all duration-700 ${
                  heartbeatActive 
                    ? 'text-rose-500 stroke-[3.5] scale-y-[1.8] animate-ecg-fast' 
                    : 'text-rose-400 stroke-[2] scale-y-[0.7] animate-ecg-slow'
                }`}
              />
            </svg>
          </div>

          <div className="flex items-center space-x-[-20px] relative z-10">
            {/* Me avatar */}
            <div 
              className="relative group/avatar block hover:scale-105 transition-all duration-300"
            >
              {/* Speech Bubble */}
              <div className="absolute -top-11 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-xs border border-rose-100 text-[10px] font-extrabold text-rose-600 px-2.5 py-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 group-hover:-translate-y-1.5 transition-all duration-500 select-none whitespace-nowrap pointer-events-none z-30 animate-bubble-float">
                😘 想你了
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white border-r border-b border-rose-100 rotate-45" />
              </div>
              
              <div className="avatar-left-container w-24 h-24 rounded-full border-4 overflow-hidden bg-rose-50 shadow-md relative transition-all duration-500 ease-out animate-float-left animate-glow-breath">
                {myProfile?.avatar_url ? (
                  <img src={myProfile.avatar_url} alt="My Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-rose-400">
                    <User size={36} />
                  </div>
                )}
                <span className="absolute bottom-0 left-0 right-0 bg-rose-500/80 text-white text-[9px] font-bold text-center py-0.5 select-none">
                  {myProfile?.nickname || '我'}
                </span>
              </div>
            </div>

            {/* Central heartbeat glowing heart */}
            <div className="relative z-20 flex items-center justify-center">
              {heartClicked && (
                <div className="absolute w-12 h-12 bg-rose-500/40 rounded-full animate-ping pointer-events-none" />
              )}
              <div 
                onClick={() => {
                  setHeartClicked(true);
                  setTimeout(() => setHeartClicked(false), 400);
                  handleSendInteraction('kiss');
                }}
                className={`heart-center-btn w-11 h-11 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white cursor-pointer transition-all duration-300 ${
                  heartClicked ? 'scale-90 rotate-12 bg-rose-600 shadow-rose-400' : 'hover:scale-[1.18]'
                } animate-heartbeat animate-pulse-glow`}
              >
                <Heart size={18} fill="currentColor" />
              </div>
            </div>

            {/* Partner avatar */}
            <Link 
              to="/wiki" 
              className="relative group/avatar cursor-pointer block hover:scale-105 transition-all duration-300"
              title="点击查看伴侣百科"
            >
              {/* Animated Bouncing Wiki entry indicator badge */}
              <div className="absolute -top-3 -right-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md z-40 border border-white/80 animate-bounce pointer-events-none select-none flex items-center space-x-0.5">
                <span>✨ 伴侣百科</span>
              </div>

              {/* Speech Bubble */}
              <div className="absolute -top-11 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-xs border border-rose-100 text-[10px] font-extrabold text-rose-600 px-2.5 py-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 group-hover:-translate-y-1.5 transition-all duration-500 select-none whitespace-nowrap pointer-events-none z-30 animate-bubble-float">
                🥰 贴贴~
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white border-r border-b border-rose-100 rotate-45" />
              </div>
              
              <div className="avatar-right-container w-24 h-24 rounded-full border-4 overflow-hidden bg-rose-50 shadow-md relative transition-all duration-500 ease-out animate-float-right animate-glow-breath">
                {partnerProfile?.avatar_url ? (
                  <img src={partnerProfile.avatar_url} alt="Partner Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-rose-400">
                    <User size={36} />
                  </div>
                )}
                <span className="absolute bottom-0 left-0 right-0 bg-rose-500/80 text-white text-[9px] font-bold text-center py-0.5 select-none">
                  {partnerProfile?.nickname || 'Ta'}
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Floating Interaction panel */}
        <div className="glass-panel rounded-3xl p-5 custom-shadow text-center">
          <p className="text-xs font-semibold text-rose-600/80 mb-3.5">给远处的 Ta 表达爱意吧</p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => handleSendInteraction('kiss')}
              className="px-4 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition duration-300 transform active:scale-95 shadow-md flex items-center space-x-1.5"
            >
              <span>💋 送飞吻</span>
            </button>
            <button
              onClick={() => handleSendInteraction('hug')}
              className="px-4 py-2.5 rounded-full bg-pink-400 hover:bg-pink-500 text-white text-xs font-bold transition duration-300 transform active:scale-95 shadow-md flex items-center space-x-1.5"
            >
              <span>🤗 送拥抱</span>
            </button>
            <button
              onClick={() => handleSendInteraction('miss')}
              className="px-4 py-2.5 rounded-full bg-amber-400 hover:bg-amber-500 text-white text-xs font-bold transition duration-300 transform active:scale-95 shadow-md flex items-center space-x-1.5"
            >
              <span>👀 我想你</span>
            </button>
          </div>
        </div>

        {/* Monthly Countdown Room Card */}
        <Link 
          to="/review"
          className="glass-panel rounded-3xl p-5 custom-shadow flex justify-between items-center bg-white/40 border border-white/50 hover:bg-white/50 transition duration-300 block select-none"
        >
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-rose-800 flex items-center">
              <Calendar size={15} className="mr-1.5 text-rose-500" />
              {latestReview?.status === 'negotiating' ? '约定协商中 ⏳' : '约定日倒计时 📅'}
            </h3>
            <p className="text-[10px] text-rose-600/80">
              {latestReview
                ? latestReview.status === 'agreed'
                  ? `已锁定约定时间: ${formatProposedDateTime(latestReview.scheduled_date)}`
                  : `提议约定时间: ${formatProposedDateTime(latestReview.proposed_date)} (待确定)`
                : '暂无未来的约定，去发起一个吧 ✨'}
            </p>
          </div>
          
          <div className="flex space-x-1 items-baseline font-mono text-rose-700 bg-white/30 px-3 py-1.5 rounded-2xl border border-white/40 shadow-inner">
            {countdown.isNow ? (
              <span className="text-xs font-bold text-rose-600 animate-pulse">进行中！</span>
            ) : !latestReview || (latestReview.status === 'agreed' && new Date(latestReview.scheduled_date).getTime() <= new Date().getTime()) ? (
              <span className="text-xs font-bold text-rose-500">暂无约定</span>
            ) : (
              <>
                <span className="text-sm font-bold">{countdown.days}</span>
                <span className="text-[9px]">天</span>
                <span className="text-sm font-bold">{countdown.hours}</span>
                <span className="text-[9px]">时</span>
                <span className="text-sm font-bold">{countdown.mins}</span>
                <span className="text-[9px]">分</span>
              </>
            )}
          </div>
        </Link>

        {/* Love Checklist Progress Card */}
        <Link 
          to="/checklist"
          className="glass-panel rounded-3xl p-5 custom-shadow flex flex-col space-y-3 bg-white/40 border border-white/50 block hover:bg-white/50 transition duration-300 select-none"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-rose-800 flex items-center">
              <Heart size={15} className="mr-1.5 text-rose-500 fill-rose-500" />
              恋爱 100 件事清单
            </h3>
            <span className="text-xs font-bold text-rose-600 bg-rose-50/50 px-2 py-0.5 rounded-full border border-rose-100">
              {checklistCount} / {checklistTotal}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-rose-100/40 rounded-full h-2 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-pink-400 to-rose-500 h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.round((checklistCount / Math.max(1, checklistTotal)) * 100)}%` }}
            />
          </div>

          {latestChecklistItem ? (
            <div className="text-[10px] text-rose-500 font-semibold flex items-center justify-between">
              <span className="truncate max-w-[70%]">
                ✨ 最近达成: {latestChecklistItem.item_name}
                {latestChecklistItem.notes && ` (${latestChecklistItem.notes})`}
              </span>
              <span className="text-rose-400/80 text-[8px]">{latestChecklistItem.completed_at.replace(/-/g, '/')}</span>
            </div>
          ) : (
            <p className="text-[10px] text-rose-500/80">还没有开启打卡呢，快点击这里开始记录吧~</p>
          )}
        </Link>

        {/* Config Settings Drawer Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-end justify-center">
            <div className="w-full max-w-md bg-white rounded-t-[32px] animate-slide-up shadow-2xl border-t border-rose-100 max-h-[85vh] flex flex-col overflow-hidden">
              <div className="flex justify-between items-center border-b border-rose-50 px-6 py-4 flex-shrink-0">
                <h2 className="text-base font-bold text-rose-800 flex items-center">
                  <Settings size={18} className="mr-1.5 text-rose-500 animate-spin-slow" />
                  空间与账户设置
                </h2>
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="text-xs font-bold text-rose-400 hover:text-rose-600 p-1"
                >
                  关闭
                </button>
              </div>

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-rose-700">空间主背景主题</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTheme('sunset')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        theme === 'sunset' 
                          ? 'bg-rose-500 text-white border-rose-500 shadow-md' 
                          : 'bg-rose-50/50 text-rose-700 border-rose-100 hover:bg-rose-50'
                      }`}
                    >
                      🌅 温暖落日
                    </button>
                    <button
                      onClick={() => setTheme('starry')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        theme === 'starry' 
                          ? 'bg-indigo-900 text-white border-indigo-900 shadow-md' 
                          : 'bg-indigo-50/50 text-indigo-700 border-indigo-100 hover:bg-indigo-50'
                      }`}
                    >
                      🌌 浪漫星空
                    </button>
                    <button
                      onClick={() => setTheme('cherry')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        theme === 'cherry' 
                          ? 'bg-pink-400 text-white border-pink-400 shadow-md' 
                          : 'bg-pink-50/50 text-pink-700 border-pink-100 hover:bg-pink-50'
                      }`}
                    >
                      🌸 烂漫樱花
                    </button>
                    <button
                      onClick={() => setTheme('auto')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        theme === 'auto' 
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md' 
                          : 'bg-rose-50/50 text-rose-700 border-rose-100 hover:bg-rose-50'
                      }`}
                    >
                      ⏰ 自动随时间
                    </button>
                  </div>
                </div>

                {/* Anniversary Editor */}
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">在一起的纪念日</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 text-rose-400" size={16} />
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="w-full pl-10 pr-4 py-2.5 text-left text-sm border border-rose-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800 bg-white/60 backdrop-blur-xs font-semibold"
                    >
                      {newAnniversary || '选择纪念日'}
                    </button>
                  </div>
                  
                  {showDatePicker && (
                    <div className="mt-2 bg-rose-50/30 border border-rose-100 rounded-2xl p-4 animate-slide-up">
                      {/* Calendar Header */}
                      <div className="flex justify-between items-center mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (calendarMonth === 0) {
                              setCalendarMonth(11);
                              setCalendarYear(calendarYear - 1);
                            } else {
                              setCalendarMonth(calendarMonth - 1);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 transition"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        
                        <div className="flex space-x-1.5">
                          <select
                            value={calendarYear}
                            onChange={(e) => setCalendarYear(parseInt(e.target.value, 10))}
                            className="text-xs font-bold text-rose-800 bg-white border border-rose-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                          >
                            {yearsList.map(y => (
                              <option key={y} value={y}>{y}年</option>
                            ))}
                          </select>
                          <select
                            value={calendarMonth}
                            onChange={(e) => setCalendarMonth(parseInt(e.target.value, 10))}
                            className="text-xs font-bold text-rose-800 bg-white border border-rose-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                          >
                            {monthsList.map((m, idx) => (
                              <option key={idx} value={idx}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (calendarMonth === 11) {
                              setCalendarMonth(0);
                              setCalendarYear(calendarYear + 1);
                            } else {
                              setCalendarMonth(calendarMonth + 1);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 transition"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Calendar Week Labels */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-rose-400 mb-1">
                        {['日', '一', '二', '三', '四', '五', '六'].map(w => (
                          <div key={w} className="py-1">{w}</div>
                        ))}
                      </div>

                      {/* Calendar Days Grid */}
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
                          const dayStr = `${targetYear}-${(targetMonth + 1).toString().padStart(2, '0')}-${item.day.toString().padStart(2, '0')}`;
                          const isSelected = newAnniversary === dayStr;
                          
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setNewAnniversary(dayStr);
                                setShowDatePicker(false);
                              }}
                              className={`py-1.5 text-xs rounded-lg font-bold transition ${
                                isSelected
                                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                                  : item.isCurrentMonth
                                    ? 'text-rose-800 hover:bg-rose-50'
                                    : 'text-rose-300 hover:bg-rose-50/50'
                              }`}
                            >
                              {item.day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Nickname Editor */}
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">我的昵称</label>
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder="阿强/阿珍"
                    className="w-full px-4 py-2.5 text-sm border border-rose-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800"
                  />
                </div>

                {/* Avatar Upload */}
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">我的头像</label>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-rose-50 rounded-xl border border-rose-100 overflow-hidden flex items-center justify-center">
                      {newAvatarUrl ? (
                        <img src={newAvatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-rose-300" />
                      )}
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                        id="avatar-upload"
                        className="hidden"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="inline-flex items-center space-x-1.5 px-4 py-2.5 border border-rose-100 rounded-xl bg-rose-50/50 hover:bg-rose-50 text-rose-700 text-xs font-bold cursor-pointer transition"
                      >
                        <Image size={14} />
                        <span>{uploadingAvatar ? '上传中...' : '上传新头像'}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* System Web Push Notifications Toggle */}
                <div className="pt-4 border-t border-rose-50/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-rose-700 flex items-center">
                        <Bell size={14} className="mr-1.5 text-rose-500 animate-pulse" />
                        开启手机系统消息通知
                      </h4>
                      <p className="text-[10px] text-rose-400 mt-0.5 leading-normal">
                        开启后，对方发来互动或悄悄话时，即使关闭网页也可收到通知
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={subscribingPush}
                      onClick={handleToggleNotification}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notificationEnabled ? 'bg-rose-500' : 'bg-rose-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notificationEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  {notificationEnabled && (
                    <div className="p-2 rounded-xl bg-rose-50/50 border border-rose-100/50 text-[10px] text-rose-600 leading-normal">
                      ✅ 消息通知已启用。注：iOS 设备须先在 Safari 中“添加到主屏幕”并在系统设置中允许通知。
                    </div>
                  )}
                </div>

                {/* Change Password Block */}
                <div className="pt-4 border-t border-rose-50/80 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-rose-700 hover:text-rose-800 transition focus:outline-none"
                  >
                    <span className="flex items-center">
                      <Lock size={14} className="mr-1.5 text-rose-500" />
                      🔐 修改专属登录密码
                    </span>
                    <span className="text-[10px] text-rose-400">
                      {showPasswordFields ? '收起' : '展开'}
                    </span>
                  </button>

                  {showPasswordFields && (
                    <div className="space-y-3 p-3.5 bg-rose-50/20 border border-rose-100/60 rounded-2xl animate-slide-up">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-rose-800/80 select-none">新密码</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="不少于 6 位的新密码"
                            className="w-full px-3 py-2 text-xs border border-rose-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-rose-400 hover:text-rose-600"
                          >
                            {showNewPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-rose-800/80 select-none">确认新密码</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="再次输入新密码"
                            className="w-full px-3 py-2 text-xs border border-rose-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-rose-400 hover:text-rose-600"
                          >
                            {showConfirmPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={passwordUpdating || !newPassword || !confirmPassword}
                        onClick={handleChangePassword}
                        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-3 rounded-xl transition text-[11px] disabled:opacity-50 shadow-sm"
                      >
                        {passwordUpdating ? '正在修改密码...' : '确定修改密码'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 pt-3 pb-8 border-t border-rose-50 bg-white flex-shrink-0">
                <button
                  onClick={handleSaveSettings}
                  disabled={updating || uploadingAvatar}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 px-4 rounded-2xl transition hover:shadow-lg active:scale-95 disabled:opacity-50 text-sm"
                >
                  {updating ? '正在保存修改...' : '保存修改'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Custom Toast Notification Popup */}
      {toast && (
        <div className="fixed toast-safe-top left-1/2 -translate-x-1/2 z-[1200] max-w-xs w-full px-4 animate-fade-in pointer-events-none">
          <div className={`glass-panel p-4 rounded-2xl shadow-xl border flex items-center space-x-3 backdrop-blur-md transition-all duration-300 pointer-events-auto ${
            toast.type === 'error' 
              ? 'border-red-200 bg-red-50/90 text-red-800' 
              : 'border-rose-200 bg-rose-50/95 text-rose-800 shadow-rose-200/50'
          }`}>
            <span className="text-lg">
              {toast.type === 'error' ? '❌' : '✨'}
            </span>
            <p className="text-xs font-bold leading-snug">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Custom Quote Manager Modal */}
      {showQuoteEditor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[1000] flex items-center justify-center p-4">
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-rose-100/50 shadow-2xl space-y-4 bg-white/95 relative max-h-[85vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-rose-50 flex-shrink-0">
              <h3 className="text-xs font-bold text-rose-800 flex items-center space-x-1.5">
                <Heart size={14} fill="currentColor" className="text-rose-500 animate-pulse" />
                <span>我们的专属情话/诗词集</span>
              </h3>
              <button 
                onClick={() => setShowQuoteEditor(false)}
                className="p-1 rounded-full hover:bg-rose-50 text-rose-500 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1">
              
              {/* Tab Selector */}
              <div className="grid grid-cols-3 gap-1 bg-rose-50/50 p-1 rounded-xl">
                {(['morning', 'afternoon', 'night'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewQuotePeriod(p)}
                    className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                      newQuotePeriod === p 
                        ? 'bg-rose-500 text-white shadow-xs' 
                        : 'text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    {p === 'morning' ? '🌅 晨曦' : p === 'afternoon' ? '🌇 暮色' : '🌌 星辰'}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSaveCustomQuote} className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-rose-700 mb-1">写下一段誓言/情话</label>
                  <textarea
                    value={newQuoteText}
                    onChange={(e) => setNewQuoteText(e.target.value)}
                    placeholder="例如：灶台有烟火，身旁有你。&#10;支持多行输入（一句一行），展示时会依次滚动。"
                    className="glass-input w-full p-2.5 rounded-xl text-[11px] text-rose-800 placeholder-rose-300 resize-none h-20 focus:ring-rose-400 border border-rose-100 leading-normal"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newQuoteText.trim()}
                  className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1 text-xs active:scale-95 shadow-sm"
                >
                  <Plus size={12} />
                  <span>收纳情话</span>
                </button>
              </form>

              {/* List */}
              <div className="space-y-2 pt-3 border-t border-rose-50">
                <h4 className="text-[10px] font-bold text-rose-700">
                  当前已收纳 ({(customQuotes[newQuotePeriod] || []).length} 条)
                </h4>
                
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {(customQuotes[newQuotePeriod] || []).length === 0 ? (
                    <p className="text-[10px] text-center text-rose-400 py-6">
                      当前时段还没有专属情话，快去添加一句吧 ✍️
                    </p>
                  ) : (
                    (customQuotes[newQuotePeriod] || []).map((quoteLines: string[], idx: number) => (
                      <div 
                        key={idx} 
                        className="flex items-start justify-between bg-rose-50/20 p-2 rounded-xl border border-rose-100/10 text-rose-800"
                      >
                        <div className="space-y-0.5 pr-2">
                          {quoteLines.map((line, lidx) => (
                            <p key={lidx} className="text-[10px] leading-relaxed text-rose-700">
                              {line}
                            </p>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomQuote(newQuotePeriod, idx)}
                          className="text-rose-300 hover:text-red-500 p-0.5 rounded transition"
                          title="删除"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 伴侣发起约定日协商时间弹出卡片 */}
      {showProposalModal && latestReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-4">
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-rose-100/50 shadow-2xl space-y-4 bg-white/95 relative animate-scale-up text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <Calendar size={28} className="text-rose-500" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-sm font-black text-rose-800">💞 伴侣发起了约定日邀约！</h3>
              <p className="text-[10px] text-rose-600/80 leading-relaxed font-medium">
                伴侣 <strong>{profiles.find(p => p.id === latestReview.last_proposer_id)?.nickname || 'Ta'}</strong> 提议了下次约定的时间：
              </p>
              <div className="bg-rose-50 border border-rose-100 rounded-2xl py-2.5 px-4 font-bold text-rose-800 text-xs inline-block shadow-inner mt-1">
                {formatProposedDateTime(latestReview.proposed_date)}
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowProposalModal(false);
                  sessionStorage.setItem(`dismissed_proposal_${latestReview.id}`, 'true');
                }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-2xl transition active:scale-95 text-xs"
              >
                暂时忽略
              </button>
              <Link
                to="/review"
                onClick={() => {
                  setShowProposalModal(false);
                  sessionStorage.setItem(`dismissed_proposal_${latestReview.id}`, 'true');
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-2xl transition active:scale-95 text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-rose-200"
              >
                <span>去表态 ➔</span>
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

