import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export const MoodJournal: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [logsCount, setLogsCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const fetchLogsCount = async () => {
      try {
        const { count, error } = await supabase
          .from('mood_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id);

        if (!error && count !== null) {
          setLogsCount(count);
        }
      } catch (err) {
        console.error('Error fetching logs count:', err);
      }
    };
    fetchLogsCount();
  }, [currentUser]);

  return (
    <div className="glass-panel rounded-[28px] p-5 border border-white/60 custom-shadow bg-white/45 flex items-center justify-between hover:scale-[1.01] transition-all duration-300 relative overflow-hidden select-none">
      <div className="flex items-center space-x-3.5 relative z-10">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-400 to-pink-400 flex items-center justify-center text-white shadow-2xs">
          <BookOpen size={20} className="animate-pulse" />
        </div>
        <div>
          <h4 className="text-xs font-black text-rose-800 tracking-wider">📖 我的私密心情日志本</h4>
          <p className="text-[10px] text-gray-400 font-bold mt-0.5">写下碎碎念，封存小美好 • 已记录 {logsCount} 篇</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate('/mood')}
        className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-[10px] font-black tracking-wider transition-all duration-300 active:scale-95 shadow-2xs hover:shadow-xs relative z-10"
      >
        翻开手账
      </button>

      {/* Soft background decor glow */}
      <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full blur-[25px] bg-rose-400/10 pointer-events-none" />
    </div>
  );
};
export default MoodJournal;
