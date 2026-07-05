import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import confetti from 'canvas-confetti';
import { Heart, ChevronLeft, Award, RotateCcw, AlertTriangle, UserCheck, Flame } from 'lucide-react';

const RULES = [
  { id: 1, text: "绝不和异性搞暧昧", detail: "保持边界感，只给对方唯一的偏爱和安全感。" },
  { id: 2, text: "随时能够联系到", detail: "看到消息第一之间回复，不让对方陷入焦虑和胡思乱想中。" },
  { id: 3, text: "绝不在有异性的情况下过夜", detail: "主动避嫌，洁身自好是维系绝对信任的基石。" },
  { id: 4, text: "吵架时不能不接电话且挂电话", detail: "保持沟通渠道通畅，冷战比吵架更伤害感情。" },
  { id: 5, text: "不可以忘记特殊日子", detail: "每一个纪念日和重要节日，都是平淡生活里的爱意仪式。" },
  { id: 6, text: "出去玩要告知对方", detail: "主动报备行程，让对方感到被尊重与安心。" },
  { id: 7, text: "绝不撒谎", detail: "诚实是爱情的底线，一次谎言需要无数次信任去修复。" },
  { id: 8, text: "早上和晚上都要亲切问候", detail: "一句早安和晚安，是开启和结束一天的浪漫习惯。" },
  { id: 9, text: "绝不玩失踪，一天找不到人", detail: "断联是感情的冷酷杀手，有事外出务必提前交待。" },
  { id: 10, text: "当天事情当天解决，绝不过夜", detail: "矛盾不积累，睡前一定要把心结解开拥抱和好。" },
  { id: 11, text: "不开心心烦可以但不可以不告诉对方", detail: "情绪要共享，不开心时我们一起分担，不要独自封闭。" },
  { id: 12, text: "每天晚上尽量早点休息", detail: "爱护身体，规律作息，健康地携手走向长远的未来。" },
  { id: 13, text: "只要是对的就要听对方的", detail: "以理服人，少一些无谓的执拗，多一份宽容与倾听。" },
  { id: 14, text: "不能说很重的粗话", detail: "再愤怒也不用尖锐的言语伤害最爱的人，良言一句三冬暖。" },
  { id: 15, text: "两个人都要学会认错，但是男方要稍微大度一点", detail: "包容对方的小脾气，先低头的人不是输了，而是更爱。" },
  { id: 16, text: "未尽事宜双方共同协商修改，修改补充与本合约同等效力", detail: "规则是死的人是活的，用爱沟通，随成长共同完善契约。" }
];

export const Contract: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Expanded rule list state
  const [expandedRule, setExpandedRule] = useState<number | null>(null);

  // Canvas Drawing States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);

  // Fingerprint Pressing States
  const [pressProgress, setPressProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const pressTimerRef = useRef<any>(null);

  // Active duration since signed_at
  const [activeDuration, setActiveDuration] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        fetchData(user.id);
      }
    });

    // Realtime database listener for database updates
    const contractChannel = supabase
      .channel('public:love_contract')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'love_contract' },
        (payload) => {
          if (payload.new) {
            setContract(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contractChannel);
      if (pressTimerRef.current) clearInterval(pressTimerRef.current);
    };
  }, []);

  // Update contract runtime duration clock
  useEffect(() => {
    if (contract && contract.signed_at) {
      const interval = setInterval(() => {
        const signedTime = new Date(contract.signed_at).getTime();
        const now = new Date().getTime();
        const diffMs = now - signedTime;

        if (diffMs > 0) {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
          setActiveDuration({ days, hours, mins, secs });
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [contract]);

  const fetchData = async (userId: string) => {
    try {
      // 1. Fetch profiles
      const { data: profs } = await supabase.from('profiles').select('*');
      if (profs) {
        setProfiles(profs);
        const me = profs.find(p => p.id === userId);
        if (me) setMyProfile(me);
      }

      // 2. Fetch contract record
      const { data, error } = await supabase
        .from('love_contract')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .maybeSingle();

      if (!error && data) {
        setContract(data);
      } else {
        // Fallback: If not found, insert default record
        const { data: inserted } = await supabase
          .from('love_contract')
          .insert({ id: '00000000-0000-0000-0000-000000000000', status: 'draft' })
          .select()
          .single();
        if (inserted) setContract(inserted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Canvas Drawing Actions
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawingAction = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Submit hand drawn signature
  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn || !currentUser || !myProfile) return;

    const base64Data = canvas.toDataURL('image/png');
    const isPrince = myProfile.gender === 'prince';

    const updatePayload: any = {};
    if (isPrince) {
      updatePayload.groom_signature = base64Data;
      updatePayload.groom_signed_at = new Date().toISOString();
    } else {
      updatePayload.bride_signature = base64Data;
      updatePayload.bride_signed_at = new Date().toISOString();
    }

    try {
      const { error } = await supabase
        .from('love_contract')
        .update(updatePayload)
        .eq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      // Close modal and show confetti
      setSignatureModalOpen(false);
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.7 },
        colors: ['#ff4d6d', '#ffccd5']
      });

      // Refetch
      fetchData(currentUser.id);
    } catch (err: any) {
      alert('签名上传失败: ' + err.message);
    }
  };

  // Clear signature to resign
  const handleResetSignature = async () => {
    if (!currentUser || !myProfile) return;
    const isPrince = myProfile.gender === 'prince';

    (window as any).showCustomConfirm(
      '重新签名 ✏️',
      '确定要清除当前的签名并重新签字吗？',
      async () => {
        const updatePayload: any = {};
        if (isPrince) {
          updatePayload.groom_signature = null;
          updatePayload.groom_signed_at = null;
        } else {
          updatePayload.bride_signature = null;
          updatePayload.bride_signed_at = null;
        }

        // Also reset signed status if it was locked
        updatePayload.status = 'draft';
        updatePayload.signed_at = null;

        try {
          const { error } = await supabase
            .from('love_contract')
            .update(updatePayload)
            .eq('id', '00000000-0000-0000-0000-000000000000');
          if (error) throw error;
          fetchData(currentUser.id);
        } catch (err: any) {
          alert('重置失败: ' + err.message);
        }
      }
    );
  };

  // Fingerprint Interaction logic
  const handleFingerprintPressStart = () => {
    if (!contract || contract.status === 'signed') return;
    if (!contract.groom_signature || !contract.bride_signature) {
      (window as any).showCustomAlert('签约受阻 ⚠️', '需要双方都写下签名后，才能启动指纹誓约融合仪式！');
      return;
    }

    setIsPressing(true);
    setPressProgress(0);

    pressTimerRef.current = setInterval(() => {
      setPressProgress(prev => {
        if (prev >= 100) {
          clearInterval(pressTimerRef.current);
          handleContractCompletion();
          return 100;
        }
        return prev + 5; // Reaches 100% in 2 seconds (20 steps of 100ms)
      });
    }, 100);
  };

  const handleFingerprintPressEnd = () => {
    setIsPressing(false);
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
    }
    setPressProgress(0);
  };

  const handleContractCompletion = async () => {
    try {
      const { error } = await supabase
        .from('love_contract')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      // Burst of romantic hearts confetti
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.4 },
        colors: ['#ff4d6d', '#ff85a1', '#ff0a54', '#ff70a6', '#f3c6f1'],
      });

      // Show floating hearts effect in body
      for (let i = 0; i < 20; i++) {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'heart-particle';
          el.innerText = '💖';
          el.style.left = `${Math.random() * 80 + 10}vw`;
          el.style.fontSize = `${20 + Math.random() * 20}px`;
          el.style.setProperty('--drift', `${(Math.random() - 0.5) * 150}px`);
          el.style.setProperty('--rotation', `${Math.random() * 90 - 45}deg`);
          el.style.animationDuration = `${Math.random() * 1.5 + 2.5}s`;
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 4000);
        }, i * 80);
      }

      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 400]);
      }

      fetchData(currentUser.id);
    } catch (e: any) {
      alert('锁定契约失败: ' + e.message);
    }
  };

  // Find partner profiles
  const groomProfile = profiles.find(p => p.gender === 'prince');
  const brideProfile = profiles.find(p => p.gender === 'princess');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Heart className="text-rose-500 animate-heartbeat" size={40} fill="currentColor" />
        <p className="text-xs text-rose-600/70 font-semibold mt-4">正在载入永恒的誓言...</p>
      </div>
    );
  }

  const isSigned = contract?.status === 'signed';

  return (
    <div className="px-4 pb-28 pt-4 max-w-md mx-auto relative select-none">
      
      {/* Top bar */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2.5 rounded-full bg-white/40 hover:bg-white/60 border border-white/40 text-rose-700 transition"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-handwritten text-xl text-rose-600 font-bold">永恒不分手契约</span>
        <div className="w-10" /> {/* Balancer */}
      </div>

      <div className="space-y-6">
        
        {/* Core Certificate Banner */}
        <div className="relative glass-panel rounded-3xl p-6 border border-white/50 text-center overflow-hidden custom-shadow">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-amber-300/10 pointer-events-none" />
          
          {/* Animated Glow Border if signed */}
          {isSigned && (
            <div className="absolute inset-0 border-2 border-rose-500/60 rounded-3xl animate-pulse pointer-events-none z-10" />
          )}

          <Flame size={24} className="text-rose-500 animate-bounce mx-auto mb-2" fill="currentColor" />
          <h2 className="text-lg font-black text-rose-800 tracking-wide">
            {isSigned ? '💞 我们的爱情终身保障契约 💞' : '📜 我们的一辈子爱情协议书'}
          </h2>
          
          {isSigned ? (
            <div className="mt-4 space-y-2">
              <div className="bg-rose-500/10 border border-rose-400/40 rounded-2xl py-3 px-2 inline-block shadow-inner">
                <span className="text-xs font-bold text-rose-700 block mb-1">契约安全护航中</span>
                <div className="flex justify-center items-baseline space-x-1.5 font-mono text-rose-800">
                  <span className="text-3xl font-extrabold">{activeDuration.days}</span>
                  <span className="text-[10px] font-bold">天</span>
                  <span className="text-xl font-bold">{String(activeDuration.hours).padStart(2, '0')}</span>
                  <span className="text-[10px] font-bold">时</span>
                  <span className="text-xl font-bold">{String(activeDuration.mins).padStart(2, '0')}</span>
                  <span className="text-[10px] font-bold">分</span>
                  <span className="text-lg font-semibold animate-timer-beat">{String(activeDuration.secs).padStart(2, '0')}</span>
                  <span className="text-[10px] font-bold">秒</span>
                </div>
              </div>
              <p className="text-[10px] text-rose-600/70 font-semibold leading-normal pt-1">
                本协议于 {new Date(contract.signed_at).toLocaleDateString()} 锁定生效<br />
                双方向全宇宙见证：不管在什么情况下，都不离不弃，绝不分手！
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] text-rose-500/80 font-bold max-w-xs mx-auto leading-relaxed">
                协议正在拟定中。需要双方手写签名，并在页面下方联合按压指纹启动誓言仪式，锁定本终身契约。
              </p>
            </div>
          )}
        </div>

        {/* 16 Rules Accordion Grid */}
        <div className="glass-panel rounded-3xl p-5 border border-white/40 custom-shadow">
          <h3 className="text-sm font-black text-rose-800 mb-3.5 flex items-center space-x-1.5">
            <Award size={16} className="text-rose-500" />
            <span>爱情约法十六章</span>
          </h3>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {RULES.map((rule) => {
              const isExpanded = expandedRule === rule.id;
              return (
                <div
                  key={rule.id}
                  onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                  className={`p-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isExpanded
                      ? 'bg-rose-500/10 border-rose-400/50 shadow-sm'
                      : 'bg-white/40 border-white/50 hover:bg-white/60'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-rose-700 leading-snug">
                      {rule.id}. {rule.text}
                    </span>
                    <span className="text-[10px] font-extrabold text-rose-400">
                      {isExpanded ? '收起 ▴' : '详情 ▾'}
                    </span>
                  </div>
                  
                  {isExpanded && (
                    <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-2 pl-4 border-l-2 border-rose-300 animate-slide-down">
                      {rule.detail}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Humorous Punishments Warning Panels */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Groom Curse */}
          <div className="glass-panel rounded-3xl p-4 border border-rose-200/40 bg-rose-50/15 relative overflow-hidden">
            <div className="absolute top-1 right-1 opacity-20 text-rose-300">
              <AlertTriangle size={32} />
            </div>
            <h4 className="text-[11px] font-black text-rose-700 flex items-center space-x-1 mb-1.5">
              <span>👨‍💻 男方违约诅咒</span>
            </h4>
            <ul className="text-[9px] text-gray-500 space-y-1 font-semibold leading-relaxed">
              <li>• 终身再难寻真爱</li>
              <li>• 打游戏队友全挂机</li>
              <li>• 抢车票永远售罄</li>
              <li>• 剪头发总是惨不忍睹</li>
              <li>• 余额永久80元以下</li>
              <li className="text-rose-600 font-bold">• 终身“站”不起来！</li>
            </ul>
          </div>

          {/* Bride Curse */}
          <div className="glass-panel rounded-3xl p-4 border border-rose-200/40 bg-pink-50/15 relative overflow-hidden">
            <div className="absolute top-1 right-1 opacity-20 text-rose-300">
              <AlertTriangle size={32} />
            </div>
            <h4 className="text-[11px] font-black text-rose-700 flex items-center space-x-1 mb-1.5">
              <span>👸 女方违约诅咒</span>
            </h4>
            <ul className="text-[9px] text-gray-500 space-y-1 font-semibold leading-relaxed">
              <li>• 终身被各种渣男骗</li>
              <li>• 逛街全买假化妆品</li>
              <li>• 天天被好闺蜜挖坑</li>
              <li>• 人越来越不好看</li>
              <li>• 体重身材越来越胖</li>
              <li className="text-rose-600 font-bold">• 变成孤家没人要！</li>
            </ul>
          </div>

        </div>

        {/* Signature Box Section */}
        <div className="glass-panel rounded-3xl p-5 border border-white/40 custom-shadow space-y-4">
          <h3 className="text-sm font-black text-rose-800 flex items-center space-x-1.5">
            <UserCheck size={16} className="text-rose-500" />
            <span>双方盖章签字</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            
            {/* Groom Signature Panel */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-white/50 border border-white/60 relative">
              <span className="text-[10px] font-bold text-rose-600 mb-2">男方签字 (王子)</span>
              
              {contract?.groom_signature ? (
                <div className="w-full aspect-[2/1] border border-rose-100 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                  <img src={contract.groom_signature} className="w-full h-full object-contain" alt="男方签名" />
                </div>
              ) : (
                <div className="w-full aspect-[2/1] border border-dashed border-rose-200 rounded-xl flex items-center justify-center bg-rose-50/20 text-rose-300 text-[10px] font-bold">
                  未签署
                </div>
              )}

              <span className="text-[8px] text-gray-400 mt-1 font-mono">
                {groomProfile?.nickname || '未设定'}
              </span>

              {/* Show resign button if signed draft */}
              {contract?.groom_signature && !isSigned && myProfile?.gender === 'prince' && (
                <button
                  onClick={handleResetSignature}
                  className="mt-2 text-[8px] font-bold text-rose-500 flex items-center space-x-0.5 hover:underline"
                >
                  <RotateCcw size={8} />
                  <span>重写</span>
                </button>
              )}

              {/* Sign button for prince */}
              {!contract?.groom_signature && myProfile?.gender === 'prince' && (
                <button
                  onClick={() => setSignatureModalOpen(true)}
                  className="mt-2 px-3 py-1.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-bold shadow-md transition active:scale-95"
                >
                  去手写签名
                </button>
              )}
            </div>

            {/* Bride Signature Panel */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-white/50 border border-white/60 relative">
              <span className="text-[10px] font-bold text-rose-600 mb-2">女方签字 (公主)</span>
              
              {contract?.bride_signature ? (
                <div className="w-full aspect-[2/1] border border-rose-100 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                  <img src={contract.bride_signature} className="w-full h-full object-contain" alt="女方签名" />
                </div>
              ) : (
                <div className="w-full aspect-[2/1] border border-dashed border-rose-200 rounded-xl flex items-center justify-center bg-rose-50/20 text-rose-300 text-[10px] font-bold">
                  未签署
                </div>
              )}

              <span className="text-[8px] text-gray-400 mt-1 font-mono">
                {brideProfile?.nickname || '未设定'}
              </span>

              {/* Show resign button if signed draft */}
              {contract?.bride_signature && !isSigned && myProfile?.gender === 'princess' && (
                <button
                  onClick={handleResetSignature}
                  className="mt-2 text-[8px] font-bold text-rose-500 flex items-center space-x-0.5 hover:underline"
                >
                  <RotateCcw size={8} />
                  <span>重写</span>
                </button>
              )}

              {/* Sign button for princess */}
              {!contract?.bride_signature && myProfile?.gender === 'princess' && (
                <button
                  onClick={() => setSignatureModalOpen(true)}
                  className="mt-2 px-3 py-1.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-bold shadow-md transition active:scale-95"
                >
                  去手写签名
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Interactive Fingerprint Pressing Section */}
        {!isSigned && (
          <div className="glass-panel rounded-3xl p-5 border border-white/40 custom-shadow text-center space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-rose-800">指纹按压锁定仪式</h4>
              <p className="text-[9px] text-gray-500 leading-normal max-w-xs mx-auto font-medium">
                双方均完成手写签名后，长按下方指纹区域 2 秒，将正式融合指纹锁定终身不分手契约！
              </p>
            </div>

            <div className="flex justify-center items-center">
              <button
                onMouseDown={handleFingerprintPressStart}
                onMouseUp={handleFingerprintPressEnd}
                onMouseLeave={handleFingerprintPressEnd}
                onTouchStart={handleFingerprintPressStart}
                onTouchEnd={handleFingerprintPressEnd}
                className={`relative w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 select-none ${
                  isPressing 
                    ? 'border-rose-600 bg-rose-500/10 scale-95 shadow-[0_0_20px_rgba(225,29,72,0.5)]' 
                    : 'border-rose-400/60 bg-white/60 hover:scale-[1.03] shadow-md'
                }`}
              >
                {/* Progress Circle SVG */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth="4"
                    strokeDasharray={263.89}
                    strokeDashoffset={263.89 - (263.89 * pressProgress) / 100}
                    className="transition-all duration-100"
                  />
                </svg>

                {/* Fingerprint Vector Graphic */}
                <svg
                  viewBox="0 0 24 24"
                  className={`w-12 h-12 transition-colors duration-300 ${
                    isPressing ? 'text-rose-600 animate-pulse' : 'text-rose-400'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M12 2a10 10 0 0 0-8 15.6" />
                  <path d="M18.8 6a8 8 0 0 0-14.8 7.3" />
                  <path d="M12 8a4 4 0 0 0-4 4v4" />
                  <path d="M8.5 10.4A6 6 0 0 0 6 15v3" />
                  <path d="M12 12a1 1 0 0 0-1 1v6" />
                  <path d="M15.5 10.4A6 6 0 0 1 18 15v3" />
                  <path d="M18.5 13.5a8 8 0 0 1 .5 3v1.5" />
                  <path d="M12 15a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
            
            {isPressing && (
              <p className="text-[10px] text-rose-600 font-bold animate-pulse">
                契约誓言融合中... {pressProgress}%
              </p>
            )}
          </div>
        )}

      </div>

      {/* Signature Handwriting Modal */}
      {signatureModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-5 rounded-3xl bg-white border border-rose-100 text-center space-y-4">
            <h3 className="text-xs font-black text-rose-800 flex items-center justify-center space-x-1">
              <span>✍️ 亲笔写下你的誓约签名</span>
            </h3>
            
            {/* Canvas Sign Box */}
            <div className="w-full aspect-[2/1] border border-rose-100 bg-rose-50/20 rounded-2xl relative overflow-hidden">
              <canvas
                ref={canvasRef}
                width={320}
                height={160}
                className="w-full h-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawingAction}
                onMouseLeave={stopDrawingAction}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawingAction}
              />
              
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-rose-300 text-[10px] font-bold">
                  请在此区域用手指/鼠标绘制签名
                </div>
              )}
            </div>

            {/* Canvas Controls */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setSignatureModalOpen(false);
                  clearCanvas();
                }}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-2xl transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                disabled={!hasDrawn}
                className="px-4 py-2 border border-rose-100 hover:bg-rose-50 text-rose-500 text-xs font-semibold rounded-2xl transition disabled:opacity-50"
              >
                重写
              </button>
              <button
                type="button"
                onClick={saveSignature}
                disabled={!hasDrawn}
                className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-2xl transition disabled:opacity-50"
              >
                签署
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
