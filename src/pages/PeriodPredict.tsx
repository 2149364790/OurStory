import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Brain, Heart, Sparkles, AlertCircle, MessageCircle, Send, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PeriodPredictProps {
  currentUser: any;
  profiles: any[];
}

const parseMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return '';

  // 1. Basic HTML Escape to prevent XSS
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Parse Tables
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true;
      const cols = line.split('|').map(c => c.trim()).slice(1, -1);
      // Skip divider row
      if (cols.every(c => /^:-*|-+:?|:-+:$/.test(c))) {
        continue;
      }
      tableRows.push(cols);
    } else {
      if (inTable && tableRows.length > 0) {
        let tableHtml = '<div class="overflow-x-auto my-2 border border-rose-100 rounded-lg shadow-2xs"><table class="w-full text-left text-[10px] border-collapse bg-white">';
        tableRows.forEach((row, rowIndex) => {
          const isHeader = rowIndex === 0;
          tableHtml += `<tr class="${isHeader ? 'bg-rose-50/75 font-black text-rose-800 border-b border-rose-100' : 'border-b border-rose-50/50'}">`;
          row.forEach(col => {
            const tag = isHeader ? 'th' : 'td';
            tableHtml += `<${tag} class="px-2 py-1.5">${col}</${tag}>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</table></div>';
        processedLines.push(tableHtml);
        tableRows = [];
        inTable = false;
      }
      processedLines.push(lines[i]);
    }
  }

  if (inTable && tableRows.length > 0) {
    let tableHtml = '<div class="overflow-x-auto my-2 border border-rose-100 rounded-lg shadow-2xs"><table class="w-full text-left text-[10px] border-collapse bg-white">';
    tableRows.forEach((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      tableHtml += `<tr class="${isHeader ? 'bg-rose-50/75 font-black text-rose-800 border-b border-rose-100' : 'border-b border-rose-50/50'}">`;
      row.forEach(col => {
        const tag = isHeader ? 'th' : 'td';
        tableHtml += `<${tag} class="px-2 py-1.5">${col}</${tag}>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</table></div>';
    processedLines.push(tableHtml);
  }

  html = processedLines.join('\n');

  // 3. Bold replacements: **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-rose-950">$1</strong>');

  // 4. Bullet lists replacements
  html = html.replace(/^-\s+(.*)$/gm, '<li class="ml-4 list-disc font-semibold text-gray-700">$1</li>');

  // 5. Number lists replacements
  html = html.replace(/^\d+\.\s+(.*)$/gm, '<li class="ml-4 list-decimal font-semibold text-gray-700">$1</li>');

  // 6. Headers
  html = html.replace(/^###\s+(.*)$/gm, '<h3 class="text-xs font-black text-rose-900 mt-2.5 mb-1">$1</h3>');
  html = html.replace(/^####\s+(.*)$/gm, '<h4 class="text-[11px] font-black text-rose-900 mt-2 mb-1">$1</h4>');

  // 7. Newlines to br
  html = html.replace(/\n/g, '<br />');

  return html;
};

export const PeriodPredict: React.FC<PeriodPredictProps> = ({ currentUser, profiles }) => {
  const navigate = useNavigate();
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  // Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChatBadge, setShowChatBadge] = useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const loadingTexts = [
    'AI 正在读取雷达历史数据...',
    '捕捉最新体征信号中...',
    'DeepSeek 正在为您分析计算周期...',
    '正在撰写贴心求生指南...',
    '马上为您揭晓结果...'
  ];

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

  // Cycle loading texts
  useEffect(() => {
    if (generatingAi) {
      const interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % loadingTexts.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [generatingAi]);

  // Load predictions
  const runPrediction = async () => {
    if (!targetProfile || !currentUser) return;
    setGeneratingAi(true);
    setErrorMsg(null);

    try {
      // 1. Fetch latest 6 logs
      const { data: logsData, error: logsError } = await supabase
        .from('period_logs')
        .select('*')
        .eq('user_id', targetProfile.id)
        .order('start_date', { ascending: false })
        .limit(6);

      if (logsError) throw logsError;

      // 2. Fetch latest 10 observations
      const { data: obsData, error: obsError } = await supabase
        .from('period_observations')
        .select('*')
        .eq('user_id', targetProfile.id)
        .order('log_date', { ascending: false })
        .limit(10);

      if (obsError) throw obsError;

      if (!logsData || logsData.length === 0) {
        setAiReport({
          error: true,
          analysis: '暂无生理期历史数据，AI 预测至少需要一笔历史记录。请返回雷达主页进行历史补录。'
        });
        setGeneratingAi(false);
        setLoading(false);
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];

      // 3. Call Supabase edge function with role
      const { data, error } = await supabase.functions.invoke('predict-period', {
        body: {
          logs: logsData,
          observations: obsData || [],
          currentDate: todayStr,
          role: myProfile?.gender
        }
      });

      if (error) throw error;

      let processedData = data;
      const isPrincess = myProfile?.gender === 'princess';
      if (isPrincess && data) {
        // Fallback translator in case backend prompt version is cached or legacy
        const tips = data.care_tips ? data.care_tips.map((tip: string) => {
          return tip
            .replace(/她/g, '你')
            .replace(/女朋友/g, '自己')
            .replace(/Ta/g, '自己')
            .replace(/主分担家务，提醒自己/g, '适当减少家务，让自己')
            .replace(/这几天开启温柔包容模式，不要争论/g, '这几天对自己温柔一点，保持心情愉悦，不要纠结')
            .replace(/提前买好/g, '提前备好')
            .replace(/买好/g, '备好');
        }) : [];
        
        let analysis = data.analysis || '';
        analysis = analysis
          .replace(/她最近/g, '你最近')
          .replace(/她/g, '你')
          .replace(/女朋友/g, '自己');

        processedData = {
          ...data,
          analysis,
          care_tips: tips
        };
      }

      setAiReport(processedData);

      // Trigger celebrate confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.4 },
        colors: ['#ff4d6d', '#ffb3c1', '#f15bb5', '#fee4e6']
      });
    } catch (err: any) {
      console.error('AI Prediction error:', err);
      setErrorMsg(err.message || '网络连接超时，请确认您的数据库与网络状态正常');
    } finally {
      setGeneratingAi(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetProfile) {
      runPrediction();
    }
  }, [targetProfile]);

  // Scroll to bottom when chat messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleChipClick = async (question: string) => {
    if (chatLoading) return;
    const newMsg = { role: 'user' as const, content: question };
    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('predict-period', {
        body: {
          logs: [],
          observations: [],
          currentDate: new Date().toISOString().split('T')[0],
          role: myProfile?.gender,
          messages: updatedMessages
        }
      });
      if (error) throw error;
      if (data && data.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: '连接服务失败，请检查网络后再试 💡' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || chatLoading) return;

    const userText = inputVal.trim();
    setInputVal('');

    const newMsg = { role: 'user' as const, content: userText };
    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('predict-period', {
        body: {
          logs: [],
          observations: [],
          currentDate: new Date().toISOString().split('T')[0],
          role: myProfile?.gender,
          messages: updatedMessages
        }
      });
      if (error) throw error;
      if (data && data.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: '连接服务失败，请检查网络后再试 💡' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const isPrincess = myProfile?.gender === 'princess';
  const headerTitle = isPrincess ? 'DeepSeek 暖宫健康气象台' : 'DeepSeek 暖宫守护气象台';
  const cardTag = isPrincess ? '预测我的下一次生理期区间' : '预测她的下一次生理期区间';
  const analysisTitle = isPrincess ? '🦄 暖宫健康分析报告：' : '🕵️‍♂️ 恋爱秘书·守护报告：';
  const tipsTitle = isPrincess ? '🌸 本月小主自我保养指南：' : '✨ 本月特派守护与“求生”清单：';
  const bottomBtnText = isPrincess ? '收到！好好爱护自己' : '收到！安排体贴守护';

  const cardBgClass = isPrincess
    ? 'bg-gradient-to-br from-pink-400 to-rose-450'
    : 'bg-gradient-to-br from-rose-500 to-pink-500';
  const buttonBgClass = isPrincess
    ? 'bg-gradient-to-r from-pink-400 to-rose-450 hover:from-pink-500 hover:to-rose-500 shadow-pink-200/50'
    : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-rose-200/50';
  const probTextClass = isPrincess ? 'text-pink-600' : 'text-rose-600';
  const iconBgClass = isPrincess ? 'bg-pink-50 border-pink-100' : 'bg-rose-50 border-rose-100';
  const heartClass = isPrincess ? 'text-pink-500 fill-pink-500' : 'text-rose-500 fill-rose-500';

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-between px-4 py-6 font-sans select-none">
      
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
          <Brain size={15} className="text-rose-500 animate-pulse" />
          <span>{headerTitle}</span>
        </h2>
        <div className="w-9 h-9" /> {/* Spacer */}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center">
        {generatingAi || loading ? (
          /* Beating heart and cycling loader */
          <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-18 h-18 rounded-full border-4 border-rose-100 border-t-rose-500 animate-spin absolute" />
              <div className="w-16 h-16 rounded-full bg-rose-50/50 flex items-center justify-center shadow-inner">
                <Heart size={26} className="text-rose-500 animate-heartbeat fill-rose-500" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-black text-rose-800 tracking-wide animate-pulse">
                {loadingTexts[loadingTextIndex]}
              </p>
              <p className="text-[10px] text-gray-400">
                初次计算可能需要几秒钟，请稍候...
              </p>
            </div>
          </div>
        ) : errorMsg ? (
          /* Error feedback card */
          <div className="glass-panel p-6 rounded-3xl border border-rose-200 bg-white/60 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 bg-rose-100/50 rounded-full flex items-center justify-center mx-auto text-rose-500">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-sm font-extrabold text-rose-800">气象数据加载失败</h3>
            <p className="text-xs text-rose-700/80 leading-relaxed whitespace-pre-wrap">
              {errorMsg}
            </p>
            <button
              onClick={runPrediction}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold transition shadow-md shadow-rose-200/50 active:scale-95"
            >
              重新连接预测
            </button>
          </div>
        ) : aiReport?.error ? (
          /* Logical errors from cache or logs empty */
          <div className="glass-panel p-6 rounded-3xl border border-rose-200 bg-white/60 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 bg-rose-100/50 rounded-full flex items-center justify-center mx-auto text-rose-500">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-sm font-extrabold text-rose-800">无法预测</h3>
            <p className="text-xs text-rose-700/80 leading-relaxed">
              {aiReport.analysis}
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold transition shadow-md shadow-rose-200/50 active:scale-95"
            >
              返回雷达进行补录
            </button>
          </div>
        ) : (
          /* Success Report Display */
          <div className="space-y-6 animate-slide-up">
            
            {/* Predictions Card (Dashed ticket style) */}
            <div className={`${cardBgClass} text-white rounded-3xl p-6 space-y-4 text-center shadow-lg relative overflow-hidden`}>
              <div className="absolute top-[-10%] right-[-10%] w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="absolute bottom-[-15%] left-[-5%] w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
              
              <span className="inline-block bg-white/20 backdrop-blur-xs text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                {cardTag}
              </span>
              
              <h4 className="text-xl font-black tracking-wide drop-shadow-sm font-mono mt-2">
                {aiReport?.predicted_range || '计算中...'}
              </h4>
              
              {/* Divider dashed line */}
              <div className="border-t border-dashed border-white/35 my-2" />

              {/* Probability tag */}
              <div className="flex justify-center items-center space-x-2">
                <span className="text-[11px] font-bold text-pink-100">到来预测概率：</span>
                <span className={`bg-white ${probTextClass} text-xs font-black px-3 py-0.5 rounded-full shadow-xs`}>
                  {aiReport?.probability || '未知'}
                </span>
              </div>
            </div>

            {/* Analysis (Love Letter Theme) */}
            <div className="letter-theme-sunset rounded-3xl p-5 shadow-sm relative overflow-hidden font-love-letter border border-rose-100/40 bg-white/60">
              <div className="absolute top-0 right-0 w-8 h-8 opacity-20 border-r-2 border-t-2 border-rose-900 rounded-bl-3xl pointer-events-none" />
              <span className="block text-xs font-bold text-rose-900 mb-2.5 flex items-center">
                {analysisTitle}
              </span>
              <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap text-rose-950 font-sans tracking-wide">
                {aiReport?.analysis}
              </p>
            </div>

            {/* Tips Section */}
            {aiReport?.care_tips && aiReport.care_tips.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="block text-[11px] font-black text-rose-800 tracking-wider flex items-center">
                  <Sparkles size={13} className="mr-1 text-amber-500 animate-pulse" />
                  {tipsTitle}
                </span>
                <div className="space-y-2.5">
                  {aiReport.care_tips.map((tip: string, idx: number) => (
                    <div 
                      key={idx} 
                      className="flex items-start space-x-3 bg-white/70 border border-rose-100/50 rounded-2xl p-3.5 shadow-3xs hover:border-rose-200 transition-all duration-300"
                    >
                      <div className={`w-5 h-5 rounded-full ${iconBgClass} flex items-center justify-center flex-shrink-0 mt-0.5 border`}>
                        <Heart size={10} className={`${heartClass} animate-pulse`} />
                      </div>
                      <span className="text-xs font-bold text-gray-700 leading-normal">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Bottom Button */}
      {!generatingAi && !loading && (
        <div className="mt-6 pt-4 border-t border-rose-100/50 flex-shrink-0">
          <button
            onClick={() => navigate('/')}
            className={`w-full py-3 rounded-full ${buttonBgClass} text-white text-xs font-bold tracking-widest transition shadow-md hover:scale-102 active:scale-98 button-shimmer-container`}
          >
            {bottomBtnText}
          </button>
        </div>
      )}

      {/* AI Chat FAB & Drawer (B 方案) */}
      <div className="fixed bottom-24 right-6 sm:right-[calc(50%-200px)] z-50 flex flex-col items-end">
        {/* Floating action button with breathing effect */}
        {!isChatOpen && (
          <button
            onClick={() => {
              setIsChatOpen(true);
              setShowChatBadge(false);
            }}
            className={`relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer transform hover:scale-110 active:scale-95 transition-all duration-300 ${
              isPrincess
                ? 'bg-gradient-to-br from-pink-400 to-rose-450 shadow-pink-300/40 animate-pulse-glow'
                : 'bg-gradient-to-br from-rose-500 to-pink-500 shadow-rose-400/30 animate-pulse-glow'
            }`}
            title="AI 生理助手问答"
          >
            <MessageCircle size={24} />
            {showChatBadge && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping" />
            )}
            {showChatBadge && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>
        )}

        {/* Chat Drawer Overlay */}
        {isChatOpen && (
          <div className="w-[320px] sm:w-[360px] h-[480px] bg-white/95 backdrop-blur-md rounded-3xl border border-rose-100/50 shadow-2xl flex flex-col overflow-hidden animate-slide-up relative z-[99] mb-2">
            {/* Header */}
            <div className={`p-4 text-white flex justify-between items-center ${
              isPrincess
                ? 'bg-gradient-to-r from-pink-400 to-rose-450'
                : 'bg-gradient-to-r from-rose-500 to-pink-500'
            }`}>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Brain size={16} className="text-white animate-pulse" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black tracking-wide">
                    {isPrincess ? '暖宫健康助手' : '求生守护军师'}
                  </h3>
                  <span className="text-[8px] opacity-75 font-bold">DeepSeek AI 实时在线</span>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Conversation Messages Box */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-rose-50/15">
              {chatMessages.length === 0 ? (
                /* Starter Page */
                <div className="h-full flex flex-col justify-center items-center text-center p-2 space-y-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                    isPrincess ? 'bg-pink-50 text-pink-500' : 'bg-rose-50 text-rose-500'
                  }`}>
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-700">
                      {isPrincess ? '哈喽小公主！今天身体有什么疑问吗？' : '哈喽王子！遇到什么棘手的求生问题了吗？'}
                    </p>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      我可以为您提供生理期饮食禁忌、痛经缓解、情绪抚慰、红糖姜茶做法等建议。
                    </p>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="w-full space-y-1.5 pt-1">
                    <span className="block text-[9px] text-gray-400 font-bold text-left">您可以这样问我：</span>
                    <div className="flex flex-col space-y-1.5">
                      {(isPrincess
                        ? ['痛经怎么快速缓解？', '生理期吃什么能够补铁？', '这几天可以喝奶茶/咖啡吗？']
                        : ['她痛经特别厉害，我该怎么办？', '她生理期心情不好，我怎么哄她？', '红糖姜茶的正确比例和做法？']
                      ).map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleChipClick(q)}
                          className="w-full text-left text-[10px] font-bold py-2 px-3 border border-rose-100/40 rounded-xl bg-white/60 hover:bg-rose-50 text-gray-600 transition cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Message List */
                <div className="space-y-3">
                  {chatMessages.map((m, idx) => {
                    const isUser = m.role === 'user';
                    return (
                      <div
                        key={idx}
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                      >
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed font-semibold text-left shadow-3xs ${
                          isUser
                            ? isPrincess
                              ? 'bg-pink-400 text-white rounded-tr-none'
                              : 'bg-rose-500 text-white rounded-tr-none'
                            : 'bg-white text-gray-700 border border-rose-100/30 rounded-tl-none'
                        }`}>
                          {isUser ? (
                            m.content
                          ) : (
                            <div 
                              className="space-y-1.5 markdown-body"
                              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(m.content) }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {chatLoading && (
                    <div className="flex justify-start animate-pulse">
                      <div className="bg-white text-gray-400 border border-rose-100/30 rounded-2xl rounded-tl-none px-3 py-2 text-[10px] font-bold flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-rose-50 bg-white flex items-center space-x-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={isPrincess ? "输入您身体的小疑问..." : "输入女朋友的体征或如何关心..."}
                disabled={chatLoading}
                className="flex-1 text-xs border border-rose-100/50 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-300 placeholder-gray-400 bg-rose-50/10"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || chatLoading}
                className={`p-2 rounded-xl text-white transition-all active:scale-95 disabled:opacity-35 cursor-pointer ${
                  isPrincess ? 'bg-pink-400' : 'bg-rose-500'
                }`}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
};
