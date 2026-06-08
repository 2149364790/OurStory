import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Heart, Plus, Trash2, Copy, Gift, ShieldAlert,
  CheckCircle, ArrowLeft, Edit3, BookOpen, Coffee, Shirt,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LoveProgressBar } from '../components/LoveProgressBar';

interface PartnerPreferences {
  clothing_sizes: {
    cloth: string;
    pants: string;
    shoes: string;
    ring: string;
  };
  diet_preferences: {
    likes: string[];
    hates: string[];
    milktops: string;
  };
  mbti: string;
  how_to_soothe: string;
}

interface PartnerRecord {
  id: string;
  creator_id: string;
  target_id: string;
  type: 'advantage' | 'wish' | 'love_reason';
  content: string;
  is_secret: boolean;
  created_at: string;
}

export const PartnerWiki: React.FC = () => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);
  
  // Realtime lists
  const [myPrefs, setMyPrefs] = useState<PartnerPreferences>({
    clothing_sizes: { cloth: '', pants: '', shoes: '', ring: '' },
    diet_preferences: { likes: [], hates: [], milktops: '' },
    mbti: '',
    how_to_soothe: ''
  });
  
  const [records, setRecords] = useState<PartnerRecord[]>([]);

  // Editing modes
  const [isEditingPrefs, setIsEditingPrefs] = useState(false);
  const [newAdvantage, setNewAdvantage] = useState('');
  const [newWish, setNewWish] = useState('');
  const [newWishSecret, setNewWishSecret] = useState(false);
  
  // Custom Tag Inputs
  const [likeInput, setLikeInput] = useState('');
  const [hateInput, setHateInput] = useState('');
  const [newLoveReason, setNewLoveReason] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState<string | null>(null);
  const [hasAutoPublished, setHasAutoPublished] = useState(false);

  // Toast / feedback message
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'info' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const partnerProfile = useMemo(() => {
    return profiles.find(p => p.id !== currentUser?.id);
  }, [profiles, currentUser]);



  // Fetch initial data
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }
        setCurrentUser(user);

        // Fetch profiles
        const { data: profs } = await supabase.from('profiles').select('*').order('updated_at', { ascending: true });
        if (profs) setProfiles(profs);

        // Fetch preferences & records with table existence check
        const { data: prefsData, error: prefsError } = await supabase.from('partner_preferences').select('*');
        if (prefsError) {
          // If table doesn't exist, we show setup page
          if (prefsError.code === '42P01') {
            setDbReady(false);
            setLoading(false);
            return;
          }
          throw prefsError;
        }

        const { data: recData, error: recError } = await supabase.from('partner_records').select('*').order('created_at', { ascending: false });
        if (recError) throw recError;

        // Separate preference data
        if (prefsData) {
          const mine = prefsData.find(p => p.id === user.id);
          if (mine) {
            setMyPrefs({
              clothing_sizes: mine.clothing_sizes || { cloth: '', pants: '', shoes: '', ring: '' },
              diet_preferences: mine.diet_preferences || { likes: [], hates: [], milktops: '' },
              mbti: mine.mbti || '',
              how_to_soothe: mine.how_to_soothe || ''
            });
          }
        }

        if (recData) {
          setRecords(recData);
        }

        // Fetch anniversary date
        const { data: configData } = await supabase
          .from('couple_config')
          .select('anniversary_date')
          .eq('id', '00000000-0000-0000-0000-000000000000')
          .single();
        if (configData && configData.anniversary_date) {
          setAnniversaryDate(configData.anniversary_date);
        }
        
      } catch (err) {
        console.error("Error loading wiki data:", err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [navigate]);

  // Auto-publish on anniversary and special milestones
  useEffect(() => {
    if (!currentUser || !records.length || !anniversaryDate || hasAutoPublished) return;

    const checkAndAutoPublish = async () => {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentDate = today.getDate();

      // 1. Check Romantic Holidays (西方情人节, 520, 圣诞节, 跨年夜, 元旦)
      const isRomanticHoliday = (
        (currentMonth === 2 && currentDate === 14) || // 西方情人节
        (currentMonth === 5 && currentDate === 20) || // 520 网络情人节
        (currentMonth === 12 && currentDate === 25) || // 圣诞节
        (currentMonth === 12 && currentDate === 31) || // 跨年夜
        (currentMonth === 1 && currentDate === 1)      // 元旦
      );

      // 2. Check relationship anniversary (together date)
      const together = new Date(anniversaryDate);
      
      // Calculate days together (clean calendar days, counting the start day as Day 1)
      const date1 = Date.UTC(together.getFullYear(), together.getMonth(), together.getDate());
      const date2 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      const diffDays = Math.floor((date2 - date1) / (1000 * 60 * 60 * 24)) + 1;

      // Conditions for auto-publish
      const isAnnualAnniversary = (currentMonth === (together.getMonth() + 1) && currentDate === together.getDate());
      const isMilestoneHundredDays = (diffDays > 0 && diffDays % 100 === 0);
      const isSpecialMilestoneDays = (diffDays === 520 || diffDays === 1314);

      if (isRomanticHoliday || isAnnualAnniversary || isMilestoneHundredDays || isSpecialMilestoneDays) {
        // Filter out secret reasons written by me
        const privateReasons = records.filter(
          r => r.type === 'love_reason' && r.creator_id === currentUser.id && r.is_secret
        );

        if (privateReasons.length > 0) {
          try {
            const idsToUpdate = privateReasons.map(r => r.id);
            const { error } = await supabase
              .from('partner_records')
              .update({ is_secret: false })
              .in('id', idsToUpdate);

            if (error) throw error;

            setHasAutoPublished(true);

            // Confetti animation
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#ff4d6d', '#ff758f', '#ffccd5', '#f15bb5'],
            });

            // Trigger custom beauty modal notification
            let cause = "特别的日子";
            if (isAnnualAnniversary) cause = `在一起的 ${today.getFullYear() - together.getFullYear()} 周年纪念日`;
            else if (isRomanticHoliday && currentMonth === 5 && currentDate === 20) cause = "520 浪漫节日当天";
            else if (isRomanticHoliday) cause = "浪漫的传统节日";
            else if (isSpecialMilestoneDays) cause = `在一起的第 ${diffDays} 天特别纪念`;
            else if (isMilestoneHundredDays) cause = `相伴的第 ${diffDays} 天百日纪念`;

            (window as any).showCustomAlert(
              '💖 纪念日浪漫惊喜',
              `今天是你们${cause}！您默默在手账中积攒的 ${privateReasons.length} 条心动理由已自动公开送达给 Ta 啦！🎉`
            );
          } catch (err) {
            console.error('Error auto-publishing love reasons:', err);
          }
        }
      }
    };

    checkAndAutoPublish();
  }, [currentUser, records, anniversaryDate, hasAutoPublished]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!currentUser || !dbReady) return;

    const prefsChannel = supabase
      .channel('realtime:partner_prefs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partner_preferences' },
        (payload) => {
          const updated = payload.new as any;
          if (updated && updated.id === currentUser.id) {
            setMyPrefs({
              clothing_sizes: updated.clothing_sizes,
              diet_preferences: updated.diet_preferences,
              mbti: updated.mbti,
              how_to_soothe: updated.how_to_soothe
            });
          }
        }
      )
      .subscribe();

    const recordsChannel = supabase
      .channel('realtime:partner_recs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partner_records' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const ins = payload.new as PartnerRecord;
            setRecords(prev => [ins, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const upd = payload.new as PartnerRecord;
            setRecords(prev => prev.map(r => r.id === upd.id ? upd : r));
          } else if (payload.eventType === 'DELETE') {
            const del = payload.old as any;
            setRecords(prev => prev.filter(r => r.id !== del.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(prefsChannel);
      supabase.removeChannel(recordsChannel);
    };
  }, [currentUser, dbReady]);



  // Save Preferences
  const handleSavePreferences = async () => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from('partner_preferences').upsert({
        id: currentUser.id,
        clothing_sizes: myPrefs.clothing_sizes,
        diet_preferences: myPrefs.diet_preferences,
        mbti: myPrefs.mbti,
        how_to_soothe: myPrefs.how_to_soothe,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      setIsEditingPrefs(false);
      showFeedback('💾 喜好档案已成功保存！');
      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.8 },
        colors: ['#2ec4b6', '#cbf3f0'],
      });
    } catch (err) {
      console.error(err);
      (window as any).showCustomAlert('保存失败', '请检查网络连接是否正常。');
    }
  };

  // Add tag helper
  const addPreferenceTag = (type: 'likes' | 'hates') => {
    const val = type === 'likes' ? likeInput.trim() : hateInput.trim();
    if (!val) return;
    
    setMyPrefs(prev => {
      const list = prev.diet_preferences[type] || [];
      if (list.includes(val)) return prev;
      return {
        ...prev,
        diet_preferences: {
          ...prev.diet_preferences,
          [type]: [...list, val]
        }
      };
    });

    if (type === 'likes') setLikeInput('');
    else setHateInput('');
  };

  // Remove tag helper
  const removePreferenceTag = (type: 'likes' | 'hates', tag: string) => {
    setMyPrefs(prev => {
      const list = prev.diet_preferences[type] || [];
      return {
        ...prev,
        diet_preferences: {
          ...prev.diet_preferences,
          [type]: list.filter(t => t !== tag)
        }
      };
    });
  };

  // Add an advantage (compliment) to partner
  const handleAddAdvantage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !partnerProfile || !newAdvantage.trim()) return;

    try {
      const { error } = await supabase.from('partner_records').insert({
        creator_id: currentUser.id,
        target_id: partnerProfile.id,
        type: 'advantage',
        content: newAdvantage.trim(),
        is_secret: false
      });

      if (error) throw error;

      // Animate celebration
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#ff4d6d', '#ff758f', '#ffccd5'],
      });

      setNewAdvantage('');
      showFeedback('💖 已向 Ta 的优点墙写入记录，Ta 已收到通知！');
    } catch (err) {
      console.error(err);
    }
  };

  // Delete a record (advantage, wish, or love_reason)
  const handleDeleteRecord = async (id: string) => {
    (window as any).showCustomConfirm(
      '确认删除 🗑️',
      '确定要删除这一条温馨记录吗？此操作无法撤销。',
      async () => {
        try {
          const { error } = await supabase.from('partner_records').delete().eq('id', id);
          if (error) throw error;
          showFeedback('🗑️ 记录已移去');
        } catch (err) {
          console.error(err);
          (window as any).showCustomAlert('删除失败', '请检查网络连接是否正常。');
        }
      }
    );
  };

  // Add a wish
  const handleAddWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newWish.trim()) return;

    try {
      // Creator is currentUser. If it's secret, target is partner (I plan it for them)
      // If it's a public wish, target can be myself (I wish for it, they fulfill it)
      const targetId = newWishSecret ? (partnerProfile?.id || currentUser.id) : currentUser.id;

      const { error } = await supabase.from('partner_records').insert({
        creator_id: currentUser.id,
        target_id: targetId,
        type: 'wish',
        content: newWish.trim(),
        is_secret: newWishSecret
      });

      if (error) throw error;

      setNewWish('');
      setNewWishSecret(false);
      showFeedback(newWishSecret ? '🤫 悄悄在心里记下了一个礼物惊喜' : '🌟 心愿发布成功！');
    } catch (err) {
      console.error(err);
    }
  };

  // Add a reason why I love my partner
  const handleAddLoveReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !partnerProfile || !newLoveReason.trim()) return;

    try {
      const { error } = await supabase.from('partner_records').insert({
        creator_id: currentUser.id,
        target_id: partnerProfile.id,
        type: 'love_reason',
        content: newLoveReason.trim(),
        is_secret: true // 平时私密
      });

      if (error) throw error;

      setNewLoveReason('');
      showFeedback('💖 已记下一条喜欢 Ta 的原因，等待纪念日一键公开！');
      confetti({
        particleCount: 20,
        spread: 30,
        origin: { y: 0.8 },
        colors: ['#ff85a1', '#ffccd5'],
      });
    } catch (err) {
      console.error(err);
      (window as any).showCustomAlert('添加失败', '请检查网络连接是否正常。');
    }
  };

  // Publish all secret love reasons
  const handlePublishAllLoveReasons = async () => {
    if (!currentUser || !partnerProfile) return;
    const privateReasons = myLoveReasons.filter(r => r.is_secret);
    if (privateReasons.length === 0) return;

    (window as any).showCustomConfirm(
      '公开心动理由 💖',
      `确定要在今天将所有攒下的 ${privateReasons.length} 条心动理由公开给 Ta 吗？这将会是一份浪漫的惊喜！`,
      async () => {
        try {
          const idsToUpdate = privateReasons.map(r => r.id);
          const { error } = await supabase
            .from('partner_records')
            .update({ is_secret: false })
            .in('id', idsToUpdate);

          if (error) throw error;

          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#ff4d6d', '#ff758f', '#ffccd5', '#f15bb5'],
          });

          showFeedback('🎉 所有的心动理由均已成功公开！Ta 可以在自己的百科中看到了！');
        } catch (err) {
          console.error(err);
          (window as any).showCustomAlert('公开失败', '请检查网络连接是否正常。');
        }
      }
    );
  };

  // Copy utility
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showFeedback(`📋 已复制 ${label} 到剪贴板！`, 'info');
    });
  };

  // Filtered lists
  const myLoveReasons = useMemo(() => {
    return records.filter(r => r.type === 'love_reason' && r.creator_id === currentUser?.id);
  }, [records, currentUser]);

  const partnerLoveReasons = useMemo(() => {
    return records.filter(r => r.type === 'love_reason' && r.creator_id === partnerProfile?.id && !r.is_secret);
  }, [records, partnerProfile]);

  const partnerPrivateReasonsCount = useMemo(() => {
    if (!partnerProfile) return 0;
    return records.filter(r => r.type === 'love_reason' && r.creator_id === partnerProfile.id && r.is_secret).length;
  }, [records, partnerProfile]);


  const myCompliments = useMemo(() => {
    return records.filter(r => r.type === 'advantage' && r.target_id === currentUser?.id);
  }, [records, currentUser]);

  const partnerCompliments = useMemo(() => {
    return records.filter(r => r.type === 'advantage' && r.target_id === partnerProfile?.id);
  }, [records, partnerProfile]);

  const wishesList = useMemo(() => {
    // 1. Wishes made by my partner publicly (creator = partner, target = partner, secret = false)
    // 2. Wishes made by me publicly (creator = me, target = me, secret = false)
    // 3. My secret plans for partner (creator = me, target = partner, secret = true)
    return records.filter(r => {
      if (r.type !== 'wish') return false;
      if (r.is_secret) {
        // Only creator can see secret wishes
        return r.creator_id === currentUser?.id;
      }
      return true;
    });
  }, [records, currentUser]);

  // SQL Script for setup guidance
  const sqlScript = `-- 伴侣百科 SQL 初始化脚本
-- 您可在 Supabase 控制台的 SQL Editor 中一键复制并运行：

create table if not exists public.partner_preferences (
  id uuid references public.profiles(id) on delete cascade primary key,
  clothing_sizes jsonb not null default '{}'::jsonb,
  diet_preferences jsonb not null default '{}'::jsonb,
  mbti varchar(20),
  how_to_soothe text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.partner_preferences enable row level security;

create policy "Allow authenticated users full access to partner_preferences" 
  on public.partner_preferences for all using (auth.role() = 'authenticated');

create table if not exists public.partner_records (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  target_id uuid references public.profiles(id) on delete cascade not null,
  type varchar(20) not null check (type in ('advantage', 'wish', 'love_reason')),
  content text not null,
  is_secret boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.partner_records enable row level security;

create policy "Allow authenticated users full access to partner_records" 
  on public.partner_records for all using (auth.role() = 'authenticated');

alter publication supabase_realtime add table public.partner_preferences;
alter publication supabase_realtime add table public.partner_records;`;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#fdf6f0] via-[#fee4e6] to-[#fceade]">
        <div className="w-16 h-16 rounded-2xl bg-white/85 border border-rose-100 shadow-md flex items-center justify-center animate-glow-breath mb-4">
          <Heart className="text-rose-500 animate-pulse" size={30} fill="currentColor" />
        </div>
        <p className="text-xs text-rose-700/80 font-bold tracking-wider animate-pulse">正在翻阅专属档案手账...</p>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-md mx-auto space-y-6 flex flex-col justify-center">
        <div className="glass-panel p-6 rounded-3xl border border-amber-200 bg-amber-50/40 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-500">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-base font-extrabold text-amber-800">数据库表尚未部署</h2>
          <p className="text-xs text-amber-700/80 leading-relaxed">
            检测到伴侣百科功能所依赖的数据库表（`partner_preferences` 和 `partner_records`）在 Supabase 后端尚未被创建。
          </p>
          <p className="text-xs font-semibold text-rose-600 bg-white/70 py-2 px-3 rounded-xl border border-rose-100">
            💡 请让技术维护者在 Supabase 控制台的 SQL Editor 中执行该文件夹下的迁移文件 [partner_wiki_schema.sql](file:///d:/TMEP/健身-饮食-护肤-穿搭-情绪-生活/our_story/supabase/partner_wiki_schema.sql)
          </p>
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase">SQL 初始化命令</span>
              <button 
                onClick={() => copyToClipboard(sqlScript, 'SQL 脚本')}
                className="text-xs text-amber-600 hover:text-amber-800 font-extrabold flex items-center space-x-1"
              >
                <Copy size={12} />
                <span>复制 SQL</span>
              </button>
            </div>
            <pre className="text-[9px] font-mono bg-gray-900 text-gray-200 p-3 rounded-2xl overflow-x-auto max-h-48 shadow-inner leading-normal">
              {sqlScript}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition duration-300"
          >
            完成执行后，刷新页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-28 min-h-screen">
      {/* Top Header */}
      <div className="flex justify-between items-center py-4 max-w-md mx-auto relative z-10">
        <button 
          onClick={() => navigate('/')} 
          className="p-2.5 rounded-full bg-white/40 hover:bg-white/60 border border-white/40 text-rose-700 transition"
          title="返回主页"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-handwritten text-xl text-rose-700 font-bold select-none flex items-center space-x-1.5">
          <BookOpen size={18} className="text-rose-500" />
          <span>伴侣百科手账</span>
        </span>
        <div className="w-10 h-10" /> {/* Balance placeholder */}
      </div>

      {/* Floating feedback alert */}
      {feedback && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-lg border transition-all animate-bounce-in ${
          feedback.type === 'success' 
            ? 'bg-rose-50 text-rose-800 border-rose-200' 
            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
        }`}>
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-6">
        {/* Partner Wiki Card (View & Edit Partner's preferences, sizes, MBTI and Soothe plan) */}
        <div className="glass-panel rounded-3xl p-5 border border-white/50 custom-shadow space-y-4 bg-white/40 relative overflow-hidden">
          <div className="absolute w-32 h-32 rounded-full bg-pink-400/10 blur-[35px] top-[-10%] right-[-10%] pointer-events-none" />
          
          <div className="flex justify-between items-center pb-2 border-b border-rose-100/50">
            <h3 className="text-xs font-bold text-rose-800 flex items-center">
              <Coffee size={14} className="mr-1.5 text-rose-500" />
              <span>伴侣实用信息 💡 (仅我可见，逐步完善)</span>
            </h3>
            {!isEditingPrefs ? (
              <button 
                onClick={() => setIsEditingPrefs(true)}
                className="text-xs text-rose-600 hover:text-rose-800 font-extrabold flex items-center space-x-1"
              >
                <Edit3 size={12} />
                <span>编辑修改</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button 
                  onClick={() => {
                    setIsEditingPrefs(false);
                    window.location.reload(); // Quick reset
                  }}
                  className="text-xs text-gray-500 hover:text-gray-750 font-bold"
                >
                  取消
                </button>
                <button 
                  onClick={handleSavePreferences}
                  className="text-xs text-rose-600 hover:text-rose-800 font-extrabold"
                >
                  保存
                </button>
              </div>
            )}
          </div>

          {!isEditingPrefs ? (
            // View Mode
            <div className="space-y-4">
              {/* Sizes section */}
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => myPrefs.clothing_sizes.cloth && copyToClipboard(myPrefs.clothing_sizes.cloth, '衣服尺码')}
                  className="bg-white/50 border border-white/80 rounded-2xl p-3 shadow-2xs cursor-pointer hover:bg-white/70 active:scale-98 transition text-center relative group"
                >
                  <Shirt size={12} className="absolute top-2 left-2 text-rose-300" />
                  <span className="block text-[10px] font-bold text-gray-400">衣服尺码</span>
                  <span className="block text-sm font-extrabold text-rose-800 mt-1">
                    {myPrefs.clothing_sizes.cloth || '未填写'}
                  </span>
                  {myPrefs.clothing_sizes.cloth && <span className="absolute bottom-1 right-2 text-[8px] text-gray-300 opacity-0 group-hover:opacity-100 transition">点击复制</span>}
                </div>
                <div 
                  onClick={() => myPrefs.clothing_sizes.pants && copyToClipboard(myPrefs.clothing_sizes.pants, '裤子尺码')}
                  className="bg-white/50 border border-white/80 rounded-2xl p-3 shadow-2xs cursor-pointer hover:bg-white/70 active:scale-98 transition text-center relative group"
                >
                  <span className="block text-[10px] font-bold text-gray-400">裤子尺码</span>
                  <span className="block text-sm font-extrabold text-rose-800 mt-1">
                    {myPrefs.clothing_sizes.pants || '未填写'}
                  </span>
                  {myPrefs.clothing_sizes.pants && <span className="absolute bottom-1 right-2 text-[8px] text-gray-300 opacity-0 group-hover:opacity-100 transition">点击复制</span>}
                </div>
                <div 
                  onClick={() => myPrefs.clothing_sizes.shoes && copyToClipboard(myPrefs.clothing_sizes.shoes, '鞋子尺码')}
                  className="bg-white/50 border border-white/80 rounded-2xl p-3 shadow-2xs cursor-pointer hover:bg-white/70 active:scale-98 transition text-center relative group"
                >
                  <span className="block text-[10px] font-bold text-gray-400">鞋子尺码</span>
                  <span className="block text-sm font-extrabold text-rose-800 mt-1">
                    {myPrefs.clothing_sizes.shoes || '未填写'}
                  </span>
                  {myPrefs.clothing_sizes.shoes && <span className="absolute bottom-1 right-2 text-[8px] text-gray-300 opacity-0 group-hover:opacity-100 transition">点击复制</span>}
                </div>
                <div 
                  onClick={() => myPrefs.clothing_sizes.ring && copyToClipboard(myPrefs.clothing_sizes.ring, '戒指指围')}
                  className="bg-white/50 border border-white/80 rounded-2xl p-3 shadow-2xs cursor-pointer hover:bg-white/70 active:scale-98 transition text-center relative group"
                >
                  <span className="block text-[10px] font-bold text-gray-400">戒指指围</span>
                  <span className="block text-sm font-extrabold text-rose-800 mt-1">
                    {myPrefs.clothing_sizes.ring || '未填写'}
                  </span>
                  {myPrefs.clothing_sizes.ring && <span className="absolute bottom-1 right-2 text-[8px] text-gray-300 opacity-0 group-hover:opacity-100 transition">点击复制</span>}
                </div>
              </div>

              {/* Milk tea / Diet preference */}
              <div 
                onClick={() => myPrefs.diet_preferences.milktops && copyToClipboard(myPrefs.diet_preferences.milktops, '奶茶喜好')}
                className="bg-white/60 border border-white/95 rounded-2xl p-4 shadow-2xs relative overflow-hidden cursor-pointer hover:bg-white/70 active:scale-99 transition group"
              >
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-400/80" />
                <span className="block text-[10px] font-extrabold text-amber-700 tracking-wider">🧋 伴侣奶茶偏好</span>
                <span className="block text-xs font-bold text-gray-650 mt-1.5 leading-relaxed">
                  {myPrefs.diet_preferences.milktops || '尚未记录 Ta 的奶茶常点偏好~'}
                </span>
                {myPrefs.diet_preferences.milktops && <span className="absolute bottom-2 right-3 text-[8px] text-gray-300 opacity-0 group-hover:opacity-100 transition">点击复制</span>}
              </div>

              {/* Foods likes & hates */}
              <div className="space-y-3 pt-1">
                <div>
                  <span className="block text-[10px] font-bold text-emerald-600 mb-1.5 flex items-center">
                    🟢 Ta爱吃的东西:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {myPrefs.diet_preferences.likes && myPrefs.diet_preferences.likes.length > 0 ? (
                      myPrefs.diet_preferences.likes.map((l, idx) => (
                        <span key={idx} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700">
                          {l}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">暂无记录</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-rose-500 mb-1.5 flex items-center">
                    🔴 Ta讨厌/忌口食物:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {myPrefs.diet_preferences.hates && myPrefs.diet_preferences.hates.length > 0 ? (
                      myPrefs.diet_preferences.hates.map((h, idx) => (
                        <span key={idx} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600">
                          {h}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">暂无记录</span>
                    )}
                  </div>
                </div>
              </div>

              {/* MBTI Personality */}
              <div className="flex items-center space-x-3 bg-white/50 border border-white/80 rounded-2xl p-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center font-black text-rose-600 text-sm">
                  {myPrefs.mbti ? myPrefs.mbti.substring(0, 4).toUpperCase() : '?'}
                </div>
                <div className="flex-1">
                  <span className="block text-[10px] font-bold text-gray-400">MBTI 性格类型</span>
                  <span className="block text-xs font-bold text-rose-800 mt-0.5">
                    {myPrefs.mbti || '尚未记录 Ta 的 MBTI 性格特征~'}
                  </span>
                </div>
              </div>

              {/* How to soothe (Notebook style card) */}
              <div className="bg-amber-50/20 border border-amber-100/60 rounded-2xl p-4 shadow-2xs relative notebook-paper">
                <div className="absolute top-0 bottom-0 left-4 w-[1px] bg-red-200/50 pointer-events-none" />
                <span className="block text-[10px] font-extrabold text-amber-700 tracking-wider pl-4">📝 当 Ta 生气/难过时的哄法</span>
                <p className="text-xs font-medium text-gray-600 pl-4 pr-1 mt-2.5 whitespace-pre-wrap leading-relaxed">
                  {myPrefs.how_to_soothe || '尚未写下当 Ta 难过时怎么哄最管用的备忘录。点击右上角编辑开始记录吧！'}
                </p>
              </div>
            </div>
          ) : (
            // Edit Mode Form
            <div className="space-y-4">
              {/* Edit Sizes */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-rose-700">尺码编辑 (衣服/鞋帽)</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[9px] text-gray-450 font-bold mb-0.5">衣服尺码 (如 M/L/170)</label>
                    <input 
                      type="text" 
                      value={myPrefs.clothing_sizes.cloth}
                      onChange={(e) => setMyPrefs(prev => ({
                        ...prev, 
                        clothing_sizes: { ...prev.clothing_sizes, cloth: e.target.value }
                      }))}
                      className="w-full text-xs px-2.5 py-1.5 border border-rose-100 rounded-lg bg-white/80"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-450 font-bold mb-0.5">裤子尺码 (如 29码/XL)</label>
                    <input 
                      type="text" 
                      value={myPrefs.clothing_sizes.pants}
                      onChange={(e) => setMyPrefs(prev => ({
                        ...prev, 
                        clothing_sizes: { ...prev.clothing_sizes, pants: e.target.value }
                      }))}
                      className="w-full text-xs px-2.5 py-1.5 border border-rose-100 rounded-lg bg-white/80"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-450 font-bold mb-0.5">鞋子尺码 (如 37码/41码)</label>
                    <input 
                      type="text" 
                      value={myPrefs.clothing_sizes.shoes}
                      onChange={(e) => setMyPrefs(prev => ({
                        ...prev, 
                        clothing_sizes: { ...prev.clothing_sizes, shoes: e.target.value }
                      }))}
                      className="w-full text-xs px-2.5 py-1.5 border border-rose-100 rounded-lg bg-white/80"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-450 font-bold mb-0.5">手指戒圈号 (如 12号/15mm)</label>
                    <input 
                      type="text" 
                      value={myPrefs.clothing_sizes.ring}
                      onChange={(e) => setMyPrefs(prev => ({
                        ...prev, 
                        clothing_sizes: { ...prev.clothing_sizes, ring: e.target.value }
                      }))}
                      className="w-full text-xs px-2.5 py-1.5 border border-rose-100 rounded-lg bg-white/80"
                    />
                  </div>
                </div>
              </div>

              {/* Edit Milk tea preference */}
              <div>
                <label className="block text-[10px] font-bold text-rose-700 mb-1">🧋 伴侣的奶茶口味偏好 (去冰/甜度/加料等)</label>
                <input 
                  type="text" 
                  value={myPrefs.diet_preferences.milktops}
                  onChange={(e) => setMyPrefs(prev => ({
                    ...prev,
                    diet_preferences: { ...prev.diet_preferences, milktops: e.target.value }
                  }))}
                  placeholder="例：茉莉奶绿，去冰，三分糖，加椰果和波波"
                  className="w-full text-xs px-3 py-2 border border-rose-100 rounded-xl bg-white/80"
                />
              </div>

              {/* Edit Likes Food (Tags manager) */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-emerald-600">🟢 Ta爱吃的东西 (添加标签)</label>
                <div className="flex space-x-1.5">
                  <input 
                    type="text" 
                    value={likeInput}
                    onChange={(e) => setLikeInput(e.target.value)}
                    placeholder="输入食物如：草莓"
                    className="flex-1 text-xs px-2.5 py-1.5 border border-rose-150 rounded-lg"
                  />
                  <button 
                    type="button" 
                    onClick={() => addPreferenceTag('likes')}
                    className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold"
                  >
                    添加
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {myPrefs.diet_preferences.likes?.map((tag) => (
                    <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center space-x-1">
                      <span>{tag}</span>
                      <button 
                        type="button" 
                        onClick={() => removePreferenceTag('likes', tag)}
                        className="text-emerald-500 hover:text-emerald-800 text-[10px] font-black"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Edit Hates Food (Tags manager) */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-rose-500">🔴 Ta讨厌/忌口的东西 (添加标签)</label>
                <div className="flex space-x-1.5">
                  <input 
                    type="text" 
                    value={hateInput}
                    onChange={(e) => setHateInput(e.target.value)}
                    placeholder="输入如：香菜 / 海鲜过敏"
                    className="flex-1 text-xs px-2.5 py-1.5 border border-rose-150 rounded-lg"
                  />
                  <button 
                    type="button" 
                    onClick={() => addPreferenceTag('hates')}
                    className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold"
                  >
                    添加
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {myPrefs.diet_preferences.hates?.map((tag) => (
                    <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center space-x-1">
                      <span>{tag}</span>
                      <button 
                        type="button" 
                        onClick={() => removePreferenceTag('hates', tag)}
                        className="text-rose-500 hover:text-rose-800 text-[10px] font-black"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Edit MBTI */}
              <div>
                <label className="block text-[10px] font-bold text-rose-700 mb-1">伴侣性格 MBTI 或特色标签</label>
                <input 
                  type="text" 
                  value={myPrefs.mbti}
                  onChange={(e) => setMyPrefs(prev => ({ ...prev, mbti: e.target.value }))}
                  placeholder="例：INFP 傲娇小猫咪"
                  className="w-full text-xs px-3 py-2 border border-rose-100 rounded-xl bg-white/80"
                />
              </div>

              {/* Edit How to soothe */}
              <div>
                <label className="block text-[10px] font-bold text-rose-700 mb-1">📝 当 Ta 生气/难过时的哄法</label>
                <textarea 
                  value={myPrefs.how_to_soothe}
                  onChange={(e) => setMyPrefs(prev => ({ ...prev, how_to_soothe: e.target.value }))}
                  rows={3}
                  placeholder="记录适合 Ta 的哄法：如买杯奶茶、给个拥抱、或者静静陪伴..."
                  className="w-full text-xs px-3 py-2 border border-rose-100 rounded-xl bg-white/80 focus:outline-none"
                />
              </div>

              <button 
                onClick={handleSavePreferences}
                className="w-full py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md transition"
              >
                全部保存
              </button>
            </div>
          )}
        </div>

        {/* Card A: 喜欢 Ta 的理由 (我记录的) */}
        <div className="glass-panel rounded-3xl p-5 border border-white/50 custom-shadow space-y-4 bg-white/40 relative overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-rose-100/50">
            <h3 className="text-xs font-bold text-rose-800 flex items-center">
              <Heart size={14} className="mr-1.5 text-rose-500" />
              <span>喜欢 Ta 的理由 💖 (已攒 {myLoveReasons.length} 条)</span>
            </h3>
            {myLoveReasons.some(r => r.is_secret) && (
              <button 
                onClick={handlePublishAllLoveReasons}
                className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold flex items-center space-x-1 bg-rose-50/80 px-2.5 py-1 rounded-full border border-rose-100 shadow-2xs hover:scale-105 active:scale-95 transition"
              >
                <span>✨ 纪念日公开</span>
              </button>
            )}
          </div>

          {/* Love Progress Bar */}
          <LoveProgressBar count={myLoveReasons.length} label="我积攒的爱意理由" />

          {/* Card Collection Swiper */}
          <div className="flex overflow-x-auto snap-x gap-4 py-3.5 px-1 scrollbar-thin snap-mandatory select-none">
            {myLoveReasons.length > 0 && myLoveReasons.map((item, index) => {
              // Numbering them in chronological order
              const cardNum = myLoveReasons.length - index;
              return (
                <div 
                  key={item.id} 
                  className="w-[210px] h-[260px] flex-shrink-0 snap-center bg-gradient-to-br from-white/95 to-pink-50/90 border border-white/60 rounded-2xl shadow-md p-4 relative flex flex-col justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group"
                >
                  {/* Sticker tape decoration */}
                  <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-12 h-3.5 bg-white/40 border-dashed border border-gray-300/60 shadow-3xs rotate-1 z-10 pointer-events-none" />
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-center text-[10px] font-extrabold text-rose-500/80">
                    <span className="font-handwritten text-xs">Card No.{String(cardNum).padStart(2, '0')}</span>
                    {item.is_secret ? (
                      <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200/50 px-1.5 py-0.5 rounded-sm font-bold flex items-center">
                        🤫 私密
                      </span>
                    ) : (
                      <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-1.5 py-0.5 rounded-sm font-bold flex items-center">
                        ✨ 已公开
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 flex items-center justify-center py-2 overflow-y-auto scrollbar-none">
                    <p className="text-xs font-semibold text-rose-900 leading-relaxed text-center whitespace-pre-wrap font-handwritten max-h-[145px]">
                      ✨ {item.content}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="flex justify-between items-end border-t border-rose-100/50 pt-2 text-[9px] text-gray-400">
                    <span className="font-mono">{new Date(item.created_at).toLocaleDateString('zh-CN')}</span>
                    <button 
                      onClick={() => handleDeleteRecord(item.id)}
                      className="text-gray-450 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                      title="删除记录"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add Card Placeholder */}
            <div 
              onClick={() => {
                const inputEl = document.getElementById('new-love-reason-input');
                if (inputEl) inputEl.focus();
              }}
              className="w-[210px] h-[260px] flex-shrink-0 snap-center bg-white/20 border-2 border-dashed border-rose-350/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/40 hover:border-rose-450/70 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-2 border border-rose-100/60 shadow-2xs">
                <Plus size={16} />
              </div>
              <span className="text-xs font-bold text-rose-800/80">记录新的理由</span>
              <span className="text-[9px] text-rose-600/60 mt-1">
                {myLoveReasons.length === 0 ? '写下第一条心动原因' : `点此记录第 ${myLoveReasons.length + 1} 个理由`}
              </span>
            </div>
          </div>

          {/* Add Love Reason Form */}
          <form onSubmit={handleAddLoveReason} className="flex space-x-2 pt-2">
            <input 
              id="new-love-reason-input"
              type="text" 
              value={newLoveReason}
              onChange={(e) => setNewLoveReason(e.target.value)}
              placeholder="记录一条喜欢 Ta 的新理由 (平时默认私密)..."
              maxLength={120}
              className="flex-1 text-xs border border-rose-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white/70"
            />
            <button 
              type="submit"
              disabled={!newLoveReason.trim()}
              className="px-3 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
            >
              <Plus size={14} />
              <span>记录</span>
            </button>
          </form>
        </div>

        {/* Card B: 来自 Ta 的心动笺言 */}
        <div className="glass-panel rounded-3xl p-5 border border-white/50 custom-shadow space-y-4 bg-white/40 relative overflow-hidden">
          <h3 className="text-xs font-bold text-rose-800 flex items-center pb-2 border-b border-rose-100/50">
            <Gift size={14} className="mr-1.5 text-rose-500" />
            <span>来自 Ta 的心动笺言 💌 (Ta 喜欢我的理由)</span>
          </h3>

          {/* Partner Love Progress Bar */}
          <LoveProgressBar count={partnerLoveReasons.length + partnerPrivateReasonsCount} label="Ta 积攒的爱意理由" />

          {/* Card Collection Swiper */}
          <div className="flex overflow-x-auto snap-x gap-4 py-3.5 px-1 scrollbar-thin snap-mandatory select-none">
            {partnerLoveReasons.map((item, index) => {
              const cardNum = index + 1;
              return (
                <div 
                  key={item.id} 
                  className="w-[210px] h-[260px] flex-shrink-0 snap-center bg-white border border-rose-100/40 rounded-2xl shadow-md p-4 relative flex flex-col justify-between notebook-paper hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                >
                  {/* Sticker tape decoration */}
                  <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-12 h-3.5 bg-white/40 border-dashed border border-gray-300/60 shadow-3xs rotate-1 z-10 pointer-events-none" />
                  <div className="absolute top-0 bottom-0 left-4 w-[1px] bg-red-200/45 pointer-events-none" />
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-center text-[10px] font-extrabold text-rose-700/70 pl-3">
                    <span className="font-handwritten text-xs">Card No.{String(cardNum).padStart(2, '0')}</span>
                    <span className="text-[8px] bg-rose-50 text-rose-750 border border-rose-150/40 px-1.5 py-0.5 rounded-sm font-bold">
                      💌 已解锁
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 flex items-center justify-center py-2 pl-3 overflow-y-auto scrollbar-none">
                    <p className="text-xs font-semibold text-gray-750 leading-relaxed text-center whitespace-pre-wrap font-handwritten max-h-[145px]">
                      🌹 {item.content}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="flex justify-between items-end border-t border-rose-100/50 pt-2 text-[9px] text-gray-400 pl-3">
                    <span className="font-mono">{new Date(item.created_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
              );
            })}

            {/* Locked Placeholders */}
            {Array.from({ length: partnerPrivateReasonsCount }).map((_, idx) => {
              const cardNum = partnerLoveReasons.length + idx + 1;
              return (
                <div 
                  key={`locked-${idx}`} 
                  className="w-[210px] h-[260px] flex-shrink-0 snap-center bg-gradient-to-br from-rose-50/10 via-pink-100/5 to-rose-100/15 border-2 border-dashed border-rose-200/40 rounded-2xl shadow-xs p-4 relative flex flex-col justify-between items-center text-center select-none"
                >
                  <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-12 h-3.5 bg-white/10 border-dashed border border-gray-300/30 shadow-3xs rotate-1 z-10 pointer-events-none" />
                  
                  {/* Card Header */}
                  <div className="w-full flex justify-between items-center text-[10px] font-extrabold text-gray-400/80">
                    <span className="font-handwritten text-xs">Card No.{String(cardNum).padStart(2, '0')}</span>
                    <span className="text-[8px] bg-gray-100 text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-sm font-bold flex items-center space-x-0.5">
                      <Lock size={8} />
                      <span>待解锁</span>
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 flex flex-col items-center justify-center py-4 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-rose-50/40 flex items-center justify-center text-rose-450/70 border border-rose-100/30 shadow-inner">
                      <Lock size={16} className="animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[11px] font-bold text-rose-700/60">爱意小卡片密写中</span>
                      <span className="block text-[8.5px] text-gray-400/90 leading-normal px-2">
                        Ta 正在悄悄为您积攒理由，将在纪念日自动开启惊喜！
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="w-full border-t border-rose-100/30 pt-2 text-[8px] text-gray-300 font-bold uppercase tracking-wider">
                    🔒 纪念日解锁惊喜 🤫
                  </div>
                </div>
              );
            })}

            {/* Empty state if 0 total cards */}
            {partnerLoveReasons.length === 0 && partnerPrivateReasonsCount === 0 && (
              <div className="w-full py-8 text-center text-xs text-gray-400 italic bg-white/20 rounded-2xl border border-dashed border-gray-200 leading-relaxed flex flex-col items-center justify-center snap-center">
                <span className="text-xl mb-1.5">🤫</span>
                <span>目前 Ta 还没有积攒任何理由，写些甜言蜜语催催 Ta 吧~</span>
              </div>
            )}
          </div>
        </div>

        {/* Compliments list (优点夸夸墙) */}
        <div className="glass-panel rounded-3xl p-5 border border-white/50 custom-shadow space-y-4 bg-white/40">
          <h3 className="text-xs font-bold text-rose-800 flex items-center pb-2 border-b border-rose-100/50">
            <Heart size={14} className="mr-1.5 text-rose-500" />
            <span>Ta 的闪光点记录墙 💖</span>
          </h3>

          {/* Compliments Input Form */}
          <form onSubmit={handleAddAdvantage} className="flex space-x-2">
            <input 
              type="text" 
              value={newAdvantage}
              onChange={(e) => setNewAdvantage(e.target.value)}
              placeholder={`写下对 Ta 的一个夸赞或心动瞬间...`}
              maxLength={100}
              className="flex-1 text-xs border border-rose-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white/70"
            />
            <button 
              type="submit"
              disabled={!newAdvantage.trim()}
              className="px-3 py-2 bg-rose-500 hover:bg-rose-655 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
            >
              <Plus size={14} />
              <span>夸夸</span>
            </button>
          </form>

          {/* Compliments List */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {partnerCompliments.length > 0 ? (
              partnerCompliments.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white/60 border border-white/95 rounded-2xl p-3 shadow-2xs relative group/item flex justify-between items-start space-x-2 animate-slide-up"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-rose-900 leading-normal">
                      ✨ {item.content}
                    </p>
                    <span className="block text-[8px] text-gray-400 font-mono">
                      {new Date(item.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  
                  {/* Delete button (only show for creator) */}
                  {item.creator_id === currentUser.id && (
                    <button 
                      onClick={() => handleDeleteRecord(item.id)}
                      className="text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 opacity-0 group-hover/item:opacity-100 transition flex-shrink-0"
                      title="删除记录"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-gray-400 italic bg-white/20 rounded-2xl border border-dashed border-gray-200">
                这里记录 Ta 让你心动的优点。快写下第一句赞美吧~ 🌟
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-white/50 custom-shadow space-y-4 bg-white/40">
          <h3 className="text-xs font-bold text-rose-800 flex items-center pb-2 border-b border-rose-100/50">
            <Heart size={14} className="mr-1.5 text-rose-500" />
            <span>来自 Ta 的闪光点夸夸墙 💖</span>
          </h3>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {myCompliments.length > 0 ? (
              myCompliments.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white/60 border border-white/95 rounded-2xl p-3 shadow-2xs relative flex justify-between items-start space-x-2 animate-slide-up"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-rose-900 leading-normal">
                      🌸 {item.content}
                    </p>
                    <span className="block text-[8px] text-gray-400 font-mono">
                      {new Date(item.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-gray-400 italic bg-white/20 rounded-2xl border border-dashed border-gray-200">
                目前还没有收到夸夸哦。别急，伴侣在查看“Ta的百科”时可以随时写下对你的赞赏~ 🌟
              </div>
            )}
          </div>
        </div>

        {/* ======================================================= */}
        {/* SHARED SECTION: Surprise & Wishlist (心愿惊喜单) */}
        {/* ======================================================= */}
        <div className="glass-panel rounded-3xl p-5 border border-white/50 custom-shadow space-y-4 bg-white/40">
          <div className="flex justify-between items-center pb-2 border-b border-rose-100/50">
            <h3 className="text-xs font-bold text-rose-800 flex items-center">
              <Gift size={14} className="mr-1.5 text-rose-500" />
              <span>惊喜心愿清单 🌟</span>
            </h3>
          </div>

          {/* Add Wish / Surprise Form */}
          <form onSubmit={handleAddWish} className="space-y-3 bg-white/30 p-3 rounded-2xl border border-white/40 shadow-inner">
            <div className="flex space-x-2">
              <input 
                type="text" 
                value={newWish}
                onChange={(e) => setNewWish(e.target.value)}
                placeholder="记录心愿 (例：买那个草莓发夹 / 偷偷准备七夕乐高)..."
                maxLength={80}
                className="flex-1 text-xs border border-rose-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white/80"
              />
              <button 
                type="submit"
                disabled={!newWish.trim()}
                className="px-3 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                <Plus size={14} />
                <span>添加</span>
              </button>
            </div>

            {/* Secret Toggle */}
            <div className="flex items-center space-x-2 pl-1">
              <input 
                type="checkbox" 
                id="wish-secret"
                checked={newWishSecret}
                onChange={(e) => setNewWishSecret(e.target.checked)}
                className="w-3.5 h-3.5 text-rose-600 border-gray-300 rounded-sm focus:ring-rose-400"
              />
              <label htmlFor="wish-secret" className="text-[10px] text-gray-500 font-bold cursor-pointer select-none">
                🤫 设为悄悄准备的惊喜 (仅我可见，伴侣端会被屏蔽，送出时给Ta大惊喜！)
              </label>
            </div>
          </form>

          {/* Wish list rendered items */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {wishesList.length > 0 ? (
              wishesList.map((item) => {
                const isMine = item.creator_id === currentUser?.id;
                
                return (
                  <div 
                    key={item.id} 
                    className={`border rounded-2xl p-3.5 shadow-2xs relative group flex justify-between items-center space-x-3 transition duration-300 animate-slide-up bg-white/60 border-white/90`}
                  >
                    <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.is_secret ? 'bg-amber-100 text-amber-600' : 'bg-pink-100 text-rose-600'
                      }`}>
                        {item.is_secret ? <span>🤫</span> : <Gift size={14} />}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-gray-700 leading-normal truncate">
                          {item.content}
                        </span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-[8px] text-gray-400 font-mono">
                            {new Date(item.created_at).toLocaleDateString('zh-CN')}
                          </span>
                          {item.is_secret && (
                            <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded-sm font-bold">
                              私密惊喜
                            </span>
                          )}
                          {!item.is_secret && (
                            <span className="text-[8px] bg-rose-50 text-rose-700 border border-rose-100 px-1 rounded-sm font-bold">
                              {isMine ? '我的心愿' : 'Ta的心愿'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {/* Fulfill action */}
                      {!isMine && !item.is_secret && (
                        <button
                          onClick={() => {
                            confetti({
                              particleCount: 50,
                              spread: 50,
                              origin: { y: 0.8 },
                              colors: ['#ff4d6d', '#ff85a1'],
                            });
                            handleDeleteRecord(item.id);
                          }}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-100 rounded-full px-2 py-0.5 hover:bg-rose-100 transition active:scale-95 flex items-center space-x-0.5"
                          title="帮Ta达成心愿"
                        >
                          <CheckCircle size={10} />
                          <span>达成</span>
                        </button>
                      )}

                      {/* Delete action (only creator can delete/complete private surprises) */}
                      {isMine && (
                        <button 
                          onClick={() => {
                            if (item.is_secret) {
                              confetti({
                                particleCount: 60,
                                spread: 60,
                                origin: { y: 0.8 },
                                colors: ['#f59e0b', '#fcd34d', '#ffccd5'],
                              });
                            }
                            handleDeleteRecord(item.id);
                          }}
                          className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition"
                          title={item.is_secret ? "送出礼物并结案" : "删除心愿"}
                        >
                          {item.is_secret ? <CheckCircle size={14} className="text-amber-500 hover:text-amber-700" /> : <Trash2 size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-gray-400 italic bg-white/20 rounded-2xl border border-dashed border-gray-200">
                暂无心愿或惊喜安排。添加一个，无论是公开给 Ta 看，还是偷偷记下来准备惊喜吧~ 🎁
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default PartnerWiki;
