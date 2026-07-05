import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Trash2, Calendar, AlertCircle } from 'lucide-react';

interface PeriodHistoryProps {
  currentUser: any;
  profiles: any[];
}

interface PeriodLog {
  id: string;
  user_id: string;
  recorded_by: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export const PeriodHistory: React.FC<PeriodHistoryProps> = ({ currentUser, profiles }) => {
  const navigate = useNavigate();
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [logs, setLogs] = useState<PeriodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Find partner
  useEffect(() => {
    if (currentUser && profiles.length > 0) {
      const partner = profiles.find(p => p.id !== currentUser.id);
      setPartnerProfile(partner);
    }
  }, [currentUser, profiles]);

  const myProfile = React.useMemo(() => profiles.find(p => p.id === currentUser?.id), [profiles, currentUser]);
  const targetProfile = React.useMemo(() => {
    if (myProfile?.gender === 'princess') {
      return myProfile;
    }
    return partnerProfile;
  }, [myProfile, partnerProfile]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchLogs = async () => {
    if (!targetProfile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('period_logs')
        .select('*')
        .eq('user_id', targetProfile.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching period logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetProfile) {
      fetchLogs();
    }
  }, [targetProfile]);

  const handleDeleteLog = async (id: string) => {
    (window as any).showCustomConfirm(
      '确认删除 🗑️',
      '确定要删除这一条生理期历史记录吗？删除后将无法恢复。',
      async () => {
        try {
          const { error } = await supabase.from('period_logs').delete().eq('id', id);
          if (error) throw error;
          showToast('🗑️ 记录已成功删除');
          fetchLogs();
        } catch (err) {
          console.error(err);
          (window as any).showCustomAlert('错误', '删除失败，请检查网络。');
        }
      }
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-between px-4 py-6 font-sans select-none">
      
      {/* Toast alert */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-[10px] font-bold shadow-lg border bg-rose-50 text-rose-800 border-rose-200 animate-bounce-in">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-rose-100/50 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-rose-50 rounded-full text-rose-500 transition-all flex items-center justify-center border border-rose-100/40 shadow-2xs active:scale-95 bg-white/70"
          title="返回雷达主页"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-sm font-black text-rose-800 tracking-wider flex items-center space-x-1.5">
          <Calendar size={15} className="text-rose-500" />
          <span>历史生理期记录手账</span>
        </h2>
        <div className="w-9 h-9" /> {/* Spacer */}
      </div>

      {/* Main Logs List */}
      <div className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-xs font-bold text-rose-700/80 animate-pulse">
            正在读取生理期历史数据...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
            <AlertCircle size={28} className="text-gray-300" />
            <p className="text-xs text-gray-400 italic">暂无历史记录，开始记录第一笔吧~</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-0.5 max-h-[70vh] scrollbar-thin animate-slide-up">
            {logs.map((log) => {
              const start = new Date(log.start_date);
              const end = log.end_date ? new Date(log.end_date) : null;
              let duration = '进行中';
              if (end) {
                const diffMs = end.getTime() - start.getTime();
                duration = `${Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1}天`;
              }

              return (
                <div key={log.id} className="flex justify-between items-center bg-white/60 border border-rose-100/40 backdrop-blur-xs rounded-2xl p-4 shadow-3xs hover:border-rose-250 transition-all duration-300">
                  <div>
                    <div className="text-xs font-bold text-gray-700 font-mono">
                      {log.start_date.replace(/-/g, '.')} ~ {log.end_date ? log.end_date.replace(/-/g, '.') : '进行中'}
                    </div>
                    <span className="inline-block bg-rose-50 border border-rose-100/60 text-rose-600 text-[9px] font-extrabold px-2 py-0.5 rounded-md mt-1.5">
                      时长: {duration}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteLog(log.id)}
                    className="text-gray-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-full transition-all active:scale-95"
                    title="删除此条记录"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Button */}
      <div className="mt-6 pt-4 border-t border-rose-100/50 flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold tracking-widest transition shadow-md shadow-rose-200/50 hover:scale-102 active:scale-98"
        >
          返回雷达首页
        </button>
      </div>

    </div>
  );
};
