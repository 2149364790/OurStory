import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, X, Image, Video, Calendar, Smile, User, Maximize2, Trash2, Heart, Clock, Send, Rocket, Sparkles, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';

const spawnReactionParticle = (emoji: string) => {
  const particle = document.createElement('div');
  particle.className = 'heart-particle';
  particle.innerHTML = `<div style="font-size: 28px; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.15));">${emoji}</div>`;
  
  const left = Math.random() * 80 + 10;
  const drift = (Math.random() - 0.5) * 120;
  const rotation = Math.random() * 90 - 45;
  const duration = Math.random() * 1.5 + 2.5;
  
  particle.style.left = `${left}vw`;
  particle.style.setProperty('--drift', `${drift}px`);
  particle.style.setProperty('--rotation', `${rotation}deg`);
  particle.style.animationDuration = `${duration}s`;
  
  document.body.appendChild(particle);
  
  setTimeout(() => {
    particle.remove();
  }, duration * 1000);
};

const monthsList = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

export const Tasks: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Interactions states
  const [reactions, setReactions] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [shuttleMemory, setShuttleMemory] = useState<any | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Zoomed media state
  const [zoomedMedia, setZoomedMedia] = useState<string | null>(null);

  // Custom DateTime Picker States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState(Math.floor(new Date().getMinutes() / 5) * 5);

  const getDaysInMonth = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();
    const days = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevTotalDays - i, isCurrentMonth: false, monthOffset: -1 });
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, isCurrentMonth: true, monthOffset: 0 });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, monthOffset: 1 });
    }

    return days;
  };

  const updateCompletedAt = (year: number, month: number, day: number, hour: number, minute: number) => {
    const newDate = new Date(year, month, day, hour, minute);
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    const hh = String(newDate.getHours()).padStart(2, '0');
    const min = String(newDate.getMinutes()).padStart(2, '0');
    setCompletedAt(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
  };

  const formatDisplayDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return '';
    const d = new Date(dateTimeStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (completedAt) {
      const d = new Date(completedAt);
      if (!isNaN(d.getTime())) {
        setCalendarYear(d.getFullYear());
        setCalendarMonth(d.getMonth());
        setSelectedDay(d.getDate());
        setSelectedHour(d.getHours());
        setSelectedMinute(Math.floor(d.getMinutes() / 5) * 5);
      }
    }
  }, [completedAt]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        fetchProfiles();
        fetchTasks();
        fetchReactions();
        fetchComments();
      }
    });

    // Realtime channel
    const taskChannel = supabase
      .channel('public:tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Trigger confetti for insertion
            confetti({
              particleCount: 50,
              spread: 60,
              colors: ['#ffe5ec', '#ffb3c1', '#ff4d6d'],
            });
          }
          fetchTasks();
        }
      )
      .subscribe();

    const interactionsChannel = supabase
      .channel('public:task_interactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_reactions' },
        (payload) => {
          const newReaction = payload.new as any;
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && newReaction.user_id !== user.id) {
              triggerLocalReactionAnimation(newReaction.type);
            }
          });
          fetchReactions();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'task_reactions' },
        () => {
          fetchReactions();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_comments' },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(interactionsChannel);
    };
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data);
  };

  const fetchReactions = async () => {
    const { data, error } = await supabase.from('task_reactions').select('*');
    if (!error && data) {
      setReactions(data);
    }
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) {
      setComments(data);
    }
  };

  const triggerLocalReactionAnimation = (type: string) => {
    const emojis: Record<string, string> = {
      heart: '💖',
      hug: '🤗',
      star: '🌟',
      thumbsup: '👍'
    };
    const emoji = emojis[type] || '💖';
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        spawnReactionParticle(emoji);
      }, i * 150);
    }
  };

  const handleToggleReaction = async (taskId: string, reactionType: string) => {
    if (!currentUser) return;
    
    const existing = reactions.find(
      (r) => r.task_id === taskId && r.user_id === currentUser.id && r.type === reactionType
    );
    
    if (existing) {
      const { error } = await supabase
        .from('task_reactions')
        .delete()
        .eq('id', existing.id);
      if (error) {
        console.error('Error deleting reaction:', error);
      } else {
        fetchReactions();
      }
    } else {
      const { error } = await supabase
        .from('task_reactions')
        .insert({
          task_id: taskId,
          user_id: currentUser.id,
          type: reactionType
        });
      if (error) {
        console.error('Error adding reaction:', error);
      } else {
        triggerLocalReactionAnimation(reactionType);
        fetchReactions();
      }
    }
  };

  const handleAddComment = async (taskId: string, text?: string) => {
    if (!currentUser) return;
    const content = text || commentInputs[taskId];
    if (!content || !content.trim()) return;

    const { error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        sender_id: currentUser.id,
        content: content.trim()
      });

    if (error) {
      console.error('Error adding comment:', error);
    } else {
      setCommentInputs(prev => ({ ...prev, [taskId]: '' }));
      fetchComments();
    }
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('completed_at', { ascending: false });
    if (error) {
      console.error('Error fetching tasks:', error);
    } else if (data) {
      setTasks(data);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
      setMediaFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !currentUser) return;
    setLoading(true);
    setUploadProgress(0);

    const uploadedUrls: string[] = [];

    try {
      // 1. Process and upload media files
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        // Upload original file directly without compression
        const fileToUpload = file;

        const fileExt = file.name.split('.').pop();
        const filePath = `tasks/${currentUser.id}_${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, fileToUpload);

        if (uploadError) throw uploadError;

        // Get public url
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
        setUploadProgress(Math.round(((i + 1) / mediaFiles.length) * 100));
      }

      // 2. Insert task record
      const taskRecord = {
        title,
        note,
        media: uploadedUrls,
        completed_at: completedAt ? new Date(completedAt).toISOString() : new Date().toISOString(),
        created_by: currentUser.id,
      };

      const { error: insertError } = await supabase.from('tasks').insert(taskRecord);
      if (insertError) throw insertError;

      // Reset form
      setTitle('');
      setNote('');
      setCompletedAt('');
      setMediaFiles([]);
      setShowAddForm(false);
      fetchTasks();

      // Fun animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

    } catch (err: any) {
      (window as any).showCustomAlert('记录失败', '记录打卡失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (id: string, mediaUrls: string[]) => {
    (window as any).showCustomConfirm(
      '确认删除 🗑️',
      '确定要删除这条美好的回忆吗？此操作无法撤销。',
      async () => {
        try {
          // 1. Delete associated media files from storage if present
          if (mediaUrls && mediaUrls.length > 0) {
            const fileNames = mediaUrls.map((url) => {
              const matchStr = '/storage/v1/object/public/media/';
              const idx = url.indexOf(matchStr);
              if (idx !== -1) {
                return url.substring(idx + matchStr.length);
              }
              const parts = url.split('/');
              return parts[parts.length - 1];
            });
            
            await supabase.storage.from('media').remove(fileNames);
          }

          // 2. Delete task from DB
          const { error } = await supabase.from('tasks').delete().eq('id', id);
          if (error) throw error;
          fetchTasks();
        } catch (err: any) {
          (window as any).showCustomAlert('删除失败', '删除失败: ' + err.message);
        }
      }
    );
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getFullYear()}年${(date.getMonth() + 1)}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Helper to find who logged the item
  const getCreatorName = (creatorId: string) => {
    const profile = profiles.find((p) => p.id === creatorId);
    return profile ? profile.nickname : '伴侣';
  };

  const getCreatorAvatar = (creatorId: string) => {
    const profile = profiles.find((p) => p.id === creatorId);
    return profile ? profile.avatar_url : '';
  };

  // Check file type from URL
  const isVideoUrl = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    return ['mp4', 'mov', 'webm', 'ogg', '3gp'].includes(ext);
  };

  // Calculate Love Thermometer temperature
  const loveTemperature = useMemo(() => {
    const baseTemp = 36.5;
    const taskPoints = tasks.length * 3.0;
    const reactionPoints = reactions.length * 1.0;
    const commentPoints = comments.length * 1.5;
    const total = baseTemp + taskPoints + reactionPoints + commentPoints;
    return Math.min(100, Math.round(total * 10) / 10);
  }, [tasks, reactions, comments]);

  // Get status string and icon based on temperature
  const tempStatus = useMemo(() => {
    if (loveTemperature < 50) {
      return { text: '细水长流 ☕', colorClass: 'from-pink-300 to-rose-400', heartSpeed: 'animate-pulse' };
    } else if (loveTemperature < 75) {
      return { text: '浓情蜜意 💕', colorClass: 'from-rose-400 to-pink-500', heartSpeed: 'animate-pulse duration-500' };
    } else if (loveTemperature < 99.9) {
      return { text: '热烈升温 🔥', colorClass: 'from-rose-500 via-pink-500 to-red-500', heartSpeed: 'animate-pulse duration-300' };
    } else {
      return { text: '沸腾热恋中！💖', colorClass: 'from-red-500 via-orange-500 to-yellow-500', heartSpeed: 'animate-pulse duration-150' };
    }
  }, [loveTemperature]);

  // Find "On This Day" memories (same month/day from past years, or past months)
  const onThisDayTasks = useMemo(() => {
    if (tasks.length === 0) return [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();

    // 1. Same month, same day, but from a previous year
    const matchingYears = tasks.filter((t) => {
      const d = new Date(t.completed_at);
      return (
        d.getMonth() === currentMonth &&
        d.getDate() === currentDate &&
        d.getFullYear() < currentYear
      );
    });
    if (matchingYears.length > 0) return matchingYears;

    // 2. Fallback: exact month anniversaries (e.g. 1, 2, 3, 6, 9 months ago today)
    return tasks.filter((t) => {
      const d = new Date(t.completed_at);
      const yearDiff = currentYear - d.getFullYear();
      const monthDiff = currentMonth - d.getMonth() + yearDiff * 12;
      return d.getDate() === currentDate && [1, 2, 3, 6, 9].includes(monthDiff);
    });
  }, [tasks]);

  const handleTimeShuttle = () => {
    if (tasks.length === 0) return;
    const randomIndex = Math.floor(Math.random() * tasks.length);
    const selected = tasks[randomIndex];
    
    // Trigger confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffe5ec', '#ffb3c1', '#ff4d6d', '#ffccd5', '#ff85a1']
    });

    setShuttleMemory(selected);
  };

  return (
    <div className="px-4 pt-4">
      {/* Top action bar */}
      <div className="flex justify-between items-center max-w-md mx-auto mb-6">
        <h1 className="text-xl font-bold text-rose-800">回忆打卡河流</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-1 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition active:scale-95"
        >
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          <span>{showAddForm ? '取消' : '记录新约定'}</span>
        </button>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Love Thermometer Panel */}
        <div className="glass-panel p-4 rounded-3xl shadow-md space-y-3 relative overflow-hidden border border-white/40">
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-rose-50 rounded-xl text-rose-500">
                <Heart size={16} fill="currentColor" className={tempStatus.heartSpeed} />
              </span>
              <div>
                <span className="text-[10px] font-bold text-rose-400 block tracking-wider uppercase">热恋温度计</span>
                <span className="text-xs font-black text-rose-800">{tempStatus.text}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-rose-900 leading-none tracking-tight">{loveTemperature}</span>
              <span className="text-[10px] font-extrabold text-rose-500 ml-0.5">°C</span>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="relative h-4 bg-rose-50/50 rounded-full border border-rose-100/50 overflow-hidden shadow-inner">
            <div
              className={`h-full bg-gradient-to-r ${tempStatus.colorClass} rounded-full transition-all duration-1000 ease-out relative animate-thermometer-flow`}
              style={{ width: `${((loveTemperature - 36.5) / (100 - 36.5)) * 100}%` }}
            >
              {/* Bubbles animation overlays inside progress bar */}
              {loveTemperature > 45 && (
                <div className="absolute inset-0 flex justify-around overflow-hidden opacity-40">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bubble-up" style={{ animationDelay: '0s', animationDuration: '2.5s' }}></span>
                  <span className="w-1 h-1 bg-white rounded-full animate-bubble-up" style={{ animationDelay: '0.6s', animationDuration: '3.2s' }}></span>
                  <span className="w-2 h-2 bg-white rounded-full animate-bubble-up" style={{ animationDelay: '1.2s', animationDuration: '2.1s' }}></span>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bubble-up" style={{ animationDelay: '1.8s', animationDuration: '2.8s' }}></span>
                </div>
              )}
            </div>
          </div>

          {/* Subtitle / Details counts */}
          <div className="flex justify-between items-center text-[9px] text-rose-700/60 font-semibold px-1">
            <span>起点 36.5°C</span>
            <span className="flex space-x-2">
              <span>约定打卡 {tasks.length}</span>
              <span>•</span>
              <span>心动点赞 {reactions.length}</span>
              <span>•</span>
              <span>悄悄留言 {comments.length}</span>
            </span>
          </div>
        </div>

        {/* Time Machine & Tools */}
        {tasks.length > 0 && (
          <div className="glass-panel flex justify-between items-center border border-white/20 rounded-2xl p-2.5 shadow-sm">
            <span className="text-[10px] font-bold text-rose-800 flex items-center space-x-1">
              <Sparkles size={12} className="text-rose-500 animate-spin-slow" />
              <span>重温我们的浪漫旅程</span>
            </span>
            <button
              type="button"
              onClick={handleTimeShuttle}
              className="flex items-center space-x-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer"
            >
              <Rocket size={10} className="animate-bounce" />
              <span>时光穿梭 🚀</span>
            </button>
          </div>
        )}

        {/* On This Day Memories */}
        {onThisDayTasks.length > 0 && (
          <div className="bg-gradient-to-br from-rose-50/80 to-pink-50/50 border border-rose-100 rounded-3xl p-4 shadow-md space-y-3 relative overflow-hidden">
            <div className="absolute top-1 right-2 text-rose-300 opacity-30">
              <Gift size={32} />
            </div>
            <div className="flex items-center space-x-1.5 border-b border-rose-100/50 pb-2">
              <Sparkles size={14} className="text-rose-500 animate-pulse" />
              <h3 className="text-xs font-black text-rose-900">那年今日 • 独家记忆</h3>
            </div>

            <div className="polaroid-effect max-w-[280px] mx-auto relative cursor-pointer" onClick={() => setShuttleMemory(onThisDayTasks[0])}>
              <div className="aspect-[4/3] bg-rose-50/50 rounded overflow-hidden mb-3 border border-rose-50/50">
                {onThisDayTasks[0].media && onThisDayTasks[0].media.length > 0 ? (
                  isVideoUrl(onThisDayTasks[0].media[0]) ? (
                    <video src={onThisDayTasks[0].media[0]} className="w-full h-full object-cover" />
                  ) : (
                    <img src={onThisDayTasks[0].media[0]} alt="Memory" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-rose-50 text-rose-300">
                    <Heart size={24} fill="currentColor" className="opacity-40" />
                  </div>
                )}
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-xs font-black text-rose-950 truncate px-1">{onThisDayTasks[0].title}</h4>
                <p className="text-[8px] text-gray-400 font-extrabold">{formatTimestamp(onThisDayTasks[0].completed_at)}</p>
              </div>
            </div>
          </div>
        )}
        {/* Record New Event Card Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-3xl space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-rose-800 border-b border-rose-50 pb-2">在这里打卡我们的约定</h2>
            
            <div>
              <label className="block text-xs font-semibold text-rose-700 mb-1">我们今天做了什么？</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="比如：一起吃第一顿自己做的早餐"
                className="w-full px-4 py-2.5 rounded-xl border border-rose-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-700 mb-1">写下当时的心情/碎碎念</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="这一刻，我们很开心..."
                className="w-full px-4 py-2.5 rounded-xl border border-rose-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-rose-700 mb-1">回忆发生的时刻</label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full px-3 py-2.5 rounded-xl border border-rose-100 text-left text-[11px] text-rose-800 bg-white/80 hover:bg-rose-50/20 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-400 flex items-center justify-between"
                >
                  <span className="truncate">{completedAt ? formatDisplayDateTime(completedAt) : '选择回忆时间 (默认现在)'}</span>
                  <Calendar size={13} className="text-rose-400 flex-shrink-0 ml-1" />
                </button>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-rose-700 mb-1">上传照片</label>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    id="media-upload"
                    className="hidden"
                  />
                  <label
                    htmlFor="media-upload"
                    className="w-full flex items-center justify-center space-x-1.5 px-3 py-2.5 border border-rose-100 rounded-xl bg-rose-50/50 hover:bg-rose-50 text-rose-700 text-xs font-bold cursor-pointer transition"
                  >
                    <Image size={14} />
                    <span>选择照片</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Inline Date Picker (full width below the grid) */}
            {showDatePicker && (
              <div className="bg-rose-50/30 border border-rose-100/80 rounded-2xl p-4 animate-slide-up space-y-3">
                {/* Calendar Header */}
                <div className="flex justify-between items-center pb-2 border-b border-rose-100/50">
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
                    className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-500 text-[10px] font-bold"
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
                    className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-500 text-[10px] font-bold"
                  >
                    ▶
                  </button>
                </div>

                {/* Week labels */}
                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-rose-400">
                  {['日', '一', '二', '三', '四', '五', '六'].map(w => (
                    <div key={w} className="py-1">{w}</div>
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
                          updateCompletedAt(targetYear, targetMonth, item.day, selectedHour, selectedMinute);
                        }}
                        className={`py-1.5 text-[10px] rounded-lg font-bold transition ${
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
                <div className="border-t border-rose-100/50 pt-2 flex flex-col space-y-1.5">
                  <span className="text-[9px] font-extrabold text-rose-800 flex items-center">
                    <Clock size={10} className="mr-1 text-rose-500" />
                    时间选择
                  </span>
                  
                  <div className="flex space-x-3 items-center">
                    <div className="flex-1 space-y-0.5">
                      <span className="text-[8px] font-bold text-rose-400 block text-center">小时 (时)</span>
                      <select
                        value={selectedHour}
                        onChange={(e) => {
                          const hour = parseInt(e.target.value, 10);
                          setSelectedHour(hour);
                          updateCompletedAt(calendarYear, calendarMonth, selectedDay, hour, selectedMinute);
                        }}
                        className="w-full text-xs font-bold text-rose-800 bg-white border border-rose-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <option key={h} value={h}>{String(h).padStart(2, '0')}时</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 space-y-0.5">
                      <span className="text-[8px] font-bold text-rose-400 block text-center">分钟 (分)</span>
                      <select
                        value={selectedMinute}
                        onChange={(e) => {
                          const min = parseInt(e.target.value, 10);
                          setSelectedMinute(min);
                          updateCompletedAt(calendarYear, calendarMonth, selectedDay, selectedHour, min);
                        }}
                        className="w-full text-xs font-bold text-rose-800 bg-white border border-rose-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                      >
                        {Array.from({ length: 12 }).map((_, idx) => {
                          const m = idx * 5;
                          return (
                            <option key={m} value={m}>{String(m).padStart(2, '0')}分</option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action buttons inside popover */}
                <div className="flex justify-end space-x-2 pt-1.5 border-t border-rose-100/50">
                  <button
                    type="button"
                    onClick={() => {
                      setCompletedAt('');
                      setShowDatePicker(false);
                    }}
                    className="px-2.5 py-1 text-[9px] font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  >
                    重置当前
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    className="px-3.5 py-1 text-[9px] font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition shadow-md"
                  >
                    确定
                  </button>
                </div>
              </div>
            )}

            {/* Media files preview panel */}
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-2">
                {mediaFiles.map((file, i) => (
                  <div key={i} className="relative aspect-square bg-rose-50 border border-rose-100 rounded-lg overflow-hidden group">
                    {file.type.startsWith('video/') ? (
                      <div className="w-full h-full flex items-center justify-center bg-rose-900 text-white text-[9px] font-bold">
                        <Video size={16} />
                      </div>
                    ) : (
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMediaFile(i)}
                      className="absolute top-1 right-1 bg-black/50 hover:bg-black/80 text-white rounded-full p-0.5"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div className="w-full bg-rose-100 rounded-full h-1.5 dark:bg-rose-100 overflow-hidden">
                <div className="bg-rose-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 px-4 rounded-xl transition active:scale-95 disabled:opacity-50 text-xs"
            >
              {loading ? '正在封装我们的回忆...' : '封装回忆并发起打卡'}
            </button>
          </form>
        )}

        {/* Timeline list */}
        <div className="relative pl-6 border-l-2 border-rose-200/50 space-y-6">
          {tasks.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 text-center text-rose-700/60 max-w-sm mx-auto select-none">
              <Smile size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">这里还没有打卡回忆哦</p>
              <p className="text-xs mt-1">点击右上角“记录新约定”写下第一份吧~</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="relative">
                {/* Timeline Heart Node */}
                <span className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full bg-rose-100 border-2 border-rose-300 flex items-center justify-center text-rose-500 shadow-sm z-10 animate-pulse">
                  <Heart size={10} fill="currentColor" />
                </span>

                <div className="glass-panel p-5 rounded-2xl shadow-sm space-y-3 relative group hover:shadow-md transition">
                  
                  {/* Delete button (only creator or generic permission) */}
                  <button
                    onClick={() => handleDeleteTask(task.id, task.media || [])}
                    className="absolute top-4 right-4 text-rose-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition duration-300"
                    title="删除回忆"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <User size={8} />
                      <span>{getCreatorName(task.created_by)} 的记录</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium flex items-center">
                      <Calendar size={10} className="mr-1" />
                      {formatTimestamp(task.completed_at)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-rose-900 leading-tight">{task.title}</h3>

                  {task.note && (
                    <p className="text-xs text-rose-700/80 leading-relaxed bg-white/30 rounded-xl p-3 border border-white/20">
                      {task.note}
                    </p>
                  )}

                  {/* Media Gallery */}
                  {task.media && task.media.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {task.media.map((url: string, index: number) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-xl overflow-hidden border border-rose-50/50 shadow-sm bg-rose-50 cursor-zoom-in"
                        >
                          {isVideoUrl(url) ? (
                            <video
                              src={url}
                              className="w-full h-full object-cover"
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomedMedia(url);
                              }}
                            />
                          ) : (
                            <img
                              src={url}
                              alt="Memory"
                              className="w-full h-full object-cover"
                              onClick={() => setZoomedMedia(url)}
                              loading="lazy"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                            <Maximize2 size={16} className="text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reaction Bar & Comments Section */}
                  <div className="border-t border-rose-100/40 pt-3 mt-3 space-y-3">
                    {/* Reaction Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex space-x-1 bg-white/30 rounded-full p-1 border border-white/20">
                        {[
                          { type: 'heart', emoji: '💖', label: '超级心动' },
                          { type: 'hug', emoji: '🤗', label: '贴贴抱抱' },
                          { type: 'star', emoji: '🌟', label: '期待下次' },
                          { type: 'thumbsup', emoji: '👍', label: 'Ta超棒' }
                        ].map((btn) => {
                          const hasReacted = reactions.some(
                            (r) => r.task_id === task.id && r.user_id === currentUser?.id && r.type === btn.type
                          );
                          const typeReactions = reactions.filter(
                            (r) => r.task_id === task.id && r.type === btn.type
                          );
                          
                          return (
                            <button
                              key={btn.type}
                              type="button"
                              onClick={() => handleToggleReaction(task.id, btn.type)}
                              className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs transition active:scale-90 font-bold ${
                                hasReacted
                                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                                  : 'text-rose-700 hover:bg-rose-50/50'
                              }`}
                              title={btn.label}
                            >
                              <span>{btn.emoji}</span>
                              {typeReactions.length > 0 && (
                                <span className="text-[10px]">{typeReactions.length}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Display who reacted with avatars */}
                      <div className="flex -space-x-1.5 overflow-hidden items-center">
                        {reactions
                          .filter((r) => r.task_id === task.id)
                          .map((r) => {
                            const userAvatar = getCreatorAvatar(r.user_id);
                            const userName = getCreatorName(r.user_id);
                            const reactionEmojis: Record<string, string> = {
                              heart: '💖',
                              hug: '🤗',
                              star: '🌟',
                              thumbsup: '👍'
                            };
                            const emoji = reactionEmojis[r.type] || '💖';
                            return (
                              <div key={r.id} className="relative group/avatar" title={`${userName} 贴了 ${emoji}`}>
                                {userAvatar ? (
                                  <img
                                    src={userAvatar}
                                    alt={userName}
                                    className="w-5 h-5 rounded-full border border-white object-cover"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border border-white bg-rose-200 text-[8px] text-rose-700 flex items-center justify-center font-bold">
                                    {userName.substring(0, 1)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Comments / Whisper board */}
                    <div className="space-y-2 pt-2 border-t border-rose-100/20">
                      {/* Comment List */}
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {comments
                          .filter((c) => c.task_id === task.id)
                          .map((comment) => {
                            const isMe = comment.sender_id === currentUser?.id;
                            const senderName = getCreatorName(comment.sender_id);
                            const senderAvatar = getCreatorAvatar(comment.sender_id);
                            return (
                              <div
                                key={comment.id}
                                className={`flex items-start space-x-2 ${
                                  isMe ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                                }`}
                              >
                                {senderAvatar ? (
                                  <img
                                    src={senderAvatar}
                                    alt={senderName}
                                    className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5 border border-white/80 shadow-sm"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-rose-100 text-[10px] text-rose-600 flex items-center justify-center font-bold flex-shrink-0 mt-0.5 border border-white/80 shadow-sm">
                                    {senderName.substring(0, 1)}
                                  </div>
                                )}
                                <div
                                  className={`rounded-2xl px-3 py-1.5 text-xs max-w-[80%] shadow-sm leading-relaxed border ${
                                    isMe
                                      ? 'bg-rose-500/10 text-rose-900 border-rose-200/50 rounded-tr-none'
                                      : 'bg-white/70 text-rose-800 border-white/50 rounded-tl-none'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-0.5 space-x-2">
                                    <span className="font-extrabold text-[9px] text-rose-700/80">{senderName}</span>
                                    <span className="text-[8px] text-gray-400 font-medium">
                                      {new Date(comment.created_at).toLocaleDateString() === new Date().toLocaleDateString()
                                        ? new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : new Date(comment.created_at).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="break-all font-medium">{comment.content}</p>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Quick Replies */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {['下次还要去！⛺', '超级喜欢！💖', '今天辛苦啦～🥰', '我的宝最棒了！🌟'].map((reply) => (
                          <button
                            key={reply}
                            type="button"
                            onClick={() => handleAddComment(task.id, reply)}
                            className="text-[9px] font-bold text-rose-600 bg-white/40 hover:bg-white/80 border border-rose-100/60 rounded-full px-2.5 py-1 transition active:scale-95 shadow-sm cursor-pointer"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>

                      {/* Comment Input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAddComment(task.id);
                        }}
                        className="flex items-center space-x-2 mt-2"
                      >
                        <input
                          type="text"
                          placeholder="写下你的悄悄话..."
                          value={commentInputs[task.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [task.id]: e.target.value }))
                          }
                          className="flex-1 px-3 py-1.5 rounded-full border border-rose-100 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800 bg-white/60"
                        />
                        <button
                          type="submit"
                          disabled={!commentInputs[task.id]?.trim()}
                          className="bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white rounded-full p-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                        >
                          <Send size={12} />
                        </button>
                      </form>
                    </div>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Large Image/Video Zoomed Modal overlay */}
      {zoomedMedia && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedMedia(null)}
        >
          <div className="max-w-4xl max-h-[90vh] flex items-center justify-center relative">
            <button
              onClick={() => setZoomedMedia(null)}
              className="absolute top-[-40px] right-0 text-white hover:text-rose-400 p-2 font-bold text-sm bg-white/10 rounded-full"
            >
              关闭
            </button>
            {isVideoUrl(zoomedMedia) ? (
              <video
                src={zoomedMedia}
                controls
                autoPlay
                className="rounded-lg max-w-full max-h-[80vh] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={zoomedMedia}
                alt="Zoomed Memory"
                className="rounded-lg max-w-full max-h-[80vh] object-contain shadow-2xl"
              />
            )}
          </div>
        </div>
      )}

      {/* Shuttle Polaroid Popup Modal */}
      {shuttleMemory && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShuttleMemory(null)}>
          <div
            className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 relative border border-rose-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShuttleMemory(null)}
              className="absolute -top-3 -right-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-2.5 shadow-lg border-2 border-white transition active:scale-95 cursor-pointer z-10"
            >
              <X size={14} />
            </button>

            {/* Polaroid Frame */}
            <div className="polaroid-effect shadow-md">
              <div className="aspect-[4/3] bg-rose-50/50 rounded-xl overflow-hidden mb-4 border border-rose-50/50 relative">
                {shuttleMemory.media && shuttleMemory.media.length > 0 ? (
                  isVideoUrl(shuttleMemory.media[0]) ? (
                    <video src={shuttleMemory.media[0]} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={shuttleMemory.media[0]} alt="Memory" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-rose-50 text-rose-300">
                    <Heart size={32} fill="currentColor" className="opacity-40" />
                  </div>
                )}
                <span className="absolute top-2 left-2 bg-rose-500/90 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">
                  🚀 时光穿梭中
                </span>
              </div>

              <div className="text-center space-y-2">
                <span className="text-[9px] text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded-full inline-block">
                  {getCreatorName(shuttleMemory.created_by)} 的打卡约定
                </span>
                <h3 className="text-sm font-black text-rose-950 leading-tight">{shuttleMemory.title}</h3>
                <p className="text-[10px] text-gray-400 font-extrabold">{formatTimestamp(shuttleMemory.completed_at)}</p>
              </div>
            </div>

            {/* Memory Note description */}
            {shuttleMemory.note && (
              <div className="bg-rose-50/40 rounded-2xl p-3 border border-rose-100/50">
                <p className="text-xs text-rose-800 leading-relaxed font-semibold">{shuttleMemory.note}</p>
              </div>
            )}

            {/* Popup footer actions */}
            <div className="flex justify-center space-x-2 pt-1 border-t border-rose-50">
              <button
                type="button"
                onClick={() => {
                  handleToggleReaction(shuttleMemory.id, 'heart');
                  setShuttleMemory(null);
                }}
                className="flex items-center space-x-1.5 bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-full text-xs font-bold transition active:scale-95 shadow-md shadow-rose-200 cursor-pointer"
              >
                <Heart size={12} fill="currentColor" />
                <span>心动贴贴 💖</span>
              </button>
              <button
                type="button"
                onClick={() => setShuttleMemory(null)}
                className="flex items-center space-x-1 px-4 py-2 border border-rose-200 text-rose-700 rounded-full text-xs font-bold hover:bg-rose-50 transition active:scale-95 cursor-pointer"
              >
                <span>返回河流</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
