import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Heart, Sparkles, User, Plus, Trash2, Copy, Gift, ShieldAlert,
  CheckCircle, ArrowLeft, Smile, Edit3, BookOpen, Coffee, Shirt
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
  type: 'advantage' | 'wish';
  content: string;
  is_secret: boolean;
  created_at: string;
}

export const PartnerWiki: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'me' ? 'me' : 'partner';
  const [activeTab, setActiveTab] = useState<'me' | 'partner'>(defaultTab);

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
  
  const [partnerPrefs, setPartnerPrefs] = useState<PartnerPreferences>({
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

  // Toast / feedback message
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'info' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const partnerProfile = useMemo(() => {
    return profiles.find(p => p.id !== currentUser?.id);
  }, [profiles, currentUser]);

  const myProfile = useMemo(() => {
    return profiles.find(p => p.id === currentUser?.id);
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
          const partners = prefsData.find(p => p.id !== user.id);
          if (mine) {
            setMyPrefs({
              clothing_sizes: mine.clothing_sizes || { cloth: '', pants: '', shoes: '', ring: '' },
              diet_preferences: mine.diet_preferences || { likes: [], hates: [], milktops: '' },
              mbti: mine.mbti || '',
              how_to_soothe: mine.how_to_soothe || ''
            });
          }
          if (partners) {
            setPartnerPrefs({
              clothing_sizes: partners.clothing_sizes || { cloth: '', pants: '', shoes: '', ring: '' },
              diet_preferences: partners.diet_preferences || { likes: [], hates: [], milktops: '' },
              mbti: partners.mbti || '',
              how_to_soothe: partners.how_to_soothe || ''
            });
          }
        }

        if (recData) {
          setRecords(recData);
        }
        
      } catch (err) {
        console.error("Error loading wiki data:", err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [navigate]);

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
          if (updated) {
            if (updated.id === currentUser.id) {
              setMyPrefs({
                clothing_sizes: updated.clothing_sizes,
                diet_preferences: updated.diet_preferences,
                mbti: updated.mbti,
                how_to_soothe: updated.how_to_soothe
              });
            } else {
              setPartnerPrefs({
                clothing_sizes: updated.clothing_sizes,
                diet_preferences: updated.diet_preferences,
                mbti: updated.mbti,
                how_to_soothe: updated.how_to_soothe
              });
            }
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

  // Tab control synchronization
  const handleTabChange = (tab: 'me' | 'partner') => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setIsEditingPrefs(false);
  };

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
      alert('保存失败，请检查网络');
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

  // Delete a record (advantage or wish)
  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('确定要删除这一条温馨记录吗？')) return;
    try {
      const { error } = await supabase.from('partner_records').delete().eq('id', id);
      if (error) throw error;
      showFeedback('🗑️ 记录已移去');
    } catch (err) {
      console.error(err);
    }
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

  // Copy utility
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showFeedback(`📋 已复制 ${label} 到剪贴板！`, 'info');
    });
  };

  // Filtered lists
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
  type varchar(20) not null check (type in ('advantage', 'wish')),
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50/20">
        <Heart className="text-rose-500 animate-heartbeat" size={48} fill="currentColor" />
        <p className="text-xs text-rose-700/80 font-bold mt-4 tracking-wider">正在翻阅专属档案手账...</p>
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
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] w-[90%] max-w-xs bg-rose-500 text-white rounded-2xl shadow-xl px-4 py-2.5 border border-rose-400 flex items-center space-x-2 animate-fade-in">
          <Sparkles size={14} className="text-amber-200 animate-pulse flex-shrink-0" />
          <p className="text-[11px] font-bold leading-tight">{feedback.message}</p>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-6 relative z-10">
        {/* Double Avatars Tab Switcher */}
        <div className="glass-panel p-2.5 rounded-3xl flex items-center relative border border-white/50 custom-shadow overflow-hidden bg-white/40 select-none">
          {/* Apple-style sliding background */}
          <div 
            className="absolute top-2.5 bottom-2.5 rounded-2xl bg-white/85 shadow-sm border border-white/80 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] z-0"
            style={{
              left: activeTab === 'partner' ? '2.5%' : '51.5%',
              width: '46%',
            }}
          />

          {/* Partner Tab */}
          <button
            onClick={() => handleTabChange('partner')}
            className={`w-1/2 flex items-center justify-center py-2.5 relative z-10 space-x-2 transition-all duration-300 ${
              activeTab === 'partner' ? 'text-rose-600 scale-102 font-extrabold' : 'text-gray-400 hover:text-rose-400 font-bold'
            }`}
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-rose-200">
              {partnerProfile?.avatar_url ? (
                <img src={partnerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-rose-100 flex items-center justify-center text-[10px]">Ta</div>
              )}
            </div>
            <span className="text-xs">{partnerProfile?.nickname || '伴侣'} 的百科</span>
          </button>

          {/* Mine Tab */}
          <button
            onClick={() => handleTabChange('me')}
            className={`w-1/2 flex items-center justify-center py-2.5 relative z-10 space-x-2 transition-all duration-300 ${
              activeTab === 'me' ? 'text-rose-600 scale-102 font-extrabold' : 'text-gray-400 hover:text-rose-400 font-bold'
            }`}
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-rose-200">
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-rose-100 flex items-center justify-center text-[10px]">我</div>
              )}
            </div>
            <span className="text-xs">我的喜好档案</span>
          </button>
        </div>

        {/* ======================================================= */}
        {/* PARTNER TAB: View companion's profile, record compliments */}
        {/* ======================================================= */}
        {activeTab === 'partner' && (
          <div className="space-y-6">
            
            {/* 1. Practical Details Card (Sizes & Drinks) */}
            <div className="glass-panel rounded-3xl p-5 border border-white/50 custom-shadow space-y-4 bg-white/40 relative overflow-hidden">
              <div className="absolute w-32 h-32 rounded-full bg-pink-400/10 blur-[35px] top-[-10%] right-[-10%] pointer-events-none" />
              
              <h3 className="text-xs font-bold text-rose-800 flex items-center pb-2 border-b border-rose-100/50">
                <Coffee size={14} className="mr-1.5 text-rose-500" />
                <span>实用信息查阅 💡 (Ta的填写)</span>
              </h3>

              {/* Sizes section */}
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => partnerPrefs.clothing_sizes.cloth && copyToClipboard(partnerPrefs.clothing_sizes.cloth, '衣服尺码')}
                  className="bg-white/50 border border-white/80 rounded-2xl p-3 shadow-2xs cursor-pointer hover:bg-white/70 active:scale-98 transition text-center relative group"
                >
                  <Shirt size={12} className="absolute top-2 left-2 text-rose-300" />
                  <span className="block text-[10px] font-bold text-gray-400">衣服尺码</span>
                  <span className="block text-sm font-extrabold text-rose-800 mt-1">
                    {partnerPrefs.clothing_sizes.cloth || '未填写'}
                  </span>
                  {partnerPrefs.clothing_sizes.cloth && <span className="absolute bottom-1 right-2 text-[8px] text-gray-300 opacity-0 group-hover:opacity-100 transition">点击复制</span>}
                </div>
                <div 
                  onClick={() => partnerPrefs.clothing_sizes.pants && copyToClipboard(partnerPrefs.clothing_sizes.pants, '裤子尺码')}
                  className="bg-white/50 border border-white/80 rounded-2xl p-3 shadow-2xs cursor-pointer hover:bg-white/70 active:scale-98 transition text-center relative group"
                >
                  <span className="block text-[10px] font-bold text-gray-400">裤子尺码</span>
                  <span className="block text-sm font-extrabold text-rose-800 mt-1">
                    {partnerPrefs.clothing_sizes.pants || '未填写'}
                  </span>
                  {partnerPrefs.clothing_sizes.pants && <span className="absolute bottom-1 right-2 text-[8px] text-gray-300 opacity-0 group-hover:opacity-100 transition">点击复制</span>}
                </div>
                <div 
                  onClick={() => partnerPrefs.clothing_sizes.shoes && copyToClipboard(partnerPrefs.clothing_sizes.shoes, '鞋子尺码')}
                  className="bg-white/50 border border-white/80 rounded-2xl p-3 shadow-2xs cursor-pointer hover:bg-white/70 active:scale-98 transition text-center relative group"
                >
                  <span className="block text-[10px] font-bold text-gray-400">鞋子尺码</span>
                  <span className="block text-sm font-extrabold text-rose-800 mt-1">
                    {partnerPrefs.clothing_sizes.shoes || '未填写'}
                  </span>
                  {partnerPrefs.clothing_sizes.shoes && <span className="absolute bottom-1 right-2 text-[8px] text-gray-300 opacity-0 group-hover:opacity-100 transition">点击复制</span>}
                </div>
                <div 
                  onClick={() => partnerPrefs.clothing_sizes.ring && copyToClipboard(partnerPrefs.clothing_sizes.ring, '戒指指围')}
                  className="bg-white/50 border border-white/80 rounded-2xl p-3 shadow-2xs cursor-pointer hover:bg-white/70 active:scale-98 transition text-center relative group"
                >
                  <span className="block text-[10px] font-bold text-gray-400">戒指指围</span>
                  <span className="block text-sm font-extrabold text-rose-800 mt-1">
                    {partnerPrefs.clothing_sizes.ring || '未填写'}
                  </span>
                  {partnerPrefs.clothing_sizes.ring && <span className="absolute bottom-1 right-2 text-[8px] text-gray-300 opacity-0 group-hover:opacity-100 transition">点击复制</span>}
                </div>
              </div>

              {/* Milk tea / Diet preference */}
              <div 
                onClick={() => partnerPrefs.diet_preferences.milktops && copyToClipboard(partnerPrefs.diet_preferences.milktops, '奶茶喜好')}
                className="bg-white/60 border border-white/95 rounded-2xl p-4 shadow-2xs relative overflow-hidden cursor-pointer hover:bg-white/70 active:scale-99 transition group"
              >
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-400/80" />
                <span className="block text-[10px] font-extrabold text-amber-700 tracking-wider">🧋 奶茶偏好</span>
                <span className="block text-xs font-bold text-gray-650 mt-1.5 leading-relaxed">
                  {partnerPrefs.diet_preferences.milktops || 'Ta 还没有写下奶茶喜好偏好~'}
                </span>
                {partnerPrefs.diet_preferences.milktops && <span className="absolute bottom-2 right-3 text-[8px] text-gray-300 opacity-0 group-hover:opacity-100 transition">点击复制</span>}
              </div>

              {/* Foods likes & hates */}
              <div className="space-y-3 pt-1">
                <div>
                  <span className="block text-[10px] font-bold text-emerald-600 mb-1.5 flex items-center">
                    🟢 爱吃的东西:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {partnerPrefs.diet_preferences.likes && partnerPrefs.diet_preferences.likes.length > 0 ? (
                      partnerPrefs.diet_preferences.likes.map((l, idx) => (
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
                    🔴 讨厌/过敏食物:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {partnerPrefs.diet_preferences.hates && partnerPrefs.diet_preferences.hates.length > 0 ? (
                      partnerPrefs.diet_preferences.hates.map((h, idx) => (
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
            </div>

            {/* 2. Romance Memo (Personality, MBTI, How to soothe) */}
            <div className="glass-panel rounded-3xl p-5 border border-white/50 custom-shadow space-y-4 bg-white/40 relative">
              <h3 className="text-xs font-bold text-rose-800 flex items-center pb-2 border-b border-rose-100/50">
                <Smile size={14} className="mr-1.5 text-rose-500" />
                <span>性格特质与默契 💝</span>
              </h3>

              {/* MBTI Tag */}
              <div className="flex items-center space-x-3 bg-white/50 border border-white/80 rounded-2xl p-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center font-black text-rose-600 text-sm">
                  {partnerPrefs.mbti ? partnerPrefs.mbti.substring(0, 4).toUpperCase() : '?'}
                </div>
                <div className="flex-1">
                  <span className="block text-[10px] font-bold text-gray-400">MBTI 性格类型</span>
                  <span className="block text-xs font-bold text-rose-800 mt-0.5">
                    {partnerPrefs.mbti || 'Ta 还没有标明 MBTI 属性哦~'}
                  </span>
                </div>
              </div>

              {/* How to soothe (Notebook style card) */}
              <div className="bg-amber-50/20 border border-amber-100/60 rounded-2xl p-4 shadow-2xs relative notebook-paper">
                <div className="absolute top-0 bottom-0 left-4 w-[1px] bg-red-200/50 pointer-events-none" />
                <span className="block text-[10px] font-extrabold text-amber-700 tracking-wider pl-4">📝 当 Ta 生气/难过时的哄法</span>
                <p className="text-xs font-medium text-gray-600 pl-4 pr-1 mt-2.5 whitespace-pre-wrap leading-relaxed">
                  {partnerPrefs.how_to_soothe || 'Ta 还没有写下如何哄好自己的心得备忘录。你可以暗示 Ta 去“我的喜好档案”里写下哦~'}
                </p>
              </div>
            </div>

            {/* 3. Compliment Wall (优点夸夸墙) */}
            <div className="glass-panel rounded-3xl p-5 border border-white/50 custom-shadow space-y-4 bg-white/40">
              <h3 className="text-xs font-bold text-rose-800 flex items-center pb-2 border-b border-rose-100/50">
                <Heart size={14} className="mr-1.5 text-rose-500" />
                <span>Ta的闪光点记录墙 💖</span>
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
                  className="px-3 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
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

          </div>
        )}

        {/* ======================================================= */}
        {/* MINE TAB: Edit and view my profile configs */}
        {/* ======================================================= */}
        {activeTab === 'me' && (
          <div className="space-y-6">
            
            {/* Preferences Form (View & Edit) */}
            <div className="glass-panel rounded-3xl p-5 border border-white/50 custom-shadow space-y-4 bg-white/40">
              <div className="flex justify-between items-center pb-2 border-b border-rose-100/50">
                <h3 className="text-xs font-bold text-rose-800 flex items-center">
                  <User size={14} className="mr-1.5 text-rose-500" />
                  <span>我的档案设置</span>
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
                  {/* Sizes */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white/40 rounded-xl p-2.5 border border-white/60">
                      <span className="block text-[9px] font-bold text-gray-400">我的衣服尺码</span>
                      <span className="block text-xs font-extrabold text-gray-700 mt-0.5">
                        {myPrefs.clothing_sizes.cloth || '未填写'}
                      </span>
                    </div>
                    <div className="bg-white/40 rounded-xl p-2.5 border border-white/60">
                      <span className="block text-[9px] font-bold text-gray-400">我的裤子尺码</span>
                      <span className="block text-xs font-extrabold text-gray-700 mt-0.5">
                        {myPrefs.clothing_sizes.pants || '未填写'}
                      </span>
                    </div>
                    <div className="bg-white/40 rounded-xl p-2.5 border border-white/60">
                      <span className="block text-[9px] font-bold text-gray-400">我的鞋子尺码</span>
                      <span className="block text-xs font-extrabold text-gray-700 mt-0.5">
                        {myPrefs.clothing_sizes.shoes || '未填写'}
                      </span>
                    </div>
                    <div className="bg-white/40 rounded-xl p-2.5 border border-white/60">
                      <span className="block text-[9px] font-bold text-gray-400">我的指围尺码</span>
                      <span className="block text-xs font-extrabold text-gray-700 mt-0.5">
                        {myPrefs.clothing_sizes.ring || '未填写'}
                      </span>
                    </div>
                  </div>

                  {/* Milk Tea */}
                  <div className="bg-white/50 border border-white/80 rounded-2xl p-3 text-xs leading-relaxed text-gray-650">
                    <span className="block text-[9px] font-bold text-amber-700 mb-1">🧋 我的奶茶常点偏好:</span>
                    {myPrefs.diet_preferences.milktops || '尚未写下专属的甜度与配料~'}
                  </div>

                  {/* Likes / Hates */}
                  <div className="space-y-3">
                    <div>
                      <span className="block text-[10px] font-bold text-emerald-600 mb-1">🟢 我爱吃的东西:</span>
                      <div className="flex flex-wrap gap-1">
                        {myPrefs.diet_preferences.likes && myPrefs.diet_preferences.likes.length > 0 ? (
                          myPrefs.diet_preferences.likes.map((tag, i) => (
                            <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{tag}</span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">未添加标签</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-rose-500 mb-1">🔴 我讨厌/过敏的食物:</span>
                      <div className="flex flex-wrap gap-1">
                        {myPrefs.diet_preferences.hates && myPrefs.diet_preferences.hates.length > 0 ? (
                          myPrefs.diet_preferences.hates.map((tag, i) => (
                            <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">{tag}</span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">未添加标签</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MBTI */}
                  <div className="bg-white/40 p-3 rounded-xl border border-white/60 text-xs flex items-center space-x-2">
                    <span className="font-bold text-gray-400 text-[10px]">MBTI 类型:</span>
                    <span className="font-extrabold text-rose-800 bg-rose-50 px-2 py-0.5 border border-rose-100 rounded-lg">
                      {myPrefs.mbti || '未标明'}
                    </span>
                  </div>

                  {/* Soothe */}
                  <div className="bg-amber-50/10 p-3.5 rounded-xl border border-amber-100/60 text-xs whitespace-pre-wrap leading-relaxed text-gray-600">
                    <span className="block font-bold text-amber-700 text-[10px] mb-1">📝 难过/委屈时怎么哄我最管用:</span>
                    {myPrefs.how_to_soothe || '还没写下我的“难过哄我说明书”。点击编辑，快教一下Ta吧！'}
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
                    <label className="block text-[10px] font-bold text-rose-700 mb-1">🧋 奶茶口味常点偏好 (去冰/甜度/加料等)</label>
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
                    <label className="block text-[10px] font-bold text-emerald-600">🟢 我爱吃的东西 (添加标签)</label>
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
                    <label className="block text-[10px] font-bold text-rose-500">🔴 我讨厌/忌口的东西 (添加标签)</label>
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
                    <label className="block text-[10px] font-bold text-rose-700 mb-1">性格 MBTI 或简单特色标签</label>
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
                    <label className="block text-[10px] font-bold text-rose-700 mb-1">📝 难过/委屈时怎么哄我最管用 (哄我说明书)</label>
                    <textarea 
                      value={myPrefs.how_to_soothe}
                      onChange={(e) => setMyPrefs(prev => ({ ...prev, how_to_soothe: e.target.value }))}
                      rows={3}
                      placeholder="告诉Ta：怎么抱抱、要不要买零食、或者安静待着..."
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

            {/* Compliments board FOR ME (他人夸赞我的闪光点) */}
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

          </div>
        )}

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
