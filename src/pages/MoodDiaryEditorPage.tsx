import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Undo } from 'lucide-react';

const MOODS = [
  { id: 'happy', emoji: '😊', label: '开心/超棒' },
  { id: 'neutral', emoji: '😐', label: '平静/一般' },
  { id: 'sad', emoji: '😢', label: '难过/失落' },
  { id: 'angry', emoji: '😠', label: '生气/郁闷' },
  { id: 'anxious', emoji: '😰', label: '焦虑/烦躁' }
];

const HIGHLIGHT_COLORS = [
  { id: 'none', label: '无', color: 'transparent' },
  { id: 'purple', label: '紫色', color: '#d8b4fe' },
  { id: 'pink', label: '粉色', color: '#fbcfe8' },
  { id: 'orange', label: '橙色', color: '#fed7aa' },
  { id: 'mint', label: '薄荷色', color: '#a7f3d0' },
  { id: 'blue', label: '蓝色', color: '#bae6fd' }
];

export const MoodDiaryEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [existingLog, setExistingLog] = useState<any>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Form states
  const [myMood, setMyMood] = useState('neutral');
  const [partnerMood, setPartnerMood] = useState('neutral');
  const [diaryTitle, setDiaryTitle] = useState('');
  const [diaryContent, setDiaryContent] = useState('');
  const [myMoodOpen, setMyMoodOpen] = useState(false);
  const [partnerMoodOpen, setPartnerMoodOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Floating Selection Tooltip Coordinates
  const [selectionCoords, setSelectionCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fetch existing log for the date
  useEffect(() => {
    if (!currentUser) return;
    const fetchExisting = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('mood_logs')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('log_date', dateStr)
          .maybeSingle();

        if (!error && data) {
          setExistingLog(data);
          setMyMood(data.my_mood);
          setPartnerMood(data.partner_mood);
          setDiaryTitle(data.diary_title || '');
          setDiaryContent(data.diary_content || '');
        } else {
          setExistingLog(null);
          setMyMood('neutral');
          setPartnerMood('neutral');
          setDiaryTitle('');
          setDiaryContent('');
        }
      } catch (err) {
        console.error('Error fetching log:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExisting();
  }, [currentUser, dateStr]);

  // Sync contentEditable content on load
  useEffect(() => {
    if (!loading && editorRef.current) {
      editorRef.current.innerHTML = diaryContent;
    }
  }, [loading]);

  // Listen to text selection change to show/hide floating highlighter color picker
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
        setSelectionCoords(null);
        return;
      }

      const editor = editorRef.current;
      if (!editor || !editor.contains(selection.anchorNode)) {
        setSelectionCoords(null);
        return;
      }

      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Position tooltip exactly above the selection rectangle
        setSelectionCoords({
          top: rect.top - 46, 
          left: rect.left + rect.width / 2
        });
      } catch (e) {
        setSelectionCoords(null);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Get current HTML from contentEditable div
    const currentHtmlContent = editorRef.current ? editorRef.current.innerHTML : '';

    const moodScore: Record<string, number> = {
      happy: 5,
      neutral: 3,
      sad: 1,
      angry: 2,
      anxious: 2
    };

    const myScoreValue = moodScore[myMood] || 3;
    const partnerScoreValue = moodScore[partnerMood] || 3;

    setSaving(true);
    try {
      if (existingLog) {
        // Update
        const { error } = await supabase
          .from('mood_logs')
          .update({
            my_mood: myMood,
            my_score: myScoreValue,
            partner_mood: partnerMood,
            partner_score: partnerScoreValue,
            diary_title: diaryTitle,
            diary_content: currentHtmlContent
          })
          .eq('id', existingLog.id);

        if (error) throw error;
        showToast('✍️ 日记更新成功');
      } else {
        // Create
        const { error } = await supabase
          .from('mood_logs')
          .insert({
            user_id: currentUser.id,
            log_date: dateStr,
            my_mood: myMood,
            my_score: myScoreValue,
            partner_mood: partnerMood,
            partner_score: partnerScoreValue,
            diary_title: diaryTitle,
            diary_content: currentHtmlContent
          });

        if (error) throw error;
        showToast('💖 今天的日记已封存入册');
      }
      setTimeout(() => navigate(-1), 1000);
    } catch (err) {
      console.error('Error saving diary:', err);
      showToast('❌ 保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const applyHighlight = (color: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('hiliteColor', false, color);
    
    // Clear selection ranges to hide tooltip
    window.getSelection()?.removeAllRanges();
    setSelectionCoords(null);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 select-none min-h-screen flex flex-col justify-between relative">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-[10px] font-bold shadow-lg border bg-rose-50 text-rose-800 border-rose-200 animate-bounce-in">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Editor Main Card */}
      <div className="flex-1 flex flex-col justify-between">
        
        {/* Editor Body */}
        <form onSubmit={handleSave} className="flex-grow flex flex-col">
          
          {/* Notepad Page Container */}
          <div className="flex-grow rounded-[32px] p-6 border border-gray-200 shadow-md flex flex-col relative bg-white text-gray-800">
            
            {/* Lined paper lines decorations */}
            <div className="absolute inset-0 bg-repeating-lines opacity-10 pointer-events-none rounded-[32px]" />

            {/* Editor Header */}
            <div className="flex justify-between items-center border-b border-black/10 pb-3 mb-4 flex-shrink-0 relative z-10">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="p-1.5 hover:bg-black/5 rounded-xl transition"
                >
                  <ArrowLeft size={16} />
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevents contentEditable focus loss
                    document.execCommand('undo');
                  }}
                  className="p-1.5 hover:bg-black/5 rounded-xl transition text-rose-500 flex items-center justify-center"
                  title="撤销 (Undo)"
                >
                  <Undo size={15} />
                </button>

                <span className="text-[10px] font-black tracking-wider uppercase font-mono pl-1">
                  {dateStr.replace(/-/g, '.')}
                </span>
              </div>

              <button
                type="submit"
                disabled={saving || loading}
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-[10px] font-black tracking-wider shadow-2xs hover:scale-102 active:scale-98 transition-all animate-bounce-in"
              >
                {saving ? '封存中...' : '封存入册'}
              </button>
            </div>

            {loading ? (
              <div className="flex-grow flex items-center justify-center text-[10px] font-bold animate-pulse">
                正在铺展信纸...
              </div>
            ) : (
              <div className="flex-grow flex flex-col space-y-4 relative z-10">
                
                {/* Select Moods */}
                <div className="grid grid-cols-2 gap-4 relative">
                  <div className="relative">
                    <label className="block text-[8px] font-black opacity-60 mb-1">今天我的心情</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMyMoodOpen(!myMoodOpen);
                        setPartnerMoodOpen(false);
                      }}
                      className="w-full flex items-center justify-between text-xs border border-gray-200/80 rounded-xl px-2.5 py-2 bg-white/70 hover:bg-white active:scale-98 transition-all duration-200 text-gray-800 shadow-3xs"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm filter drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.15)]">{MOODS.find(m => m.id === myMood)?.emoji}</span>
                        <span className="font-extrabold text-[10px] text-gray-700">{MOODS.find(m => m.id === myMood)?.label}</span>
                      </div>
                      <span className="text-gray-400 text-[8px] scale-75 transition-transform duration-300" style={{ transform: myMoodOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </button>
                    {myMoodOpen && (
                      <React.Fragment>
                        <div className="fixed inset-0 z-30" onClick={() => setMyMoodOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1 z-40 bg-white/95 backdrop-blur-md border border-gray-150 rounded-2xl p-1 shadow-lg space-y-0.5 border-rose-100/40 animate-bounce-in">
                          {MOODS.map(m => {
                            const isSelected = m.id === myMood;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setMyMood(m.id);
                                  setMyMoodOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all duration-200 ${
                                  isSelected 
                                    ? 'bg-rose-50/70 text-rose-900 font-black' 
                                    : 'hover:bg-gray-50 text-gray-700'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm filter drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.15)]">{m.emoji}</span>
                                  <span className="text-[10px] font-bold">{m.label}</span>
                                </div>
                                {isSelected && <span className="text-rose-500 text-[8px]">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </React.Fragment>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-[8px] font-black opacity-60 mb-1">伴侣的心情感觉像</label>
                    <button
                      type="button"
                      onClick={() => {
                        setPartnerMoodOpen(!partnerMoodOpen);
                        setMyMoodOpen(false);
                      }}
                      className="w-full flex items-center justify-between text-xs border border-gray-200/80 rounded-xl px-2.5 py-2 bg-white/70 hover:bg-white active:scale-98 transition-all duration-200 text-gray-800 shadow-3xs"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm filter drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.15)]">{MOODS.find(m => m.id === partnerMood)?.emoji}</span>
                        <span className="font-extrabold text-[10px] text-gray-700">{MOODS.find(m => m.id === partnerMood)?.label}</span>
                      </div>
                      <span className="text-gray-400 text-[8px] scale-75 transition-transform duration-300" style={{ transform: partnerMoodOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </button>
                    {partnerMoodOpen && (
                      <React.Fragment>
                        <div className="fixed inset-0 z-30" onClick={() => setPartnerMoodOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1 z-40 bg-white/95 backdrop-blur-md border border-gray-150 rounded-2xl p-1 shadow-lg space-y-0.5 border-rose-100/40 animate-bounce-in">
                          {MOODS.map(m => {
                            const isSelected = m.id === partnerMood;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setPartnerMood(m.id);
                                  setPartnerMoodOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all duration-200 ${
                                  isSelected 
                                    ? 'bg-rose-50/70 text-rose-900 font-black' 
                                    : 'hover:bg-gray-50 text-gray-700'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm filter drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.15)]">{m.emoji}</span>
                                  <span className="text-[10px] font-bold">{m.label}</span>
                                </div>
                                {isSelected && <span className="text-rose-500 text-[8px]">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </React.Fragment>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="给今天的碎碎念起个小标题吧..."
                    value={diaryTitle}
                    onChange={(e) => setDiaryTitle(e.target.value)}
                    className="w-full text-sm font-black border-b border-black/5 pb-2 focus:outline-none focus:border-rose-350 bg-transparent placeholder-black/30"
                  />
                </div>

                {/* Rich text contenteditable div for highlights */}
                <div className="flex-grow flex flex-col min-h-[150px] pb-10">
                  <div
                    ref={editorRef}
                    contentEditable
                    className="w-full flex-grow text-xs bg-transparent border-none focus:outline-none resize-none leading-relaxed min-h-[150px] outline-none"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                </div>

              </div>
            )}

          </div>

        </form>

      </div>

      {/* Floating Rich Text Selection Highlighter Palette Tooltip */}
      {selectionCoords && (
        <div 
          style={{ 
            position: 'fixed', 
            top: `${selectionCoords.top}px`, 
            left: `${selectionCoords.left}px`, 
            transform: 'translateX(-50%)',
            zIndex: 100 
          }}
          className="bg-white/80 backdrop-blur-md border border-gray-150 rounded-full px-2.5 py-1.5 shadow-lg flex items-center space-x-2 animate-bounce-in border-rose-100"
        >
          {HIGHLIGHT_COLORS.map(hc => (
            <button
              key={hc.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // Keep selection
                applyHighlight(hc.color);
              }}
              className="w-7 h-7 rounded-full border border-black/5 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-3xs"
              style={{ backgroundColor: hc.id === 'none' ? '#ffffff' : hc.color }}
              title={hc.label}
            >
              {hc.id === 'none' && (
                <span className="text-[8px] text-gray-400 font-bold">✕</span>
              )}
            </button>
          ))}
        </div>
      )}

    </div>
  );
};
export default MoodDiaryEditorPage;
