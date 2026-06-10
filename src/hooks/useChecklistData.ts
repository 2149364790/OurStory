import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import confetti from 'canvas-confetti';

export interface DBChecklistItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  is_preset: boolean;
  is_priority: boolean;
  created_by?: string;
  created_at: string;
}

export interface CompletionItem {
  id: string;
  item_id: string;
  completed_by: string;
  completed_at: string;
  notes: string | null;
  task_id: string | null;
  media?: string[] | null;
}

export interface AuditLog {
  id: string;
  operator_id: string;
  action_type: string;
  item_name: string;
  details: string | null;
  created_at: string;
  operator_name?: string;
}

export interface DBCategoryItem {
  id: string;
  name: string;
  created_at: string;
}

const getStoragePathFromUrl = (url: string): string => {
  const matchStr = '/storage/v1/object/public/media/';
  const idx = url.indexOf(matchStr);
  if (idx !== -1) {
    return url.substring(idx + matchStr.length);
  }
  const parts = url.split('/');
  return parts[parts.length - 1];
};

export const DEFAULT_PRESET_CATEGORIES = [
  '美食与日常饮食',
  '旅行与户外活动',
  '居家与日常陪伴',
  '节日与仪式感',
  '情侣专属互动',
  '交通与住宿体验',
  '健康与自我提升',
  '人生大事与未来规划',
  '娱乐与休闲活动',
];

export const useChecklistData = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [items, setItems] = useState<DBChecklistItem[]>([]);
  const [completions, setCompletions] = useState<CompletionItem[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [hasUnreadLogs, setHasUnreadLogs] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dynamic categories state
  const [rawCategories, setRawCategories] = useState<DBCategoryItem[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);

  // Wishlist States
  const [loveWishes, setLoveWishes] = useState<any[]>([]);

  // Media upload progress states
  const [checklistUploading, setChecklistUploading] = useState(false);
  const [checklistUploadProgress, setChecklistUploadProgress] = useState(0);

  // Custom Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data);
  }, []);

  const fetchWishes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('love_wishes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setLoveWishes(data);
    } catch (err: any) {
      console.error('Error fetching wishes:', err.message);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('love_checklist_categories').select('*').order('created_at', { ascending: true });
      if (error) throw error;

      if (data && data.length === 0) {
        // Seed categories
        const { error: seedErr } = await supabase.from('love_checklist_categories').insert(
          DEFAULT_PRESET_CATEGORIES.map((cat) => ({
            name: cat,
          }))
        );
        if (seedErr) throw seedErr;
        const { data: seeded } = await supabase.from('love_checklist_categories').select('*').order('created_at', { ascending: true });
        if (seeded) {
          setRawCategories(seeded);
          setDbCategories(seeded.map(c => c.name));
        }
      } else if (data) {
        setRawCategories(data);
        setDbCategories(data.map(c => c.name));
      }
    } catch (err: any) {
      console.error('Error fetching categories:', err.message);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('love_checklist_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setItems(data);
    } catch (err: any) {
      console.error('Error fetching items:', err.message);
    }
  }, []);

  const fetchCompletions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('love_checklist_completions')
        .select('*')
        .order('completed_at', { ascending: false });
      if (error) throw error;
      if (data) setCompletions(data);
    } catch (err: any) {
      console.error('Error fetching completions:', err.message);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('love_checklist_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setLogs(data);
    } catch (err: any) {
      console.error('Error fetching logs:', err.message);
    }
  }, []);

  const uploadMediaFiles = useCallback(async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    setChecklistUploading(true);
    setChecklistUploadProgress(0);

    const urls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const filePath = `checklist/${currentUser?.id || 'unknown'}_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        urls.push(publicUrl);
        setChecklistUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      return urls;
    } catch (err: any) {
      console.error('Checklist media upload failed:', err);
      showToast('图片上传失败: ' + err.message, 'error');
      throw err;
    } finally {
      setChecklistUploading(false);
      setChecklistUploadProgress(0);
    }
  }, [currentUser, showToast]);

  const initData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchCategories(),
      fetchItems(),
      fetchCompletions(),
      fetchLogs(),
      fetchWishes()
    ]);
    setLoading(false);
  }, [fetchCategories, fetchItems, fetchCompletions, fetchLogs, fetchWishes]);

  // Auth initialization and realtime channels
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        fetchProfiles();
        // Load initial records
        setLoading(true);
        Promise.all([
          supabase.from('love_checklist_categories').select('*').order('created_at', { ascending: true }),
          supabase.from('love_checklist_items').select('*').order('created_at', { ascending: false }),
          supabase.from('love_checklist_completions').select('*').order('completed_at', { ascending: false }),
          supabase.from('love_checklist_logs').select('*').order('created_at', { ascending: false }),
          supabase.from('love_wishes').select('*').order('created_at', { ascending: false })
        ]).then(([cats, itemsRes, comps, logsRes, wishes]) => {
          if (cats.data) {
            setRawCategories(cats.data);
            setDbCategories(cats.data.map(c => c.name));
          }
          if (itemsRes.data) setItems(itemsRes.data);
          if (comps.data) setCompletions(comps.data);
          if (logsRes.data) setLogs(logsRes.data);
          if (wishes.data) setLoveWishes(wishes.data);
          setLoading(false);
        });
      }
    });

    const itemsChannel = supabase
      .channel('public:love_checklist_items_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'love_checklist_items' }, () => {
        fetchItems();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'love_checklist_completions' }, () => {
        fetchCompletions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'love_checklist_logs' }, () => {
        fetchLogs();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'love_checklist_categories' }, () => {
        fetchCategories();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'love_wishes' }, () => {
        fetchWishes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
    };
  }, [fetchProfiles, fetchItems, fetchCompletions, fetchLogs, fetchCategories, fetchWishes]);

  // Unread logs calculation
  useEffect(() => {
    if (logs.length > 0 && currentUser) {
      const lastViewedStr = localStorage.getItem('checklist_logs_last_viewed');
      if (!lastViewedStr) {
        const hasPartnerLog = logs.some(log => log.operator_id !== currentUser.id);
        setHasUnreadLogs(hasPartnerLog);
      } else {
        const lastViewed = new Date(lastViewedStr);
        const unread = logs.some(log => log.operator_id !== currentUser.id && new Date(log.created_at) > lastViewed);
        setHasUnreadLogs(unread);
      }
    }
  }, [logs, currentUser]);

  // Toast autoclose
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Mutations: Wishes
  const handleAddWish = useCallback(async (title: string, expectation: number, imageUrl: string, mediaFile: File | null) => {
    if (!currentUser || !title.trim()) return;
    setChecklistUploading(true);
    let uploadedUrl = imageUrl;

    try {
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const filePath = `wishes/${currentUser.id}_${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('media')
          .upload(filePath, mediaFile);
        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);
        uploadedUrl = publicUrl;
      }

      const { error: insertErr } = await supabase.from('love_wishes').insert({
        creator_id: currentUser.id,
        title: title.trim(),
        image_url: uploadedUrl || null,
        expectation,
        status: 'pending'
      });
      if (insertErr) throw insertErr;

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'create',
        item_name: `心愿:${title.trim()}`,
        details: `许下了新的恋爱心愿: “${title.trim()}” 🌠`,
      });

      showToast('许愿成功！期待伴侣悄悄发现它吧');
      fetchWishes();
      fetchLogs();
    } catch (err: any) {
      showToast('许愿失败: ' + err.message, 'error');
      throw err;
    } finally {
      setChecklistUploading(false);
    }
  }, [currentUser, fetchWishes, fetchLogs, showToast]);

  const handleClaimWish = useCallback(async (wish: any) => {
    if (!currentUser || !wish) return;
    try {
      const { error } = await supabase
        .from('love_wishes')
        .update({
          status: 'claimed',
          claimed_by: currentUser.id
        })
        .eq('id', wish.id);
      if (error) throw error;

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'update',
        item_name: `心愿:${wish.title}`,
        details: `悄悄认领了伴侣的愿望: “${wish.title}” 🤫`,
      });

      showToast('已悄悄认领，去为伴侣筹备惊喜吧！');
      fetchWishes();
      fetchLogs();
    } catch (err: any) {
      showToast('认领失败: ' + err.message, 'error');
    }
  }, [currentUser, fetchWishes, fetchLogs, showToast]);

  const handleAchieveWish = useCallback(async (wish: any) => {
    if (!currentUser || !wish) return;
    try {
      const { error } = await supabase
        .from('love_wishes')
        .update({
          status: 'achieved',
          achieved_at: new Date().toISOString()
        })
        .eq('id', wish.id);
      if (error) throw error;

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'update',
        item_name: `心愿:${wish.title}`,
        details: `帮伴侣实现了愿望: “${wish.title}” 🎉`,
      });

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ff69b4', '#ffb6c1', '#ffc0cb', '#ff1493', '#db7093']
      });

      showToast('恭喜！又共同实现了一个恋爱心愿 💖');
      fetchWishes();
      fetchLogs();
    } catch (err: any) {
      showToast('标记失败: ' + err.message, 'error');
    }
  }, [currentUser, fetchWishes, fetchLogs, showToast]);

  const handleDeleteWish = useCallback(async (wish: any) => {
    if (!currentUser || !wish) return;
    if (wish.creator_id !== currentUser.id) {
      showToast('只能删除自己许下的心愿哦', 'error');
      return;
    }

    try {
      if (wish.image_url) {
        const filePath = getStoragePathFromUrl(wish.image_url);
        await supabase.storage.from('media').remove([filePath]);
      }

      const { error } = await supabase
        .from('love_wishes')
        .delete()
        .eq('id', wish.id);
      if (error) throw error;

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'delete',
        item_name: `心愿:${wish.title}`,
        details: `撤销了恋爱心愿: “${wish.title}” 🗑️`,
      });

      showToast('心愿已撤销');
      fetchWishes();
      fetchLogs();
    } catch (err: any) {
      showToast('删除失败: ' + err.message, 'error');
    }
  }, [currentUser, fetchWishes, fetchLogs, showToast]);

  // Mutations: Categories
  const handleCreateCategory = useCallback(async (name: string) => {
    if (!name.trim() || !currentUser) return;
    try {
      const { error } = await supabase.from('love_checklist_categories').insert({
        name: name.trim(),
        created_by: currentUser.id,
      });
      if (error) throw error;

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'create',
        item_name: `分类:${name.trim()}`,
        details: `新建了清单分类 “${name.trim()}” 🗂️`,
      });

      showToast(`已成功添加清单分类: ${name.trim()}`);
      fetchCategories();
      fetchLogs();
    } catch (err: any) {
      showToast('创建分类失败: ' + err.message, 'error');
    }
  }, [currentUser, fetchCategories, fetchLogs, showToast]);

  const handleSaveCategoryName = useCallback(async (cat: DBCategoryItem, newName: string) => {
    if (!newName.trim() || !currentUser) return;
    const cleanName = newName.trim();
    const originalName = cat.name;

    try {
      const { error } = await supabase
        .from('love_checklist_categories')
        .update({ name: cleanName })
        .eq('id', cat.id);
      if (error) throw error;

      // Update associated goals' categories
      await supabase
        .from('love_checklist_items')
        .update({ category: cleanName })
        .eq('category', originalName);

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'update',
        item_name: `分类:${cleanName}`,
        details: `将分类 “${originalName}” 重命名为 “${cleanName}” ✏️`,
      });

      showToast('修改成功');
      fetchCategories();
      fetchItems();
      fetchLogs();
    } catch (err: any) {
      showToast('更新分类名失败: ' + err.message, 'error');
    }
  }, [currentUser, fetchCategories, fetchItems, fetchLogs, showToast]);

  const handleDeleteCategory = useCallback(async (cat: DBCategoryItem) => {
    if (!currentUser || !cat) return;
    try {
      const { error } = await supabase
        .from('love_checklist_categories')
        .delete()
        .eq('id', cat.id);
      if (error) throw error;

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'delete',
        item_name: `分类:${cat.name}`,
        details: `删除了清单分类 “${cat.name}” 🗑️`,
      });

      showToast(`分类 ${cat.name} 已被删除`);
      fetchCategories();
      fetchLogs();
    } catch (err: any) {
      showToast('删除分类失败: ' + err.message, 'error');
    }
  }, [currentUser, fetchCategories, fetchLogs, showToast]);

  // Mutations: Item Definitions (Goals)
  const handleCreateItem = useCallback(async (name: string, category: string, icon: string) => {
    if (!name.trim() || !currentUser) return;
    const cleanName = name.trim();

    try {
      const { error } = await supabase.from('love_checklist_items').insert({
        name: cleanName,
        category,
        icon,
        is_preset: false,
        created_by: currentUser.id
      });
      if (error) throw error;

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'create',
        item_name: cleanName,
        details: `添加了新的清单项 “${cleanName}” 📌`,
      });

      showToast(`已成功添加项目: ${cleanName}`);
      fetchItems();
      fetchLogs();
    } catch (err: any) {
      showToast('添加项目失败: ' + err.message, 'error');
    }
  }, [currentUser, fetchItems, fetchLogs, showToast]);

  const handleUpdateItem = useCallback(async (id: string, name: string, category: string, icon: string) => {
    if (!name.trim() || !currentUser) return;
    const cleanName = name.trim();

    try {
      const { error } = await supabase
        .from('love_checklist_items')
        .update({ name: cleanName, category, icon })
        .eq('id', id);
      if (error) throw error;

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'update',
        item_name: cleanName,
        details: `修改了项目信息: “${cleanName}” ⚙️`,
      });

      showToast('更新项目成功');
      fetchItems();
      fetchLogs();
    } catch (err: any) {
      showToast('更新项目失败: ' + err.message, 'error');
    }
  }, [currentUser, fetchItems, fetchLogs, showToast]);

  const handleDeleteItem = useCallback(async (id: string, name: string) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from('love_checklist_items')
        .delete()
        .eq('id', id);
      if (error) throw error;

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'delete',
        item_name: name,
        details: `删除了清单项 “${name}” 🗑️`,
      });

      showToast('项目已成功删除');
      fetchItems();
      fetchLogs();
    } catch (err: any) {
      showToast('删除项目失败: ' + err.message, 'error');
    }
  }, [currentUser, fetchItems, fetchLogs, showToast]);

  const handleToggleItemPriority = useCallback(async (itemId: string, currentPriority: boolean, itemName: string) => {
    if (!currentUser) return;
    const nextPriority = !currentPriority;
    try {
      const { error } = await supabase
        .from('love_checklist_items')
        .update({ is_priority: nextPriority })
        .eq('id', itemId);
      if (error) throw error;

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'update',
        item_name: itemName,
        details: `${nextPriority ? '标记了' : '取消了'}清单项 "${itemName}" 为重点推荐 ⭐️`,
      });

      showToast(nextPriority ? '已标记为星标重点 ⭐️' : '已取消星标');
      fetchItems();
      fetchLogs();
    } catch (err: any) {
      showToast('更新优先级失败: ' + err.message, 'error');
    }
  }, [currentUser, fetchItems, fetchLogs, showToast]);

  // Mutations: Completions (Check-in entries)
  const handleCompleteItem = useCallback(async (itemId: string, itemName: string, completedAt: string, notes: string, mediaFiles: File[]) => {
    if (!currentUser) return;
    setChecklistUploading(true);

    try {
      const mediaUrls = await uploadMediaFiles(mediaFiles);

      // Create linked Task to memory timeline automatically
      const { data: taskData, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          title: `完成了打卡：${itemName}`,
          note: notes || '记录甜蜜的瞬间。',
          media: mediaUrls || [],
          created_by: currentUser.id,
          completed_at: completedAt ? new Date(completedAt).toISOString() : new Date().toISOString()
        })
        .select('id')
        .single();

      if (taskErr) throw taskErr;

      const { error: compErr } = await supabase
        .from('love_checklist_completions')
        .insert({
          item_id: itemId,
          completed_by: currentUser.id,
          completed_at: completedAt ? new Date(completedAt).toISOString() : new Date().toISOString(),
          notes: notes.trim() || null,
          task_id: taskData?.id || null,
          media: mediaUrls || null
        });

      if (compErr) throw compErr;

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'check',
        item_name: itemName,
        details: `完成了打卡: “${itemName}” 🎉`,
      });

      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#ff4d6d', '#ff758f', '#ffccd5'],
      });

      showToast('恭喜！完成打卡记录');
      fetchCompletions();
      fetchLogs();
    } catch (err: any) {
      showToast('打卡记录失败: ' + err.message, 'error');
      throw err;
    } finally {
      setChecklistUploading(false);
    }
  }, [currentUser, uploadMediaFiles, fetchCompletions, fetchLogs, showToast]);

  const handleEditCompletion = useCallback(async (compId: string, completedAt: string, notes: string, originalMedia: string[], newFiles: File[], itemName: string) => {
    if (!currentUser) return;
    setChecklistUploading(true);

    try {
      const newUrls = await uploadMediaFiles(newFiles);
      const combinedMedia = [...originalMedia, ...newUrls];

      const { error: compErr } = await supabase
        .from('love_checklist_completions')
        .update({
          completed_at: completedAt ? new Date(completedAt).toISOString() : new Date().toISOString(),
          notes: notes.trim() || null,
          media: combinedMedia.length > 0 ? combinedMedia : null
        })
        .eq('id', compId);

      if (compErr) throw compErr;

      // Update linked timeline task
      const { data: compData } = await supabase
        .from('love_checklist_completions')
        .select('task_id')
        .eq('id', compId)
        .single();

      if (compData && compData.task_id) {
        await supabase
          .from('tasks')
          .update({
            note: notes.trim() || '记录甜蜜的瞬间。',
            media: combinedMedia,
            completed_at: completedAt ? new Date(completedAt).toISOString() : new Date().toISOString()
          })
          .eq('id', compData.task_id);
      }

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'update',
        item_name: itemName,
        details: `更新了打卡记录: “${itemName}” 📝`,
      });

      showToast('记录修改成功');
      fetchCompletions();
      fetchLogs();
    } catch (err: any) {
      showToast('修改记录失败: ' + err.message, 'error');
    } finally {
      setChecklistUploading(false);
    }
  }, [currentUser, uploadMediaFiles, fetchCompletions, fetchLogs, showToast]);

  const handleDeleteCompletion = useCallback(async (comp: CompletionItem, itemName: string) => {
    if (!currentUser || !comp) return;

    try {
      // 1. Delete associated media from storage
      if (comp.media && comp.media.length > 0) {
        const paths = comp.media.map(getStoragePathFromUrl);
        await supabase.storage.from('media').remove(paths);
      }

      // 2. Delete linked timeline task
      if (comp.task_id) {
        await supabase.from('tasks').delete().eq('id', comp.task_id);
      }

      // 3. Delete completion row
      const { error } = await supabase
        .from('love_checklist_completions')
        .delete()
        .eq('id', comp.id);

      if (error) throw error;

      await supabase.from('love_checklist_logs').insert({
        operator_id: currentUser.id,
        action_type: 'uncheck',
        item_name: itemName,
        details: `撤销了打卡: “${itemName}” 🗑️`,
      });

      showToast('打卡记录已成功移除');
      fetchCompletions();
      fetchLogs();
    } catch (err: any) {
      showToast('删除记录失败: ' + err.message, 'error');
    }
  }, [currentUser, fetchCompletions, fetchLogs, showToast]);

  // Derived / computed states
  const getNickname = useCallback((userId: string) => {
    const p = profiles.find((prof) => prof.id === userId);
    return p ? p.nickname : '伴侣';
  }, [profiles]);

  return {
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
    showToast,
    getNickname,
    initData,
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
    handleToggleItemPriority,
    handleCompleteItem,
    handleEditCompletion,
    handleDeleteCompletion,
  };
};

export default useChecklistData;
