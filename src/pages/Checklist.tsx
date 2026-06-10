import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ListTodo, CheckCircle2, Circle, Calendar, Edit3, X, Sparkles, Trash2, Heart, Plus, FileText, ChevronLeft, ChevronRight, Settings, Image } from 'lucide-react';
import { TimeMachineModal } from '../components/TimeMachineModal';
import { 
  useChecklistData 
} from '../hooks/useChecklistData';
import type { DBChecklistItem, CompletionItem, DBCategoryItem } from '../hooks/useChecklistData';

// Calendar Date Picker Helpers
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

const getStoragePathFromUrl = (url: string): string => {
  const matchStr = '/storage/v1/object/public/media/';
  const idx = url.indexOf(matchStr);
  if (idx !== -1) {
    return url.substring(idx + matchStr.length);
  }
  const parts = url.split('/');
  return parts[parts.length - 1];
};

export const Checklist: React.FC = () => {
  const {
    currentUser,
    profiles,
    items,
    completions,
    logs,
    hasUnreadLogs,
    setHasUnreadLogs,
    loading,
    rawCategories,
    dbCategories,
    loveWishes,
    checklistUploading,
    checklistUploadProgress,
    toast,
    setToast,
    getNickname,
    handleAddWish,
    handleClaimWish,
    handleAchieveWish,
    handleDeleteWish,
    handleCreateCategory,
    handleSaveCategoryName,
    handleDeleteCategory,
    handleCreateItem,
    handleUpdateItem,
    handleDeleteItem,
    handleCompleteItem,
    handleEditCompletion,
    handleDeleteCompletion,
  } = useChecklistData();

  const wishUploading = checklistUploading;

  // Navigation / Filter state
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<DBChecklistItem | null>(null);
  const [modalDate, setModalDate] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [createDropOpen, setCreateDropOpen] = useState(false);
  const [editDropOpen, setEditDropOpen] = useState(false);

  // Completion timeline and repeat check-in states
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [editingCompDate, setEditingCompDate] = useState('');
  const [editingCompNotes, setEditingCompNotes] = useState('');
  const [showAgainForm, setShowAgainForm] = useState(false);

  // Media upload local file states for checklist completion
  const [checklistMediaFiles, setChecklistMediaFiles] = useState<File[]>([]);

  // States for editing completion media
  const [editingCompMediaUrls, setEditingCompMediaUrls] = useState<string[]>([]);
  const [editingNewMediaFiles, setEditingNewMediaFiles] = useState<File[]>([]);

  // States for zoom / lightbox preview
  const [zoomImages, setZoomImages] = useState<string[]>([]);
  const [zoomIndex, setZoomIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Category management states
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [confirmDeleteCategoryOpen, setConfirmDeleteCategoryOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<DBCategoryItem | null>(null);

  // Custom Item Definition Modal (Create)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCategory, setCreateCategory] = useState('美食与日常饮食');
  const [createIcon, setCreateIcon] = useState('❤️');

  // Edit Item Definition Modal (Update)
  const [editDefOpen, setEditDefOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editIcon, setEditIcon] = useState('');

  // Activity Logs Drawer Modal
  const [logsOpen, setLogsOpen] = useState(false);

  // Delete item confirming state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteCompOpen, setConfirmDeleteCompOpen] = useState(false);
  const [compToDelete, setCompToDelete] = useState<CompletionItem | null>(null);
  const [deleteCompIndex, setDeleteCompIndex] = useState<number | null>(null);

  const [timeMachineOpen, setTimeMachineOpen] = useState(false);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);

  // Wishlist States
  const [activeTab, setActiveTab] = useState<'checklist' | 'wishlist'>('checklist');
  const [wishModalOpen, setWishModalOpen] = useState(false);
  const [wishTitle, setWishTitle] = useState('');
  const [wishExpectation, setWishExpectation] = useState(3);
  const [wishImageUrl, setWishImageUrl] = useState('');
  const [wishMediaFile, setWishMediaFile] = useState<File | null>(null);

  // Swipe Handlers for Lightbox Touch Gestures
  const touchStartX = React.useRef(0);
  const touchEndX = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (zoomImages.length <= 1) return;
    const threshold = 50;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > threshold) {
      setZoomIndex((prev) => (prev === zoomImages.length - 1 ? 0 : prev + 1));
    } else if (diff < -threshold) {
      setZoomIndex((prev) => (prev === 0 ? zoomImages.length - 1 : prev - 1));
    }
  };

  // Toast autoclose
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, setToast]);

  // Anniversary Auto-Trigger Effect
  useEffect(() => {
    if (!currentUser || hasAutoTriggered) return;

    const checkAnniversary = async () => {
      try {
        const { data } = await supabase
          .from('couple_config')
          .select('anniversary_date')
          .eq('id', '00000000-0000-0000-0000-000000000000')
          .single();
        if (data && data.anniversary_date) {
          const together = new Date(data.anniversary_date);
          const today = new Date();
          if (today.getDate() === together.getDate()) {
            setTimeMachineOpen(true);
            setHasAutoTriggered(true);
          }
        }
      } catch (err) {
        console.error('Error checking anniversary:', err);
      }
    };
    checkAnniversary();
  }, [currentUser, hasAutoTriggered]);

  // UI Event Handlers mapping to Hook Mutations
  const onAddWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishTitle.trim()) return;
    try {
      await handleAddWish(wishTitle, wishExpectation, wishImageUrl, wishMediaFile);
      setWishTitle('');
      setWishExpectation(3);
      setWishImageUrl('');
      setWishMediaFile(null);
      setWishModalOpen(false);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await handleCreateCategory(newCategoryName);
    setNewCategoryName('');
  };

  const onSaveCategoryName = async (cat: DBCategoryItem) => {
    if (!editingCategoryName.trim()) return;
    await handleSaveCategoryName(cat, editingCategoryName);
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const onDeleteCategoryConfirm = async () => {
    if (!categoryToDelete) return;
    const categoryItems = items.filter(it => it.category === categoryToDelete.name);
    for (const item of categoryItems) {
      const itemComps = completions.filter(c => c.item_id === item.id);
      for (const comp of itemComps) {
        if (comp.media && comp.media.length > 0) {
          const fileNames = comp.media.map((url) => getStoragePathFromUrl(url));
          await supabase.storage.from('media').remove(fileNames).catch(console.error);
        }
      }
    }
    await handleDeleteCategory(categoryToDelete);
    setConfirmDeleteCategoryOpen(false);
    setCategoryToDelete(null);
  };

  const handleCreateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    await handleCreateItem(createName, createCategory, createIcon);
    setCreateName('');
    setCreateIcon('❤️');
    setCreateModalOpen(false);
  };

  const onSaveItemDefinition = async () => {
    if (!activeItem || !editName.trim()) return;
    await handleUpdateItem(activeItem.id, editName, editCategory, editIcon);
    setEditDefOpen(false);
    setCompletionModalOpen(false);
  };

  const onDeleteItemDefinition = async () => {
    if (!activeItem) return;
    const itemComps = completions.filter((c) => c.item_id === activeItem.id);
    for (const comp of itemComps) {
      if (comp.media && comp.media.length > 0) {
        const fileNames = comp.media.map((url) => getStoragePathFromUrl(url));
        await supabase.storage.from('media').remove(fileNames).catch(console.error);
      }
    }
    await handleDeleteItem(activeItem.id, activeItem.name);
    setConfirmDeleteOpen(false);
    setEditDefOpen(false);
    setCompletionModalOpen(false);
  };

  const handleCardClick = (item: DBChecklistItem) => {
    setActiveItem(item);
    setChecklistMediaFiles([]);
    
    const itemComps = completions.filter((c) => c.item_id === item.id);
    const sortedComps = [...itemComps].sort((a, b) => b.completed_at.localeCompare(a.completed_at));
    const latestComp = sortedComps[0];
    const dateToParse = latestComp ? latestComp.completed_at : new Date().toISOString().split('T')[0];
    
    if (latestComp) {
      setModalDate(latestComp.completed_at);
      setModalNotes(latestComp.notes || '');
    } else {
      const now = new Date();
      const offset = now.getTimezoneOffset();
      const localToday = new Date(now.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
      setModalDate(localToday);
      setModalNotes('');
    }

    const parts = dateToParse.split('-');
    if (parts.length === 3) {
      setCalendarYear(parseInt(parts[0], 10));
      setCalendarMonth(parseInt(parts[1], 10) - 1);
    }
    setShowDatePicker(false);
    setEditDropOpen(false);
    setEditingCompId(null);
    setShowAgainForm(false);
    setCompletionModalOpen(true);
  };

  const onSaveCompletion = async () => {
    if (!activeItem) return;
    await handleCompleteItem(activeItem.id, activeItem.name, modalDate, modalNotes, checklistMediaFiles);
    setCompletionModalOpen(false);
    setShowAgainForm(false);
    setModalNotes('');
    setChecklistMediaFiles([]);
  };

  const onUpdateSingleCompletion = async (compId: string, _originalDate: string) => {
    if (!activeItem) return;
    const originalComp = completions.find(c => c.id === compId);
    if (originalComp && originalComp.media && originalComp.media.length > 0) {
      const deletedUrls = originalComp.media.filter(url => !editingCompMediaUrls.includes(url));
      if (deletedUrls.length > 0) {
        const fileNames = deletedUrls.map((url) => getStoragePathFromUrl(url));
        await supabase.storage.from('media').remove(fileNames).catch(console.error);
      }
    }
    await handleEditCompletion(compId, editingCompDate, editingCompNotes, editingCompMediaUrls, editingNewMediaFiles, activeItem.name);
    setEditingCompId(null);
    setEditingNewMediaFiles([]);
  };

  const handleDeleteSingleCompletion = async (comp: CompletionItem) => {
    if (!activeItem) return;
    await handleDeleteCompletion(comp, activeItem.name);
  };

  useEffect(() => {
    if (dbCategories.length > 0 && selectedCategory !== '全部' && !dbCategories.includes(selectedCategory)) {
      setSelectedCategory('全部');
    }
  }, [dbCategories, selectedCategory]);

  useEffect(() => {
    if (dbCategories.length > 0) {
      if (!dbCategories.includes(createCategory)) {
        setCreateCategory(dbCategories[0]);
      }
      if (!dbCategories.includes(editCategory)) {
        setEditCategory(dbCategories[0]);
      }
    }
  }, [dbCategories, createCategory, editCategory]);

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === '全部' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalCount = items.length;
  const uniqueCompletedCount = new Set(completions.map(c => c.item_id)).size;
  const progressPercent = totalCount > 0 ? Math.round((uniqueCompletedCount / totalCount) * 100) : 0;

  // Calculate TOP 5 repeated completed items
  const getTop5RepeatedItems = () => {
    const counts: { [key: string]: number } = {};
    completions.forEach((c) => {
      counts[c.item_id] = (counts[c.item_id] || 0) + 1;
    });

    const sorted = Object.keys(counts)
      .map((id) => {
        const item = items.find((it) => it.id === id);
        return {
          id,
          count: counts[id],
          name: item?.name || '未知项目',
          icon: item?.icon || '❤️',
        };
      })
      .filter((it) => it.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return sorted;
  };

  const top5Items = getTop5RepeatedItems();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#fdf6f0] via-[#fee4e6] to-[#fceade]">
        <div className="w-16 h-16 rounded-2xl bg-white/85 border border-rose-100 shadow-md flex items-center justify-center animate-glow-breath mb-4">
          <Heart className="text-rose-500 animate-pulse" size={30} fill="currentColor" />
        </div>
        <p className="text-xs text-rose-700/80 font-bold tracking-wider animate-pulse">正在加载清单数据...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 max-w-md mx-auto relative min-h-screen pb-32">
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-base sm:text-xl font-bold text-rose-800 flex items-center space-x-1.5 shrink-0">
          <ListTodo size={18} className="text-rose-500" />
          <span>{activeTab === 'checklist' ? '恋爱 100 件事清单' : '悄悄话愿望清单'}</span>
        </h1>
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => {
              setLogsOpen(true);
              const now = new Date().toISOString();
              localStorage.setItem('checklist_logs_last_viewed', now);
              setHasUnreadLogs(false);
              window.dispatchEvent(new Event('checklist_logs_read'));
            }}
            className="p-2 bg-rose-50 hover:bg-rose-100/80 text-rose-600 rounded-full border border-rose-100 transition active:scale-95 shadow-xs relative"
            title="查看修改动态"
          >
            <FileText size={14} />
            {hasUnreadLogs && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-white animate-pulse" />
            )}
          </button>

          {activeTab === 'checklist' ? (
            <>
              <button
                onClick={() => setCategoriesModalOpen(true)}
                className="p-2 bg-rose-50 hover:bg-rose-100/80 text-rose-600 rounded-full border border-rose-100 transition active:scale-95 shadow-xs"
                title="分类管理"
              >
                <Settings size={14} />
              </button>
              <button
                onClick={() => {
                  setCreateDropOpen(false);
                  setCreateModalOpen(true);
                }}
                className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition active:scale-95 shadow-xs flex items-center justify-center"
                title="添加自定义清单项"
              >
                <Plus size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setWishModalOpen(true)}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition active:scale-95 shadow-xs flex items-center space-x-1 text-[11px] font-black"
              title="许下新愿望"
            >
              <Plus size={12} />
              <span>许下心愿</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-rose-100/30 p-1 rounded-2xl mb-4.5 border border-rose-200/20">
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'checklist'
              ? 'bg-white text-rose-700 shadow-xs border border-rose-200/10'
              : 'text-rose-500/80 hover:text-rose-600'
          }`}
        >
          <span>💯 恋爱打卡</span>
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'wishlist'
              ? 'bg-white text-rose-700 shadow-xs border border-rose-200/10'
              : 'text-rose-500/80 hover:text-rose-600'
          }`}
        >
          <span>🎁 心愿盲盒</span>
        </button>
      </div>

      {activeTab === 'checklist' ? (
        <>
          {/* Progress Card */}
          <div className="glass-panel p-5 rounded-3xl border border-rose-100/50 shadow-md mb-4 text-center relative overflow-hidden">
            {/* Floating background heart */}
            <div className="absolute -right-4 -bottom-4 text-rose-100/30 scale-150 rotate-12 pointer-events-none">
              <Heart size={80} fill="currentColor" />
            </div>

            <div className="relative z-10 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold text-rose-700/80">打卡解锁进度</span>
                <span className="text-sm font-black text-rose-600">{progressPercent}%</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-rose-100/40 rounded-full h-3 border border-rose-200/20 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-pink-400 to-rose-500 h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-rose-500/80">
                <span>已打卡：{uniqueCompletedCount} 件</span>
                <span>总清单：{totalCount} 件</span>
              </div>
            </div>
          </div>

          {/* Time Machine Banner Card */}
          <div 
            onClick={() => setTimeMachineOpen(true)}
            className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md active:scale-98 transition cursor-pointer mb-5 group"
          >
            {/* Background light shapes */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
              <Heart size={48} fill="currentColor" className="animate-pulse" />
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xs font-black tracking-wide flex items-center">
                  <span className="text-sm mr-1.5">⏰</span>
                  恋爱时光机
                </h3>
                <p className="text-[9px] text-white/80 font-medium">
                  开启相伴的月度与年度回顾，体验双盲写情书 💌
                </p>
              </div>
              <div className="bg-white/20 hover:bg-white/30 text-[9px] font-black px-2.5 py-1 rounded-full border border-white/20 transition shrink-0 ml-2">
                进入时光机 ✨
              </div>
            </div>
          </div>

          {/* Dynamic Top 5 repeated items Card */}
          {top5Items.length > 0 && (
            <div className="glass-panel p-4.5 rounded-3xl border border-rose-100/50 shadow-md mb-5 relative overflow-hidden bg-gradient-to-tr from-rose-500/5 to-pink-500/10">
              <div className="relative z-10">
                <h3 className="text-xs font-black text-rose-800 flex items-center mb-3">
                  <Sparkles size={13} className="text-rose-500 mr-1 animate-pulse" />
                  🏆 甜蜜默契榜 (TOP 5 重复记忆)
                </h3>
                
                <div className="space-y-2">
                  {top5Items.map((item, idx) => {
                    const medals = ['🥇', '🥈', '🥉', '4th', '5th'];
                    return (
                      <div key={item.id} className="flex items-center justify-between text-xs bg-white/40 border border-rose-100/20 px-3.5 py-2 rounded-2xl hover:bg-white/60 transition">
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-bold text-rose-600/80">{medals[idx]}</span>
                          <span className="text-sm">{item.icon}</span>
                          <span className="font-bold text-rose-800 text-[11px]">{item.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100/30">
                          累计 {item.count} 次
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索打卡项目... (例如: 看电影)"
              className="w-full px-4 py-2.5 rounded-2xl border border-rose-100 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-800 bg-white/70 shadow-xs placeholder-rose-400/60"
            />
          </div>

          {/* Categories Horizontal Tabs */}
          <div className="flex overflow-x-auto gap-2 pb-3.5 scrollbar-none scroll-smooth -mx-4 px-4 mask-gradient-right">
            {['全部', ...dbCategories].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full border text-[10px] font-bold transition shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                    : 'bg-white/50 text-rose-700 border-rose-100 hover:bg-rose-50'
                }`}
              >
                {cat === '全部' ? '🔍 全部' : cat}
              </button>
            ))}
          </div>

          {/* Grid of Checklist Cards */}
          <div className="grid grid-cols-2 gap-3 mt-1.5">
            {filteredItems.map((item) => {
              const itemComps = completions.filter((c) => c.item_id === item.id);
              const isCompleted = itemComps.length > 0;
              const compCount = itemComps.length;
              
              const sortedComps = [...itemComps].sort((a, b) => b.completed_at.localeCompare(a.completed_at));
              const latestComp = sortedComps[0];

              return (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className={`glass-panel p-4 rounded-2xl border transition-all duration-300 active:scale-97 cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden select-none group ${
                    isCompleted
                      ? 'border-rose-300 bg-gradient-to-br from-rose-50/80 to-pink-100/40 animate-card-glow'
                      : 'border-dashed border-rose-200/40 bg-white/20 hover:bg-white/35 hover:border-rose-300/50 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Checkbox Icon or Completion Count */}
                  <div className="absolute top-2.5 right-2.5 flex items-center space-x-1">
                    {isCompleted ? (
                      <>
                        {compCount > 1 && (
                          <span className="text-[8px] bg-rose-500 text-white font-black px-1.5 py-0.5 rounded-full select-none transform scale-90 shadow-sm animate-pulse">
                            {compCount}次
                          </span>
                        )}
                        <div className="relative flex items-center justify-center">
                          <span className="absolute w-3.5 h-3.5 bg-rose-400/50 rounded-full animate-ping" />
                          <CheckCircle2 size={13} className="text-rose-500 fill-rose-50 drop-shadow-[0_0_3px_rgba(244,63,94,0.8)] relative z-10" />
                        </div>
                      </>
                    ) : (
                      <Circle size={13} className="text-rose-300/40 group-hover:text-rose-400/70 transition-colors" />
                    )}
                  </div>

                  {/* Goal Emoji & Label */}
                  <div className="space-y-1.5 pt-1">
                    <span className={`text-2xl filter transition-all duration-300 inline-block ${
                      isCompleted 
                        ? 'drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] scale-110' 
                        : 'grayscale-[20%] opacity-65 group-hover:grayscale-0 group-hover:opacity-100'
                    }`}>
                      {item.icon}
                    </span>
                    <h3 className={`text-xs font-bold leading-snug break-all transition-colors ${
                      isCompleted ? 'text-rose-800 font-extrabold' : 'text-rose-900/60 font-semibold'
                    }`}>
                      {item.name}
                    </h3>
                  </div>

                  {/* Accomplished Data notes info */}
                  {isCompleted && latestComp && (
                    <div className="border-t border-rose-100/50 pt-2 flex flex-col space-y-0.5 text-[8px] text-rose-600/80">
                      <span className="flex items-center space-x-0.5 font-bold">
                        <Calendar size={8} />
                        <span>{latestComp.completed_at.replace(/-/g, '/')}</span>
                      </span>
                      {latestComp.notes && (
                        <span className="truncate max-w-[100%] font-semibold italic text-rose-500">
                          "{latestComp.notes}"
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty Search matches state */}
          {filteredItems.length === 0 && (
            <div className="glass-panel rounded-3xl p-10 text-center text-rose-700/60 relative overflow-hidden animate-slide-up mt-4">
              <span className="text-3xl animate-bounce inline-block mb-3">🔍</span>
              <p className="text-xs font-bold text-rose-800">未找到匹配的恋爱项目</p>
              <p className="text-[10px] text-rose-500/80 mt-1">您可以点击右上角 “➕” 添加一个自定义的目标！</p>
            </div>
          )}
        </>
      ) : (
        /* Wishlist View Panel */
        <div className="space-y-4">
          <div className="bg-gradient-to-tr from-pink-400/5 to-rose-500/10 border border-rose-100/30 p-4 rounded-3xl text-center relative overflow-hidden shadow-xs">
            <span className="text-2xl">🌠</span>
            <h3 className="text-xs font-black text-rose-800 mt-1">心愿盲盒规则</h3>
            <p className="text-[9px] text-rose-600/70 mt-1.5 leading-relaxed max-w-[90%] mx-auto font-medium">
              写下你想要的小心愿，对方能立刻看到并可以点击“悄悄认领”。认领状态会对你**绝对保密**，直到心愿达成，制造满满的仪式感与惊喜！✨
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {loveWishes.length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center text-rose-700/60 border border-dashed border-rose-200 bg-white/15">
                <span className="text-3xl inline-block mb-2">🎁</span>
                <p className="text-xs font-bold text-rose-800">还没有人许愿哦</p>
                <p className="text-[10px] text-rose-500/70 mt-1">点击右上角“许下心愿”写下第一个期待吧！</p>
              </div>
            ) : (
              loveWishes.map((wish) => {
                const isMine = wish.creator_id === currentUser?.id;
                const creatorName = isMine ? '我' : getNickname(wish.creator_id);
                
                // Secret logic: if it is mine and status is 'claimed', show it as 'pending' (Secret!)
                const visibleStatus = (isMine && wish.status === 'claimed') ? 'pending' : wish.status;

                return (
                  <div
                    key={wish.id}
                    className={`glass-panel p-4.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-3.5 relative overflow-hidden ${
                      wish.status === 'achieved'
                        ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-teal-50/20'
                        : isMine
                          ? 'border-rose-100/80 bg-gradient-to-br from-rose-50/30 to-pink-50/10'
                          : 'border-blue-100/80 bg-gradient-to-br from-blue-50/30 to-indigo-50/10'
                    }`}
                  >
                    {/* Card Top: Owner tag & star ranking */}
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border ${
                        wish.status === 'achieved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : isMine
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {creatorName} 的心愿
                      </span>
                      <div className="flex space-x-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-[9px] ${i < wish.expectation ? 'text-amber-400' : 'text-gray-300'}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card Middle: Content & optional image */}
                    <div className="flex items-start space-x-3">
                      {wish.image_url && (
                        <img
                          src={wish.image_url}
                          onClick={() => {
                            setZoomImages([wish.image_url]);
                            setZoomIndex(0);
                            setLightboxOpen(true);
                          }}
                          className="w-16 h-16 rounded-xl object-cover border border-rose-100/50 shadow-inner flex-shrink-0 cursor-zoom-in"
                          alt="wish item reference"
                        />
                      )}
                      <div className="flex-grow space-y-1">
                        <p className="text-xs font-bold text-rose-950 leading-relaxed break-all">
                          {wish.title}
                        </p>
                        <p className="text-[8px] text-rose-500/50 font-semibold">
                          许愿于: {new Date(wish.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Card Bottom: Actions depending on owner & status */}
                    <div className="flex justify-between items-center border-t border-rose-100/20 pt-3 flex-wrap gap-2">
                      <div className="flex items-center space-x-1">
                        {visibleStatus === 'pending' && (
                          <span className="text-[10px] text-rose-500/80 font-bold flex items-center">
                            <span className="text-xs mr-1">⏳</span> 许愿中
                          </span>
                        )}
                        {wish.status === 'claimed' && !isMine && (
                          <span className="text-[10px] text-blue-500 font-extrabold flex items-center">
                            <span className="text-xs mr-1">🎁</span> 筹备中 (已被我悄悄认领)
                          </span>
                        )}
                        {wish.status === 'achieved' && (
                          <span className="text-[10px] text-emerald-600 font-black flex items-center">
                            <span className="text-xs mr-1">🎉</span> 已实现
                            {wish.achieved_at && (
                              <span className="text-[9px] text-emerald-500/60 font-semibold ml-1.5">
                                ({new Date(wish.achieved_at).toLocaleDateString()})
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 ml-auto">
                        {/* Delete/Withdraw: Creator can delete if not claimed (to prevent breaking surprises, but actually we let creator delete if pending/claimed since they don't know it is claimed) */}
                        {isMine && wish.status !== 'achieved' && (
                          <button
                            onClick={() => {
                              (window as any).showCustomConfirm('撤销心愿', '确认撤销这个愿望吗？', () => {
                                handleDeleteWish(wish);
                              });
                            }}
                            className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="撤销心愿"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                        {/* Partner Action: Claim */}
                        {!isMine && wish.status === 'pending' && (
                          <button
                            onClick={() => handleClaimWish(wish)}
                            className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] rounded-full transition active:scale-95 shadow-xs flex items-center space-x-1"
                          >
                            <span>悄悄认领</span>
                          </button>
                        )}

                        {/* Partner Action: Complete */}
                        {!isMine && wish.status === 'claimed' && (
                          <button
                            onClick={() => handleAchieveWish(wish)}
                            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] rounded-full transition active:scale-95 shadow-xs flex items-center space-x-1"
                          >
                            <span>实现愿望</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Complete Item & Notes Details Editor */}
      {completionModalOpen && activeItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[1000] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-rose-100/50 shadow-2xl space-y-4 animate-slide-up bg-white/95 relative max-h-[90vh] overflow-y-auto">
            {/* Close */}
            <button
              onClick={() => setCompletionModalOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-full transition"
            >
              <X size={14} />
            </button>

            {/* Header info */}
            <div className="flex items-center justify-between border-b border-rose-50 pb-2.5 pr-8">
              <div className="flex items-center space-x-2 text-rose-800 font-bold">
                <span className="text-2xl">{activeItem.icon}</span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-rose-500/80">
                    {activeItem.is_preset ? '官方预设' : '自定义事项'} · {activeItem.category}
                  </span>
                  <span className="text-sm font-extrabold">{activeItem.name}</span>
                </div>
              </div>
              
              {/* Gear / Option button to edit definition */}
              <button
                onClick={() => {
                  setEditName(activeItem.name);
                  setEditCategory(activeItem.category);
                  setCreateIcon(activeItem.icon); // reusing icon preview helper
                  setEditIcon(activeItem.icon);
                  setEditDefOpen(true);
                }}
                className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-[10px] font-bold flex items-center space-x-0.5 border border-rose-100/50"
                title="修改清单事项名称/图标"
              >
                <span>编辑事项</span>
              </button>
            </div>

            {/* Historical Footprints list (shown if itemComps.length > 0) */}
            {completions.filter((c) => c.item_id === activeItem.id).length > 0 && (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-rose-800 flex items-center">
                    <Heart size={10} fill="currentColor" className="mr-1 text-rose-500 animate-pulse" />
                    已累积打卡 {completions.filter((c) => c.item_id === activeItem.id).length} 次
                  </span>
                  {!showAgainForm && (
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const offset = now.getTimezoneOffset();
                        const localToday = new Date(now.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
                        setModalDate(localToday);
                        setModalNotes('');
                        setChecklistMediaFiles([]);
                        setShowAgainForm(true);
                      }}
                      className="px-2.5 py-1 text-[9px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition"
                    >
                      ➕ 再次打卡
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 border border-rose-100/30 rounded-2xl p-2.5 bg-rose-50/10 divide-y divide-rose-100/30">
                  {completions
                    .filter((c) => c.item_id === activeItem.id)
                    .sort((a, b) => b.completed_at.localeCompare(a.completed_at)) // sorted latest first
                    .map((comp, idx, arr) => {
                      const isEditing = editingCompId === comp.id;
                      const operatorName = getNickname(comp.completed_by);
                      const displayIndex = arr.length - idx;

                      return (
                        <div key={comp.id} className="pt-2 first:pt-0 flex flex-col space-y-1.5">
                          {isEditing ? (
                            <div className="space-y-2 w-full p-2 bg-rose-50/50 rounded-xl border border-rose-100/50">
                              <div>
                                <label className="block text-[8px] font-bold text-rose-700 mb-0.5">打卡日期</label>
                                <input
                                  type="date"
                                  value={editingCompDate}
                                  onChange={(e) => setEditingCompDate(e.target.value)}
                                  className="w-full px-2 py-1 text-[10px] border border-rose-100 rounded-lg text-rose-800 bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-bold text-rose-700 mb-0.5">纪念笔记</label>
                                <textarea
                                  value={editingCompNotes}
                                  onChange={(e) => setEditingCompNotes(e.target.value)}
                                  className="w-full px-2 py-1 text-[10px] border border-rose-100 rounded-lg text-rose-800 bg-white"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-bold text-rose-700 mb-0.5 flex items-center justify-between">
                                  <span>打卡相片</span>
                                  <span className="text-[7px] text-rose-400">管理记录的照片</span>
                                </label>
                                <div className="space-y-1.5">
                                  {/* Existing photos with X buttons */}
                                  {editingCompMediaUrls.length > 0 && (
                                    <div className="grid grid-cols-5 gap-1">
                                      {editingCompMediaUrls.map((url, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-rose-100 shadow-2xs">
                                          <img src={url} className="w-full h-full object-cover" alt="completion" />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCompMediaUrls((prev) => prev.filter((_, i) => i !== idx));
                                            }}
                                            className="absolute top-0.5 right-0.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-0.5 transition scale-75"
                                          >
                                            <X size={8} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Select new files to add */}
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => {
                                      if (e.target.files) {
                                        const filesArray = Array.from(e.target.files);
                                        setEditingNewMediaFiles((prev) => [...prev, ...filesArray]);
                                      }
                                    }}
                                    id={`edit-media-upload-${comp.id}`}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`edit-media-upload-${comp.id}`}
                                    className="flex items-center justify-center space-x-1 py-1 border border-dashed border-rose-200 hover:border-rose-300 rounded-lg bg-white/70 text-rose-600 text-[8px] font-bold cursor-pointer transition select-none"
                                  >
                                    <Plus size={8} />
                                    <span>添加照片</span>
                                  </label>

                                  {/* New files previews */}
                                  {editingNewMediaFiles.length > 0 && (
                                    <div className="grid grid-cols-5 gap-1">
                                      {editingNewMediaFiles.map((file, idx) => {
                                        const fileUrl = URL.createObjectURL(file);
                                        return (
                                          <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-green-200 shadow-2xs">
                                            <img src={fileUrl} className="w-full h-full object-cover" alt="new preview" />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingNewMediaFiles((prev) => prev.filter((_, i) => i !== idx));
                                              }}
                                              className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 transition scale-75"
                                            >
                                              <X size={8} />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-2 justify-end">
                                <button
                                  type="button"
                                  disabled={checklistUploading}
                                  onClick={() => setEditingCompId(null)}
                                  className="px-2 py-0.5 text-[9px] font-semibold text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                                >
                                  取消
                                </button>
                                <button
                                  type="button"
                                  disabled={checklistUploading}
                                  onClick={() => onUpdateSingleCompletion(comp.id, comp.completed_at)}
                                  className="px-2 py-0.5 text-[9px] font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 rounded-md transition flex items-center space-x-1"
                                >
                                  {checklistUploading ? (
                                    <span>保存中 ({checklistUploadProgress}%)</span>
                                  ) : (
                                    <span>保存</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-baseline">
                                <div className="flex items-center space-x-1">
                                  <span className="text-[8px] bg-rose-100 text-rose-600 px-1 py-0.2 rounded-sm font-black scale-90">
                                    #{displayIndex}
                                  </span>
                                  <span className="text-[9px] font-extrabold text-rose-800">{operatorName}</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-[8px] text-gray-400 font-semibold">{comp.completed_at.replace(/-/g, '/')}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCompId(comp.id);
                                      setEditingCompDate(comp.completed_at);
                                      setEditingCompNotes(comp.notes || '');
                                      setEditingCompMediaUrls(comp.media || []);
                                      setEditingNewMediaFiles([]);
                                    }}
                                    className="p-0.5 text-rose-400 hover:text-rose-600 transition"
                                    title="编辑此条记录"
                                  >
                                    <Edit3 size={10} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCompToDelete(comp);
                                      setDeleteCompIndex(displayIndex);
                                      setConfirmDeleteCompOpen(true);
                                    }}
                                    className="p-0.5 text-red-400 hover:text-red-600 transition"
                                    title="删除此条记录"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                              {comp.notes && (
                                <p className="text-[9px] text-rose-900/70 italic leading-relaxed pl-5 font-medium">
                                  "{comp.notes}"
                                </p>
                              )}
                              
                              {/* Display media photo gallery */}
                              {comp.media && comp.media.length > 0 && (
                                <div className="pl-5 pt-1.5">
                                  <div className={`grid gap-1.5 ${
                                    comp.media.length === 1 
                                      ? 'grid-cols-1 max-w-[150px]' 
                                      : comp.media.length === 2 
                                        ? 'grid-cols-2 max-w-[200px]' 
                                        : 'grid-cols-3'
                                  }`}>
                                    {comp.media.map((url, imgIdx) => (
                                      <div 
                                        key={imgIdx} 
                                        onClick={() => {
                                          setZoomImages(comp.media || []);
                                          setZoomIndex(imgIdx);
                                          setLightboxOpen(true);
                                        }}
                                        className="relative rounded-xl overflow-hidden border border-rose-100 bg-rose-50/10 aspect-square cursor-zoom-in active:scale-95 hover:scale-[1.02] transition shadow-xs group"
                                      >
                                        <img src={url} className="w-full h-full object-cover" alt="scrapbook" loading="lazy" />
                                        <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Completion inputs Form (shown if first-time complete or if showAgainForm is true) */}
            {(completions.filter((c) => c.item_id === activeItem.id).length === 0 || showAgainForm) && (
              <div className="space-y-3 p-3 bg-rose-50/20 rounded-2xl border border-rose-100/30">
                <h4 className="text-[10px] font-extrabold text-rose-800 flex items-center">
                  <Sparkles size={10} className="mr-1 text-rose-500 animate-pulse" />
                  {completions.filter((c) => c.item_id === activeItem.id).length === 0 ? '完成打卡' : '再次打卡足迹'}
                </h4>
                
                <div>
                  <label className="block text-[9px] font-bold text-rose-700 mb-1 flex items-center">
                    <Calendar size={8} className="mr-1" />
                    打卡纪念日
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={checklistUploading}
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="w-full px-3 py-2 text-left text-xs border border-rose-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-800 bg-white flex items-center justify-between font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span>{modalDate.replace(/-/g, '/')}</span>
                      <Calendar size={12} className="text-rose-400" />
                    </button>

                    {showDatePicker && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-rose-100 rounded-2xl p-3 shadow-xl z-50 animate-slide-up">
                        {/* Calendar Header */}
                        <div className="flex justify-between items-center mb-2.5">
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
                            className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          
                          <div className="flex space-x-1">
                            <select
                              value={calendarYear}
                              onChange={(e) => setCalendarYear(parseInt(e.target.value, 10))}
                              className="text-[10px] font-bold text-rose-800 bg-white border border-rose-100 rounded-lg px-1.5 py-0.5 focus:outline-none cursor-pointer"
                            >
                              {yearsList.map(y => (
                                <option key={y} value={y}>{y}年</option>
                              ))}
                            </select>
                            <select
                              value={calendarMonth}
                              onChange={(e) => setCalendarMonth(parseInt(e.target.value, 10))}
                              className="text-[10px] font-bold text-rose-800 bg-white border border-rose-100 rounded-lg px-1.5 py-0.5 focus:outline-none cursor-pointer"
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
                            className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>

                        {/* Calendar Week Labels */}
                        <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-bold text-rose-400 mb-1">
                          {['日', '一', '二', '三', '四', '五', '六'].map(w => (
                            <div key={w} className="py-0.5">{w}</div>
                          ))}
                        </div>

                        {/* Calendar Days Grid */}
                        <div className="grid grid-cols-7 gap-0.5">
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
                            const isSelected = modalDate === dayStr;
                            
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setModalDate(dayStr);
                                  setShowDatePicker(false);
                                }}
                                className={`py-1 text-[10px] rounded-lg font-bold transition ${
                                  isSelected
                                    ? 'bg-rose-500 text-white shadow-xs'
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
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-rose-700 mb-1 flex items-center">
                    <Edit3 size={8} className="mr-1" />
                    纪念笔记 / 备忘录
                  </label>
                  <textarea
                    value={modalNotes}
                    disabled={checklistUploading}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="记录一下这件小事的趣闻吧（如：吃火锅被辣哭了，哈哈）"
                    rows={2}
                    className="w-full px-3 py-2 text-xs border border-rose-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-800 bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-rose-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center"><Image size={8} className="mr-1" />打卡纪念照片</span>
                    <span className="text-[7px] text-rose-400 font-normal">支持多选原图</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          const filesArray = Array.from(e.target.files);
                          setChecklistMediaFiles((prev) => [...prev, ...filesArray]);
                        }
                      }}
                      id="checklist-media-upload"
                      className="hidden"
                    />
                    <label
                      htmlFor="checklist-media-upload"
                      className={`flex items-center justify-center space-x-1 px-3 py-2 border border-dashed border-rose-200 rounded-xl text-rose-700 text-[10px] font-bold select-none transition ${
                        checklistUploading 
                          ? 'opacity-50 cursor-not-allowed pointer-events-none' 
                          : 'hover:border-rose-400 bg-white/70 hover:bg-rose-50/20 cursor-pointer'
                      }`}
                    >
                      <Plus size={10} />
                      <span>添加合照/相片</span>
                    </label>

                    {/* Previews of selected media files */}
                    {checklistMediaFiles.length > 0 && (
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {checklistMediaFiles.map((file, idx) => {
                          const fileUrl = URL.createObjectURL(file);
                          return (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-rose-100 group shadow-xs">
                              <img src={fileUrl} className="w-full h-full object-cover" alt="preview" />
                              <button
                                type="button"
                                disabled={checklistUploading}
                                onClick={() => {
                                  setChecklistMediaFiles((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="absolute top-0.5 right-0.5 bg-black/45 hover:bg-black/70 text-white rounded-full p-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <X size={8} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2 pt-1">
                  {completions.filter((c) => c.item_id === activeItem.id).length > 0 && (
                    <button
                      type="button"
                      disabled={checklistUploading}
                      onClick={() => setShowAgainForm(false)}
                      className="flex-grow py-2 text-xs font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
                    >
                      取消
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={checklistUploading}
                    onClick={onSaveCompletion}
                    className="flex-grow py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 rounded-xl transition shadow-xs flex items-center justify-center space-x-1"
                  >
                    {checklistUploading ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                        <span>正在上传 ({checklistUploadProgress}%)</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={11} className="text-amber-200" />
                        <span>确认打卡</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Close footer button if completions exist and form is closed */}
            {completions.filter((c) => c.item_id === activeItem.id).length > 0 && !showAgainForm && (
              <button
                type="button"
                onClick={() => setCompletionModalOpen(false)}
                className="w-full py-2.5 text-xs font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition active:scale-95"
              >
                关闭
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Create Custom Checklist Item Definition */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[1000] flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleCreateItemSubmit} className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-rose-100/50 shadow-2xl space-y-4 animate-slide-up bg-white/95 relative">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-full transition"
            >
              <X size={14} />
            </button>

            <h3 className="text-sm font-extrabold text-rose-800 border-b border-rose-50 pb-2 pr-8">➕ 新建恋爱清单事项</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-rose-700 mb-1">清单事项名称</label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="例如: 一起去看海、一起打雪仗"
                  className="w-full px-3 py-2 text-xs border border-rose-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-800 bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-rose-700 mb-1">所属大分类</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCreateDropOpen(!createDropOpen)}
                      className="w-full px-3 py-2 text-left text-xs border border-rose-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-800 bg-white flex items-center justify-between font-bold"
                    >
                      <span className="truncate">{createCategory}</span>
                      <span className={`text-[8px] text-rose-400 transform transition-transform duration-200 ${createDropOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {createDropOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setCreateDropOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-rose-100 rounded-2xl py-1.5 shadow-xl z-50 max-h-48 overflow-y-auto animate-slide-up">
                          {dbCategories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setCreateCategory(cat);
                                setCreateDropOpen(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-xs transition-colors ${
                                createCategory === cat
                                  ? 'bg-rose-50 text-rose-700 font-extrabold'
                                  : 'text-rose-900/80 hover:bg-rose-50/50 hover:text-rose-600 font-semibold'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-rose-700 mb-1">图标 Emoji</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={createIcon}
                    onChange={(e) => setCreateIcon(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-center border border-rose-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-800 bg-white"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition active:scale-95 shadow-md shadow-rose-200"
            >
              确定新建事项
            </button>
          </form>
        </div>
      )}

      {/* Modal 3: Edit Item definition (Rename/Recategorize/Delete completely) */}
      {editDefOpen && activeItem && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[1050] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-rose-100/50 shadow-2xl space-y-4 animate-slide-up bg-white/95 relative">
            <button
              onClick={() => setEditDefOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-full transition"
            >
              <X size={14} />
            </button>

            <h3 className="text-sm font-extrabold text-rose-800 border-b border-rose-50 pb-2 pr-8">✏️ 修改清单事项信息</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-rose-700 mb-1">项目名字</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-rose-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-800 bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-rose-700 mb-1">所属分类</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setEditDropOpen(!editDropOpen)}
                      className="w-full px-3 py-2 text-left text-xs border border-rose-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-800 bg-white flex items-center justify-between font-bold"
                    >
                      <span className="truncate">{editCategory}</span>
                      <span className={`text-[8px] text-rose-400 transform transition-transform duration-200 ${editDropOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {editDropOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setEditDropOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-rose-100 rounded-2xl py-1.5 shadow-xl z-50 max-h-48 overflow-y-auto animate-slide-up">
                          {dbCategories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setEditCategory(cat);
                                setEditDropOpen(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-xs transition-colors ${
                                editCategory === cat
                                  ? 'bg-rose-50 text-rose-700 font-extrabold'
                                  : 'text-rose-900/80 hover:bg-rose-50/50 hover:text-rose-600 font-semibold'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-rose-700 mb-1">图标 Emoji</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editIcon}
                    onChange={(e) => setEditIcon(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-center border border-rose-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-800 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-2.5 pt-2">
              <button
                onClick={() => setConfirmDeleteOpen(true)}
                className="p-2.5 text-red-500 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition active:scale-95 flex items-center justify-center"
                title="删除此项及打卡记录 (去重)"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={onSaveItemDefinition}
                className="flex-grow py-2.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition active:scale-95 shadow-md shadow-rose-200"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Modal 4: Love Checklist Audit Activity Logs */}
      {logsOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[1000] flex items-end justify-center">
          <div className="w-full max-w-md bg-white rounded-t-[32px] animate-slide-up shadow-2xl border-t border-rose-100 max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center border-b border-rose-50 px-6 py-4 flex-shrink-0">
              <h2 className="text-sm font-extrabold text-rose-800 flex items-center">
                <FileText size={16} className="mr-1.5 text-rose-500" />
                恋爱打卡动态 (公开透明)
              </h2>
              <button
                onClick={() => setLogsOpen(false)}
                className="text-xs font-bold text-rose-400 hover:text-rose-600 p-1"
              >
                关闭
              </button>
            </div>

            {/* Logs Timeline body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {logs.length === 0 ? (
                <p className="text-[10px] text-gray-400 text-center py-10 select-none">暂时没有任何操作日志记录。</p>
              ) : (
                logs.map((log) => {
                  const operatorName = getNickname(log.operator_id);
                  let badgeBg = 'bg-rose-50 text-rose-600 border-rose-100/50';
                  let logEmoji = '📝';

                  if (log.action_type === 'create') {
                    badgeBg = 'bg-green-50 text-green-600 border-green-100';
                    logEmoji = '➕';
                  } else if (log.action_type === 'delete') {
                    badgeBg = 'bg-red-50 text-red-600 border-red-100';
                    logEmoji = '🗑️';
                  } else if (log.action_type === 'complete') {
                    badgeBg = 'bg-pink-100 text-pink-700 border-pink-200';
                    logEmoji = '🎉';
                  } else if (log.action_type === 'uncomplete') {
                    badgeBg = 'bg-gray-100 text-gray-600 border-gray-200';
                    logEmoji = '↩️';
                  }

                  return (
                    <div key={log.id} className="flex space-x-3 text-xs leading-normal items-start border-b border-rose-50/20 pb-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${badgeBg}`}>
                        <span className="text-base">{logEmoji}</span>
                      </div>
                      <div className="flex-grow space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-rose-800">{operatorName}</span>
                          <span className="text-[8px] text-gray-400 font-medium">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-rose-900/80 font-medium">{log.details}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}



      {/* Confirm Popup Modal: Delete Goal Definition */}
      {confirmDeleteOpen && activeItem && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[1100] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel max-w-xs w-full p-6 rounded-3xl border border-rose-100/50 shadow-2xl space-y-4 animate-slide-up text-center bg-white/95">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 shadow-inner mx-auto">
              <span className="text-2xl">🗑️</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-red-800">确认彻底删除此事项</h3>
              <p className="text-[10px] text-red-600/80 leading-relaxed">
                确定要在恋爱清单中**永久移除**事项 “{activeItem.icon} {activeItem.name}” 吗？此操作不可逆，且**会同步删除该事项的打卡达成记录**！
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition active:scale-95"
              >
                取消
              </button>
              <button
                onClick={onDeleteItemDefinition}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition active:scale-95 shadow-md"
              >
                彻底删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Popup Modal: Delete Check-in Completion */}
      {confirmDeleteCompOpen && compToDelete && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[1100] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel max-w-xs w-full p-6 rounded-3xl border border-rose-100/50 shadow-2xl space-y-4 animate-slide-up text-center bg-white/95">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 shadow-inner mx-auto animate-pulse">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-red-800">确认删除此打卡记录</h3>
              <p className="text-[10px] text-red-600/80 leading-relaxed">
                确定要删除第 <span className="font-bold text-red-700">{deleteCompIndex}</span> 次打卡记录吗？此操作不可逆，打卡附带的照片和纪念笔记也将被彻底删除！
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => {
                  setConfirmDeleteCompOpen(false);
                  setCompToDelete(null);
                  setDeleteCompIndex(null);
                }}
                className="flex-1 py-2 text-xs font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition active:scale-95"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  setConfirmDeleteCompOpen(false);
                  if (compToDelete) {
                    await handleDeleteSingleCompletion(compToDelete);
                  }
                  setCompToDelete(null);
                  setDeleteCompIndex(null);
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition active:scale-95 shadow-md"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Modal 5: Dynamic Categories Manager */}
      {categoriesModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[1000] flex items-end justify-center">
          <div className="w-full max-w-md bg-white rounded-t-[32px] animate-slide-up shadow-2xl border-t border-rose-100 max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center border-b border-rose-50 px-6 py-4 flex-shrink-0 pr-8 relative">
              <h2 className="text-sm font-extrabold text-rose-800 flex items-center">
                <Settings size={16} className="mr-1.5 text-rose-500 animate-spin-slow" />
                恋爱清单分类管理
              </h2>
              <button
                onClick={() => setCategoriesModalOpen(false)}
                className="absolute top-4 right-4 p-1 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-full transition"
              >
                <X size={14} />
              </button>
            </div>

            {/* List and form */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Form to create new category */}
              <form onSubmit={handleCreateCategorySubmit} className="flex space-x-2">
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="新建分类名称... (如: 周年企划 🎂)"
                  className="flex-grow px-3 py-2 text-xs border border-rose-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-800 bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition active:scale-95 shadow-xs shrink-0 flex items-center space-x-1"
                >
                  <Plus size={12} />
                  <span>添加</span>
                </button>
              </form>

              {/* Categories list */}
              <div className="border border-rose-50 rounded-2xl overflow-hidden divide-y divide-rose-50 bg-rose-50/10">
                {rawCategories.map((cat) => {
                  const isEditing = editingCategoryId === cat.id;

                  return (
                    <div key={cat.id} className="flex items-center justify-between p-3.5 bg-white">
                      {isEditing ? (
                        <div className="flex-grow flex space-x-2">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="flex-grow px-2.5 py-1 text-xs border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-800 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => onSaveCategoryName(cat)}
                            className="px-3 py-1 text-[10px] font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg transition active:scale-95 shrink-0"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryId(null)}
                            className="px-3 py-1 text-[10px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition active:scale-95 shrink-0"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-rose-900/80">{cat.name}</span>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setEditingCategoryName(cat.name);
                              }}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="修改分类名称"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryToDelete(cat);
                                setConfirmDeleteCategoryOpen(true);
                              }}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="删除分类"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Popup Modal: Delete Category */}
      {confirmDeleteCategoryOpen && categoryToDelete && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[1100] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel max-w-xs w-full p-6 rounded-3xl border border-rose-100/50 shadow-2xl space-y-4 animate-slide-up text-center bg-white/95">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 shadow-inner mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-red-800">确认彻底删除分类</h3>
              <p className="text-[10px] text-red-600/80 leading-relaxed font-semibold">
                确定要删除分类 “{categoryToDelete.name}” 吗？
              </p>
              <p className="text-[9px] text-red-500/80 bg-red-50/50 p-2 rounded-xl border border-red-100/30 leading-normal text-left font-medium">
                ⚠️ 注意：此操作不可逆，且**会同步删除该分类下的所有清单打卡事项，以及它们的打卡记录**！
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => {
                  setConfirmDeleteCategoryOpen(false);
                  setCategoryToDelete(null);
                }}
                className="flex-1 py-2 text-xs font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition active:scale-95"
              >
                取消
              </button>
              <button
                onClick={onDeleteCategoryConfirm}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition active:scale-95 shadow-md"
              >
                彻底删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Preview Modal */}
      {lightboxOpen && zoomImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[2000] flex flex-col items-center justify-center animate-fade-in select-none"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute right-6 p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition z-[2010] lightbox-close-btn"
          >
            <X size={20} />
          </button>

          {/* Main Image View */}
          <div 
            className="relative w-full flex-grow flex items-center justify-center p-4 touch-pan-y select-none"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={zoomImages[zoomIndex]}
              className="max-w-full max-h-[75vh] object-contain rounded-lg animate-scale-up select-none cursor-default"
              alt="zoomed completion"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Pagination Controls */}
          {zoomImages.length > 1 && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomIndex((prev) => (prev === 0 ? zoomImages.length - 1 : prev - 1));
                }}
                className="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full pointer-events-auto transition active:scale-90 flex items-center justify-center border border-white/5"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomIndex((prev) => (prev === zoomImages.length - 1 ? 0 : prev + 1));
                }}
                className="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full pointer-events-auto transition active:scale-90 flex items-center justify-center border border-white/5"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Image index indicator */}
          <div className="absolute bottom-8 text-white/70 text-xs font-semibold tracking-wider">
            {zoomIndex + 1} / {zoomImages.length}
          </div>
        </div>
      )}

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

      {/* WishModal: Create New Wish */}
      {wishModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[72px] sm:pb-4">
          <div className="w-full max-w-sm bg-white rounded-t-[32px] sm:rounded-3xl animate-slide-up shadow-2xl border-t sm:border border-rose-100/50 px-6 pt-6 pb-6 space-y-4 max-h-[80vh] overflow-y-auto relative bg-gradient-to-b from-white to-rose-50/10">
            {/* Close */}
            <button
              onClick={() => {
                setWishModalOpen(false);
                setWishTitle('');
                setWishExpectation(3);
                setWishImageUrl('');
                setWishMediaFile(null);
              }}
              className="absolute top-4 right-4 p-1 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-full transition"
            >
              <X size={14} />
            </button>

            <div className="border-b border-rose-50 pb-2.5 flex items-center space-x-1.5 text-rose-800">
              <span className="text-xl">🌠</span>
              <h2 className="text-sm font-extrabold">许下我的心愿</h2>
            </div>

            <form onSubmit={onAddWish} className="space-y-4">
              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-rose-800 flex items-center">
                  <span>心愿描述 ✨</span>
                  <span className="text-rose-400 ml-0.5">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={wishTitle}
                  onChange={(e) => setWishTitle(e.target.value)}
                  placeholder="写下你的期待... (例如: 想在生日那天收到一个草莓熊熊玩偶 🧸，或者想吃日料)"
                  className="w-full px-3 py-2 text-xs border border-rose-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-850 bg-white placeholder-rose-300/80 resize-none font-medium leading-relaxed"
                />
              </div>

              {/* Star Rating input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-rose-800">期待星级 (几颗星代表多想实现哦 ⭐)</label>
                <div className="flex space-x-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const active = i < wishExpectation;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setWishExpectation(i + 1)}
                        className={`text-xl transition-all active:scale-90 ${
                          active ? 'text-amber-400 scale-110 drop-shadow-[0_0_3px_rgba(251,191,36,0.5)]' : 'text-gray-300'
                        }`}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reference Image input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-rose-800 flex items-center space-x-1">
                  <Image size={10} className="text-rose-500" />
                  <span>添加心愿参考图 (可选)</span>
                </label>

                {wishMediaFile ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-rose-200">
                    <img
                      src={URL.createObjectURL(wishMediaFile)}
                      className="w-full h-full object-cover"
                      alt="local preview"
                    />
                    <button
                      type="button"
                      onClick={() => setWishMediaFile(null)}
                      className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <label className="cursor-pointer px-4 py-2 bg-rose-50 hover:bg-rose-100/70 border border-rose-100 text-rose-600 font-extrabold text-[10px] rounded-xl transition active:scale-95 flex items-center space-x-1">
                      <Plus size={10} />
                      <span>上传图片</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setWishMediaFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[8px] text-rose-400/80 font-medium">支持图片参考</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2.5 pt-2 border-t border-rose-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setWishModalOpen(false);
                    setWishTitle('');
                    setWishExpectation(3);
                    setWishImageUrl('');
                    setWishMediaFile(null);
                  }}
                  className="flex-1 py-2.5 text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100/60 rounded-xl transition active:scale-95"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={wishUploading}
                  className="flex-1 py-2.5 text-xs font-black text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition active:scale-95 shadow-md flex items-center justify-center space-x-1 disabled:opacity-50"
                >
                  {wishUploading ? (
                    <>
                      <span className="animate-spin text-[10px]">🌸</span>
                      <span>正在许愿...</span>
                    </>
                  ) : (
                    <>
                      <span>确定许愿</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Time Machine Modal */}
      <TimeMachineModal
        isOpen={timeMachineOpen}
        onClose={() => setTimeMachineOpen(false)}
        currentUser={currentUser}
        profiles={profiles}
        completions={completions}
        items={items}
      />
    </div>
  );
};
