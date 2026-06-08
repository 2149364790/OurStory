import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { AudioPlayer } from '../components/AudioPlayer';
import { MessageSquare, Mic, Square, Trash2, Send, ChevronDown, ChevronUp, User, Clock, X, Lock, Edit2, RotateCcw, Sparkles, Mail, Plus, Calendar, Image as ImageIcon } from 'lucide-react';
import confetti from 'canvas-confetti';
import imageCompression from 'browser-image-compression';

const monthsList = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

export const Whispers: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [whispers, setWhispers] = useState<any[]>([]);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  
  // Create thread form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Reply form states
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  
  // Audio states
  const { isRecording, audioBlob, duration, startRecording, stopRecording, clearRecording } = useAudioRecorder();
  const [audioUrlPreview, setAudioUrlPreview] = useState<string | null>(null);

  // Rich Whisper States
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState('');
  const [unlockAction, setUnlockAction] = useState<string | null>(null);
  const [unlockedThreads, setUnlockedThreads] = useState<Record<string, boolean>>({});
  const [isSendingAirplane, setIsSendingAirplane] = useState(false);

  // Editing States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Toast & Confirm States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Love Letters tab and form states
  const [activeTab, setActiveTab] = useState<'whispers' | 'letters'>('whispers');
  const [showLetterForm, setShowLetterForm] = useState(false);
  const [letters, setLetters] = useState<any[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);
  const [shakeLetterId, setShakeLetterId] = useState<string | null>(null);
  const [loadingLetters, setLoadingLetters] = useState(false);

  // Love Letter Form Fields
  const [letterTitle, setLetterTitle] = useState('');
  const [letterContent, setLetterContent] = useState('');
  const [letterTheme, setLetterTheme] = useState<'vintage' | 'sunset' | 'starry' | 'cherry'>('vintage');
  const [letterUnlockAt, setLetterUnlockAt] = useState('');
  const [letterImages, setLetterImages] = useState<File[]>([]);
  const [letterUploadProgress, setLetterUploadProgress] = useState(0);

  // Custom DatePicker States for Love Letters
  const [showLetterDatePicker, setShowLetterDatePicker] = useState(false);
  const [letterCalendarYear, setLetterCalendarYear] = useState(new Date().getFullYear());
  const [letterCalendarMonth, setLetterCalendarMonth] = useState(new Date().getMonth());
  const [letterSelectedDay, setLetterSelectedDay] = useState(new Date().getDate());
  const [letterSelectedHour, setLetterSelectedHour] = useState(new Date().getHours());
  const [letterSelectedMinute, setLetterSelectedMinute] = useState(Math.floor(new Date().getMinutes() / 5) * 5);

  const getLetterDaysInMonth = (year: number, month: number) => {
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

  const updateLetterUnlockAt = (year: number, month: number, day: number, hour: number, minute: number) => {
    const newDate = new Date(year, month, day, hour, minute);
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    const hh = String(newDate.getHours()).padStart(2, '0');
    const min = String(newDate.getMinutes()).padStart(2, '0');
    setLetterUnlockAt(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
  };

  const formatLetterDisplayDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return '年 / 月 / 日 -- : --';
    const d = new Date(dateTimeStr);
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (letterUnlockAt) {
      const d = new Date(letterUnlockAt);
      if (!isNaN(d.getTime())) {
        setLetterCalendarYear(d.getFullYear());
        setLetterCalendarMonth(d.getMonth());
        setLetterSelectedDay(d.getDate());
        setLetterSelectedHour(d.getHours());
        setLetterSelectedMinute(Math.floor(d.getMinutes() / 5) * 5);
      }
    } else {
      const now = new Date();
      setLetterCalendarYear(now.getFullYear());
      setLetterCalendarMonth(now.getMonth());
      setLetterSelectedDay(now.getDate());
      setLetterSelectedHour(now.getHours());
      setLetterSelectedMinute(Math.floor(now.getMinutes() / 5) * 5);
    }
  }, [letterUnlockAt]);


  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Helper parser for backward compatibility
  const parseWhisperContent = (content: string | null) => {
    if (!content) return { text: '', mood: null, unlock_at: null, unlock_action: null, is_edited: false };
    if (content.startsWith('{"is_rich":true')) {
      try {
        const parsed = JSON.parse(content);
        return {
          text: parsed.text || '',
          mood: parsed.mood || null,
          unlock_at: parsed.unlock_at || null,
          unlock_action: parsed.unlock_action || null,
          is_edited: !!parsed.is_edited
        };
      } catch (e) {
        // Fallback
      }
    }
    return { text: content, mood: null, unlock_at: null, unlock_action: null, is_edited: false };
  };

  const parseReplyContent = (content: string | null) => {
    if (!content) return { text: '', is_edited: false };
    if (content.startsWith('{"text":') || content.startsWith('{"')) {
      try {
        const parsed = JSON.parse(content);
        return {
          text: parsed.text || '',
          is_edited: !!parsed.is_edited
        };
      } catch (e) {
        // Fallback
      }
    }
    return { text: content, is_edited: false };
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        fetchProfiles();
        fetchWhispers();
        fetchLetters();
      }
    });

    // Realtime whispers synchronization
    const whispersChannel = supabase
      .channel('public:whispers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whispers' },
        () => {
          fetchWhispers();
        }
      )
      .subscribe();

    // Realtime letters synchronization
    const lettersChannel = supabase
      .channel('public:love_letters')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'love_letters' },
        () => {
          fetchLetters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(whispersChannel);
      supabase.removeChannel(lettersChannel);
    };
  }, []);

  // Update preview URL when audioBlob changes
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrlPreview(url);
    } else {
      setAudioUrlPreview(null);
    }
  }, [audioBlob]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data);
  };

  const fetchWhispers = async () => {
    const { data, error } = await supabase
      .from('whispers')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching whispers:', error);
    } else if (data) {
      setWhispers(data);
    }
  };

  const fetchLetters = async () => {
    setLoadingLetters(true);
    try {
      const { data, error } = await supabase
        .from('love_letters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setLetters(data);
    } catch (err: any) {
      console.error('Error fetching letters:', err);
    } finally {
      setLoadingLetters(false);
    }
  };

  const handleFileChangeLetters = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (letterImages.length + filesArray.length > 3) {
        showToast('最多只能上传三张照片哦 📸', 'error');
        return;
      }
      setLetterImages((prev) => [...prev, ...filesArray]);
    }
  };

  const removeLetterImage = (index: number) => {
    setLetterImages((prev) => prev.filter((_, i) => i !== index));
  };

  const compressLetterImage = async (file: File) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error('Image compression failed, using original:', error);
      return file;
    }
  };

  const handlePostLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterTitle.trim() || !letterContent.trim() || !currentUser) return;
    setLoading(true);
    setLetterUploadProgress(0);

    const uploadedUrls: string[] = [];

    try {
      // 1. Process and upload media images
      for (let i = 0; i < letterImages.length; i++) {
        const file = letterImages[i];
        let fileToUpload = file;

        if (file.type.startsWith('image/') && file.type !== 'image/gif') {
          fileToUpload = await compressLetterImage(file);
        }

        const fileExt = file.name.split('.').pop();
        const filePath = `letters/${currentUser.id}_${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
        setLetterUploadProgress(Math.round(((i + 1) / letterImages.length) * 100));
      }

      // 2. Insert letter record
      const unlockAtTimestamp = letterUnlockAt ? new Date(letterUnlockAt).toISOString() : null;

      const { error } = await supabase.from('love_letters').insert({
        sender_id: currentUser.id,
        title: letterTitle,
        content: letterContent,
        images: uploadedUrls,
        theme: letterTheme,
        unlock_at: unlockAtTimestamp,
        is_read: false
      });

      if (error) throw error;

      // Clean form states
      setLetterTitle('');
      setLetterContent('');
      setLetterTheme('vintage');
      setLetterUnlockAt('');
      setLetterImages([]);
      setShowLetterForm(false);
      
      confetti({
        particleCount: 50,
        spread: 60,
        colors: ['#fcd34d', '#ffb3c1', '#ff4d6d'],
      });

      showToast('✉️ 悄悄寄出情书啦，已加上火漆封印！');
      fetchLetters();
    } catch (err: any) {
      console.error('Error posting letter:', err);
      showToast('寄信失败: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setLetterUploadProgress(0);
    }
  };

  const getStoragePathFromUrl = (url: string) => {
    const match = url.match(/\/storage\/v1\/object\/public\/media\/(.+)$/);
    return match ? match[1] : '';
  };

  const handleDeleteLetter = async (id: string, images: string[]) => {
    if (!window.confirm('确定要删除这封珍贵的情书吗？此操作无法撤销。')) return;

    try {
      // 1. Delete associated images from storage
      if (images && images.length > 0) {
        const filesToRemove = images.map(url => {
          const relativePath = getStoragePathFromUrl(url);
          return relativePath || url.split('/').pop() || '';
        }).filter(Boolean);

        if (filesToRemove.length > 0) {
          await supabase.storage.from('media').remove(filesToRemove);
        }
      }

      // 2. Delete letter record
      const { error } = await supabase.from('love_letters').delete().eq('id', id);
      if (error) throw error;

      showToast('情书已成云烟，成功收回 🍃');
      if (selectedLetter?.id === id) {
        setSelectedLetter(null);
      }
      fetchLetters();
    } catch (err: any) {
      console.error('Error deleting letter:', err);
      showToast('删除失败: ' + err.message, 'error');
    }
  };

  const handleLetterClick = async (letter: any) => {
    const isLocked = letter.unlock_at ? new Date() < new Date(letter.unlock_at) : false;
    const isMyLetter = letter.sender_id === currentUser?.id;
    
    if (isLocked && !isMyLetter) {
      // Trigger temporary shake swing animation
      setShakeLetterId(letter.id);
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      setTimeout(() => setShakeLetterId(null), 500);
      return;
    }

    // Unlocked or my own letter: Open Details View
    setSelectedLetter(letter);

    // Mark as read if receiving and unread
    if (!isMyLetter && !letter.is_read) {
      try {
        await supabase
          .from('love_letters')
          .update({ is_read: true })
          .eq('id', letter.id);
        fetchLetters();
      } catch (err) {
        console.error('Error marking letter as read:', err);
      }
    }
  };

  const getLetterCountdown = (unlockAt: string) => {
    const diff = new Date(unlockAt).getTime() - new Date().getTime();
    if (diff <= 0) return '已开启';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}天${hours}小时`;
    if (hours > 0) return `${hours}小时${mins}分`;
    return `${mins}分钟`;
  };

  // Mark a thread and its children as read
  const handleMarkAsRead = async (threadId: string) => {
    if (!currentUser) return;
    
    // Find unread items in this thread where the current user is not the sender
    const threadWhispers = whispers.filter(
      (w) => (w.id === threadId || w.parent_id === threadId) && 
             w.sender_id !== currentUser.id && 
             !w.is_read
    );

    if (threadWhispers.length === 0) return;

    const unreadIds = threadWhispers.map((w) => w.id);

    try {
      await supabase
        .from('whispers')
        .update({ is_read: true })
        .in('id', unreadIds);

      fetchWhispers();
    } catch (err) {
      console.error('Error marking whispers as read:', err);
    }
  };

  const toggleExpand = (threadId: string) => {
    setExpandedThreads((prev) => {
      const nextState = !prev[threadId];
      if (nextState) {
        handleMarkAsRead(threadId);
      }
      return { ...prev, [threadId]: nextState };
    });
  };

  const handleUploadAudio = async (blob: Blob): Promise<string> => {
    if (!currentUser) return '';
    const filePath = `${currentUser.id}_${Date.now()}.webm`;

    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(filePath, blob, { contentType: blob.type });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handlePostWhisper = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    const textContent = parentId ? replyContent[parentId] : newContent;
    if (!textContent && !audioBlob && !parentId) return;
    setLoading(true);
    if (!parentId) {
      setIsSendingAirplane(true);
    }

    try {
      let uploadedAudioUrl = '';
      if (audioBlob) {
        uploadedAudioUrl = await handleUploadAudio(audioBlob);
      }

      let contentPayload = textContent || '';
      if (!parentId) {
        contentPayload = JSON.stringify({
          is_rich: true,
          text: textContent || '',
          mood: selectedMood,
          unlock_at: isLocked && lockTime ? new Date(lockTime).toISOString() : null,
          unlock_action: isLocked ? unlockAction : null,
        });
      }

      // Keep paper airplane animation running for a sweet duration
      if (!parentId) {
        await new Promise((resolve) => setTimeout(resolve, 1800));
      }

      const { error } = await supabase.from('whispers').insert({
        sender_id: currentUser.id,
        content: contentPayload,
        audio_path: uploadedAudioUrl || null,
        audio_duration: uploadedAudioUrl ? duration : null,
        parent_id: parentId,
        is_read: false,
      });

      if (error) throw error;

      // Send push notification to partner
      const partnerProfile = profiles.find((p) => p.id !== currentUser.id);
      const myProfile = profiles.find((p) => p.id === currentUser.id);
      if (partnerProfile) {
        const senderName = myProfile?.nickname || '伴侣';
        const title = parentId ? '收到悄悄话回复 💬' : '收到新悄悄话 🤫';
        const bodyText = parentId
          ? `${senderName} 回复了你的悄悄话 🤫`
          : `${senderName} 给你写了一条新悄悄话 🌸`;
        
        supabase.functions.invoke('send-push', {
          body: {
            recipient_id: partnerProfile.id,
            title,
            body: bodyText,
            url: '/whispers'
          }
        }).catch(err => console.error('Error invoking send-push:', err));
      }

      // Reset states
      if (parentId) {
        setReplyContent((prev) => ({ ...prev, [parentId]: '' }));
      } else {
        setNewContent('');
        setSelectedMood(null);
        setIsLocked(false);
        setLockTime('');
        setUnlockAction(null);
        clearRecording();
        setShowAddForm(false);
      }
      
      fetchWhispers();
    } catch (err: any) {
      showToast('发布失败: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setIsSendingAirplane(false);
    }
  };

  const handleDeleteWhisper = async (id: string, audioPath: string | null) => {
    setConfirmModal({
      show: true,
      title: '确认删除',
      message: '确定要删除这条消息吗？此操作将无法撤回。',
      onConfirm: async () => {
        try {
          // 1. Delete audio file if it exists
          if (audioPath) {
            const parts = audioPath.split('/');
            const fileName = parts[parts.length - 1];
            await supabase.storage.from('audio').remove([fileName]);
          }

          // 2. Delete whisper record
          const { error } = await supabase.from('whispers').delete().eq('id', id);
          if (error) throw error;
          
          showToast('已成功删除');
          fetchWhispers();
        } catch (err: any) {
          showToast('删除失败: ' + err.message, 'error');
        }
      }
    });
  };

  const handleUnlockByAction = async (threadId: string, action: string) => {
    if (!currentUser) return;
    
    try {
      // 1. Insert interaction (hug/kiss)
      await supabase.from('interactions').insert({
        sender_id: currentUser.id,
        type: action,
      });

      // Send push notification to partner
      const partnerProfile = profiles.find((p) => p.id !== currentUser.id);
      const myProfile = profiles.find((p) => p.id === currentUser.id);
      if (partnerProfile) {
        const senderName = myProfile?.nickname || '伴侣';
        let bodyText = '';
        if (action === 'kiss') {
          bodyText = `${senderName} 给你送来了一个 甜蜜飞吻 💋 (通过解锁悄悄话)`;
        } else if (action === 'hug') {
          bodyText = `${senderName} 给你送来了一个 温暖拥抱 🤗 (通过解锁悄悄话)`;
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

      // 2. Play confetti explosion
      confetti({
        particleCount: 50,
        spread: 60,
        colors: ['#ff4d6d', '#ffb3c1', '#fee4e6'],
      });

      // 3. Shake/vibrate slightly if supported
      if ('vibrate' in navigator) {
        if (action === 'hug') navigator.vibrate(400);
        else if (action === 'kiss') navigator.vibrate([70, 80, 70]);
      }

      // 4. Reveal in local state
      setUnlockedThreads((prev) => ({ ...prev, [threadId]: true }));
    } catch (err) {
      console.error('Error unlocking whisper by action:', err);
    }
  };

  const handleRecallWhisper = async (id: string, content: string, audioPath: string | null, isReply: boolean, parentId?: string) => {
    try {
      // 1. Delete audio file if it exists
      if (audioPath) {
        const parts = audioPath.split('/');
        const fileName = parts[parts.length - 1];
        await supabase.storage.from('audio').remove([fileName]);
      }

      // 2. Delete whisper record
      const { error } = await supabase.from('whispers').delete().eq('id', id);
      if (error) throw error;

      // 3. Populate text back into inputs for WeChat-like "Re-edit"
      let textToRestore = '';
      if (content.startsWith('{"is_rich":true')) {
        try {
          const parsed = JSON.parse(content);
          textToRestore = parsed.text || '';
        } catch (e) {
          textToRestore = content;
        }
      } else if (content.startsWith('{"text":') || content.startsWith('{"')) {
        try {
          const parsed = JSON.parse(content);
          textToRestore = parsed.text || '';
        } catch (e) {
          textToRestore = content;
        }
      } else {
        textToRestore = content;
      }

      if (isReply && parentId) {
        setReplyContent((prev) => ({ ...prev, [parentId]: textToRestore }));
      } else {
        setNewContent(textToRestore);
        setShowAddForm(true);
      }

      showToast('已撤回，内容已恢复至输入框');
      fetchWhispers();
    } catch (err: any) {
      showToast('撤回失败: ' + err.message, 'error');
    }
  };

  const handleSaveEdit = async (id: string, originalContent: string, newText: string) => {
    if (!currentUser || !newText.trim()) return;

    try {
      let updatedContent = newText;
      if (originalContent.startsWith('{"is_rich":true')) {
        try {
          const parsed = JSON.parse(originalContent);
          parsed.text = newText;
          parsed.is_edited = true;
          updatedContent = JSON.stringify(parsed);
        } catch (e) {
          // fallback
        }
      } else {
        updatedContent = JSON.stringify({
          text: newText,
          is_edited: true
        });
      }

      const { error } = await supabase
        .from('whispers')
        .update({ content: updatedContent })
        .eq('id', id);

      if (error) throw error;
      setEditingId(null);
      setEditText('');
      fetchWhispers();
    } catch (err: any) {
      showToast('更新失败: ' + err.message, 'error');
    }
  };

  const handleQuickComfort = async (_threadId: string, type: 'pat' | 'hug' | 'heart') => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from('interactions').insert({
        sender_id: currentUser.id,
        type: type,
      });
      if (error) throw error;

      // Play local particle animation for immediate user feedback
      const emojiMap = {
        pat: '💆‍♂️',
        hug: '🤗',
        heart: '💖'
      };
      const emoji = emojiMap[type] || '💖';
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

      showToast('已向 Ta 传送温暖回应 ✨');

      // Send push notification
      const partnerProfile = profiles.find((p) => p.id !== currentUser.id);
      const myProfile = profiles.find((p) => p.id === currentUser.id);
      if (partnerProfile) {
        const senderName = myProfile?.nickname || '伴侣';
        let bodyText = '';
        if (type === 'pat') bodyText = `${senderName} 给你的心里话送来了 摸摸头安慰 💆‍♂️`;
        else if (type === 'hug') bodyText = `${senderName} 给你的心里话送来了 温暖拥抱 🤗`;
        else if (type === 'heart') bodyText = `${senderName} 给你的心里话送来了 满满爱意比心 💖`;
        
        supabase.functions.invoke('send-push', {
          body: {
            recipient_id: partnerProfile.id,
            title: '收到心里话温暖回应 💖',
            body: bodyText,
            url: '/whispers'
          }
        }).catch(err => console.error('Error invoking send-push:', err));
      }
    } catch (err: any) {
      console.error('Error sending quick comfort:', err);
      showToast('发送失败: ' + err.message, 'error');
    }
  };

  const getProfile = (id: string) => {
    return profiles.find((p) => p.id === id);
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return `${(date.getMonth() + 1)}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const canRecall = (createdAtString: string) => {
    const diffMs = new Date().getTime() - new Date(createdAtString).getTime();
    return diffMs < 120 * 1000;
  };

  // Group whispers into parent-threads
  const parentWhispers = whispers.filter((w) => w.parent_id === null);

  const getReplies = (parentId: string) => {
    return whispers.filter((w) => w.parent_id === parentId);
  };

  const hasUnreadReply = (parentId: string) => {
    if (!currentUser) return false;
    const threadReplies = getReplies(parentId);
    return threadReplies.some((r) => r.sender_id !== currentUser.id && !r.is_read);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const partnerProfile = profiles.find((p) => p.id !== currentUser?.id);

  const getPartnerMoodWeather = () => {
    if (!currentUser || !partnerProfile) {
      return {
        status: '未知状态 🔍',
        text: '加载伴侣心情中...',
        bgClass: 'bg-white/40 border-white/50',
        icon: '✨'
      };
    }

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const partnerWhispers = whispers.filter(w => {
      const isPartner = w.sender_id === partnerProfile.id;
      const isParent = w.parent_id === null;
      const isRecent = new Date(w.created_at) > fifteenDaysAgo;
      return isPartner && isParent && isRecent;
    });

    if (partnerWhispers.length === 0) {
      return {
        status: '清风徐来 🍃',
        text: `${partnerProfile.nickname || '伴侣'} 最近半个月没有记录心情，去敲敲 Ta 的心门吧 💌`,
        bgClass: 'bg-gradient-to-r from-teal-50/40 via-rose-50/30 to-rose-50/40 border-rose-100/40 shadow-rose-50/20',
        icon: '💌'
      };
    }

    let positiveCount = 0; // 🥳, ❤️
    let neutralCount = 0;  // 🥺
    let negativeCount = 0; // 😭, 😤, 💤

    partnerWhispers.forEach(w => {
      const parsed = parseWhisperContent(w.content);
      const mood = parsed.mood;
      if (mood === '🥳' || mood === '❤️') {
        positiveCount++;
      } else if (mood === '🥺') {
        neutralCount++;
      } else if (mood === '😭' || mood === '😤' || mood === '💤') {
        negativeCount++;
      }
    });

    const total = positiveCount + neutralCount + negativeCount;
    if (total === 0) {
      return {
        status: '风平浪静 🌤️',
        text: `${partnerProfile.nickname || '伴侣'} 投递了心里话，但未表达具体情绪，去听听 Ta 的录音吧 🎙️`,
        bgClass: 'bg-gradient-to-r from-rose-50/40 to-pink-50/30 border-rose-100/30 shadow-xs',
        icon: '🎙️'
      };
    }

    if (negativeCount >= positiveCount && negativeCount >= neutralCount) {
      return {
        status: '细雨微凉 🌧️',
        text: `${partnerProfile.nickname || '伴侣'} 最近心情有点下雨 😭 / 感觉有些疲惫 💤，快去点个摸摸头或送个拥抱安慰一下 Ta 吧 💖`,
        bgClass: 'bg-gradient-to-r from-blue-100/45 via-indigo-100/40 to-rose-50/30 border-indigo-200/50 shadow-indigo-100/20',
        icon: '🌧️'
      };
    } else if (positiveCount >= negativeCount && positiveCount >= neutralCount) {
      return {
        status: '晴空万里 ☀️',
        text: `${partnerProfile.nickname || '伴侣'} 最近的心情非常阳光哦 🥳，记得继续给 Ta 投递心情贴贴 👩‍❤️‍👨`,
        bgClass: 'bg-gradient-to-r from-amber-100/45 via-pink-100/40 to-rose-100/30 border-amber-200/50 shadow-amber-100/20',
        icon: '☀️'
      };
    } else {
      return {
        status: '温柔微风 🍃',
        text: `${partnerProfile.nickname || '伴侣'} 最近对你有些撒娇依赖 🥺，多给 Ta 发些温暖的回应吧 💞`,
        bgClass: 'bg-gradient-to-r from-emerald-50/45 via-teal-50/40 to-cyan-50/35 border-teal-200/40 shadow-teal-50/15',
        icon: '🍃'
      };
    }
  };

  const weather = getPartnerMoodWeather();

  return (
    <div className="px-4 pt-4">
      {/* Tab Switcher */}
      <div className="flex justify-center space-x-1.5 max-w-xs mx-auto mb-6 bg-rose-50/50 p-1.5 rounded-full border border-rose-100/30">
        <button
          onClick={() => {
            setActiveTab('whispers');
            setShowAddForm(false);
            setShowLetterForm(false);
          }}
          className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-1.5 ${
            activeTab === 'whispers'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-rose-700 hover:bg-rose-100/50'
          }`}
        >
          <MessageSquare size={14} />
          <span>树洞心里话</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('letters');
            setShowAddForm(false);
            setShowLetterForm(false);
          }}
          className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-1.5 ${
            activeTab === 'letters'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-rose-700 hover:bg-rose-100/50'
          }`}
        >
          <Mail size={14} />
          <span>时光情书阁</span>
          {letters.some(l => l.sender_id !== currentUser?.id && !l.is_read) && (
            <span className="w-1.5 h-1.5 bg-rose-300 rounded-full animate-ping ml-1" />
          )}
        </button>
      </div>

      {/* Top action bar */}
      <div className="flex justify-between items-center max-w-md mx-auto mb-6">
        <h1 className="text-xl font-bold text-rose-800">
          {activeTab === 'whispers' ? '心事树洞交换箱' : '纸短情长情书阁'}
        </h1>
        {activeTab === 'whispers' ? (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition active:scale-95"
          >
            {showAddForm ? <X size={14} /> : <MessageSquare size={14} />}
            <span>{showAddForm ? '取消' : '写心里话'}</span>
          </button>
        ) : (
          <button
            onClick={() => setShowLetterForm(!showLetterForm)}
            className="flex items-center space-x-1 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition active:scale-95 animate-pulse-glow"
          >
            {showLetterForm ? <X size={14} /> : <Plus size={14} />}
            <span>{showLetterForm ? '收回信纸' : '写情书 ✉️'}</span>
          </button>
        )}
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {activeTab === 'whispers' ? (
          <>
            {/* Write new whisper card form */}
            {showAddForm && (
          <form onSubmit={(e) => handlePostWhisper(e, null)} className="glass-panel p-6 rounded-3xl space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-rose-800 border-b border-rose-50 pb-2">写给 Ta 的心里话</h2>

            <div>
              <label className="block text-xs font-semibold text-rose-700 mb-1">写些什么...</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
                placeholder="这一刻，我有话想悄悄对你说..."
                className="w-full px-4 py-2.5 rounded-xl border border-rose-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800"
              />
            </div>

            {/* Mood selector */}
            <div>
              <label className="block text-xs font-semibold text-rose-700 mb-2">选择情绪胶囊</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { emoji: '🥳', label: '开心' },
                  { emoji: '🥺', label: '委屈' },
                  { emoji: '😭', label: '难过' },
                  { emoji: '😤', label: '生气' },
                  { emoji: '💤', label: '疲惫' },
                  { emoji: '❤️', label: '心动' },
                ].map((m) => (
                  <button
                    key={m.emoji}
                    type="button"
                    onClick={() => setSelectedMood(selectedMood === m.emoji ? null : m.emoji)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1 ${
                      selectedMood === m.emoji
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md scale-105'
                        : 'bg-white/50 text-rose-700 border-rose-100 hover:bg-rose-50'
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Capsule Lock options */}
            <div className="bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-rose-700 flex items-center">
                  <Lock size={14} className="mr-1.5 text-rose-500" />
                  开启时空密信锁
                </span>
                <input
                  type="checkbox"
                  checked={isLocked}
                  onChange={(e) => setIsLocked(e.target.checked)}
                  className="w-4 h-4 text-rose-500 accent-rose-500 rounded focus:ring-rose-400 cursor-pointer"
                />
              </div>

              {isLocked && (
                <div className="space-y-3 pt-2 border-t border-rose-100/40 animate-slide-up">
                  <div>
                    <label className="block text-[10px] font-semibold text-rose-600 mb-1">何时才能解锁阅读？</label>
                    <input
                      type="datetime-local"
                      value={lockTime}
                      onChange={(e) => setLockTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-rose-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-rose-600 mb-1">或是，通过互动立刻解锁：</label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setUnlockAction(unlockAction === 'hug' ? null : 'hug')}
                        className={`flex-1 py-1.5 rounded-xl border text-[10px] font-bold transition ${
                          unlockAction === 'hug'
                            ? 'bg-pink-400 text-white border-pink-400 shadow-sm'
                            : 'bg-white text-rose-700 border-rose-100 hover:bg-rose-50'
                        }`}
                      >
                        🤗 送 Ta 拥抱立刻解锁
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnlockAction(unlockAction === 'kiss' ? null : 'kiss')}
                        className={`flex-1 py-1.5 rounded-xl border text-[10px] font-bold transition ${
                          unlockAction === 'kiss'
                            ? 'bg-rose-400 text-white border-rose-400 shadow-sm'
                            : 'bg-white text-rose-700 border-rose-100 hover:bg-rose-50'
                        }`}
                      >
                        💋 送 Ta 飞吻立刻解锁
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Voice Record controls */}
            <div className="space-y-3 bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-rose-700 flex items-center">
                  <Mic size={14} className="mr-1 text-rose-500" />
                  捎上一段语音（可选）
                </span>
                {duration > 0 && (
                  <span className="text-xs font-mono font-bold text-rose-500">{formatDuration(duration)}</span>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {!isRecording && !audioBlob ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center space-x-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow transition active:scale-95"
                  >
                    <Mic size={14} />
                    <span>点击录音</span>
                  </button>
                ) : isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center space-x-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow animate-pulse"
                  >
                    <Square size={14} />
                    <span>停止录音</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 w-full">
                    {audioUrlPreview && <AudioPlayer url={audioUrlPreview} />}
                    <button
                      type="button"
                      onClick={clearRecording}
                      className="px-3 py-2 text-rose-500 bg-rose-100 hover:bg-rose-200 rounded-xl text-xs font-bold transition active:scale-95"
                    >
                      重录
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isRecording}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 px-4 rounded-xl transition active:scale-95 disabled:opacity-50 text-xs"
            >
              {loading ? '悄悄传送中...' : '投递心事箱'}
            </button>
          </form>
        )}

        {/* Partner Mood Weather Dashboard Card */}
        {partnerProfile && (
          <div className={`glass-panel rounded-3xl p-5 ${weather.bgClass} border transition-all duration-500 shadow-md relative overflow-hidden select-none`}>
            {/* Ambient glowing background bubbles */}
            <div className="absolute w-24 h-24 rounded-full bg-rose-300/10 blur-xl -top-6 -left-6 pointer-events-none" />
            <div className="absolute w-28 h-28 rounded-full bg-indigo-300/10 blur-xl -bottom-8 -right-8 pointer-events-none" />

            <div className="relative z-10 flex items-start space-x-3.5">
              <div className="text-3xl p-2.5 rounded-2xl bg-white/60 border border-white/80 shadow-inner flex items-center justify-center shrink-0">
                <span>{weather.icon}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-extrabold text-rose-800 tracking-wider">Ta 的情绪天气预报</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/70 border border-rose-100 text-rose-700 shadow-2xs">
                    最近 15 天
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-rose-950 flex items-center">
                  <Sparkles size={14} className="text-amber-500 mr-1 animate-pulse" />
                  当前状态：<span className="underline decoration-rose-300 decoration-2 underline-offset-4">{weather.status}</span>
                </h3>
                <p className="text-[11px] font-medium text-rose-900/80 leading-relaxed pt-0.5">
                  {weather.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Treehole stream */}
        <div className="space-y-4">
          {parentWhispers.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 text-center text-rose-700/60 select-none relative overflow-hidden animate-slide-up">
              {/* Decorative floating bubbles */}
              <div className="absolute w-24 h-24 rounded-full bg-rose-300/10 blur-xl top-0 left-0" />
              <div className="absolute w-20 h-20 rounded-full bg-pink-300/10 blur-xl bottom-0 right-0" />
              
              <div className="relative z-10 space-y-4">
                <div className="w-16 h-16 bg-rose-50/50 rounded-2xl mx-auto flex items-center justify-center border border-rose-100 shadow-inner">
                  <span className="text-3xl animate-bounce">✉️</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-rose-800">树洞箱静悄悄的</p>
                  <p className="text-xs text-rose-600/80 max-w-xs mx-auto">
                    这里是存放你们小秘密的私密树洞。今天有什么不好意思开口的心里话，或是暖暖的爱意？投递一封“情绪胶囊”或“时空密信”给 Ta 吧。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            parentWhispers.map((thread) => {
              const replies = getReplies(thread.id);
              const isExpanded = expandedThreads[thread.id];
              const sender = getProfile(thread.sender_id);
              const isMyWhisper = thread.sender_id === currentUser?.id;
              const hasRedDot = !isMyWhisper && !thread.is_read;
              const threadHasUnreadReply = hasUnreadReply(thread.id);

              const parsed = parseWhisperContent(thread.content);

              // Check time & action lock state
              const isTimeLocked = parsed.unlock_at ? new Date() < new Date(parsed.unlock_at) : false;
              const isActionLocked = parsed.unlock_action && !unlockedThreads[thread.id];
              const isLockedForMe = !isMyWhisper && (isTimeLocked || isActionLocked);

              // Custom borders/shadows based on mood
              const moodThemes: Record<string, { border: string, bg: string, shadow: string }> = {
                '🥳': { border: 'border-amber-200', bg: 'bg-amber-50/5', shadow: 'shadow-md shadow-amber-100/30' },
                '🥺': { border: 'border-indigo-200', bg: 'bg-indigo-50/5', shadow: 'shadow-md shadow-indigo-100/30' },
                '😭': { border: 'border-blue-200', bg: 'bg-blue-50/5', shadow: 'shadow-md shadow-blue-100/30' },
                '😤': { border: 'border-orange-200', bg: 'bg-orange-50/5', shadow: 'shadow-md shadow-orange-100/30' },
                '💤': { border: 'border-violet-200', bg: 'bg-violet-50/5', shadow: 'shadow-md shadow-violet-100/30' },
                '❤️': { border: 'border-rose-300', bg: 'bg-rose-50/10', shadow: 'shadow-lg shadow-rose-200/50' },
              };
              const currentMoodTheme = parsed.mood ? moodThemes[parsed.mood] : null;
              const cardBorderClass = currentMoodTheme ? currentMoodTheme.border : 'border-rose-100/40';
              const cardShadowClass = currentMoodTheme ? currentMoodTheme.shadow : 'shadow-xs';

              return (
                <div key={thread.id} className={`glass-panel rounded-3xl overflow-hidden border ${cardBorderClass} ${cardShadowClass} transition-all duration-300`}>
                  {/* Parent Whisper Card header */}
                  <div
                    onClick={() => toggleExpand(thread.id)}
                    className="p-5 cursor-pointer space-y-3 relative group active:bg-white/10"
                  >
                    {/* Read receipt red dot */}
                    {(hasRedDot || threadHasUnreadReply) && (
                      <span className="absolute top-4 left-4 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                    )}
                    {(hasRedDot || threadHasUnreadReply) && (
                      <span className="absolute top-4 left-4 w-2 h-2 bg-rose-500 rounded-full" />
                    )}

                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
                      <div className="flex items-center space-x-1.5 ml-2.5">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-rose-50 border border-rose-100 flex items-center justify-center">
                          {sender?.avatar_url ? (
                            <img src={sender.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <User size={10} className="text-rose-400" />
                          )}
                        </div>
                        <span className="font-semibold text-rose-700/80">
                          {isMyWhisper ? '我发表的心事' : `${sender?.nickname || '伴侣'} 的心里话`}
                        </span>
                        {parsed.mood && (
                          <span className="text-xs bg-white/80 border border-rose-100 rounded-full px-1.5 py-0.5 shadow-xs flex items-center space-x-0.5 scale-90">
                            <span>{parsed.mood}</span>
                          </span>
                        )}
                        {isMyWhisper && (parsed.unlock_at || parsed.unlock_action) && (
                          <span className="flex items-center text-amber-500 space-x-0.5 border border-amber-200/50 bg-amber-50/60 px-1.5 py-0.5 rounded-full scale-90">
                            <Lock size={8} />
                            <span className="text-[8px] font-bold">已加密</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock size={10} />
                        <span>{formatTimestamp(thread.created_at)}</span>
                      </div>
                    </div>

                    {isLockedForMe ? (
                      <div className="bg-rose-50/20 backdrop-blur-md rounded-2xl p-4 border border-rose-100/50 flex flex-col items-center text-center space-y-3 py-6 my-2">
                        <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 shadow-inner animate-pulse">
                          <Lock size={16} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-rose-800">这是一封时空心事密信</p>
                          {isTimeLocked && parsed.unlock_at && (
                            <p className="text-[10px] text-rose-600/70">
                              🔒 锁定期至：{new Date(parsed.unlock_at).toLocaleString()}
                            </p>
                          )}
                          {isActionLocked && parsed.unlock_action && (
                            <p className="text-[10px] text-rose-600/70">
                              🔒 需要您给 Ta 送一个{parsed.unlock_action === 'hug' ? '拥抱' : '飞吻'}后即可解开
                            </p>
                          )}
                        </div>
                        {isActionLocked && parsed.unlock_action && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlockByAction(thread.id, parsed.unlock_action!);
                            }}
                            className="mt-2 inline-flex items-center space-x-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-[10px] font-bold shadow-md active:scale-95 transition"
                          >
                            <span>{parsed.unlock_action === 'hug' ? '🤗 给 Ta 温暖拥抱解锁' : '💋 给 Ta 送个飞吻解锁'}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {editingId === thread.id ? (
                          <div className="ml-2.5 space-y-2 mt-1" onClick={(e) => e.stopPropagation()}>
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full px-3 py-2 border border-rose-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800 bg-white"
                              rows={3}
                            />
                            <div className="flex space-x-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditText('');
                                }}
                                className="px-2.5 py-1 text-[10px] text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => handleSaveEdit(thread.id, thread.content, editText)}
                                className="px-2.5 py-1 text-[10px] text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition"
                              >
                                保存
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-rose-900 font-medium ml-2.5 leading-relaxed whitespace-pre-wrap break-all">
                            {parsed.text}
                            {parsed.is_edited && (
                              <span className="text-[9px] text-rose-400/80 ml-1.5 font-normal">(已编辑)</span>
                            )}
                          </p>
                        )}

                        {thread.audio_path && (
                          <div className="ml-2.5 py-1" onClick={(e) => e.stopPropagation()}>
                            <AudioPlayer url={thread.audio_path} />
                          </div>
                        )}

                        {!isMyWhisper && (
                          <div className="ml-2.5 pt-2 pb-1 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleQuickComfort(thread.id, 'pat')}
                              className="px-2.5 py-1.5 rounded-full text-[9px] font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 shadow-2xs hover:shadow-xs transition duration-200 flex items-center space-x-1"
                            >
                              <span>💆‍♂️</span>
                              <span>摸摸头</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickComfort(thread.id, 'hug')}
                              className="px-2.5 py-1.5 rounded-full text-[9px] font-bold bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-800 shadow-2xs hover:shadow-xs transition duration-200 flex items-center space-x-1"
                            >
                              <span>🤗</span>
                              <span>给抱抱</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickComfort(thread.id, 'heart')}
                              className="px-2.5 py-1.5 rounded-full text-[9px] font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 shadow-2xs hover:shadow-xs transition duration-200 flex items-center space-x-1"
                            >
                              <span>💖</span>
                              <span>比个心</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex justify-between items-center pt-1 border-t border-rose-50/50 mt-1 ml-2.5">
                      <span className="text-[10px] font-bold text-rose-500 flex items-center">
                        <MessageSquare size={10} className="mr-1" />
                        {replies.length} 条回应
                      </span>
                      <div className="flex items-center space-x-3">
                        {isMyWhisper && (
                          <>
                            {editingId !== thread.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(thread.id);
                                  setEditText(parsed.text);
                                }}
                                className="p-1 hover:text-rose-600 text-rose-400 transition"
                                title="编辑心事"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}
                            {canRecall(thread.created_at) ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRecallWhisper(thread.id, thread.content, thread.audio_path, false);
                                }}
                                className="p-1 hover:text-rose-600 text-rose-400 transition"
                                title="撤回心事"
                              >
                                <RotateCcw size={12} />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWhisper(thread.id, thread.audio_path);
                                }}
                                className="p-1 hover:text-rose-600 text-rose-400 transition"
                                title="删除心事"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </>
                        )}
                        {isExpanded ? <ChevronUp size={14} className="text-rose-500" /> : <ChevronDown size={14} className="text-rose-500" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded reply stream */}
                  {isExpanded && (
                    <div className="bg-rose-50/30 border-t border-rose-100/60 p-4 space-y-4">
                      {replies.map((reply) => {
                        const replySender = getProfile(reply.sender_id);
                        const isMyReply = reply.sender_id === currentUser?.id;

                        const parsedReply = parseReplyContent(reply.content);

                        return (
                          <div
                            key={reply.id}
                            className={`flex space-x-2 ${isMyReply ? 'flex-row-reverse space-x-reverse' : ''}`}
                          >
                            {/* Reply avatar */}
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-rose-100 border border-white flex-shrink-0 flex items-center justify-center">
                              {replySender?.avatar_url ? (
                                <img src={replySender.avatar_url} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <User size={12} className="text-rose-400" />
                              )}
                            </div>

                            {/* Reply message bubble */}
                            <div className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-sm relative ${
                              isMyReply 
                                ? 'bg-rose-500 text-white rounded-tr-none' 
                                : 'bg-white text-rose-900 border border-rose-100/60 rounded-tl-none'
                            }`}>
                              <div className="flex justify-between items-center mb-1 space-x-2">
                                <span className={`text-[8px] font-bold ${isMyReply ? 'text-rose-100' : 'text-rose-500'}`}>
                                  {replySender?.nickname || '伴侣'}
                                </span>
                                <div className="flex items-center space-x-1.5 text-[8px] text-gray-400 shrink-0">
                                  <span>{formatTimestamp(reply.created_at)}</span>
                                  {isMyReply && editingId !== reply.id && (
                                    <div className="flex items-center space-x-1 ml-1.5">
                                      {/* Edit button */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingId(reply.id);
                                          setEditText(parsedReply.text);
                                        }}
                                        className={`transition ${isMyReply ? 'text-rose-200 hover:text-white' : 'text-rose-400 hover:text-rose-600'}`}
                                        title="编辑回应"
                                      >
                                        <Edit2 size={9} />
                                      </button>
                                      {/* Recall / Delete button */}
                                      {canRecall(reply.created_at) ? (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRecallWhisper(reply.id, reply.content, reply.audio_path, true, thread.id);
                                          }}
                                          className={`transition ${isMyReply ? 'text-rose-200 hover:text-white' : 'text-rose-400 hover:text-rose-600'}`}
                                          title="撤回回应"
                                        >
                                          <RotateCcw size={9} />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteWhisper(reply.id, reply.audio_path);
                                          }}
                                          className={`transition ${isMyReply ? 'text-rose-200 hover:text-white' : 'text-rose-400 hover:text-rose-600'}`}
                                          title="删除回应"
                                        >
                                          <Trash2 size={9} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {editingId === reply.id ? (
                                <div className="space-y-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="w-full px-2 py-1 text-xs rounded-lg border border-rose-200 text-rose-800 focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white"
                                    rows={2}
                                  />
                                  <div className="flex space-x-1.5 justify-end">
                                    <button
                                      onClick={() => {
                                        setEditingId(null);
                                        setEditText('');
                                      }}
                                      className="px-2 py-0.5 text-[9px] text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                                    >
                                      取消
                                    </button>
                                    <button
                                      onClick={() => handleSaveEdit(reply.id, reply.content, editText)}
                                      className="px-2 py-0.5 text-[9px] text-white bg-rose-600 rounded-md hover:bg-rose-700 transition"
                                    >
                                      保存
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="leading-relaxed break-all whitespace-pre-wrap">
                                    {parsedReply.text}
                                    {parsedReply.is_edited && (
                                      <span className={`text-[9px] ml-1 opacity-70 ${isMyReply ? 'text-rose-100' : 'text-rose-400'}`}>
                                        (已编辑)
                                      </span>
                                    )}
                                  </p>

                                  {reply.audio_path && (
                                    <div className="mt-2 text-rose-950">
                                      <AudioPlayer url={reply.audio_path} />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Reply form inputs */}
                      <form
                        onSubmit={(e) => handlePostWhisper(e, thread.id)}
                        className="flex items-center space-x-2 pt-2 border-t border-rose-50/50"
                      >
                        <input
                          type="text"
                          value={replyContent[thread.id] || ''}
                          onChange={(e) =>
                            setReplyContent((prev) => ({
                              ...prev,
                              [thread.id]: e.target.value,
                            }))
                          }
                          placeholder="写下你的回应/解答..."
                          className="flex-grow px-3 py-2 border border-rose-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800 bg-white"
                        />
                        <button
                          type="submit"
                          disabled={!replyContent[thread.id] || loading}
                          className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition active:scale-95 disabled:opacity-50"
                        >
                          <Send size={12} />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        </>
        ) : (
          <>
            {/* Write new Love Letter Form */}
            {showLetterForm && (
              <form onSubmit={handlePostLetter} className="glass-panel p-6 rounded-3xl space-y-5 shadow-xl border border-rose-100/40 relative overflow-visible animate-slide-up bg-white/55 z-20">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-200/10 to-amber-200/10 blur-xl pointer-events-none" />
                
                <h2 className="text-sm font-bold text-rose-800 border-b border-rose-50 pb-2 flex items-center space-x-1.5">
                  <Mail size={16} className="text-rose-500" />
                  <span>写下一封浪漫时光情书</span>
                </h2>

                {/* Theme Selector */}
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-2">选择专属信纸风格</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'vintage', label: '📜 古旧', bg: 'bg-[#fcf8f2] border-[#e6d3af] text-[#5c4b37]' },
                      { id: 'sunset', label: '🌅 晚霞', bg: 'bg-[#fff3f5] border-[#ffd4c4] text-[#7c3f35]' },
                      { id: 'starry', label: '🌌 星空', bg: 'bg-[#1e1b4b] border-[#4c1d95] text-[#f5f3ff]' },
                      { id: 'cherry', label: '🌸 樱花', bg: 'bg-[#fff0f3] border-[#ffaec0] text-[#7c2d37]' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setLetterTheme(t.id as any)}
                        className={`py-2 px-1 text-[10px] font-bold rounded-xl border text-center transition-all ${t.bg} ${
                          letterTheme === t.id ? 'ring-2 ring-rose-500 scale-105 shadow-sm' : 'opacity-75 hover:opacity-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Letter Title */}
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">情书标题</label>
                  <input
                    type="text"
                    required
                    value={letterTitle}
                    onChange={e => setLetterTitle(e.target.value)}
                    placeholder="如：给阿强的一封信 / 致我最亲爱的宝贝..."
                    className="w-full px-4 py-2 rounded-xl border border-rose-100 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800 bg-white/60 font-semibold"
                  />
                </div>

                {/* Letter Content */}
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">信件内容</label>
                  <textarea
                    required
                    rows={8}
                    value={letterContent}
                    onChange={e => setLetterContent(e.target.value)}
                    placeholder="用慢下来的笔触，记下那些不好意思开口的浓浓情意..."
                    className="w-full px-4 py-3 rounded-xl border border-rose-100 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800 bg-white/60 leading-relaxed font-love-letter font-medium"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-rose-700">插入浪漫瞬间 (最多3张)</label>
                    <span className="text-[9px] text-rose-400 font-bold">{letterImages.length} / 3</span>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {letterImages.map((file, idx) => (
                      <div key={idx} className="relative w-12 h-12 rounded-lg border border-rose-100 overflow-hidden shadow-2xs group flex-shrink-0">
                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                        <button
                          type="button"
                          onClick={() => removeLetterImage(idx)}
                          className="absolute -top-1 -right-1 p-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {letterImages.length < 3 && (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileChangeLetters}
                          id="letter-image-upload"
                          className="hidden"
                        />
                        <label
                          htmlFor="letter-image-upload"
                          className="w-12 h-12 rounded-lg border-2 border-dashed border-rose-200 hover:border-rose-400 flex flex-col items-center justify-center text-rose-400 hover:text-rose-600 transition cursor-pointer bg-rose-50/20"
                        >
                          <ImageIcon size={16} />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lock Option */}
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">时光锁死开启日期 (可选，留空则寄出立即可读)</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowLetterDatePicker(!showLetterDatePicker)}
                      className="w-full px-4 py-2.5 border border-rose-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 text-xs font-semibold text-rose-800 bg-white/60 text-left hover:bg-rose-50/20 transition flex items-center justify-between"
                    >
                      <span className="flex items-center">
                        <Calendar size={14} className="text-rose-400 mr-2.5" />
                        {letterUnlockAt ? formatLetterDisplayDateTime(letterUnlockAt) : '年 / 月 / 日 -- : --'}
                      </span>
                    </button>

                    {showLetterDatePicker && (
                      <>
                        {/* Backdrop to close the popover */}
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowLetterDatePicker(false)}
                        />
                        <div className="fixed left-3 right-3 bottom-[72px] p-4 bg-white/97 backdrop-blur-md border border-rose-100/80 rounded-2xl shadow-2xl z-50 animate-slide-up space-y-3 max-h-[60vh] overflow-y-auto">
                          {/* Calendar Header */}
                          <div className="flex justify-between items-center pb-2 border-b border-rose-100/50">
                            <button
                              type="button"
                              onClick={() => {
                                let newMonth = letterCalendarMonth - 1;
                                let newYear = letterCalendarYear;
                                if (newMonth < 0) {
                                  newMonth = 11;
                                  newYear -= 1;
                                }
                                setLetterCalendarMonth(newMonth);
                                setLetterCalendarYear(newYear);
                              }}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 text-[10px] font-bold"
                            >
                              ◀
                            </button>
                            <div className="flex space-x-1">
                              <span className="text-xs font-black text-rose-800">{letterCalendarYear}年 {monthsList[letterCalendarMonth]}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                let newMonth = letterCalendarMonth + 1;
                                let newYear = letterCalendarYear;
                                if (newMonth > 11) {
                                  newMonth = 0;
                                  newYear += 1;
                                }
                                setLetterCalendarMonth(newMonth);
                                setLetterCalendarYear(newYear);
                              }}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 text-[10px] font-bold"
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
                            {getLetterDaysInMonth(letterCalendarYear, letterCalendarMonth).map((item, idx) => {
                              let targetYear = letterCalendarYear;
                              let targetMonth = letterCalendarMonth + item.monthOffset;
                              if (targetMonth < 0) {
                                targetMonth = 11;
                                targetYear -= 1;
                              } else if (targetMonth > 11) {
                                targetMonth = 0;
                                targetYear += 1;
                              }
                              const isSelected = letterSelectedDay === item.day && letterCalendarMonth === targetMonth && letterCalendarYear === targetYear;
                              
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  disabled={!item.isCurrentMonth}
                                  onClick={() => {
                                    setLetterSelectedDay(item.day);
                                    updateLetterUnlockAt(targetYear, targetMonth, item.day, letterSelectedHour, letterSelectedMinute);
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
                              锁定开启时间
                            </span>
                            
                            <div className="flex space-x-3 items-center">
                              <div className="flex-1 space-y-0.5">
                                <span className="text-[8px] font-bold text-rose-400 block text-center">小时 (时)</span>
                                <select
                                  value={letterSelectedHour}
                                  onChange={(e) => {
                                    const hour = parseInt(e.target.value, 10);
                                    setLetterSelectedHour(hour);
                                    updateLetterUnlockAt(letterCalendarYear, letterCalendarMonth, letterSelectedDay, hour, letterSelectedMinute);
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
                                  value={letterSelectedMinute}
                                  onChange={(e) => {
                                    const min = parseInt(e.target.value, 10);
                                    setLetterSelectedMinute(min);
                                    updateLetterUnlockAt(letterCalendarYear, letterCalendarMonth, letterSelectedDay, letterSelectedHour, min);
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
                                setLetterUnlockAt('');
                                setShowLetterDatePicker(false);
                              }}
                              className="px-2.5 py-1 text-[9px] font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            >
                              立即寄出 (不锁死)
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowLetterDatePicker(false)}
                              className="px-3.5 py-1 text-[9px] font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition shadow-md"
                            >
                              确定
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {loading && letterUploadProgress > 0 && (
                  <div className="w-full bg-rose-100/40 rounded-full h-1.5 overflow-hidden shadow-inner">
                    <div className="bg-rose-500 h-full rounded-full transition-all duration-300" style={{ width: `${letterUploadProgress}%` }} />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 px-4 rounded-xl transition active:scale-95 disabled:opacity-50 text-xs flex items-center justify-center space-x-1"
                >
                  <Send size={14} />
                  <span>{loading ? '正在盖印寄出...' : '悄悄寄出 (火漆盖印) ✉️'}</span>
                </button>
              </form>
            )}

            {/* Letters list stream */}
            <div className="space-y-4">
              {loadingLetters ? (
                <div className="text-center py-8 text-rose-600/60 font-bold text-xs animate-pulse">
                  📜 正在开启两人的时光情书阁...
                </div>
              ) : letters.length === 0 ? (
                <div className="glass-panel rounded-3xl p-8 text-center text-rose-700/60 select-none relative overflow-hidden animate-slide-up bg-white/45">
                  <div className="absolute w-24 h-24 rounded-full bg-rose-300/10 blur-xl top-0 left-0" />
                  <div className="absolute w-20 h-20 rounded-full bg-pink-300/10 blur-xl bottom-0 right-0" />
                  <div className="relative z-10 space-y-4">
                    <div className="w-16 h-16 bg-rose-50/50 rounded-2xl mx-auto flex items-center justify-center border border-rose-100 shadow-inner">
                      <span className="text-3xl animate-bounce">✉️</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-extrabold text-rose-800">还没有情书寄往这里</p>
                      <p className="text-xs text-rose-600/80 max-w-xs mx-auto leading-relaxed">
                        写信是慢下来的浪漫。您可以书写一封饱含深情长信寄给对方，还可以设置未来特定纪念日才能开启的“时光锁”。快为对方铺开信纸吧。
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                letters.map((letter) => {
                  const isMyLetter = letter.sender_id === currentUser?.id;
                  const sender = getProfile(letter.sender_id);
                  const isLocked = letter.unlock_at ? new Date() < new Date(letter.unlock_at) : false;
                  
                  const cardThemes: Record<string, { border: string, bg: string, text: string }> = {
                    vintage: { border: 'border-[#e6d3af]/60', bg: 'bg-[#fcf8f2]/95 backdrop-blur-xs', text: 'text-[#5c4b37]' },
                    sunset: { border: 'border-[#ffd4c4]/60', bg: 'bg-[#fff3f5]/95 backdrop-blur-xs', text: 'text-[#7c3f35]' },
                    starry: { border: 'border-[#4c1d95]/40', bg: 'bg-[#1e1b4b]/90 backdrop-blur-xs', text: 'text-[#f5f3ff]' },
                    cherry: { border: 'border-[#ffaec0]/60', bg: 'bg-[#fff0f3]/95 backdrop-blur-xs', text: 'text-[#7c2d37]' }
                  };
                  const currentTheme = cardThemes[letter.theme] || cardThemes.vintage;

                  return (
                    <div
                      key={letter.id}
                      onClick={() => handleLetterClick(letter)}
                      className={`relative cursor-pointer transition-all duration-300 ${
                        isLocked && !isMyLetter
                          ? `animate-bottle-swing ${shakeLetterId === letter.id ? 'animate-shake-swing' : ''}`
                          : 'hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      {/* LOCKED STATE FOR RECIPIENT: CRYSTAL BOTTLE */}
                      {isLocked && !isMyLetter ? (
                        <div className="w-full p-6 bg-gradient-to-b from-white/30 to-white/10 backdrop-blur-md rounded-3xl border border-white/40 shadow-lg animate-bottle-glow flex flex-col items-center justify-center text-center relative overflow-hidden select-none">
                          <div className="absolute inset-0 bg-radial-gradient from-rose-200/10 via-transparent to-transparent pointer-events-none" />
                          
                          <div className="relative w-24 h-24 mb-3 flex items-center justify-center">
                            <Sparkles className="absolute top-2 right-2 text-amber-300 animate-pulse" size={14} />
                            
                            <svg className="w-full h-full text-white/85 drop-shadow-[0_4px_8px_rgba(251,113,133,0.3)]" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect x="44" y="8" width="12" height="10" rx="2" fill="#d97706" fillOpacity="0.85" />
                              <path d="M40 18 H60 V32 H40 Z" fill="url(#bottleGrad)" stroke="white" strokeWidth="2" strokeOpacity="0.8" />
                              <path d="M25 45 Q20 45 20 55 V100 Q20 112 32 112 H68 Q80 112 80 100 V55 Q80 45 75 45 Q65 40 65 32 H35 Q35 40 25 45 Z" fill="url(#bottleGrad)" stroke="white" strokeWidth="2.5" strokeOpacity="0.85" />
                              <ellipse cx="50" cy="100" rx="22" ry="7" fill="#fda4af" fillOpacity="0.25" />
                              
                              <path d="M38 55 Q42 52 46 55 L58 88 Q54 92 50 88 Z" fill="#fef3c7" stroke="#b45309" strokeWidth="1" />
                              <rect x="44" y="68" width="8" height="3" rx="1" fill="#dc2626" />
                              <path d="M46 71 Q44 75 40 73 M48 71 Q52 75 56 72" stroke="#dc2626" strokeWidth="1" />

                              <defs>
                                <linearGradient id="bottleGrad" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="white" stopOpacity="0.35" />
                                  <stop offset="40%" stopColor="white" stopOpacity="0.1" />
                                  <stop offset="100%" stopColor="#fda4af" stopOpacity="0.25" />
                                </linearGradient>
                              </defs>
                            </svg>
                          </div>

                          <div className="space-y-1 relative z-10">
                            <span className="inline-block bg-rose-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full mb-1">
                              时光锁信件 ⏳
                            </span>
                            <h4 className="text-xs font-bold text-rose-800">一封寄给未来的情书</h4>
                            <p className="text-[10px] text-rose-600/70 font-semibold flex items-center justify-center space-x-1 pt-1">
                              <span>🔒 倒计时可读：</span>
                              <span className="text-rose-700 font-bold bg-white/60 px-1.5 py-0.5 rounded-md border border-rose-100 shadow-2xs font-mono">
                                {getLetterCountdown(letter.unlock_at)}
                              </span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* UNLOCKED OR OWN LETTER: REVEALED ENVELOPE CARD */
                        <div className={`w-full p-5 rounded-3xl border ${currentTheme.border} ${currentTheme.bg} shadow-md relative overflow-hidden flex flex-col justify-between min-h-[145px]`}>
                          <div className="absolute top-0 right-0 w-8 h-8 opacity-20 border-l border-b border-current pointer-events-none" style={{ borderRadius: '0 0 0 16px' }} />
                          
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center space-x-2">
                                <Mail size={15} className="text-rose-500 shrink-0" />
                                <span className="text-xs font-extrabold truncate max-w-[180px] text-rose-900">
                                  {letter.title}
                                </span>
                              </div>
                              <span className="text-[8px] opacity-75 font-mono text-rose-800/80">
                                {new Date(letter.created_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                              </span>
                            </div>

                            <p className="text-[10px] font-medium line-clamp-3 leading-relaxed opacity-85 break-all font-love-letter">
                              {letter.content}
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-current/10 flex justify-between items-center text-[9px] font-semibold opacity-85">
                            <div className="flex items-center space-x-1.5">
                              <div className="w-4 h-4 rounded-full overflow-hidden bg-rose-50 border border-current/20 flex items-center justify-center shrink-0">
                                {sender?.avatar_url ? (
                                  <img src={sender.avatar_url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <User size={8} className="text-rose-400" />
                                )}
                              </div>
                              <span className="truncate max-w-[100px]">
                                {isMyLetter ? '我寄出的情书' : `${sender?.nickname || '伴侣'} 寄的信`}
                              </span>
                              {!isMyLetter && !letter.is_read && (
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse ml-1" />
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {letter.unlock_at && (
                                <span className="bg-amber-100/50 border border-amber-200/50 text-amber-800 text-[8px] font-bold px-1.5 py-0.2 rounded-md">
                                  ⏳ 时光解锁信
                                </span>
                              )}
                              {isMyLetter && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLetter(letter.id, letter.images);
                                  }}
                                  className="p-1 text-rose-500 hover:text-rose-700 transition"
                                  title="撤回报废信件"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Paper Airplane Submission Overlay */}
      {isSendingAirplane && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-xs z-[999] flex flex-col items-center justify-center animate-fade-in">
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-rose-100/50 shadow-2xl flex flex-col items-center space-y-4 text-center max-w-xs mx-4 animate-slide-up">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100/50 shadow-inner">
              <span className="text-4xl animate-bounce">✈️</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-rose-800">心事投递中...</p>
              <p className="text-[10px] text-rose-600/80">正在将心里话装入纸飞机，飞往 Ta 的身边...</p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] max-w-xs w-full px-4 animate-fade-in pointer-events-none">
          <div className={`glass-panel p-4 rounded-2xl shadow-xl border flex items-center space-x-3 backdrop-blur-md transition-all duration-300 pointer-events-auto ${
            toast.type === 'error' 
              ? 'border-red-200 bg-red-50/90 text-red-800' 
              : toast.type === 'info'
              ? 'border-blue-200 bg-blue-50/90 text-blue-800'
              : 'border-rose-200 bg-rose-50/90 text-rose-800'
          }`}>
            <span className="text-lg">
              {toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✨'}
            </span>
            <p className="text-xs font-semibold leading-snug">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Fullscreen Opened Love Letter Detail View */}
      {selectedLetter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex flex-col items-center justify-center p-6 animate-fade-in">
          {/* Visual background falling elements depending on theme */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {selectedLetter.theme === 'cherry' && Array.from({ length: 15 }).map((_, i) => (
              <div 
                key={i} 
                className="sakura-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  width: `${8 + Math.random() * 8}px`,
                  height: `${8 + Math.random() * 8}px`,
                  animationDelay: `${Math.random() * 4}s`,
                  animationDuration: `${5 + Math.random() * 5}s`
                }}
              />
            ))}
            {selectedLetter.theme === 'starry' && Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i} 
                className="star-twinkle absolute bg-white rounded-full animate-twinkle opacity-70"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 2 + 1}px`,
                  height: `${Math.random() * 2 + 1}px`,
                  animationDelay: `${Math.random() * 3}s`
                }}
              />
            ))}
          </div>

          {/* Letter Frame card */}
          <div 
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl relative z-10 border max-h-[80vh] overflow-y-auto flex flex-col justify-between animate-scale-up ${
              selectedLetter.theme === 'cherry' ? 'letter-theme-cherry' :
              selectedLetter.theme === 'sunset' ? 'letter-theme-sunset' :
              selectedLetter.theme === 'starry' ? 'letter-theme-starry' : 'letter-theme-vintage'
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-current/10 mb-4 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Mail size={16} />
                  <span className="text-xs font-bold font-mono">
                    {new Date(selectedLetter.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedLetter(null)}
                  className="p-1 rounded-full hover:bg-current/10 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Letter Title */}
              <h3 className="text-base font-extrabold text-center mb-4 tracking-wider">
                {selectedLetter.title}
              </h3>

              {/* Letter Content */}
              <p className="text-xs leading-loose break-all whitespace-pre-wrap font-love-letter font-medium text-justify select-text">
                {selectedLetter.content}
              </p>

              {/* Polaroid Photos Wall inside letter */}
              {selectedLetter.images && selectedLetter.images.length > 0 && (
                <div className="mt-6 pt-4 border-t border-current/10 space-y-4">
                  <p className="text-[10px] font-bold text-center tracking-widest opacity-80 mb-2">📸 纸短情长 · 浪漫定格</p>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedLetter.images.map((url: string, idx: number) => (
                      <div key={idx} className="bg-white p-2.5 pb-6 rounded-lg shadow-md border border-gray-150 rotate-[-1.5deg] hover:rotate-[1.5deg] transition duration-300 w-11/12 mx-auto text-gray-700">
                        <div className="w-full aspect-[4/3] overflow-hidden rounded-md border border-gray-100">
                          <img src={url} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="text-center pt-3 text-[8px] font-mono text-gray-500 tracking-wide font-extrabold">
                          MOMENTS #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Letter Footer */}
            <div className="mt-8 pt-3 border-t border-current/10 flex justify-between items-center text-[10px] font-bold opacity-80 flex-shrink-0">
              <span className="italic">邮戳：两人的专属信阁</span>
              <span>
                寄信人：{profiles.find(p => p.id === selectedLetter.sender_id)?.nickname || '伴侣'}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[1000] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel max-w-xs w-full p-6 rounded-3xl border border-rose-100/50 shadow-2xl space-y-4 animate-slide-up text-center bg-white/95">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-inner mx-auto">
              <span className="text-2xl">❓</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-rose-800">{confirmModal.title}</h3>
              <p className="text-[10px] text-rose-600/80 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
                className="flex-1 py-2 text-xs font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition active:scale-95"
              >
                取消
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal((prev) => ({ ...prev, show: false }));
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition active:scale-95 shadow-md shadow-rose-200"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
