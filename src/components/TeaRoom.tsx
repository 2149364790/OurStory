import React from 'react';
import confetti from 'canvas-confetti';
import { 
  Coffee, Sprout, HeartCrack, ClipboardList, PenTool, Lightbulb, Heart, BookOpen
} from 'lucide-react';

interface CommunicationLog {
  id: string;
  user_id: string;
  category: 'unhappy' | 'agenda' | 'reflection' | 'memo';
  content: string;
  reflection_action?: string;
  is_private: boolean;
  status: 'pending' | 'discussed';
  review_id?: string;
  created_at: string;
}

interface TeaRoomProps {
  currentUser: any;
  profiles: any[];
  communicationLogs: CommunicationLog[];
  teaRoomStep: number;
  setTeaRoomStep: (step: number) => void;
  resolvedLogIds: string[];
  setResolvedLogIds: (ids: string[]) => void;
  consensusText: string;
  setConsensusText: (text: string) => void;
  isSubmittingConsensus: boolean;
  onExit: () => void;
  onFinish: () => void;
}

export const TeaRoom: React.FC<TeaRoomProps> = ({
  currentUser,
  profiles,
  communicationLogs,
  teaRoomStep,
  setTeaRoomStep,
  resolvedLogIds,
  setResolvedLogIds,
  consensusText,
  setConsensusText,
  isSubmittingConsensus,
  onExit,
  onFinish,
}) => {
  return (
    <div className="fixed inset-0 z-[150] bg-gradient-to-br from-[#fdf6f0] via-[#fee4e6] to-[#fceade] overflow-y-auto p-4 flex flex-col items-center justify-between pb-8 select-none">

      {/* Tea Room Header */}
      <div className="w-full max-w-md flex justify-between items-center py-4 border-b border-rose-200/50">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center">
            <Coffee size={14} className="text-rose-500" />
          </span>
          <div className="text-left">
            <h2 className="text-xs font-black text-rose-900">约定沟通茶室</h2>
            <span className="text-[8px] text-rose-600/70 block">放下杂念，倾听彼此的心声</span>
          </div>
        </div>
        <button
          onClick={onExit}
          className="px-2.5 py-1 bg-white/50 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-full text-[9px] font-black transition active:scale-95 shadow-2xs"
        >
          退出茶室
        </button>
      </div>

      {/* Tea Room Main Container */}
      <div className="w-full max-w-md flex-1 py-6 flex flex-col justify-start">

        {/* Steps Guide Indicator */}
        <div className="flex justify-between items-center mb-6 px-4">
          {[
            { step: 1, text: '聆听自省', icon: <Sprout size={10} className="mr-1 inline-block" /> },
            { step: 2, text: '探讨议题', icon: <HeartCrack size={10} className="mr-1 inline-block" /> },
            { step: 3, text: '达成共识', icon: <PenTool size={10} className="mr-1 inline-block" /> }
          ].map((s) => (
            <div key={s.step} className="flex flex-col items-center space-y-1 flex-1 relative">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                teaRoomStep >= s.step ? 'bg-rose-500 text-white shadow-md' : 'bg-rose-200/50 text-rose-700/60'
              }`}>
                {s.step}
              </div>
              <span className={`text-[8px] font-black transition-all flex items-center justify-center ${
                teaRoomStep === s.step ? 'text-rose-800 scale-105' : 'text-rose-700/50'
              }`}>
                {s.icon}
                <span>{s.text}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Reflections */}
        {teaRoomStep === 1 && (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-white/50 border border-emerald-100 rounded-2xl p-4 text-center space-y-2 shadow-inner">
                <Sprout size={22} className="text-emerald-500 animate-bounce mx-auto block" />
                <h3 className="text-xs font-black text-emerald-800">第一阶段：聆听自省</h3>
                <p className="text-[9px] text-emerald-700/80 leading-relaxed font-medium">
                  以真诚的自省开场，倾听彼此在相处中反思出的不足以及改进的具体行动。
                </p>
              </div>

              {communicationLogs.filter(l => l.category === 'reflection').length === 0 ? (
                <div className="glass-panel border border-dashed border-emerald-150 rounded-2xl p-8 text-center text-[10px] font-black text-emerald-800 bg-white/40">
                  本期暂无自省记录。可以直接进行下一步。
                </div>
              ) : (
                <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                  {communicationLogs.filter(l => l.category === 'reflection').map((log) => {
                    const isMine = log.user_id === currentUser?.id;
                    const writerProfile = profiles.find(p => p.id === log.user_id);
                    const writerNickname = isMine ? '我' : (writerProfile?.nickname || '伴侣');

                    return (
                      <div key={log.id} className="glass-panel border border-emerald-250 rounded-2xl p-4 space-y-2.5 bg-white/60 font-love-letter text-left shadow-2xs">
                        <div className="flex justify-between items-center text-[8px] font-black text-emerald-700/70 border-b border-emerald-100 pb-1.5">
                          <span className="flex items-center space-x-1">
                            <Sprout size={10} className="text-emerald-500" />
                            <span>{writerNickname} 的反思</span>
                          </span>
                          <span>{new Date(log.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-emerald-950 leading-relaxed whitespace-pre-wrap font-medium">{log.content}</p>
                        {log.reflection_action && (
                          <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-2.5 text-[9px] mt-2 space-y-1 shadow-inner">
                            <span className="font-extrabold text-emerald-850 flex items-center space-x-1 mb-0.5">
                              <Lightbulb size={12} className="text-emerald-600" />
                              <span>改进的具体行动：</span>
                            </span>
                            <p className="text-emerald-700 font-medium whitespace-pre-wrap leading-relaxed">{log.reflection_action}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => setTeaRoomStep(2)}
              className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs transition active:scale-95 shadow-md shadow-rose-200/50"
            >
              下一步：探讨议题与心结 (共 {communicationLogs.filter(l => l.category !== 'reflection' && l.category !== 'memo').length} 条) ➔
            </button>
          </div>
        )}

        {/* Step 2: Unhappy / Agenda */}
        {teaRoomStep === 2 && (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-white/50 border border-rose-100 rounded-2xl p-4 text-center space-y-2 shadow-inner">
                <HeartCrack size={22} className="text-rose-500 animate-bounce mx-auto block" />
                <h3 className="text-xs font-black text-rose-800">第二阶段：探讨议题与心结</h3>
                <p className="text-[9px] text-rose-700/80 leading-relaxed font-medium">
                  平时隐藏的手记均已解锁。面对面沟通这些卡片，讨论并释怀后，将其标记为"达成一致"。
                </p>
              </div>

              {communicationLogs.filter(l => l.category !== 'reflection' && l.category !== 'memo').length === 0 ? (
                <div className="glass-panel border border-dashed border-rose-150 rounded-2xl p-8 text-center text-[10px] font-black text-rose-800 bg-white/40">
                  本期暂无摩擦心结与商议议题记录。可以直接进行下一步。
                </div>
              ) : (
                <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                  {communicationLogs.filter(l => l.category !== 'reflection' && l.category !== 'memo').map((log) => {
                    const isMine = log.user_id === currentUser?.id;
                    const writerProfile = profiles.find(p => p.id === log.user_id);
                    const writerNickname = isMine ? '我' : (writerProfile?.nickname || '伴侣');
                    const isResolved = resolvedLogIds.includes(log.id);

                    const cardBorder = log.category === 'unhappy' ? 'border-rose-200' : 'border-indigo-200';
                    const logTypeLabel = log.category === 'unhappy' ? '委屈' : '议题';
                    const badgeIcon = log.category === 'unhappy' ? <HeartCrack size={10} className="mr-0.5" /> : <ClipboardList size={10} className="mr-0.5" />;
                    const badgeColor = log.category === 'unhappy' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700';

                    return (
                      <div
                        key={log.id}
                        className={`glass-panel border rounded-2xl p-4 space-y-2 bg-white/60 transition duration-300 relative text-left shadow-2xs ${cardBorder} ${
                          isResolved ? 'opacity-40 grayscale-[40%] line-through scale-[0.98]' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center text-[8px] font-black border-b border-black/5 pb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <span className={`px-1.5 py-0.5 rounded-full ${badgeColor} text-[7px] flex items-center`}>
                              {badgeIcon}
                              <span>{logTypeLabel}</span>
                            </span>
                            <span className="text-rose-800">{writerNickname} 的记录</span>
                          </div>
                          <button
                            onClick={() => {
                              if (isResolved) {
                                setResolvedLogIds(resolvedLogIds.filter(id => id !== log.id));
                              } else {
                                setResolvedLogIds([...resolvedLogIds, log.id]);
                                confetti({
                                  particleCount: 15,
                                  spread: 30,
                                  origin: { y: 0.8 },
                                  colors: ['#ff85a1', '#ffccd5'],
                                });
                              }
                            }}
                            className={`px-2 py-0.5 rounded-full text-[8px] font-black transition ${
                              isResolved ? 'bg-green-500 text-white' : 'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}
                          >
                            {isResolved ? '✓ 已达成' : '标记达成'}
                          </button>
                        </div>
                        <p className="text-xs text-rose-950 leading-relaxed whitespace-pre-wrap font-medium">{log.content}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setTeaRoomStep(1)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs transition"
              >
                返回第一步
              </button>
              <button
                onClick={() => setTeaRoomStep(3)}
                className="flex-2 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs transition active:scale-95 shadow-md shadow-rose-200/50"
              >
                下一步：落笔新约定 ➔
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Shared Consensus */}
        {teaRoomStep === 3 && (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-white/50 border border-amber-100 rounded-2xl p-4 text-center space-y-2 shadow-inner">
                <PenTool size={22} className="text-amber-500 animate-bounce mx-auto block" />
                <h3 className="text-xs font-black text-amber-800">第三阶段：共同敲定新共识</h3>
                <p className="text-[9px] text-amber-700/80 leading-relaxed font-medium">
                  沟通完毕！写下属于你们两人的"新共识与约定"，确认后它将被永久锁入时光墙中。
                </p>
              </div>

              <div className="space-y-1 text-left">
                <span className="text-[10px] font-black text-rose-900 flex items-center pl-1 space-x-1">
                  <BookOpen size={12} className="text-rose-500" />
                  <span>我们的约定共识：</span>
                </span>
                <textarea
                  value={consensusText}
                  onChange={(e) => setConsensusText(e.target.value)}
                  placeholder={`例如：\n1. 相处中有误会先给对方一个拥抱，不以冷战或愤怒文字收尾。\n2. 以后每个周末两人分工做一次大扫除，不再为家务推脱。\n3. 发生不开心时，说出"我感到不舒服"而不是埋怨对方做错了什么。`}
                  required
                  className="w-full bg-white/70 border border-rose-100 rounded-2xl p-4 text-xs font-medium text-rose-955 focus:outline-none focus:ring-2 focus:ring-rose-450 focus:bg-white shadow-inner h-[220px]"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setTeaRoomStep(2)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs transition animate-active"
              >
                返回上一步
              </button>
              <button
                onClick={onFinish}
                disabled={isSubmittingConsensus || !consensusText.trim()}
                className="flex-2 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-bold rounded-2xl text-xs transition active:scale-95 shadow-md shadow-rose-200/50 flex items-center justify-center space-x-2"
              >
                {isSubmittingConsensus ? (
                  <span>正在锁入时光墙...</span>
                ) : (
                  <>
                    <Heart size={14} className="fill-white" />
                    <span>确认并归档约定</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TeaRoom;
